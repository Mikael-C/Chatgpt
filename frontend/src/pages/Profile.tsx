
import { Avatar, Button, Form, Input, Space, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { uploadBytesResumable, getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../firebase';
import { useHistory } from 'react-router';
import { Capacitor } from '@capacitor/core';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase';
import { writeToCreditsCollection } from '../hooks/libs';

const Profile = () => {
    const [name, setName] = useState('');
    const [profileUrl, setProfileUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const history = useHistory();
    const [loading, setLoading] = useState(false);
    const [inviteCode, setInviteCode] = useState('');

    const prefilProfile = (session: any) => {
        if (session.name) {
            setName(session.name);
        }
        if (session.profileUrl) {
            setProfileUrl(session.profileUrl);
        }
        if (localStorage.getItem('invited_by') != null) {
            setInviteCode(localStorage.getItem('invited_by') as string);
        }
    }
    useEffect(() => {
        let session: any = localStorage.getItem('session');
        session = JSON.parse(session);
        if (session == null) {
            signInAnonymously(auth).then(async (credential) => {
                session = JSON.stringify({
                    uid: credential.user.uid,
                    sid: await credential.user.getIdToken(),
                    meta: credential,
                    invite_code: inviteCode
                });
                localStorage.setItem("session", session);
                prefilProfile(session);
            });
        }else{
            prefilProfile(session);
        }

    }, []);
    const handleFileSelect = (e: any) => {
        const file = e.target.files[0];
        setSelectedFile(file);
        setProfileUrl(URL.createObjectURL(file));
    };
    const uploadFileToStorage = async (file: any) => {
        const storageRef = ref(storage, `profile/${new Date().toISOString()}${file.name}`);

        try {
            await uploadBytesResumable(storageRef, file);
            const url = await getDownloadURL(storageRef);
            return url;
        } catch (error) {
            console.error('Error uploading file: ', error);
            throw error;
        }
    };

    const updateProfile = async () => {
        let url = '';
        if (name) {
            setLoading(true);
            if (selectedFile) {
                url = await uploadFileToStorage(selectedFile);
            }
            let session: any = localStorage.getItem('session');
            session = JSON.parse(session);
            session.profileUrl = url == '' ? session.profileUrl : url;
            session.name = name;
            localStorage.setItem('session', JSON.stringify(session));
            setLoading(false);
            if (inviteCode) {
                if (inviteCode == localStorage.getItem('invite_code') as string) {
                    message.error('You cannot invite yourself');
                    return;
                }
                writeToCreditsCollection(inviteCode, 'unclaimed', session.uid);
                localStorage.setItem('invited_by', inviteCode);
            }
            localStorage.setItem('profileSet', '');
            if (localStorage.getItem('subscribed') != null) {
                history.push('/gpt/chat');
            } else {
                history.push('/gpt/subscribe');
            }
        } else {
            message.error('Display Name is required');
        }
    }

    const skip = () => {
        localStorage.clear();
        history.push('/gpt/opensesame');
    }
    return (
        <div style={{ margin: 'auto', padding: '10px', textAlign: 'center' }}>
            <Typography.Title level={3}>Update your profile</Typography.Title>
            <Space align='center' style={{ textAlign: 'start' }}>
                <Form>
                    <Form.Item style={{ textAlign: 'center' }}>
                        <Avatar src={profileUrl} size={100} />
                    </Form.Item>
                    <Form.Item>
                        <label>Choose an image</label>
                        <input type="file" accept="image/*" onChange={handleFileSelect} />
                    </Form.Item>
                    <Form.Item>
                        <Input.Group>
                            <label>Enter your preferred display name (<Typography.Text type="danger">*</Typography.Text>)</label>
                            <Input type='text' placeholder='Display name' value={name} onChange={(e) => setName(e.target.value)}></Input>
                        </Input.Group>
                    </Form.Item>
                    <Form.Item>
                        <Input.Group>
                            <label>Who invited you? </label>
                            <Input type='text' placeholder='Invite code' value={inviteCode} readOnly={localStorage.getItem('invited_by') != null} onChange={(e) => setInviteCode(e.target.value)}></Input>
                        </Input.Group>
                    </Form.Item>
                    <Button type='primary' block onClick={() => updateProfile()} disabled={loading}>Update</Button>
                    <br /><br />
                    <Button block onClick={() => skip()}>Log out</Button>
                </Form>

            </Space>
        </div>
    )
}

export default Profile;