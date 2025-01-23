import { Divider, Button, Typography, Modal, Form, Input, Select, message, Card } from 'antd';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { HomeOutlined } from '@ant-design/icons';
import "./IdentifyImageObject.css";
import './Trade.css';
import { collection, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { firestore } from '../firebase';
import Countdown from 'antd/es/statistic/Countdown';
import { readSiteSettings } from '../hooks/libs';
export const Trade = () => {
    const history = useHistory();
    const [isReged, setReged] = useState(false);
    const [o, setO] = useState(false);
    const [user, setUser] = useState<any>();
    const [deadline, setDeadline] = useState('');
    useEffect(() => {
        //implement chat
        let session: any;
        session = localStorage.getItem('session');
        session = JSON.parse(session);
        setUser(session);

        if (localStorage.getItem('early_program') != null) {
            setReged(true);
        }

        readSiteSettings().then((settings: any) => {
            setDeadline(new Date(settings?.trade_launch_on?.seconds * 1000).toISOString());
        });
    }, []);
    const handleEarlyAccessRequest = () => {
        setO(true);
    };
    const onFinish = async (values: any) => {
        console.log('Success:', values);
        try {
            const userRef = collection(firestore, 't_user');
            const userDoc = {
                ...values,
                status: 'early',
                profileUrl: user?.profileUrl ? user.profileUrl : null,
                userId: user?.uid,
                timestamp: serverTimestamp(),
            };
            console.log(await setDoc(doc(userRef), userDoc));
            setReged(true);
            localStorage.setItem('early_program', '');
            message.success('🎊 Congratulations you have joined the early access program!!!');
            setO(false);
        } catch (error) {
            console.error(error);
            message.error("Failed to register your interest.");
        }
    };

    const onFinishFailed = (errorInfo: any) => {
        console.log('Failed:', errorInfo);
    };

    return (
        <div className="identify-image-object-container">
            <Divider>
                <Button style={{ margin: '1rem' }} icon={<HomeOutlined />} onClick={() => history.push('/gpt/chat')}>Home</Button>
            </Divider>
            <div className='identify-objects-card' style={{
                color: '#727272',
                fontFamily: 'system-ui, verdana',
                lineHeight: 2,
                padding: '2rem'
            }}>
                <h2>Invest Smarter with AI!</h2>
                <p >
                    Are you eager to take your investment journey to the next level? Be among the first to experience
                    our cutting-edge trading app with GPT and AI-powered expert traders by joining our Early Access program!
                </p>
                <p style={{ textAlign: 'center' }}>
                    <Card>
                        <Countdown title="We launch in" value={deadline} format="DD:HH:mm:ss:SSS" />
                    </Card>
                </p>
                <Typography.Title level={4}>Why join?</Typography.Title>
                <ul className='item-1'>
                    <li>
                        <strong>Exclusive Access to Advanced Features:</strong> As an Early Access member, you'll get
                        to explore and utilize our app's most innovative features before anyone else. Gain a competitive
                        edge with early access to predictive decision-making, risk management tools, and real-time market insights.
                    </li>
                    <li>
                        <strong>Personalized Guidance from Experts:</strong> Our team of expert traders and AI specialists
                        will be on hand to provide personalized guidance and support during the Early Access phase. Benefit
                        from their expertise as they help you navigate the markets and make informed investment decisions.
                    </li>
                    <li>
                        <strong>Priority Customer Support:</strong> Your satisfaction is our priority. Early Access members
                        receive top-tier customer support, ensuring that any questions or concerns are addressed promptly and efficiently.
                    </li>
                    <li>
                        <strong>Enhanced User Experience:</strong> Be a part of shaping the app's future! Your valuable feedback
                        during Early Access will help us fine-tune the user experience and tailor the app to meet your needs better.
                    </li>
                    <li>
                        <strong>Unlock Special Rewards:</strong> As a token of our appreciation for your early commitment,
                        you'll have access to exclusive rewards and promotions that will enhance your trading experience and boost your investment potential.
                    </li>
                </ul>
                <Button type="primary" onClick={handleEarlyAccessRequest} block disabled={isReged}>{isReged ? '🎊 You have already joined' : '🚀 Join Early Access'}</Button>
                <br /><br />
                <i>Disclaimer: Trading involves inherent risks, and past performance does not guarantee future results. While IntelligentTrade aims to provide valuable insights, it does not constitute financial advice. Always conduct thorough research and seek professional guidance before making any investment decisions.</i>
            </div>
            <Modal title="Almost there, please complete the below form" footer={null} open={o} onCancel={() => setO(false)}>
                <Form
                    name="basic"
                    labelCol={{ span: 10 }}
                    wrapperCol={{ span: 16 }}
                    onFinish={onFinish}
                    onFinishFailed={onFinishFailed}>
                    <Form.Item name={'title'} label='What is your title?' rules={[{ required: true, message: 'Please input your title' }]}>
                        <Input placeholder='Title eg Mr, Mrs, Ms etc' />
                    </Form.Item>
                    <Form.Item name={'fullname'} label='What is your fullname?' rules={[{ required: true, message: 'Please input your full name' }]}>
                        <Input placeholder='Full name eg John Smith' />
                    </Form.Item>
                    <Form.Item name={'profession'} label='What is your profession?' rules={[{ required: true, message: 'Please input your profession' }]}>
                        <Input placeholder='Profession eg Pilot, Engineer, etc' />
                    </Form.Item>
                    <Form.Item name={'salary'} label='What is your annual income?' rules={[{ required: true, message: 'Please input your annual income' }]}>
                        <Select defaultValue={'Less than $10,000'} options={[
                            {
                                value: 'Less than $10,000', label: 'Less than $10,000'
                            },
                            {
                                value: '$10,000 - $20,000', label: '$10,000 - $20,000'
                            },
                            {
                                value: '$20,000 - $50,000', label: '$20,000 - $50,000'
                            },
                            {
                                value: '$50,000 - $100,000', label: '$50,000 - $100,000'
                            },
                            {
                                value: 'Above $100,000', label: 'Above $100,000'
                            }
                        ]} />
                    </Form.Item>
                    <Form.Item name={'residence'} label='Country of residence' rules={[{ required: true, message: 'Please input your country of residence' }]}>
                        <Input placeholder='Country eg Mexico, Saudi Arabia, United States, etc' />
                    </Form.Item>

                    <Form.Item name={'capital'} label='Your willing starting capital' rules={[{ required: true, message: 'Please input your starting capital' }]}>
                        <Input placeholder='Starting capital in $' type='number' />
                    </Form.Item>
                    <Button block htmlType='submit' type='primary' disabled={isReged}>Join</Button>
                </Form>
            </Modal>
        </div>
    )
};
