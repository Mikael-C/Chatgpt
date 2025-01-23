import React, { useEffect, useState } from 'react'
import { AreaChartOutlined, HomeOutlined, DeleteOutlined, ShareAltOutlined, DownloadOutlined, GlobalOutlined, PushpinOutlined } from '@ant-design/icons';
import { Capacitor } from '@capacitor/core';
import { Divider, Button, FloatButton, message as msg, Modal, Form, Typography, Input, Segmented, Alert, Card, Space, Carousel, Skeleton, Result, Avatar } from 'antd';
import { useHistory } from 'react-router';
import { collection, query, where, orderBy, limit, onSnapshot, doc, serverTimestamp, setDoc, CollectionReference, DocumentData, addDoc, deleteDoc } from 'firebase/firestore';
import { firestore, storage } from '../firebase';
import { uploadBytesResumable, getDownloadURL, ref as storeRef, ref } from 'firebase/storage';
import ImageUploadModal from '../components/ImageUploadModal';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';
import Meta from "antd/es/card/Meta";

const LandmarkCard = ({ key, id, gpt, message, senderName, profileUrl, actionType, publicUrl, status, error }: any) => {
    const history = useHistory();

    const map = async () => {
        window.open(`https://www.google.com/maps?q=${gpt[0].landmarkAnnotations[0].locations[0].latLng.latitude},${gpt[0].landmarkAnnotations[0].locations[0].latLng.longitude}`, '_blank');
    }

    const del = async () => {
        if (confirm('Are you sure you want to delete')) {
            const documentRef = doc(firestore, 'landmarks', id);

            try {
                // Delete the document
                await deleteDoc(documentRef);
                msg.success('Successfully deleted!');
            } catch (error: any) {
                msg.error('Error deleting :' + error.message);
            }
        }
    }

    const post = async () => {
        if (confirm("Are you sure you want to post this chat message publicly?")) {
            try {
                const feedData = {
                    publicUrl: publicUrl,
                    actionType: actionType,
                    senderName: senderName,
                    profileUrl: profileUrl,
                    likes: 0,
                    gpt: gpt,
                    comments: 0,
                    shares: 0,
                    type: 'image',
                    isShared: false,
                    feedId: null,
                    meta: {
                        comments: [],
                        likes: [],
                        shares: []
                    },
                    timestamp: serverTimestamp()
                };
                const feedRef = collection(firestore, "feeds");
                await addDoc(feedRef, feedData);
                history.push('/gpt/feeds');
            } catch (error) {
                console.error("Error copying chat to feeds:", error);
            }
        }

    }
    return (
        <Card cover={<img src={publicUrl} />}
            actions={[
                <><Button type='text' onClick={() => post()} disabled={status == 'completed' ? false : true}><GlobalOutlined />Post</Button></>,
                <><Button type='text' onClick={() => map()} disabled={status == 'completed' ? false : true}><PushpinOutlined />Locate</Button></>,
                <><Button type='text' danger onClick={() => del()} ><DeleteOutlined />Delete</Button></>
            ]}
            className='identify-objects-card'
            key={key}
        > {status == 'new' && <Skeleton active />}
            {status == 'error' && <Result
                status="error"
                title="Unable to identify landmark"
                subTitle={`${error != undefined ? error.message : 'Unknown error as to why AI was unable toidentify landmark from uploaded image. Please try again!!!'}`}
            />}
            <Card.Meta description={message} />
            <Card>
                <Meta avatar={<Avatar src='/icon.png' size={32} />}
                    title={"Gpt"}
                    description={gpt[0]?.message}
                />
                {status == 'new' && <Skeleton active />}
            </Card>
        </Card>
    )
}
export const Landmark = () => {
    const [showImageUploadModal, setShowImageUploadModal] = useState(false);
    const [type, setType] = useState('image');
    const [arts, setArts] = useState([]);
    const history = useHistory();
    const [showArt, setShowArtModal] = useState(false);
    const [user, setUser] = useState<any>();
    const [working, setWorking] = useState(false);
    const [message, setMessage] = useState('');
    const [actionType, setActionType] = useState('Single');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [editedImage, setEditedImage] = useState<File | null>(null);
    const [fileList, setFileList] = useState<any>([]);

    useEffect(() => {

        if (localStorage.getItem('subscribed') == null) {
            msg.error('Only subscribed users can use this feature');
            history.push('/gpt/chat');
        }

        let session: any;
        session = localStorage.getItem('session');
        session = JSON.parse(session);
        setUser(session);


        const chatRef = collection(firestore, 'landmarks');
        const q = query(chatRef, where('sessionId', '==', session?.sid), orderBy('timestamp', 'desc'), limit(10));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const landmark: any = [];
            snapshot.docs.map(async (doc) => {

                landmark.push({ ...doc.data(), id: doc.id });
            });

            setArts(landmark);
        });
        return () => {
            unsubscribe();
        };
    }, []);

    const sendMessage = async (mediaUrl: any, publicUrl: any) => {
        try {
            const chatRef = collection(firestore, 'landmarks');
            const newMessage = {
                status: 'new',
                mediaUrl,
                publicUrl,
                profileUrl: user?.profileUrl ? user.profileUrl : null,
                sender: user?.uid,
                sessionId: user?.sid,
                type: actionType,
                gpt: [],
                timestamp: serverTimestamp(),
            };
            await setDoc(doc(chatRef), newMessage);
        } catch (error) {
            console.error(error);
            msg.error("Failed to send message");
        } finally {
            setShowArtModal(false);
            setFileList([]);
        }
    };

    const handleUpload = () => {
        setWorking(true);
        if (fileList.length > 0) {
            const promises = fileList.map((file: any) => {
                console.log("blob exists", file.blobData, file.blobData !== undefined);
                const storageRef = storeRef(
                    storage,
                    file.blobData !== undefined
                        ? `${type}/landmarks/${new Date().toISOString()}.${file.type}`
                        : `${type}/landmarks/${new Date().toISOString() + '_' + file.name}`
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
                        msg.success('Upload successful');
                        getDownloadURL(storeRef(storage, storagePaths[0])).then((resolvedPublicUrl) => {
                            sendMessage(mediaUrls[0], resolvedPublicUrl);
                        });
                    });
                })
                .catch((error) => {
                    console.error(error);
                    msg.error('Upload failed');
                })
                .finally(() => {
                    setWorking(false);
                });
        } else {
            sendMessage(null, null);
            setWorking(false);
        }
    };



    return (

        <div className="identify-image-object-container">
            <Divider>
                <Button style={{ margin: '1rem' }} icon={<AreaChartOutlined />} onClick={() => setShowArtModal(true)}>Upload</Button>
                <Button style={{ margin: '1rem' }} icon={<HomeOutlined />} onClick={() => history.push('/gpt/chat')}>Home</Button>
            </Divider>
            <FloatButton icon={<AreaChartOutlined />} type="primary" onClick={() => setShowArtModal(true)}></FloatButton>
            <div style={{ textAlign: 'center', display: Capacitor.isNativePlatform() ? 'none' : 'block', padding: '5px' }}>
                <iframe src="https://rcm-eu.amazon-adsystem.com/e/cm?o=2&p=12&l=ur1&category=piv&banner=1W89G1DNPNEYJHQBWMR2&f=ifr&linkID=a867cb31df6e0c4ae9f1d1b442ec64de&t=lonerai-21&tracking_id=lonerai-21" width="300" height="250" scrolling="no" style={{ border: "none" }} sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"></iframe>
            </div>
            <div style={{ padding: '15px' }}>
                {
                    arts.length == 0 && <Result
                        title="You have not asked AI to identify any landmarks for you"
                        extra={
                            <Button type="primary" key="console" onClick={() => setShowArtModal(true)} >
                                Try it now
                            </Button>
                        }
                    />
                }
                {
                    (arts.map((art: any, index) => (
                        <LandmarkCard {...art} key={index} senderName={user?.name} actionType={art.type} sender={user?.uid} profileUrl={user?.profileUrl ? user.profileUrl : null} />
                    )))
                }
            </div>
            <Modal title="Identify landmark from an image using AI" footer={null} open={showArt} onCancel={() => setShowArtModal(false)}>
                <div >
                    <Form.Item >
                        <br />
                        <Space direction='horizontal'>
                            <Button type='primary' onClick={(e) => { e.preventDefault(); setShowImageUploadModal(true); }} >Click to open image chooser</Button>
                            <Button onClick={() => setFileList([])}>Clear</Button></Space>
                        <br />
                        {
                            fileList.map((file: any) => (
                                <img src={URL.createObjectURL(file.originFileObj)} width={'100%'} />
                            ))
                        }
                    </Form.Item>
                    <Button block onClick={() => handleUpload()}>Identify landmark</Button>
                </div>
                <ImageUploadModal
                    visible={showImageUploadModal}
                    onCancel={() => setShowImageUploadModal(false)}
                    onUpload={(e: any) => {

                        setFileList(e);
                        setShowImageUploadModal(false);
                    }}
                />
            </Modal>
        </div>
    )
}


