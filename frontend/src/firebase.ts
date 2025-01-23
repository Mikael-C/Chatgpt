import { initializeApp } from "firebase/app";

import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getRemoteConfig} from 'firebase/remote-config';
import { getMessaging } from 'firebase/messaging';
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
    apiKey: "AIzaSyDVLuj5RA28gixa5KfpfPEGv1C5uqewtmM",
    authDomain: "chatgptpp-7d9f2.firebaseapp.com",
    projectId: "chatgptpp-7d9f2",
    storageBucket: "chatgptpp-7d9f2.appspot.com",
    messagingSenderId: "506381071204",
    appId: "1:506381071204:web:fbffe55d6ffbf76cc64071",
    measurementId: "G-BYE86LTFHW"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const storage = getStorage(app);

const firestore = getFirestore(app);

const remoteConfig = getRemoteConfig(app);

const messaging = getMessaging(app);

const functions = getFunctions(app);

export { app, auth, storage, firestore, remoteConfig, messaging, functions };