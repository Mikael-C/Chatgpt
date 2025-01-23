import { useState, useEffect } from 'react';
import { List, FloatButton, Typography, Divider, message, Card, message as msg, Button, Breadcrumb, Space, Col, Row, Tag, Progress, Skeleton, Avatar, Modal, Grid, Spin } from 'antd';
import ImageUploadModal from '../components/ImageUploadModal';
import {
    FileImageFilled, DeploymentUnitOutlined, HomeOutlined, DeleteOutlined, LoadingOutlined
} from '@ant-design/icons';
import { collection, serverTimestamp, setDoc, updateDoc, doc, onSnapshot, orderBy, query, where, deleteDoc, getDocs } from 'firebase/firestore';
import { uploadBytesResumable, getDownloadURL, ref as storeRef } from 'firebase/storage';
import { firestore, storage } from '../firebase';
import { useHistory } from 'react-router';
import { format } from 'date-fns';
import "./IdentifyImageObject.css";
import { Collapse } from 'antd';
import React from 'react';
import { initAds, logAds, interstitial } from '../hooks/ads';
import { Capacitor } from '@capacitor/core';
import { invokeSub } from '../hooks/libs';

const { Panel } = Collapse;
const LeaderBoardItem = ({ profileUrl, name, score }: any) => {
    return (
        <div>
            <Row>
                <Col flex={1}><Avatar src={profileUrl} /></Col>
                <Col flex="auto">{name}</Col>
                <Col flex={3}>🏆 {score}</Col>
            </Row >
            <Divider />
        </div >
    )
}
const TriviaObject = ({ key, question, options, onAnswer, response, answer }: any | undefined) => {
    const styles = {
        correct: {
            borderColor: '#63de63'
        },
        wrong: {
            borderColor: '#de6363'
        },
        selected: {
            borderColor: '#4096ff'
        }
    }

    return (

        <Card
            className='identify-objects-card'
            key={key}

        >
            <Card.Meta avatar={<Avatar src='/icon.png' />} title='Gpt' description={question} ></Card.Meta>

            <Space direction='vertical' style={{ width: '100%', marginTop: '10px' }}>
                {
                    options != undefined && options.map((option: any, index: any) => (
                        <Button block type={'default'} style={answer == option ? response == 'correct' ? styles.correct : response == 'incorrect' ? styles.wrong : styles.selected : {}}
                            onClick={e => onAnswer(option)}
                            disabled={answer == null ? false : true}  >{option}

                            {response == 'correct' && answer == option && (
                                <span style={{ marginLeft: '5px' }}>✅</span>
                            )}
                            {response == 'incorrect' && answer == option && (
                                <span style={{ marginLeft: '5px' }}>❌</span>
                            )}
                            {
                                response == null && answer == option && (
                                    <Spin indicator={<LoadingOutlined spin />} />
                                )
                            }
                        </Button>
                    ))
                }
            </Space>
            <div style={{
                textAlign: 'center',
                padding: '1rem'
            }}>
                🪙 {localStorage.getItem('trivia_chances')} remaining
            </div>
        </Card>
    )
}

