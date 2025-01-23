declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

import { useEffect, useState, useRef } from 'react';
import { Clipboard } from '@capacitor/clipboard';
import { App, AppInfo } from '@capacitor/app';
import { Share } from '@capacitor/share';
import { format } from 'date-fns';
//import { Admob, AdmobOptions } from '@awesome-cordova-plugins/admob';
//import { AdMob } from '@awesome-cordova-plugins/admob-plus';

import { Space, Input, Button, Tooltip, Menu, Dropdown, List, Watermark, Col, Row, Modal, Rate, Typography, Alert, Drawer, Tabs, QRCode, Popconfirm, Avatar, Carousel, Divider } from 'antd';
import {
    RedoOutlined,
    PayCircleOutlined,
    DesktopOutlined,
    ProfileOutlined,
    ContactsOutlined,
    FormatPainterOutlined,
    DeleteFilled,
    HistoryOutlined,
    GroupOutlined,
    MoreOutlined,
    HeartOutlined,
    BlockOutlined,
    AndroidOutlined,
    ShareAltOutlined,
    ArrowDownOutlined,
    MoneyCollectOutlined,
    CodeOutlined,
    SendOutlined, PaperClipOutlined, FileImageOutlined, LoginOutlined, MessageFilled,
    FileOutlined, AudioOutlined, DeleteOutlined, GlobalOutlined,
    VideoCameraOutlined,
    ClearOutlined, MessageOutlined, ExportOutlined, PoweroffOutlined, MenuOutlined, CopyOutlined, DownloadOutlined, MailOutlined
} from '@ant-design/icons';
import "./Chat.css";
import ImageUploadModal from '../components/ImageUploadModal';
import VideoUploadModal from '../components/VideoUploadModal';
import AudioUploadModal from '../components/AudioUploadModal';
import FileUploadModal from '../components/FileUploadModal';
import { doc, setDoc, serverTimestamp, collection, onSnapshot, query, orderBy, where, deleteDoc, getDocs, addDoc } from 'firebase/firestore';
import { uploadBytesResumable, getDownloadURL, ref as storeRef } from 'firebase/storage';
import { getString, fetchAndActivate } from 'firebase/remote-config';
import { firestore, storage, remoteConfig, functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { message as msg, Badge, Spin, MenuProps } from 'antd';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useHistory, useLocation } from 'react-router-dom';
import MoreModal from '../components/MoreModal';
import { Capacitor } from '@capacitor/core';
import { initAds, interstitial, logAds, rewardVideo } from '../hooks/ads';
import { generateRandomId, getCredits, hasCredits, invokeSub, isDatePastAMonth, loadStubbornAds, regPush, useCredits } from '../hooks/libs';
import TabPane from 'antd/es/tabs/TabPane';
import { useModelSelector } from '../hooks/useModelSelector';
import { ModelSelector } from '../components/ModelSelector/ModelSelector';
import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 0, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 0, 0, 0);
  }
`;

const ListeningButton = styled(Button)<{ $isListening: boolean }>`
  &.ant-btn {
    animation: ${props => props.$isListening ? pulse : 'none'} 1.5s infinite;
    background-color: ${props => props.$isListening ? '#ffebeb' : 'inherit'};
    border-color: ${props => props.$isListening ? '#ff4d4f' : 'inherit'};
    
    .anticon {
      color: ${props => props.$isListening ? '#ff4d4f' : 'inherit'};
    }
  }
