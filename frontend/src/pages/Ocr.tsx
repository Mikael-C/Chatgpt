import { useState, useEffect } from 'react';
import { List, FloatButton, Typography, Divider, message, Card, message as msg, Button, Breadcrumb, Space, Col, Row, Tag, Skeleton } from 'antd';
import ImageUploadModal from '../components/ImageUploadModal';
import {
    FileImageFilled, DeploymentUnitOutlined, HomeOutlined, CopyOutlined, DeleteOutlined
} from '@ant-design/icons';
import { collection, serverTimestamp, setDoc, doc, updateDoc, onSnapshot, orderBy, query, where, limit, deleteDoc } from 'firebase/firestore';
import { uploadBytesResumable, getDownloadURL, ref as storeRef } from 'firebase/storage';
import { firestore, storage } from '../firebase';
import { useHistory } from 'react-router';
import { format } from 'date-fns';
import "./IdentifyImageObject.css";
import { Collapse, message as alert } from 'antd';
import { Clipboard } from '@capacitor/clipboard';
import { initAds, logAds, interstitial } from '../hooks/ads';
import { Capacitor } from '@capacitor/core';

const { Panel } = Collapse;

const copy = async (text: any) => {
    await Clipboard.write({
        string: text
    });
    alert.success('Result copied to clipboard');
};

const IdentifyObject = ({ id, publicUrl, result, status, timestamp, key, gpt }: any) => {
    const sentToGPT = async (id: any) => {
        console.log(result);
        try {
            const chatRef = collection(firestore, 'ocr');
            await updateDoc(doc(chatRef, id), { gpt: null });
            message.success('Sent to AI for analysis');
        } catch (error) {
            console.error(error);
            msg.error("Failed to send message");
        }
    }
    const del = async () => {
        if (confirm('Are you sure you want to delete')) {
            const documentRef = doc(firestore, 'ocr', id);

            try {
                // Delete the document
                await deleteDoc(documentRef);
                msg.success('Successfully deleted!');
            } catch (error: any) {
                msg.error('Error deleting :' + error.message);
            }
        }
    }
    return (

        <Card cover={<img src={publicUrl} />}
            actions={[
                <><Button onClick={() => sentToGPT(id)} type='text' disabled={status == 'new' ? true : false}><DeploymentUnitOutlined disabled={gpt == null ? true : false} />Send result to Gpt</Button></>,
                <><Button onClick={() => copy(result)} type='text' disabled={status == 'new' ? true : false}><CopyOutlined />Copy result</Button></>,
                <><Button onClick={() => del()} type='text' danger><DeleteOutlined />Delete</Button></>
            ]}
            className='identify-objects-card'
            key={key}
        >
            <div>
                <Row>
                    <Col span={12}><Tag color={status === "new" ? "blue" : status === "completed" ? "green" : "red"}>{status}</Tag></Col>
                    <Col span={12} ><Space align='end'>{timestamp ? format(timestamp?.toDate(), 'MMM d, yyyy h:mm a') : ''}</Space></Col>
                </Row>
            </div>
            <div style={{ marginTop: '1rem' }}>
                <Collapse bordered={true} activeKey={['result', 'gpt']}>
                    <Panel header="Result" key="result">
                        <Typography.Paragraph>
                            {status == 'new' ? <Skeleton active /> : result}
                        </Typography.Paragraph>
                    </Panel>
                    <Panel header="GPT" key="gpt" style={{ display: gpt == undefined ? 'none' : 'block' }}>
                        <Typography.Paragraph>
                            {gpt == null ? <Skeleton active /> : gpt.response.message.content}
                        </Typography.Paragraph>
                    </Panel>
                </Collapse>
            </div>

        </Card>
    )
}

const Ocr = () => {
    const [showImageUploadModal, setShowImageUploadModal] = useState(false);
    const [type, setType] = useState('image');
    const [identifyObjects, setIdentifyObjects] = useState([]);
    const [working, setWorking] = useState(false);
    const [user, setUser] = useState<any>();
    const history = useHistory();

    useEffect(() => {
        if (localStorage.getItem('subscribed') == null) {
            msg.error('Only subscribed users can use this feature');
            history.push('/gpt/chat');
        }
        try {
            initAds(logAds).then(() => { }).catch((e) => logAds(e.message));
        }
        catch (e) {
            console.log(e);
        }
        //implement chat
        let session: any;
        session = localStorage.getItem('session');
        session = JSON.parse(session);
        setUser(session);


        const chatRef = collection(firestore, 'ocr');
        const q = query(chatRef, where('sessionId', '==', session?.sid), orderBy('timestamp', 'desc'), limit(10));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const cva: any = [];
            snapshot.docs.map(async (doc) => {

                cva.push({ ...doc.data(), id: doc.id });
            });

            setIdentifyObjects(cva);
        });
        return () => {
            unsubscribe();
        };
    }, []);

    const sendMessage = async (mediaUrl: any, publicUrl: any) => {
        try {
            const chatRef = collection(firestore, 'ocr');
            const newMessage = {
                status: 'new',
                mediaUrl,
                publicUrl,
                profileUrl: user?.profileUrl ? user.profileUrl : null,
                sender: user?.uid,
                sessionId: user?.sid,
                timestamp: serverTimestamp(),
            };
            console.log(await setDoc(doc(chatRef), newMessage));
        } catch (error) {
            console.error(error);
            msg.error("Failed to send message");
        } finally {
            interstitial();
        }
    };

    const handleUpload = (e: any) => {
        setWorking(true);
        if (e.length > 0) {
            const promises = e.map((file: any) => {
                console.log("blob exists", file.blobData, file.blobData !== undefined);
                const storageRef = storeRef(
                    storage,
                    file.blobData !== undefined
                        ? `${type}/ocr/${new Date().toISOString()}.${file.type}`
                        : `${type}/ocr/${new Date().toISOString() + '_' + file.name}`
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

    const onUpload = (e: any) => {
        setShowImageUploadModal(false);
        handleUpload(e);
    }
    return (
        <div className="identify-image-object-container">

            <Divider>
                <Button style={{ margin: '1rem' }} icon={<FileImageFilled />} onClick={() => setShowImageUploadModal(true)}>Upload</Button>
                <Button style={{ margin: '1rem' }} icon={<HomeOutlined />} onClick={() => history.push('/gpt/chat')}>Home</Button>
            </Divider>
            <FloatButton icon={<FileImageFilled />} type="primary" onClick={() => setShowImageUploadModal(true)}></FloatButton>
            <ImageUploadModal visible={showImageUploadModal} onCancel={() => setShowImageUploadModal(false)} onUpload={onUpload} />
            <div style={{ textAlign: 'center', display: Capacitor.isNativePlatform() ? 'none' : 'block', padding: '5px' }}>
                <iframe src="https://rcm-eu.amazon-adsystem.com/e/cm?o=2&p=12&l=ur1&category=piv&banner=1W89G1DNPNEYJHQBWMR2&f=ifr&linkID=a867cb31df6e0c4ae9f1d1b442ec64de&t=lonerai-21&tracking_id=lonerai-21" width="300" height="250" scrolling="no" style={{ border: "none" }} sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"></iframe>
            </div>
            <div style={{ padding: '15px' }}>
                {
                    (identifyObjects.map((cva: any, index) => (
                        <IdentifyObject key={index} {...cva} />
                    )))
                }
            </div>
        </div>
    );
};

export default Ocr;