const Trivia = () => {
    const [triviaObjects, setTriviaObjects] = useState([]);
    const [working, setWorking] = useState(false);
    const [user, setUser] = useState<any>();
    const [score, setScore] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const [showlb, setLB] = useState(false);
    const [rank, setRank] = useState(1000);
    const history = useHistory();
    const [iap, setIap] = useState<CdvPurchase.Store>();
    const product_id = 'new_trivia_credit_100';
    const [open, setOpen] = useState(false);
    const [answer, setAnswer] = useState();
    const [trivia_started, setTriviaStarted] = useState(false);
    const [trivia_id, setTriviaId] = useState('');
    useEffect(() => {
        //load IAP
        loadTokenInApp();

        //init trivia
        if (localStorage.getItem('trivia_id') == null) {
            localStorage.setItem('trivia_id', Math.random().toString());
        }

        if (localStorage.getItem('trivia_started') != null) {
            //setTriviaStarted(true);
        }

        if (localStorage.getItem('trivia_chances') == null) {
            if (localStorage.getItem('subscribed') != null) {
                localStorage.setItem('trivia_chances', '52');
            } else {
                localStorage.setItem('trivia_chances', '12');
            }
        }
        //implement tivia
        let session: any;
        session = localStorage.getItem('session');
        session = JSON.parse(session);
        setUser(session);

        setTriviaId(localStorage.getItem('trivia_id') as string);

        const triviaRef = collection(firestore, 'trivia');
        const q = query(triviaRef, where('triviaId', '==', trivia_id), where('sender', '==', 'gpt'), orderBy('timestamp', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const trivia: any = [];
            let hasWorking = false;
            snapshot.docs.map(async (doc) => {
                trivia.push({ ...doc.data(), id: doc.id });
                if (trivia.status == 'new') {
                    hasWorking = true;
                }
            });

            setTriviaObjects(trivia);
            setScore(trivia[0]?.score);
            console.log(trivia);
        });
        return () => {
            unsubscribe();
        };
    }, [trivia_id]);

    const loadLeaderboard = async () => {
        const leaderBoardRef = collection(firestore, 'leaderboard');
        try {
            const q = await getDocs(query(leaderBoardRef, orderBy('score', 'desc')));
            const leaderboards: any = [];
            let rank = 0;
            q.forEach((doc) => {
                if (doc.exists()) {
                    rank++;
                    leaderboards.push({ ...doc.data(), rank: rank, id: doc.id });
                    if (doc.id === user?.uid) {
                        setRank(rank);
                    }
                }
            });
            setLeaderboard(leaderboards);
        } catch (error) {
            console.error('Error :', error);
        }
    }

    const showLoading = () => {
        const m = Modal.info({
            icon: null,
            closeIcon: null,
            open: working,
            footer: null,
            content: <Space direction='horizontal'><Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} /><Typography.Text>Game loading....</Typography.Text></Space>
        });
        return m;
    }
    const loadTokenInApp = () => {
        invokeSub(() => { }).then((_: CdvPurchase.Store | undefined) => {
            if (_ != undefined) {
                setIap(_);
            }
            //console.log(iap);
        }).catch((e: any) => {
            console.log(e);
        }).finally(() => {

        });
    }
    const buyTokens = () => {
        console.log('Buy trivia tokens');
        //const trivia_chances = localStorage.getItem('tivia_chances') as string;
        //alert(trivia_chances);
        iap?.get(product_id)?.getOffer()?.order().then((result: any) => {
            if (result) {
                message.error("ERROR. Failed to place order. " + result.code + ": " + result.message);
            }
            else {
                message.success("🪙 purchased successfully.");
                localStorage.setItem('trivia_chances', '100');
            }
        }).catch((e) => {
            alert(`Error with buying tokens: ${e.message}`);
        }).finally(() => {
            setOpen(false);
        });
    };
    const show0Token = () => {
        setOpen(true);
        Modal.warning({
            title: 'Run out of trivia tokens 😟',
            content: <div>You have run out of trivia tokens. Click 'buy' to purchase more trivia credits</div>,
            okText: '🪙 Buy',
            onOk: e => buyTokens(),
            closable: true,
        });
        return;
    }
    const play = () => {
        if (checkTokenAvail()) {
            start();
        };
    }

    const reset = () => {
        const trivia_id = Math.random().toString();
        localStorage.setItem('trivia_id', trivia_id);
        setTriviaId(trivia_id);
        play();
    }
    const checkTokenAvail = () => {
        const trivia_chances = localStorage.getItem('trivia_chances') as string;
        if (!(parseInt(trivia_chances) > 0)) {
            show0Token();
            return false;
        } else {
            return true;
        }
    }

    const decToken = () => {
        // a single trivia costs 2 tokens
        const trivia_chances = localStorage.getItem('trivia_chances') as string;
        localStorage.setItem('trivia_chances', (parseInt(trivia_chances) - 2).toString());
    }
    const start = () => {
        localStorage.setItem('trivia_started', '');
        //setTriviaStarted(true);
        sendMessage(true, null);
        setTriviaObjects([]);
        const m = showLoading();
        window.setTimeout(() => {
            m.destroy();
        }, 7000);
    }

    const sendMessage = async (isStart: boolean, trivia: any) => {
        if (!checkTokenAvail()) {
            return;
        }
        const triviaRef = collection(firestore, 'trivia');
        if (isStart) {
            try {
                const newMessage = {
                    status: 'new',
                    profileUrl: user?.profileUrl ? user.profileUrl : null,
                    senderId: user?.uid,
                    triviaId: localStorage.getItem('trivia_id') as string,
                    senderName: user?.name,
                    isStart: true,
                    timestamp: serverTimestamp(),
                    remTokens: localStorage.getItem('trivia_chances')
                };
                await setDoc(doc(triviaRef), newMessage);
            } catch (error) {
                console.error(error);
            }
        } else {
            try {
                console.log(trivia);
                //decrement token
                decToken();
                await updateDoc(doc(triviaRef, trivia.id), { answer: trivia.answer });
                //show loading
            } catch (error) {
                console.error(error);
            }
        }
    };


    return (
        <div className="identify-image-object-container">
            <Divider>
                <Button style={{ margin: '1rem' }} icon={<HomeOutlined />} onClick={() => history.push('/gpt/chat')}>Home</Button>
                <Button style={{ margin: '1rem' }} onClick={e => { loadLeaderboard().finally(() => setLB(true)) }}>LeaderBoard</Button>
                <Button style={{ margin: '1rem' }} disabled={trivia_started} onClick={() => reset()} icon={<span >🎮</span>} >Play</Button>
                <Button style={{ margin: '1rem' }} onClick={() => reset()} icon={<span >🔄</span>} >Reset</Button>
                <Button type='ghost' style={{ margin: '1rem' }} icon={<span >🏆</span>} > {score}</Button>
                {!trivia_started && <FloatButton icon={<span >🎮</span>} type="primary" onClick={() => play()}></FloatButton>}
            </Divider>
            <div style={{ padding: '15px' }}>
                {
                    (triviaObjects.map((trivia: any, index) => (
                        <TriviaObject key={index} {...trivia} onAnswer={(e: any) => { sendMessage(false, { ...trivia, answer: e }); }} />
                    )))
                }
            </div>
            <Modal title="Leaderboard" afterOpenChange={e => loadLeaderboard()} open={showlb} onCancel={e => setLB(false)} footer={null}
            >
                <div style={{ textAlign: 'center' }}>You are currently ranked 🏅{rank}</div>
                <List
                    dataSource={leaderboard}
                    pagination={{
                        defaultPageSize: 5,
                    }}
                    renderItem={(item: any, index: number) => (
                        <List.Item key={item.id} style={{ flexDirection: 'unset' }}>
                            <List.Item.Meta
                                avatar={<Avatar src={item.profileUrl} />}
                                title={item.name}
                                description={`🏅 ${item.rank}`}

                            />
                            <div>🏆 {item.score}</div>
                        </List.Item>
                    )}
                />
            </Modal>
        </div>
    );
};

export default Trivia;