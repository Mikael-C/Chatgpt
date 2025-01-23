import { useState, useEffect } from 'react';
import { List, FloatButton, Typography, Divider, message, Card, message as msg, Button, Breadcrumb, Space, Col, Row, Tag, Progress, Skeleton } from 'antd';
import ImageUploadModal from '../components/ImageUploadModal';
import {
    FileImageFilled, DeploymentUnitOutlined, HomeOutlined, DeleteOutlined
} from '@ant-design/icons';
import { collection, serverTimestamp, setDoc, updateDoc, doc, onSnapshot, orderBy, query, where, deleteDoc } from 'firebase/firestore';
import { uploadBytesResumable, getDownloadURL, ref as storeRef } from 'firebase/storage';
import { firestore, storage } from '../firebase';
import { useHistory } from 'react-router';
import { format } from 'date-fns';
import "./IdentifyImageObject.css";
import { Collapse } from 'antd';
import React from 'react';
import { initAds, logAds, interstitial } from '../hooks/ads';
import { Capacitor } from '@capacitor/core';

const { Panel } = Collapse;
const IdentifyObject = ({ id, publicUrl, result, status, timestamp, key, gpt }: any) => {

    const del = async () => {
        if (confirm('Are you sure you want to delete')) {
            const documentRef = doc(firestore, 'cva', id);

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
            className='identify-objects-card'
            key={key}
            actions={[
                <Button type="text" icon={<DeleteOutlined />} danger onClick={() => del()}>Delete</Button>
            ]}
        >
            <div>
                <Row>
                    <Col span={12}><Tag color={status === "new" ? "blue" : status === "completed" ? "green" : "red"}>{status}</Tag></Col>
                    <Col span={12} ><Space align='end'>{timestamp ? format(timestamp?.toDate(), 'MMM d, yyyy h:mm a') : ''}</Space></Col>
                </Row>
            </div>
            <div style={{ marginTop: '1rem' }}>
                <Collapse activeKey={"result"} >
                    <Panel header="Result" key="result" >
                        <Typography.Paragraph>
                            {status == 'new' ? <Skeleton active /> : (
                                Object.values(result).map((r: any) => (
                                    <React.Fragment key={r.description}>
                                        {r.description}
                                        <Progress percent={r.score * 100} showInfo={false} />
                                    </React.Fragment>
                                ))
                            )}
                        </Typography.Paragraph>
                    </Panel>

                </Collapse>
            </div>

        </Card>
    )
}

const IdentifyImageObject = () => {
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


        const chatRef = collection(firestore, 'cva');
        const q = query(chatRef, where('sessionId', '==', session?.sid), orderBy('timestamp', 'desc'));

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
            const chatRef = collection(firestore, 'cva');
            const newMessage = {
                status: 'new',
                mediaUrl,
                publicUrl,
                profileUrl: user?.profileUrl ? user.profileUrl : null,
                sender: user?.uid,
                sessionId: user?.sid,
                timestamp: serverTimestamp(),
            };
            await setDoc(doc(chatRef), newMessage);
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
                        ? `${type}/cva/${new Date().toISOString()}.${file.type}`
                        : `${type}/cva/${new Date().toISOString() + '_' + file.name}`
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

export default IdentifyImageObject;