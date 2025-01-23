import { useState, useEffect } from 'react';
import { List, FloatButton, Typography, Divider, message, Card, message as msg, Button, Alert, Breadcrumb, Space, Col, Row, Tag, Progress, Modal, Input, Select, Skeleton } from 'antd';
import {
    AudioFilled,
    FileImageFilled, HomeOutlined,
    TranslationOutlined, CopyOutlined, DeploymentUnitOutlined, DeleteOutlined
} from '@ant-design/icons';
import { collection, serverTimestamp, setDoc, updateDoc, doc, onSnapshot, orderBy, query, where, limit, deleteDoc } from 'firebase/firestore';
import { uploadBytesResumable, getDownloadURL, ref as storeRef } from 'firebase/storage';
import { firestore, storage, functions } from '../firebase';
import { useHistory } from 'react-router';
import { format } from 'date-fns';
import "./IdentifyImageObject.css";
import { Collapse } from 'antd';
import React from 'react';
import AudioUploadModal from '../components/AudioUploadModal';
import { Clipboard } from '@capacitor/clipboard';
import { httpsCallable } from 'firebase/functions';
import { initAds, logAds, interstitial } from '../hooks/ads';
import { Capacitor } from '@capacitor/core';

const { Panel } = Collapse;

const copy = async (text: any) => {
    await Clipboard.write({
        string: text
    });
    message.success('Result copied to clipboard');
};

const SttObject = ({ id, publicUrl, result, status, timestamp, key, gpt, translation, lang }: any) => {

    const translate = async (id: any, lang: any) => {
        try {
            const sttRef = collection(firestore, 'stt');
            await updateDoc(doc(sttRef, id), { translation: '', lang: lang });
            message.success('Sent to AI for translation');
        } catch (error) {
            console.error(error);
            msg.error("Failed to update document");
        }
    }

    const sentSTTToGPT = async (id: any) => {
        console.log(result);
        try {
            const chatRef = collection(firestore, 'stt');
            await updateDoc(doc(chatRef, id), { gpt: {} });
            message.success('Sent to AI for analysis');
        } catch (error) {
            console.error(error);
            msg.error("Failed to send message");
        }

    }
    const del = async () => {
        if (confirm('Are you sure you want to delete')) {
            const documentRef = doc(firestore, 'stt', id);

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

        <Card cover={<audio src={publicUrl} controls />}
            className='identify-objects-card'
            key={key}

            actions={[
                <><Button type="text" onClick={() => sentSTTToGPT(id)} disabled={gpt != null || status == 'new' ? true : false}><DeploymentUnitOutlined />Send result to Gpt</Button></>,
                <><Button type="text" onClick={() => translate(id, lang)} disabled={status == 'new' ? true : false} ><TranslationOutlined />Translate Result</Button></>,
                <><Button type="text" onClick={() => copy(result)}><CopyOutlined />Copy result</Button></>,
                <><Button type="text" danger onClick={() => del()}><DeleteOutlined />Delete</Button></>
            ]}
        >
            <div>
                <Row>
                    <Col span={12}><Tag color={status === "new" ? "blue" : status === "completed" ? "green" : "red"}>{status}</Tag></Col>
                    <Col span={12} ><Space align='end'>{timestamp ? format(timestamp?.toDate(), 'MMM d, yyyy h:mm a') : ''}</Space></Col>
                </Row>
            </div>
            <div style={{ marginTop: '1rem' }}>

            </div>
            <div style={{ marginTop: '1rem' }}>
                <Collapse activeKey={['result', 'translation', 'gpt']}>
                    <Panel header="Result" key="result">
                        <Typography.Paragraph>
                            {status == 'new' ? <Skeleton active /> : result}
                        </Typography.Paragraph>
                    </Panel>
                    <Panel header="Translation" key="translation" style={{ display: translation == null ? 'none' : 'inherit' }}>
                        {translation == null ? <Skeleton active /> : translation}
                    </Panel>
                    <Panel header="GPT" key="gpt" style={{ display: gpt == null ? 'none' : 'block' }}>
                        <Typography.Paragraph>
                            {gpt == null ? <Skeleton active /> : gpt.response.message.content}
                        </Typography.Paragraph>
                    </Panel>

                </Collapse>

            </div>

        </Card>
    )
}

const Translator = () => {
    const [showAudioUploadModal, setShowAudioUploadModal] = useState(false);
    const [type, setType] = useState('image');
    const [identifyObjects, setIdentifyObjects] = useState([]);
    const [working, setWorking] = useState(false);
    const [user, setUser] = useState<any>();
    const history = useHistory();
    const [langs, setLangs] = useState([]);
    const [lang, setLang] = useState('en');
    const [langModal, setLangModal] = useState(false);

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
        //get languages

        const doLang = httpsCallable(functions, "getLanguages");
        doLang().then((data: any) => {
            setLangs(data.data);
        }).catch(e => console.log(e));
        //implement chat
        let session: any;
        if (localStorage.getItem('session')) {
            session = localStorage.getItem('session');
            session = JSON.parse(session);
            setUser(session);
        }

        const chatRef = collection(firestore, 'stt');
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
    }, [lang]);

    const sendMessage = async (mediaUrl: any, publicUrl: any) => {
        try {
            const chatRef = collection(firestore, 'stt');
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
                        ? `${type}/translations/${new Date().toISOString()}.${file.type}`
                        : `${type}/translations/${new Date().toISOString() + '_' + file.name}`
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
        setShowAudioUploadModal(false);
        handleUpload(e);
    }
    return (
        <div className="identify-image-object-container">

            <Divider>
                <Button style={{ margin: '1rem' }} onClick={() => setLangModal(true)}>{lang}</Button>
                <Button style={{ margin: '1rem' }} icon={<AudioFilled />} onClick={() => setShowAudioUploadModal(true)}>Speak</Button>
                <Button style={{ margin: '1rem' }} icon={<HomeOutlined />} onClick={() => history.push('/gpt/chat')}>Home</Button>
            </Divider>

            <FloatButton icon={<AudioFilled />} type="primary" onClick={() => setShowAudioUploadModal(true)}></FloatButton>
            <AudioUploadModal visible={showAudioUploadModal} onCancel={() => setShowAudioUploadModal(false)} onUpload={onUpload} />
            <div style={{ padding: '15px' }}>
                <Alert
                    className='identify-objects-card'
                    description="Use translation service to convert voice messages into text language of your choice."
                    type="info"
                />
                <div style={{ textAlign: 'center', display: Capacitor.isNativePlatform() ? 'none' : 'block', overflow: 'hidden' }}>
                    <iframe src="https://rcm-eu.amazon-adsystem.com/e/cm?o=2&p=13&l=ur1&category=piv&banner=0S18ZPZQADZR3SDJZ602&f=ifr&linkID=080374391480fe440a66729882a25338&t=lonerai-21&tracking_id=lonerai-21" width="468" height="60" scrolling="no" style={{ border: "none;" }} sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"></iframe>
                </div>
                {
                    (identifyObjects.map((cva: any, index) => (
                        <SttObject key={index} {...cva} lang={lang} />
                    )))
                }
            </div>
            <Modal open={langModal} onOk={() => setLangModal(false)} onCancel={() => setLangModal(false)}>
                <Select onChange={(e) => setLang(e)} style={{ width: '100%' }} defaultValue={lang}>
                    {
                        langs.map((l: any) => (
                            <Select.Option value={l.code}>{
                                l.name
                            }</Select.Option>
                        ))
                    }
                </Select>
            </Modal>
        </div>
    );
};

export default Translator;