`;

function Chat() {
    const [showImageUploadModal, setShowImageUploadModal] = useState(false);
    const [showVideoUploadModal, setShowVideoUploadModal] = useState(false);
    const [showAudioUploadModal, setShowAudioUploadModal] = useState(false);
    const [showFileUploadModal, setShowFileUploadModal] = useState(false);
    const [showMoreModal, setShowMoreModal] = useState(false);
    const [chats, setChats] = useState<any>([]);
    const [message, setMessage] = useState('');
    const [user, setUser] = useState<any>();
    const [fileList, setFileList] = useState<any>([]);
    const [type, setType] = useState('text');
    const [working, setWorking] = useState(false);
    const [gptTyping, setGptTyping] = useState(false);
    const chatPanelRef = useRef<HTMLDivElement>(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [title, setTitle] = useState('');
    const [chatId, setChatId] = useState('');
    const [chatHistory, setChatHistory] = useState<any>([]);
    const history = useHistory();
    const [chatHistoryOpen, setChatHistoryOpen] = useState(false);
    const [isGroupMode, setIsGroupMode] = useState(false);
    const [showJoin, setShowJoin] = useState(false);
    const [remoteChatId, setRemoteChatId] = useState('');
    const [chatCount, setChatCount] = useState(0);
    const [credits, setCredits] = useState(0);
    const [showInviteCode, setShowInviteCode] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);
    const quickLinks = [
        { prompt: 'What are the key environmental challenges we face today?', title: 'Environmental Challenges' },
        { prompt: 'Discuss the impact of science on our daily lives.', title: 'Science in Daily Life' },
        { prompt: 'Explore the connection between music and emotions.', title: 'Music and Emotions' },
        { prompt: 'Share your favorite lifestyle tips for a balanced and fulfilling life.', title: 'Balanced Lifestyle' },
        { prompt: 'Discuss the influence of art on culture and expression.', title: 'Art and Culture' },
        { prompt: 'Share your luxury travel experiences and recommendations.', title: 'Luxury Travel' },
        { prompt: 'Discuss the intersection of faith and modern life.', title: 'Faith and Modernity' },
        { prompt: 'Explore the latest advancements in technology and their implications.', title: 'Cutting-edge Tech' },
        { prompt: 'Share your views on the future of renewable energy.', title: 'Renewable Energy' },
        { prompt: 'Discuss the impact of social media on global communication.', title: 'Social Media Impact' },
        { prompt: 'Discuss the significance of cultural diversity in today\'s world.', title: 'Cultural Diversity' },
        { prompt: 'Explore the connection between mindfulness and well-being.', title: 'Mindfulness and Wellness' },
        { prompt: 'Discuss recent breakthroughs in medical science.', title: 'Medical Science Breakthroughs' },
        { prompt: 'Share your thoughts on the role of ethics in technological advancement.', title: 'Ethics in Technology' },
        { prompt: 'Discuss the impact of luxury goods on society and individual lifestyles.', title: 'Luxury and Lifestyle' },
        { prompt: 'Explore the relationship between AI and the job market.', title: 'AI and Employment' },
        { prompt: 'Share effective time management skills for increased productivity.', title: 'Time Management Tips' },
        { prompt: 'Recommend books that have had a positive impact on your life.', title: 'Life-changing Books' },
        { prompt: 'Explore the relationship between astrology and personality.', title: 'Astrology and Personality' },
        { prompt: 'Share your thoughts on daily habits for a successful life.', title: 'Daily Success Habits' },
        { prompt: 'Discuss the role of horoscopes in modern culture.', title: 'Horoscopes and Culture' },
        { prompt: 'Share strategies for effective content marketing.', title: 'Content Marketing Tips' },
        { prompt: 'Discuss the impact of technology on personal productivity.', title: 'Tech and Productivity' },
        { prompt: 'Share your favorite time management techniques.', title: 'Time Management Techniques' },
        { prompt: 'Recommend classic novels that everyone should read.', title: 'Classic Novels' },
        { prompt: 'Explore the significance of zodiac signs in different cultures.', title: 'Zodiac Signs Worldwide' },
        { prompt: 'Discuss the benefits of email marketing for businesses.', title: 'Email Marketing Benefits' },
        { prompt: 'Share tips for staying focused and avoiding distractions.', title: 'Focus and Distraction' },
        { prompt: 'Recommend non-fiction books that broaden one\'s perspective.', title: 'Mind-expanding Books' },
        { prompt: 'Explore the validity of horoscopes in predicting outcomes.', title: 'Horoscope Predictions' },
        { prompt: 'Share techniques for effective project management.', title: 'Project Management' },
        { prompt: 'Recommend time tracking tools for better productivity.', title: 'Time Tracking Tools' },
        { prompt: 'Explore the diversity of horoscope interpretations.', title: 'Diverse Horoscope Views' },
        { prompt: 'Share techniques for prioritizing tasks effectively.', title: 'Task Prioritization' },

    ];

    const quickActions = [
        { title: '🎨 Edit an Image', action: 'edit_image' },
        { title: '🖼️ Generate Image', action: 'generate_image' },
        { title: '🎬 Generate Video', action: 'generate_video' },
        { title: '🎥 Generate Video from Image', action: 'generate_video_from_image' },
        { title: '🎮 Edit a Video', action: 'edit_video' },
    ];

    const _location = useLocation();
    /*const admoboptions: AdmobOptions = {
        publisherId: 'ca-app-pub-7045822077342097~6119151130',
        rewardedAdId: 'ca-app-pub-7045822077342097/4044540183',
        bannerAdId: 'ca-app-pub-7045822077342097/4044540183',
        interstitialAdId: 'ca-app-pub-7045822077342097/9268946701',
        autoShowBanner: false,
        autoShowInterstitial: false,
        autoShowRewarded: false
    }*/
    const [rate, setShowRateUs] = useState(false);

    const { isOpen, setIsOpen, providers, loading, selectModel, selectedModel } = useModelSelector({
        type: 'chatbot',
        onSelect: (model) => {
            console.log('Selected Model:', model);
        },
        defaultModel: {
            id: 'gpt-4o',
            name: 'OpenAI GPT-4o',
            type: 'chatbot',
            provider: {
                providerLogoUrl: 'https://firebasestorage.googleapis.com/v0/b/chatgptpp-7d9f2.appspot.com/o/icons%2Fopenai%2Fpng%2Fopenai-logomark.png?alt=media&token=6b39a1d6-3094-4680-a3b2-eae31e9db2ad',
                providerName: '',
                models: []
            }
        }
    });

    useEffect(() => {

        if (_location.state) {
            const _state: any = _location.state as any;
            setMessage(_state?.prompt);
            localStorage.setItem('chatId', genChatId());
        }
        regPush();

        /*if (localStorage.getItem('credit_msg') == null) {
            Modal.info({
                title: '🛠️ Feature update',
                content: <p>👋 Hi there! We hope you're enjoying our app! To make sure we can continue providing this AI chat feature for free, we've introduced a credit system. You'll have 3 credits to send messages to our chatbot – each message costs 1 credit. But here's some exciting news – you can earn free credits! Simply share your invite code with friends, and when they register using it, you both get bonus credits! It's a win-win – they join the fun, and you earn extra chatting power. Thank you for understanding, and we appreciate your support! Happy chatting! 😊🤖🚀</p>,
                afterClose: () => { localStorage.setItem('credit_msg', '') }
            });
        }*/

        loadStubbornAds();

        //setCredits(getCredits());

        try {
            initAds(logAds).then(() => { }).catch((e) => logAds(e.message));
        }
        catch (e) {
            console.log(e);
        }

        if (localStorage.getItem('session') != null) {
            let session: any = localStorage.getItem('session');
            session = JSON.parse(session);
            setUser(session);
            let chatId: any = localStorage.getItem('chatId');
            if (!chatId) {
                chatId = genChatId();
            }
            setChatId(chatId);
            const chatRef = collection(firestore, 'chats');
            const q = query(chatRef, where('chatId', '==', chatId), orderBy('timestamp', 'asc'));

            loadChatHistory();
            const unsubscribe = onSnapshot(q, (snapshot) => {
                console.log(chatId);
                setGptTyping(false);

                const messages: any = [];
                snapshot.docs.map(async (doc) => {
                    if ((doc.data().status === 'new' || doc.data().status === 'processing')) {
                        setGptTyping(true);
                    }
                    messages.push({ ...doc.data(), id: doc.id });
                });

                /* if (chatPanelRef.current) {
                     chatPanelRef.current.scrollTo(0, chatPanelRef.current.scrollHeight);
                 }*/
                setChats(messages);
            });
            return () => {
                unsubscribe();
            };
        }

    }, [fileList, working, window.innerWidth, chatId]);

    const clearFileList = () => {
        setFileList([]);
    }

    const clearChatBox = () => {
        setMessage('');
    }

    const clearChats = async () => {
        if (window.confirm('Are you sure you want to clear this chat?')) {
            await deleteMessages()
            setChats([]);
            msg.warning("Chat cleared");
        }
    }

    async function deleteMessages(chatId: any = null) {
        const chatRef = collection(firestore, 'chats');
        const q = query(chatRef, where('chatId', '==', chatId));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            deleteDoc(doc.ref).then(() => {
                //console.log("Document successfully deleted!");
            }).catch((error) => {
                //console.error("Error removing document: ", error);
            });
        });
    }

    const exportChats = () => {
        if (chats.length === 0) {
            msg.error("No chats to export");
            return
        }
        const doc = new jsPDF();

        // Define the table columns
        const columns = [
            { header: 'Sender', dataKey: 'sender' },
            { header: 'Message', dataKey: 'message' },
            { header: 'Timestamp', dataKey: 'timestamp' },
        ];

        // Extract the chat data
        const data = chats.map((chat: any) => ({
            sender: chat.sender !== "gpt" ? "You" : "GPT",
            message: chat.message,
            timestamp: chat.timestamp ? format(chat.timestamp?.toDate(), 'MMM d, yyyy h:mm a') : '',
        }));

        // Create the PDF table


        (doc as any).autoTable(columns, data);

        // Download the PDF
        doc.save('chat.pdf');
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
            case 'remove_ads':
                history.push('/gpt/subscribe');
            default:
                break;
        }
    };

    const sendMessage = async (type: any, message: any, mediaUrl: any, publicUrl: any) => {

        try {
            let app_info: AppInfo = {
                build: '',
                id: '',
                name: '',
                version: ''
            };
            if (Capacitor.isNativePlatform()) {
                app_info = await App.getInfo();
            } else {
                app_info = {
                    version: '1.5.3',
                    id: '',
                    name: '',
                    build: '1.5.3'
                }
            }
            const chatRef = collection(firestore, 'chats');
            const newMessage = {
                status: 'new',
                type,
                message,
                mediaUrl,
                publicUrl,
                profileUrl: user?.profileUrl ? user.profileUrl : null,
                sender: user?.uid,
                sessionId: user?.sid,
                senderName: user?.name,
                timestamp: serverTimestamp(),
                chatId,
                model: selectedModel,
                version: app_info?.version != null ? app_info?.version : app_info?.build != null ? app_info?.build : ''
            };
            const result = await setDoc(doc(chatRef), newMessage);
            console.log(result);
            clearChatBox();
        } catch (error) {
            console.error(error);
            msg.error("Failed to send message");
        } finally {
            interstitial();
        }
    };
    const regenerateChat = async (chat: any) => {
    }
    const handleUpload = () => {
        if (localStorage.getItem('subscribed') == null) {
            msg.error("Subscribe to send unlimited chats");
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
                        msg.success('Upload successful');
                        getDownloadURL(storeRef(storage, storagePaths[0])).then((resolvedPublicUrl) => {
                            sendMessage(type, message, mediaUrls[0], resolvedPublicUrl);
                            //useCredits();
                            //setCredits(getCredits());
                        });
                    });
                })
                .catch((error) => {
                    console.error(error);
                    msg.error('Upload failed');
                })
                .finally(() => {
                    setWorking(false);
                    setFileList([]);
                });
        } else {
            sendMessage("text", message, null, null);
            setWorking(false);
            //useCredits();
            //6setCredits(getCredits());
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
                    <Button icon={<PaperClipOutlined />} />
                </Badge>
            );
        } else {
            return (
                <Button icon={<PaperClipOutlined />} />
            );
        }

    }


    const items: MenuProps['items'] = [
        {
            label: 'Discover',
            key: 'discover',
            icon: <GlobalOutlined />,
        },
        {
            label: 'Generate art',
            key: 'generate_art',
            icon: <FormatPainterOutlined />,
        },
        {
            label: 'Generate video',
            key: 'generate_video',
            icon: <VideoCameraOutlined />,
        },
        {
            label: 'Play Trivia',
            key: 'play_trivia',
            icon: <span>🎮</span>
        },
        {
            label: 'Trade with GPT',
            key: 'trade',
            style: { display: 'none' },
            icon: <MoneyCollectOutlined />,
        },
        {
            label: 'New Chat',
            key: 'new_chat',
            icon: <MessageOutlined />,
        },
        {
            label: 'Join/Share Chat',
            key: 'group_chat',
            icon: <GroupOutlined />,
        },
        {
            label: 'Chat History',
            key: 'chat_history',
            icon: <HistoryOutlined />,
        },
        {
            label: 'Export Chat',
            key: 'export_chat',
            icon: <ExportOutlined />
        },
        {
            label: 'Subscribe',
            key: 'remove_ads',
            disabled: localStorage.getItem('subscribed') == null || localStorage.getItem('subscribed') == undefined ? false : true,
            icon: <PayCircleOutlined />
        },
        {
            label: 'Rate your experience',
            key: 'rate_us',
            icon: <HeartOutlined />
        },
        {
            label: 'Show invite code',
            key: 'invite_code',
            icon: <ContactsOutlined />,
            style: { display: 'none' }
        },
        {
            label: 'Update profile',
            key: 'profile',
            icon: <ProfileOutlined />
        },
        {
            label: 'Log out',
            key: 'log_out',
            icon: <PoweroffOutlined />
        },
    ];

    const downloadApp = () => {
        window.open('https://play.google.com/store/apps/details?id=com.lonerinc.gptpp', '_blank');
    };

    const visitDesktop = () => {
        window.open('https://lonerinc.com/');
    }

    const handleMainMenuClick = (e: any) => {
        switch (e.key) {
            case 'discover':
                history.push('/gpt/feeds');
                break;
            case 'generate_art':
                localStorage.getItem('subscribed') != null ? history.push('/gpt/art') : (() => { msg.error('Only subscribed users can use this feature'); history.push('/gpt/subscribe') })();
                break;
            case 'generate_video':
                localStorage.getItem('subscribed') != null ? history.push('/gpt/video') : (() => { msg.error('Only subscribed users can use this feature'); history.push('/gpt/subscribe') })();
                break;
            case 'play_trivia':
                history.push('/gpt/trivia');
                break;
            case 'group_chat':
                setShowJoin(true);
                break;
            case 'new_chat':
                createNewChat();
                break;
            case 'clear_chat':
                clearChats();
                break;
            case 'chat_history':
                loadChatHistory();
                setChatHistoryOpen(true);
                break;
            case 'export_chat':
                exportChats();
                break;
            case 'download_app':
                downloadApp();
                break;
            case 'visit_web':
                visitDesktop();
                break;
            case 'mail_developer':
                mailDevelop();
                break;
            case 'trade':
                history.push('/gpt/trade');
                break;
            case 'rate_us':
                setShowRateUs(true);
                break;
            case 'remove_ads':
                history.push('/gpt/subscribe');
                break;
            case 'invite_code':
                Modal.confirm({
                    title: 'Invite Code',
                    content: <><Typography.Paragraph>Earn credits when you invite your friends with your invite code</Typography.Paragraph><Typography.Title>{localStorage.getItem('invite_code')}</Typography.Title></>,
                    okText: 'Copy Code',
                    open: showInviteCode,
                    onOk: () => {
                        Clipboard.write({
                            string: localStorage.getItem('invite_code') as string
                        });
                        setShowInviteCode(false);
                        msg.success('Invite code copied successfully');
                    }
                });
                break;
            case 'profile':
                history.push('/gpt/profile');
                break;
            case 'log_out':
                logOut();
                break;
        }
    }

    const menuProps = {
        items,
        onClick: handleMainMenuClick,
    };

    const copyChat = async (chat: any) => {
        if (chat.message) {
            await Clipboard.write({
                string: chat.message,
            });
            msg.success('Chat copied to clipboard');
        }
    }

    const downloadChat = (chat: any) => {
        if (chat.publicUrl) {
            window.open(chat.publicUrl, '_blank');
        }
    }

    const mailDevelop = async () => {
        await fetchAndActivate(remoteConfig);
        window.open(`mailto: ${getString(remoteConfig, 'developer_email')}`);
    }

    const rateUs = async () => {
        const hasRated: any = window.localStorage.getItem('rate_us');
        const chat_count: any = window.localStorage.getItem('chat_counts');
        //await fetchAndActivate(remoteConfig);

        //console.log('here 2',getBoolean(remoteConfig, 'rate_us_2'), getNumber(remoteConfig, 'chat_count'), JSON.parse(hasRated));
        if (chat_count >= 50) {
            if (!JSON.parse(hasRated)) {
                setShowRateUs(true);
            }
        }
    }

    const handleRate = () => {
        console.log(rating);
        window.localStorage.setItem('rate_us', JSON.stringify(true));
        const doRateUs = httpsCallable(functions, "rateUs");
        doRateUs({
            user: user?.uid,
            rate: rating,
            comment: comment
        }).then(() => {
        }).catch((err) => console.log(err)).finally(() => {
            setShowRateUs(false);
            msg.success("Thank you for rating your experience!");
        });
        //
    }

    const cancelRate = () => {
        window.localStorage.setItem('rate_us', JSON.stringify(true));
        msg.error("😞 Rating cancelled!");
        setShowRateUs(false);
    }

    const logOut = () => {
        localStorage.clear();
        window.location.replace("/");
    }

    const scrollToHeight = () => {
        if (chatPanelRef.current) {
            chatPanelRef.current.scrollTo(0, chatPanelRef.current.scrollHeight);
        }
    }

    const shareApp = async () => {
        if (await Share.canShare()) {
            Share.share({
                title: 'Introducing GPT++ - The Chatbot that Can Analyze Images, Videos, Audio, and Files!',
                url: window.location.origin,
                text: 'With GPT++, you can analyze and process a wide variety of media types, from images and videos to audio recordings and files. Our advanced AI technology enables us to understand and interpret natural language input from users, providing accurate and personalized responses to their queries. Try GPT++ today and experience the power of conversational AI!'
            })
        }
    }

    const showRewardAd = () => {
        try {
            initAds(logAds).then(() => rewardVideo()).catch((e) => logAds(e.message));
        }
        catch (e) {
            console.log(e);
        }
    }

    const createNewChat = async () => {
        saveChat(true);
    }

    const saveChat = async (is_new = false, should_gen = true) => {
        if (!(chats.length > 0)) {
            return;
        }
        const h = chatHistory.find((e: any) => e.id === chatId);
        if (!is_new) {
            if (h) {
                return;
            }

        }
        else if (h) {
            genChatId();
            return;
        }
        const title = prompt('Save current chat as');
        if (title == null) {
            return;
        }
        try {
            const chatHistoryRef = collection(firestore, 'chat_history');
            const newChat = {
                id: localStorage.getItem('chatId'),
                title: title != null ? title : localStorage.getItem('chatId'),
                profileUrl: user?.profileUrl ? user.profileUrl : null,
                sender: user?.uid,
                sessionId: user?.sid,
                timestamp: serverTimestamp(),
            };
            await setDoc(doc(chatHistoryRef), newChat);
            if (should_gen) {
                genChatId();
            }
        } catch (error) {
            console.error(error);
            msg.error("Failed to create new chat");
        }

    }

    const genChatId = () => {
        const chatId = generateRandomId(20);
        setChatId(chatId);
        localStorage.setItem('chatId', chatId);
        return chatId;
    }

    const loadChatHistory = async () => {
        try {
            const querySnapshot = await getDocs(
                query(collection(firestore, 'chat_history'), where('sender', '==', user?.uid), orderBy('timestamp', 'desc')),
            );
            const fetchedDocuments: any = [];
            querySnapshot.forEach((doc) => {
                if (doc.exists()) {
                    fetchedDocuments.push({ ...doc.data(), docId: doc.id });
                }
            });

            setChatHistory(fetchedDocuments);
        } catch (error) {
            console.error('Error retrieving documents: ', error);
        }
    };


    const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.lonerinc.gptpp';

    const chat_btn_style = { textAlign: 'center' };

    const postChat = async (chat: any) => {
        if (confirm("Are you sure you want to post this chat message publicly?")) {
            try {
                const gpt: any = [];
                // Fetch documents from 'chats' collection and populate 'gpt' array with their IDs
                const chatsQuery = query(collection(firestore, 'chats'), where('sender', '==', 'gpt'), where('replyId', '==', chat.id));
                const chatSnapshots = await getDocs(chatsQuery);
                chatSnapshots.forEach((doc) => {
                    gpt.push({ ...doc.data(), id: doc.id });
                });
                const feedData = {
                    ...chat,
                    gpt: gpt,
                    likes: 0,
                    comments: 0,
                    shares: 0,
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
                console.log("Chat copied to feeds successfully");
                history.push('/gpt/feeds');
            } catch (error) {
                console.error("Error copying chat to feeds:", error);
            }
        }
    }

    const deleteChatHistory = (chat: any) => {
        if (confirm('Are you sure you want to delete chat history?')) {
            //deleteMessages(chat.id);
            const chatHistoryRef = doc(firestore, 'chat_history', chat.docId);
            try {
                deleteDoc(chatHistoryRef);
                loadChatHistory();
            } catch (err) {
                console.error(err);
            }
        }
        if (chat.id === chatId) {
            genChatId();
        }
    }

    const tryJoinChat = () => {
        if (remoteChatId === chatId) {
            msg.warning('Already joined chat');
            return;
        }
        if (remoteChatId) {
            saveChat();
            localStorage.setItem('chatId', remoteChatId);
            setChatId(remoteChatId);
            setRemoteChatId('');
            setShowJoin(false);
        } else {
            msg.error('Chat ID cannot be empty')
        }
    }

    const switchChatHistory = (item: any) => {
        saveChat(false, false);
        setChatHistoryOpen(false);
        setChatId(item.id);
        localStorage.setItem('chatId', item.id);
    }
    const startQuickLink = (e: any) => {
        setMessage(e.prompt);
    };

    const initSpeechRecognition = () => {
        // Check if speech recognition is supported
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            msg.error("Speech recognition is not supported in this browser");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US'; // You can make this configurable

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
                .map((result: any) => result[0])
                .map(result => result.transcript)
                .join('');

            setMessage(prevMessage => prevMessage + ' ' + transcript);
        };

        recognition.onerror = (event: any) => {
            console.error(event.error);
            setIsListening(false);
            msg.error("Error occurred in speech recognition");
        };

        setRecognition(recognition);
    };

    const toggleListening = () => {
        if (!recognition) {
            initSpeechRecognition();
            return;
        }

        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    };

    return (
        <div className='main-box'>
            <div className='menu-bar'>
                <div className='left-section'>
                    <Dropdown menu={menuProps}>
                        <Button icon={<MenuOutlined />}></Button>
                    </Dropdown>
                    <Button onClick={(e) => setShowMoreModal(true)} icon={<MoreOutlined />}>
                        <span style={{ display: Capacitor.isNativePlatform() || (window.innerWidth <= 768) ? 'none' : 'inherit' }}>More from LonerAI</span>
                    </Button>
                    <Button style={{ display: Capacitor.isNativePlatform() ? 'none' : 'initial' }} icon={<AndroidOutlined />} color='#4096ff' href={PLAY_STORE_URL}>
                        <span style={{ display: Capacitor.isNativePlatform() || (window.innerWidth <= 768) ? 'none' : 'inherit' }}>Download App</span>
                    </Button>
                    <Button icon={<ShareAltOutlined />} onClick={shareApp}></Button>

                </div>

                <div className='right-section'>
                    {/* Model Selection Button */}
                    <Button onClick={() => setIsOpen(true)} style={{ backgroundColor: 'white', borderRadius: '50px' }}>
                        {selectedModel ? (
                            <>
                                <Avatar src={selectedModel.provider?.providerLogoUrl} size="small" className="avatar" />
                                <span>{selectedModel.id}</span>
                            </>
                        ) : (
                            <span>Select Model</span>
                        )}
                    </Button>
                </div>
            </div>

            {/* Model Selector Modal */}
            <ModelSelector
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                providers={providers}
                loading={loading}
                onSelect={(model) => {
                    selectModel(model);
                }}
            />

            <div className='chat-panel-holder'>
                <Alert
                    style={{ marginBottom: '20px', marginTop: '20px', display: Capacitor.isNativePlatform() ? 'none' : 'none' }}
                    message="Go mobile with our free app!"
                    showIcon
                    description="Download now for a seamless experience! App is free to download!"
                    type="info"
                    action={
                        <Button size="small" color='dark' href={PLAY_STORE_URL}>
                            Download
                        </Button>
                    }
                />
                <Alert
                    style={{ marginBottom: '20px', marginTop: '20px', display: Capacitor.isNativePlatform() && (localStorage.getItem('subscribed') == null || localStorage.getItem('subscribed') == undefined) ? 'none' : 'none' }}
                    message="Go Ad-Free: Elevate Your Chat Experience"
                    showIcon
                    description="Ditch the ads and enjoy uninterrupted conversations. Subscribe now to remove ads and enhance your chat sessions. "
                    type="info"
                    action={
                        <Button size="small" color='dark' onClick={() => history.push('/gpt/subscribe')}>
                            Subscribe
                        </Button>
                    }
                />
                <div className="chat-panel" ref={chatPanelRef}>
                    <div style={{ display: chats.length == 0 ? 'inherit' : 'none' }}>
                        <Divider>Quick Actions</Divider>
                        <Space size={[8, 16]} wrap>
                            {quickActions.map((action) => (
                                <Button
                                    key={action.action}
                                    type="primary"
                                    onClick={() => history.push(`/gpt/${action.action}`)}
                                >
                                    {action.title}
                                </Button>
                            ))}
                        </Space>

                        <Divider>Suggested Prompts</Divider>
                        <Space size={[8, 16]} wrap>
                            {quickLinks.map((link) => (
                                <Button
                                    key={link.title}
                                    type="dashed"
                                    onClick={e => startQuickLink(link)}
                                >
                                    {link.title}
                                </Button>
                            ))}
                        </Space>
                    </div>
                    <List

                        itemLayout="vertical"
                        size="large"
                        locale={{ emptyText: "No chats yet" }}
                        dataSource={chats}
                        style={{ display: chats.length == 0 ? 'none' : 'inherit' }}
                        renderItem={(chat: any, index: any) => {

                            if (chat.isAd) {
                                return (<Badge.Ribbon text="ad"><List.Item
                                    className={chat.status === 'error' ? 'list-item-error' : index % 2 === 0 ? 'list-item-even' : 'list-item-odd'}
                                    key={chat.id}

                                >
                                    <List.Item.Meta
                                        title={chat.ad.title}
                                        avatar={<Avatar src='/icon.png' size={32} />}
                                        description={chat.timestamp ? format(chat.timestamp?.toDate(), 'MMM d, yyyy h:mm a') : ''}
                                    />
                                    {
                                        chat.type === 'image' ? (
                                            <img src={chat.ad.url} style={{ maxWidth: "250px" }} />
                                        ) : (
                                            chat.type === 'video' ? (
                                                <video src={chat.ad.url} controls />
                                            ) : (
                                                chat.type === 'carousel' ? (
                                                    <Carousel
                                                        draggable={true} arrows={true} >
                                                        {
                                                            chat.ad?.assets.map((asset: any, index: any) => {
                                                                return (<div key={index}>
                                                                    <img src={asset.url} />
                                                                </div>)
                                                            })
                                                        }
                                                    </Carousel>
                                                ) : <></>
                                            )
                                        )
                                    }
                                    <ReactMarkdown className='md-box'>{chat.ad.description}</ReactMarkdown>
                                </List.Item></Badge.Ribbon>
                                )
                            }
                            else {
                                return (<List.Item
                                    className={chat.status === 'error' ? 'list-item-error' : chat.sender === 'gpt' ? 'list-item-even' : 'list-item-odd'}
                                    key={chat.id}
                                    actions={chat.sender === 'gpt' ? [
                                        <Button onClick={(e) => regenerateChat(chat)}><RedoOutlined /></Button>,
                                        <Button onClick={(e) => copyChat(chat)}><CopyOutlined /></Button>,
                                        <Button onClick={(e) => Share.share({
                                            text: chat.message,
                                            dialogTitle: 'Share Message',
                                            title: '📤 Share AI generated content'
                                        })}><ShareAltOutlined /> </Button>
                                    ] : [
                                        <Button onClick={(e) => copyChat(chat)}><CopyOutlined /></Button>,
                                        <Button style={{ display: chat.sender === 'gpt' ? 'none' : chat.sender === user.uid ? 'inherit' : 'none' }}
                                            onClick={(e) => postChat(chat)}><ShareAltOutlined /></Button>
                                    ]}
                                    extra={
                                        (
                                            chat.type === 'image' ? (
                                                <img src={chat.publicUrl} style={{ maxWidth: "250px" }} />
                                            ) : (
                                                chat.type === 'video' ? (
                                                    <video src={chat.publicUrl} controls />
                                                ) : (
                                                    chat.type === 'audio' ? (
                                                        <audio src={chat.publicUrl} controls />
                                                    ) :
                                                        (
                                                            chat.type === 'file' ? (
                                                                <Watermark content="Document" >
                                                                    <FileOutlined />
                                                                </Watermark>
                                                            ) : (
                                                                <></>
                                                            )
                                                        )
                                                )
                                            )
                                        )
                                    }
                                >
                                    <List.Item.Meta
                                        title={chat.sender !== "gpt" ? chat.sender !== user.uid ? chat.senderName : "You" : "AI"}
                                        avatar={chat.sender !== 'gpt' ? (<Avatar src={chat.profileUrl ? chat.profileUrl : '/avatar.jpg'} size={32} />) : (<Avatar src={'/icon.png'} size={32} />)}
                                        description={<>
                                            {
                                                chat.timestamp ? format(chat.timestamp?.toDate(), 'MMM d, yyyy h:mm a') : ''
                                            }

                                            &nbsp;{chat.model && chat.sender === "gpt" ? 'via' : ''} {
                                                chat.model?.provider?.providerLogoUrl && chat.sender === "gpt" ? <Avatar src={chat.model.provider.providerLogoUrl} size="small" /> : ''
                                            }
                                            {
                                                chat.sender === "gpt" ? chat.model?.id : ''
                                            }</>}
                                    />
                                    <ReactMarkdown className='md-box'>{chat.message}</ReactMarkdown>
                                </List.Item>
                                )
                            }
                        }

                        } >
                    </List>
                    <Spin style={{ display: gptTyping === true ? 'inherit' : 'none', padding: '2rem' }} tip='gpt is typing....' />

                    <div style={{ textAlign: 'center', display: 'none', padding: '5px' }}>
                        <iframe src="https://rcm-eu.amazon-adsystem.com/e/cm?o=2&p=12&l=ur1&category=piv&banner=1W89G1DNPNEYJHQBWMR2&f=ifr&linkID=a867cb31df6e0c4ae9f1d1b442ec64de&t=lonerai-21&tracking_id=lonerai-21" width="300" height="250" scrolling="no" style={{ border: "none" }} sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"></iframe>
                    </div>


                    <div className="float-btn">
                        <Button shape='circle' icon={<ArrowDownOutlined />} onClick={(_e) => scrollToHeight()}></Button>
                    </div>
                </div>
            </div>
            <div className="chat-accessories">

                <div className="chat-accessories-box">
                    <Input.TextArea
                        showCount={false}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        size="large"
                        placeholder="Type message here"
                        className="chat-input"
                        autoSize={{ minRows: 1, maxRows: 4 }}
                    />
                    <div className="button-group">
                        <Dropdown overlay={menu} placement="topRight">
                            {renderAttachButton()}
                        </Dropdown>
                        <Tooltip title={isListening ? "Stop listening" : "Start voice input"}>
                            <ListeningButton
                                icon={<AudioOutlined />}
                                onClick={toggleListening}
                                $isListening={isListening}
                            />
                        </Tooltip>
                        <Tooltip title="send">
                            <Button
                                type="primary"
                                shape="circle"
                                icon={<SendOutlined style={{ fontSize: '14px', color: '#fff' }} />}
                                onClick={() => handleUpload()}
                                disabled={working || message.length == 0}
                                className="send-button"
                            />
                        </Tooltip>
                    </div>
                </div>
                <div className="chat-message-disclaimer">
                    Messages are generated by AI and may be inaccurate or inappropriate.
                </div>
            </div>
            <MoreModal visible={showMoreModal} onCancel={() => setShowMoreModal(false)} />
            {showImageUploadModal && <ImageUploadModal visible={showImageUploadModal} onCancel={() => setShowImageUploadModal(false)} onUpload={(e: any) => { setFileList(e); setType('image'); setShowImageUploadModal(false); }} />}
            {showVideoUploadModal && <VideoUploadModal visible={showVideoUploadModal} onCancel={() => setShowVideoUploadModal(false)} onUpload={(e: any) => { setFileList(e); setType('video'); setShowVideoUploadModal(false); }} />}
            {showAudioUploadModal && <AudioUploadModal visible={showAudioUploadModal} onCancel={() => setShowAudioUploadModal(false)} onUpload={(e: any) => { setFileList(e); setType('audio'); setShowAudioUploadModal(false); }} />}
            {showFileUploadModal && <FileUploadModal visible={showFileUploadModal} onCancel={() => setShowFileUploadModal(false)} onUpload={(e: any) => { setFileList(e); setType('file'); setShowFileUploadModal(false); }} />}
            <Modal open={rate} cancelText="Not interested" okText="Submit" onCancel={() => cancelRate()} onOk={() => handleRate()}>
                <Space direction='vertical'>
                    <Typography.Text>Please rate your experience so far</Typography.Text>
                    <Rate character={<HeartOutlined />} allowHalf value={rating} onChange={(e: any) => setRating(e)} />
                    <Typography.Text>Any features, bugs, complaints we should know about?</Typography.Text>
                    <Input.TextArea rows={5} value={comment} onChange={(e) => setComment(e.target.value)} style={{ width: '100%' }} />
                </Space>
            </Modal>
            <Modal open={false} >
                <Space direction='vertical'>
                    <Typography.Text>Title</Typography.Text>
                    <Input />
                </Space>
            </Modal>

            <Modal open={chatHistoryOpen} footer={null} title="Chat History" closable={true} onCancel={() => setChatHistoryOpen(false)} afterClose={async () => loadChatHistory()}>
                <List
                    pagination={{
                        align: 'center',
                        size: 'small',
                        pageSize: 5
                    }}
                    dataSource={chatHistory}
                    renderItem={(item: any) => (
                        <List.Item actions={[
                            <DeleteFilled onClick={() => deleteChatHistory(item)} />,
                        ]} style={{ cursor: 'pointer', flexDirection: 'unset' }}>
                            <List.Item.Meta
                                title={<span onClick={() => switchChatHistory(item)}>{item.title}</span>}>
                            </List.Item.Meta>
                        </List.Item>
                    )}
                />
            </Modal>
            <Modal open={showJoin} title="Join/Share chat" onCancel={() => setShowJoin(false)} footer={null}>
                <i>Connect to a group chat or share current chat with others</i>
                <Tabs defaultActiveKey="1" >
                    <TabPane tab="Share" key="1">
                        <Space direction='vertical' align='center' style={{ width: '100%' }}>
                            <QRCode
                                value={chatId}
                                icon="./icon.png"
                            />
                            <Input
                                placeholder="-"
                                maxLength={60}
                                value={chatId}
                                readOnly
                            />
                        </Space>
                    </TabPane>
                    <TabPane tab="Join" key="2">
                        <Space direction='vertical' align='center' style={{ width: '100%' }}>
                            <Typography.Text>Enter chat ID of chat you wish to join</Typography.Text>
                            <Input placeholder='Enter chat Id' value={remoteChatId} onChange={(e) => setRemoteChatId(e.target.value)}></Input>
                            <Button type="primary" onClick={() => tryJoinChat()}>Join</Button>
                        </Space>
                    </TabPane>
                </Tabs>
            </Modal>
        </div>
    );
}

export default Chat;
