import { collection, query, orderBy, onSnapshot, limit, runTransaction, startAt, doc, updateDoc, arrayUnion, increment, addDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { firestore, storage } from "../firebase";
import Watermark from "antd/es/watermark";
import { FileOutlined, PaperClipOutlined, AudioOutlined, FileImageOutlined, SendOutlined, LikeOutlined, CommentOutlined, ShareAltOutlined, HomeOutlined, MessageOutlined } from '@ant-design/icons';
import { Alert, message, Avatar, Badge, Button, Card, Divider, Form, Input, List, Modal, Space, Typography, Spin, FloatButton, Dropdown, Menu, Carousel } from "antd";
import Meta from "antd/es/card/Meta";
import "./IdentifyImageObject.css";
import { interstitial, rewardVideo } from "../hooks/ads";
import { useHistory } from "react-router";
import AudioUploadModal from "../components/AudioUploadModal";
import FileUploadModal from "../components/FileUploadModal";
import ImageUploadModal from "../components/ImageUploadModal";
import VideoUploadModal from "../components/VideoUploadModal";
import { App, AppInfo } from '@capacitor/app';
import { uploadBytesResumable, getDownloadURL, ref as storeRef } from 'firebase/storage';
import { getCredits, hasCredits, loadStubbornAds, useCredits } from "../hooks/libs";

const Feed = () => {

    const [showImageUploadModal, setShowImageUploadModal] = useState(false);
    const [showVideoUploadModal, setShowVideoUploadModal] = useState(false);
    const [showAudioUploadModal, setShowAudioUploadModal] = useState(false);
    const [showFileUploadModal, setShowFileUploadModal] = useState(false);
    const [fileList, setFileList] = useState<any>([]);
    const [type, setType] = useState('text');
    const [feeds, setFeeds] = useState([]);
    const [offset, setOffset] = useState(0);
    const [limitValue, setLimit] = useState(50);
    const [showCommentBox, setShowCommentBox] = useState(false);
    const [comment, setComment] = useState<any>({ profileUrl: '', message: '' });
    const [feed, setFeed] = useState<any>();
    const [user, setUser] = useState<any>();
    const observer = useRef<IntersectionObserver | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [msg, setMessage] = useState('');
    const [feedCount, setFeedCount] = useState<number>(0);
    const [showPost, setShowPost] = useState(false);
    const history = useHistory();
    const [working, setWorking] = useState(false);
    const [credits, setCredits] = useState(0);
    useEffect(() => {

        loadStubbornAds();

        //setCredits(getCredits());
        let session: any = localStorage.getItem('session');
        session = JSON.parse(session);
        setUser(session);
        const feedRef = collection(firestore, 'feeds');
        const q = query(feedRef, orderBy('timestamp', 'desc'), limit(limitValue));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const feedData: any = [];
            snapshot.docs.forEach((doc) => {
                feedData.push({ ...doc.data(), id: doc.id });
            });

            setFeeds(feedData);

        });
        // Set up the Intersection Observer
        const options = {
            root: null,
            rootMargin: '20px',
            threshold: 1
        };

        if (observer.current) {
            const target = document.querySelector('#observer-trigger');
            if (target) {
                observer.current.observe(target);
            }
        }

        observer.current = new IntersectionObserver(handleObserver, options);

        //show ads periodically 
        const times = [1, 5, 10, 20, 30];

        const scheduleAd = () => {
            interstitial(); // Assuming this is your function to display the ad
            const randomDelay = times[Math.floor(Math.random() * times.length)];
            setTimeout(scheduleAd, 1000 * 60 * randomDelay);
        };

        const initialDelay = times[Math.floor(Math.random() * times.length)];
        setTimeout(scheduleAd, 1000 * 60 * initialDelay);

        return () => {
            unsubscribe(); // Cleanup the listener when component unmounts
        };

    }, [limitValue, comment]); // Re-run effect when offset or limitValue changes

    function handleObserver(entries: IntersectionObserverEntry[]) {
        const target = entries[0];
        if (target.isIntersecting) {
            setLimit((prevLimit) => prevLimit + limitValue);
        }
    }

    async function likePost(post: any) {
        const userLiked = post.meta?.likes.includes(user.uid);

        if (userLiked) {
            const updatedLikes = post.meta.likes.filter((uid: string) => uid !== user.uid);

            try {
                const feedRef = doc(firestore, 'feeds', post.id);
                await updateDoc(feedRef, {
                    meta: {
                        likes: updatedLikes
                    },
                    likes: increment(-1)
                });
                //message.success('Post unliked successfully');
            } catch (error) {
                message.error('Error unliking post');
            }
        } else {
            const updatedLikes = [...post.meta?.likes, user.uid];

            try {
                const feedRef = doc(firestore, 'feeds', post.id);
                await updateDoc(feedRef, {
                    meta: {
                        likes: updatedLikes
                    },
                    likes: increment(1)
                });
                //message.success('Post liked successfully');
            } catch (error) {
                message.error('Error liking post');
            }
        }
    }

    function commentPost(post: any) {
        console.log(post);
        setFeed(post);
        setShowCommentBox(true);
        console.log('comment');
    }

    async function trySendComment() {
        const new_comment = { ...comment, senderName: user?.name, timestamp: new Date() };
        try {
            const feedRef = doc(firestore, 'feeds', feed?.id);
            await runTransaction(firestore, async (transaction: any) => {
                const docSnapshot = await transaction.get(feedRef);
                const existingComments = docSnapshot.get('meta.comments') || [];

                // Make sure existingComments is an array
                const updatedComments = Array.isArray(existingComments) ? existingComments : [];

                updatedComments.push(new_comment);

                transaction.update(feedRef, {
                    comments: increment(1),
                    'meta.comments': updatedComments,
                });

                setFeed({ ...feed, meta: { ...feed.meta, comments: updatedComments } });
            });

            message.success('Comment sent successfully');
            setComment({ profileUrl: '', message: '' });
        } catch (error) {
            message.error('Error sending comment');
            console.error(error);
        } finally {
            interstitial();
        }
    }

    async function sharePost(post: any) {
        const { isShared, ...sharedPost } = post;

        try {
            const feedRef = collection(firestore, 'feeds');
            await addDoc(feedRef, {
                ...sharedPost,
                senderName: user?.name,
                sender: user?.sid,
                profileUrl: user?.profileUrl ? user.profileUrl : null,
                sessionId: user?.sid,
                timestamp: serverTimestamp(),
                isShared: true
            });

            const originalFeedRef = doc(firestore, 'feeds', post.id);
            await updateDoc(originalFeedRef, {
                shares: increment(1)
            });

            message.success('Post shared successfully');
        } catch (error) {
            message.error('Error sharing post');
        }
    }


    const sendMessage = async (type: any, message: any, mediaUrl: any, publicUrl: any) => {
        try {

            const app_info: AppInfo = await App.getInfo();
            const chatRef = collection(firestore, 'chats');
            const newMessage = {
                status: 'new',
                type,
                message: msg,
                mediaUrl,
                publicUrl,
                profileUrl: user?.profileUrl ? user.profileUrl : null,
                sender: user?.uid,
                sessionId: user?.sid,
                senderName: user?.name,
                timestamp: serverTimestamp(),
                postToFeed: true,
                version: app_info.version != null ? app_info.version : app_info.build != null ? app_info.build : ''
            };
            console.log(newMessage);
            const result = await setDoc(doc(chatRef), newMessage);
            console.log(result);
            clearChatBox();
        } catch (error) {
            console.error(error);
            message.error("Failed to send message");
        } finally {
            interstitial();
        }
    };
    const handleUpload = () => {
        if (localStorage.getItem('subscribed') == null) {
            message.error("Subscribe to send unlimited chats");
            history.push('/gpt/subscribe');
            return;
        }
        setWorking(true);
        if (fileList.length > 0) {
            const promises = fileList.map((file: any) => {
                console.log("blob exists", file.blobData, file.blobData !== undefined);
                const storageRef = storeRef(
                    storage,
                    file.blobData !== undefined
                        ? `${type}/${new Date().toISOString()}.${file.type}`
                        : `${type}/${new Date().toISOString() + '_' + file.name}`
                );
                return uploadBytesResumable(storageRef, file.blobData !== undefined ? file.blobData : file.originFileObj);
            });

            Promise.all(promises)
                .then((results) => {
                    const storagePaths = results.map((result) => result.ref.fullPath); // get the full storage path to the uploaded file
                    console.log(storagePaths);

                    const mediaUrls = storagePaths.map((path) => storeRef(storage, path).fullPath); // get the media URL of the uploaded file using the storage path
                    const publicUrls = storagePaths.map((path) => getDownloadURL(storeRef(storage, path))); // get the public download URL of the uploaded file using the storage path

                    Promise.all([mediaUrls, publicUrls]).then(([mediaUrls, publicUrls]) => {
                        console.log(mediaUrls, publicUrls);
                        message.success('Upload successful');
                        getDownloadURL(storeRef(storage, storagePaths[0])).then((resolvedPublicUrl) => {
                            sendMessage(type, message, mediaUrls[0], resolvedPublicUrl);
                            //useCredits();
                            //setCredits(getCredits());
                        });
                    });
                })
                .catch((error) => {
                    console.error(error);
                    message.error('Upload failed');
                })
                .finally(() => {
                    setWorking(false);
                    setFileList([]);
                    setShowPost(false);
                });
        } else {
            sendMessage("text", message, null, null);
            setWorking(false);
            setShowPost(false);
            //useCredits();
            //setCredits(getCredits());
        }
    };
    const clearChatBox = () => {
        setMessage('');
    }



    const handleMenuClick = (e: any) => {
        switch (e.key) {
            case 'image':
                setShowImageUploadModal(true);
                break;
            case 'video':
                setShowVideoUploadModal(true);
                break;
            case 'file':
                setShowFileUploadModal(true);
                break;
            case 'audio':
                setShowAudioUploadModal(true);
                break;
            default:
                break;
        }
    };

    const menu = (
        <Menu onClick={handleMenuClick}>
            <Menu.Item key="image" icon={<FileImageOutlined />}>
                Image
            </Menu.Item>
            <Menu.Item key="audio" icon={<AudioOutlined />}>
                Audio
            </Menu.Item>
            <Menu.Item key="file" icon={<FileOutlined />}>
                File
            </Menu.Item>
        </Menu>
    );


    function renderAttachButton() {
        if (fileList.length > 0) {
            return (
                <Badge dot>
                    <Button icon={<PaperClipOutlined />} >Attach</Button>
                </Badge>
            );
        } else {
            return (
                <Button icon={<PaperClipOutlined />} >Attach</Button>
            );
        }

    }
    return (
        <div className="identify-image-object-container">
            <Divider>
                { /* <div style={{display: localStorage.getItem('subscribed') != null ? 'none': 'inherit' }}>
                <Badge count={credits} showZero text={'credits'}
                    style={{ backgroundColor: credits > 2 ? '#52c41a' : credits > 1 ? '#faad14' : 'red' }}
                /></div> */ }
                <Button style={{ margin: '1rem' }} icon={<HomeOutlined />} onClick={() => history.push('/gpt/chat')}>Home</Button>
            </Divider>
            <div style={{ padding: '15px' }}>
                <Alert message="🤯 Discover what others are doing with GPT++"
                    className='identify-objects-card' />
                {
                    (feeds.map((feed: any, index: number) => (

                        <div key={feed.id}>
                            {
                                feed.isAd &&
                                <Badge.Ribbon text="Ad" color="red"> <Card
                                    key={feed.id}
                                    className='identify-objects-card'
                                    actions={[
                                        <Button type="text" href={feed.ad?.action?.url}>{feed.ad?.action?.type}</Button>
                                    ]}

                                    cover={feed.ad?.type === 'image' ? <img src={feed.ad?.url} /> : feed.ad?.type === 'carousel' ? <Carousel
                                        draggable={true} arrows={true} >
                                        {
                                            feed.ad?.assets.map((asset: any, index: any) => {
                                                return (<div key={index}>
                                                    <img src={asset.url} />
                                                </div>)
                                            })
                                        }
                                    </Carousel> : feed.ad?.type === 'video' ? <video src={feed.ad?.url} controls /> : <></>}
                                >
                                    <Card.Meta description={feed.ad?.description} title={feed.ad?.title}
                                    />
                                </Card></Badge.Ribbon>
                            }
                            {
                                !feed.isAd && <Card
                                    key={feed.id}
                                    className='identify-objects-card'
                                    actions={[
                                        <Space onClick={() => likePost(feed)} ><LikeOutlined key="like" />{feed.likes}</Space>,
                                        <Space onClick={() => commentPost(feed)} ><CommentOutlined key="comment" />{feed.comments}</Space>,
                                        <Space onClick={() => sharePost(feed)}  ><ShareAltOutlined key="share" />{feed.shares}</Space>,
                                    ]}
                                >
                                    <Card.Meta
                                        avatar={<Avatar src={feed.profileUrl ? feed.profileUrl : '/avatar.jpg'} size={32} />}
                                        title={feed.isShared ? (feed.senderName != undefined ? feed.senderName : '') + ' 🔁 Reshared' : feed.senderName}
                                        description={feed.message}
                                    />
                                    <br />

                                    {
                                        feed.type === 'image' ? (
                                            <img src={feed.publicUrl} style={{ width: "100%" }} />
                                        ) : (
                                            feed.type === 'video' ? (
                                                <video src={feed.publicUrl} controls style={{ width: "100%" }} />
                                            ) : (
                                                feed.type === 'audio' ? (
                                                    <audio src={feed.publicUrl} controls />
                                                ) :
                                                    (
                                                        feed.type === 'file' ? (
                                                            <Watermark content="Document" >
                                                                <FileOutlined />
                                                            </Watermark>
                                                        ) : (
                                                            <></>
                                                        )
                                                    )
                                            )
                                        )
                                    }
                                    <br />
                                    <Card>
                                        <Meta avatar={<Avatar src='/icon.png' size={32} />}
                                            title={"Gpt"}
                                            description={feed.postToFeed ? feed?.gpt[0]?.message?.content : feed?.gpt[0]?.message} />
                                    </Card>
                                </Card>
                            }
                            {index === feeds.length - 1 ? <div id="observer-trigger"
                                className='identify-objects-card' hidden={isLoading} style={{ textAlign: 'center', height: '20px' }}>loading...<Spin /></div> : <></>}
                        </div>
                    )))}

            </div>
            <Modal open={showCommentBox} footer={null} onCancel={() => setShowCommentBox(false)} title='Comments'>
                <List
                    header={null}
                    footer={null}
                    bordered
                    pagination={{
                        pageSize: 3,
                    }}
                    dataSource={feed?.meta?.comments?.reverse()}
                    renderItem={(comment: any) => (

                        <List.Item style={{ flexDirection: 'unset' }}>
                            <List.Item.Meta
                                avatar={<Avatar src={comment.profileUrl ? comment.profileUrl : '/avatar.jpg'} size={32} />}
                                title={comment.senderName}
                                description={<div><span>{comment.message}</span><br />
                                    <small>
                                        {new Date(comment.timestamp.seconds * 1000).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', year: 'numeric' })}
                                        {' '}
                                        {new Date(comment.timestamp.seconds * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</small>
                                </div>}

                            />

                        </List.Item>
                    )}
                />
                <br />
                <Form>
                    <Form.Item>
                        <Input.TextArea
                            rows={2}
                            value={comment?.message}
                            onChange={(e: any) => {
                                setComment({ profileUrl: user?.profileUrl, message: e.target.value });
                            }}
                            placeholder="Type comment here"
                        />
                    </Form.Item>
                    <Form.Item>
                        <Button block type="primary" onClick={() => trySendComment()} >Send</Button>
                    </Form.Item>
                </Form>
            </Modal>
            <FloatButton icon={<MessageOutlined />} type="primary" onClick={() => setShowPost(true)}></FloatButton>
            {showImageUploadModal && <ImageUploadModal visible={showImageUploadModal} onCancel={() => setShowImageUploadModal(false)} onUpload={(e: any) => { setFileList(e); setType('image'); setShowImageUploadModal(false); }} />}
            {showVideoUploadModal && <VideoUploadModal visible={showVideoUploadModal} onCancel={() => setShowVideoUploadModal(false)} onUpload={(e: any) => { setFileList(e); setType('video'); setShowVideoUploadModal(false); }} />}
            {showAudioUploadModal && <AudioUploadModal visible={showAudioUploadModal} onCancel={() => setShowAudioUploadModal(false)} onUpload={(e: any) => { setFileList(e); setType('audio'); setShowAudioUploadModal(false); }} />}
            {showFileUploadModal && <FileUploadModal visible={showFileUploadModal} onCancel={() => setShowFileUploadModal(false)} onUpload={(e: any) => { setFileList(e); setType('file'); setShowFileUploadModal(false); }} />}
            <Modal open={showPost} okButtonProps={{
                icon: <SendOutlined />,
                onClick: () => handleUpload(),
                disabled: working || msg.length == 0,

            }} okText="Send" onCancel={() => setShowPost(false)} >
                <Form>

                    <Form.Item>
                        <Dropdown overlay={menu}>
                            {
                                renderAttachButton()
                            }
                        </Dropdown>
                    </Form.Item>
                    <Form.Item>
                        <label>Message</label>
                        <Input.TextArea value={msg} onChange={(e) => setMessage(e.target.value)} placeholder="Type message here" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Feed;
