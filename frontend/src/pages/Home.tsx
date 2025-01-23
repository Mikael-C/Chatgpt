import 'firebaseui/dist/firebaseui.css';
import { useEffect, useState } from 'react';
import { signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth as firebaseAuth } from 'firebaseui';
import LogoHeader from '../components/LogoHeader';
import { auth, firestore, messaging } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { useHistory } from 'react-router-dom';
import { Spin, Space, Typography, Button, Divider, message, Input, Form, Card } from 'antd';
import { Capacitor } from '@capacitor/core';
import { collection, doc, setDoc } from 'firebase/firestore';
import { banner, initAds, logAds } from '../hooks/ads';

function Home() {
  const history = useHistory();
  const vapidKey = 'BE4UKOjtoL7-gItYBpmcPUCziL9fqtn7BntpD4ZSfBAxhZ_wZwiNHMZV1kUI9YOkqdz8QngHiPArl3nJ6XJHl5A';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userExists, setUserExists] = useState(true);
  const [cpassword, setCPassword] = useState('');
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const regPush = async () => {
    if (!localStorage.getItem("fcm_token")) {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('Notification permission granted.');
        } else {
          console.log("Unable to get permission", permission);
        }
      });
      getToken(messaging, { vapidKey: vapidKey }).then(async (currentToken) => {
        if (currentToken) {
          // Send the token to your server and update the UI if necessary
          // ...
          const tokenRef = collection(firestore, 'tokens');
          await setDoc(doc(tokenRef), {
            id: currentToken
          });
          localStorage.setItem("fcm_token", currentToken);
        } else {
          // Show permission request UI
          console.log('No registration token available. Request permission to generate one.');

          // ...
        }
      }).catch((err) => {
        console.log('An error occurred while retrieving token. ', err);
        // ...
      });
    }
  }
  const skip = () => {
    const profileSet = localStorage.getItem('profileSet');
    if (!profileSet) {
      history.push('/gpt/profile');
    } else {
      history.push('/gpt/chat');
    }
  }

  useEffect(() => {

    regPush();

   

  }, []);

  return (
    <div style={{ height: "100vh", overflowY: "scroll" }}>

      <div style={{ textAlign: 'center', display: Capacitor.isNativePlatform() ? 'none' : 'block', overflow: 'hidden' }}>
        <iframe src="https://rcm-eu.amazon-adsystem.com/e/cm?o=2&p=13&l=ur1&category=piv&banner=0S18ZPZQADZR3SDJZ602&f=ifr&linkID=080374391480fe440a66729882a25338&t=lonerai-21&tracking_id=lonerai-21" width="468" height="60" scrolling="no" style={{ border: "none;" }} sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"></iframe>
      </div>

      <LogoHeader />

      <div id="firebaseui-auth-container"></div>

      <div style={{ textAlign: "center" }} id="loader">
        <Card style={{ margin: 'auto', width: '300px', textAlign: 'start' }}>
          <Card.Meta
            title="Sign In"
          ></Card.Meta>
          <Space direction='vertical' style={{ width: '100%' }}>
            <Form><br />
              <Input.Group>
                <label>Email</label>
                <Input placeholder='Enter email' value={email} onChange={(e) => setEmail(e.target.value)} /><br /><br/>
              </Input.Group>
              <Input.Group>
                <label>Password</label>
                <Input.Password placeholder='Enter password' status={passwordMismatch ? 'error' : ''} value={password} onChange={(e) => {
                  setPasswordMismatch(false);
                  setPassword(e.target.value)
                }} /><br/>
                <br /></Input.Group>
              <Input.Group style={{ display: userExists ? 'none' : 'block' }}>
                <label>Confirm Password</label>
                <Input.Password placeholder='Enter password' status={passwordMismatch ? 'error' : ''} value={cpassword} onChange={(e) => {
                  setPasswordMismatch(false);
                  setCPassword(e.target.value)
                }} />
                <br /><br/>
              </Input.Group>
              <Button type="primary" danger block onClick={(e) => {
                if (userExists) {
                  signInWithEmailAndPassword(auth, email, password)
                    .then(async (credential) => {
                      localStorage.setItem("session", JSON.stringify({
                        uid: credential.user.uid,
                        sid: await credential.user.getIdToken(),
                        meta: credential
                      }));
                      skip();
                    })
                    .catch((error) => {
                      if (error.code === "auth/user-not-found") {
                        setUserExists(false);
                      } else {
                        console.log(error);
                        message.error(`Unable to sign in: ${error.message}`);
                      }
                    });
                } else {
                  if (password === cpassword) {
                    createUserWithEmailAndPassword(auth, email, password)
                      .then(async (credential) => {
                        localStorage.setItem("session", JSON.stringify({
                          uid: credential.user.uid,
                          sid: await credential.user.getIdToken(),
                          meta: credential
                        }));
                        skip();
                      })
                      .catch((err) => {
                        console.log(err);
                        message.error(`Unable to sign in or create user: ${err.message}`);
                      });
                  } else {
                    setPasswordMismatch(true);
                    message.error('Passwords do not match');
                  }
                }
              }}
              >{userExists ? 'Sign In with Email' : 'Sign up'}</Button>
              <br /><br />
              <Button block onClick={(e) => signInAnonymously(auth).then(async (credential) => {
                localStorage.setItem("session", JSON.stringify({
                  uid: credential.user.uid,
                  sid: await credential.user.getIdToken(),
                  meta: credential
                }));
                skip();
              }).catch((err) => console.log(err))}>Continue as guest</Button>
            </Form>
          </Space></Card></div>


      <div style={{ textAlign: "center", marginTop: '1rem', display: (Capacitor.getPlatform() === "web" ? "block" : "none") }}>
        <a href="https://www.producthunt.com/posts/gpt?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-gpt" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=388519&theme=neutral" alt="GPT&#0043;&#0043; - Transform&#0032;Your&#0032;Media&#0032;Workflow&#0032;with&#0032;GPT&#0043;&#0043;&#0032;Chatbot | Product Hunt"
          style={{ width: "250px", height: "54px;" }} width="250" height="54" /></a>
      </div>

      <Divider style={{ display: (Capacitor.getPlatform() === "web" ? "block" : "none") }} ></Divider>

      <div style={{ display: (Capacitor.getPlatform() === "web" ? "block" : "none"), textAlign: "center" }}>
        <a href='https://play.google.com/store/apps/details?id=com.lonerinc.gptpp&pcampaignid=pcampaignidMKT-Other-global-all-co-prtnr-py-PartBadge-Mar2515-1'><img alt='Get it on Google Play' width='150px' src='https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png' /></a>
      </div>
    </div>
  );
};

export default Home;
