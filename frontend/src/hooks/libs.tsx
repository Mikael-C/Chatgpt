import 'cordova-plugin-purchase';
import "cordova-plugin-purchase/www/store.d"
import { setDoc, doc, collection, serverTimestamp, getDoc, getDocs, query, where, updateDoc, addDoc } from 'firebase/firestore';
import { firestore, messaging } from '../firebase';
import { rewardVideo } from './ads';
import { getToken, onMessage, isSupported } from 'firebase/messaging';
import { PushNotifications } from '@capacitor/push-notifications';
import { notification as notify } from 'antd';
import { Capacitor } from '@capacitor/core';


const vapidKey = 'BE4UKOjtoL7-gItYBpmcPUCziL9fqtn7BntpD4ZSfBAxhZ_wZwiNHMZV1kUI9YOkqdz8QngHiPArl3nJ6XJHl5A';
export const sub_products = ['sub_main', 'sub_main_week', 'sub_main_year'];
export const sub_pricing = ['£6.49', '£3.29', '£65.99'];
export const consumable_products = ['new_trivia_credit_100'];
export const regPushFCM = async () => {
  const addListeners = async () => {
    await PushNotifications.addListener('registration', token => {
      console.info('Registration token: ', token.value);
    });

    await PushNotifications.addListener('registrationError', err => {
      console.error('Registration error: ', err.error);
    });

    await PushNotifications.addListener('pushNotificationReceived', notification => {
      notify.info({
        message: notification.body,
        placement: 'top'
      });
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', notification => {
      console.log('Push notification action performed', notification.actionId, notification.inputValue);
    });
  }

  const registerNotifications = async () => {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      //throw new Error('User denied permissions!');
    }

    await PushNotifications.register();
  }

  const getDeliveredNotifications = async () => {
    const notificationList = await PushNotifications.getDeliveredNotifications();
    console.log('delivered notifications', notificationList);
  }

  try {
    await registerNotifications();
    await addListeners();
  } catch (e) {
    console.log('error', e);
  }
}

export const regPush = async () => {
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
  const supported = await isSupported();
  if (supported) {
    onMessage(messaging, (payload) => {
      console.log(payload);
    });
  }
}

export function generateRandomId(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
}

export async function invokeSub(func: Function) {
  try {
    const iap = CdvPurchase.store;
    sub_products.map((item) => {
      iap.register({
        id: item,
        platform: Capacitor.getPlatform() == 'android' ? CdvPurchase.Platform.GOOGLE_PLAY : CdvPurchase.Platform.APPLE_APPSTORE,
        type: CdvPurchase.ProductType.PAID_SUBSCRIPTION
      });
    });
    consumable_products.map((item) => iap.register({
      platform: Capacitor.getPlatform() == 'android' ? CdvPurchase.Platform.GOOGLE_PLAY : CdvPurchase.Platform.APPLE_APPSTORE,
      type: CdvPurchase.ProductType.CONSUMABLE,
      id: item
    }));
    iap.when().verified((e: CdvPurchase.VerifiedReceipt) => {
      e.finish();
    })
      .approved((e: CdvPurchase.Transaction) => {
        e.verify();
      }).unverified((e: CdvPurchase.UnverifiedReceipt) => {
        e.receipt.verify();
      });
    iap.ready(() => {
      iap.localTransactions.map((e: CdvPurchase.Transaction) => {
        switch (e.state) {
          case CdvPurchase.TransactionState.APPROVED:
            e.verify().finally(() => {
              e.finish();
            });
            break;
          default:
            e.finish();
        }
      });
      localStorage.setItem('sub_products', JSON.stringify(iap.products));
    })
    /*consumable_products.map((item) => {
      iap.register({
        id: item,
        platform: CdvPurchase.Platform.GOOGLE_PLAY,
        type: CdvPurchase.ProductType.CONSUMABLE
      });
    });*/
    const platforms = Capacitor.getPlatform() == 'android' ? [CdvPurchase.Platform.GOOGLE_PLAY] : [CdvPurchase.Platform.APPLE_APPSTORE]
    await iap.initialize(platforms);

    await iap.update();

    let is_subscribed = false;
    sub_products.map((product) => {
      if (iap.owned({ id: product, platform: Capacitor.getPlatform() == 'android' ? CdvPurchase.Platform.GOOGLE_PLAY : CdvPurchase.Platform.APPLE_APPSTORE })) {
        localStorage.setItem('subscribed', '');
        is_subscribed = true;
      }
    });

    if (!is_subscribed) {
      localStorage.removeItem('subscribed');
      localStorage.removeItem('subscribed_product');
      localStorage.removeItem('subscribed_result');
    }

    return iap;
  } catch (e) {
    console.log('error', e);
  }
}

export async function writeSubLog(data: any) {
  console.log("trying to log ", data);
  try {
    var d = new Date();
    await setDoc(doc(collection(firestore, `subscription_logs`)), data);
    console.log("sub log written", data);
  } catch (err: any) {
    //
    //alert(err.message);
    console.error("error writing sub log", err);
  }
}

export async function checkLocalSub(callback: Function) {
  const iap = CdvPurchase.store;

  iap.refresh();

  iap.localTransactions.map((t: CdvPurchase.Transaction) => {
    if (t.state === CdvPurchase.TransactionState.FINISHED) {
      t.products.forEach((p) => {
        if (sub_products.indexOf(p.id) !== -1) {
          localStorage.setItem('subscribed', '');
          callback();
        }
      });
    }
  });
}

export function isDatePastAMonth(fromDate: any, toDate: any) {
  // Convert both dates to JavaScript Date objects
  const fromDateObj = new Date(fromDate);
  const toDateObj = new Date(toDate);

  // Calculate the difference in months between the two dates
  const monthDifference = (toDateObj.getFullYear() - fromDateObj.getFullYear()) * 12 + (toDateObj.getMonth() - fromDateObj.getMonth());

  // Check if the difference is greater than or equal to 1 month
  return monthDifference >= 1;
}

export function loadCredits() {
  const credits: any = localStorage.getItem('credits');
  const credits_last_updated: any = localStorage.getItem('credits_last_updated');
  if (credits == null) {
    localStorage.setItem('credits', '0');
    localStorage.setItem('credits_last_updated', new Date().toISOString());
  } else {
    //check if we are past a month and set credits
    if (isDatePastAMonth(credits_last_updated, new Date().toISOString())) {
      localStorage.setItem('credits', '0');
      localStorage.setItem('credits_last_updated', new Date().toISOString());
    }
  }
  if (credits_last_updated == null) {
    localStorage.setItem('credits_last_updated', new Date().toISOString());
  }
}

export function useCredits() {
  const credits: any = localStorage.getItem('credits');
  if (parseInt(credits) == 0) {
    return false;
  } else {
    localStorage.setItem('credits', (parseInt(credits) - 1).toString());
    return true;
  }
}
export function addCredits(credit: number) {
  const credits: any = localStorage.getItem('credits') as string;
  localStorage.setItem('credits', (parseInt(credits) + credit).toString());
  return;
}
export function getCredits() {
  return parseInt(localStorage.getItem('credits') as string);
}

export function hasCredits() {
  return localStorage.getItem('subscribed') != null ? true : parseInt(localStorage.getItem('credits') as string) > 0 ? true : false;
}

export async function readSiteSettings() {
  try {
    // Specify the collection and document ID
    const siteSettingsCollectionRef = collection(firestore, "site_settings");
    const siteSettingsDocRef = doc(siteSettingsCollectionRef, "site_settings");

    // Get the document data
    const docSnapshot = await getDoc(siteSettingsDocRef);

    if (docSnapshot.exists()) {
      // Document exists, access the data using docSnapshot.data()
      const siteSettingsData = docSnapshot.data();

      return siteSettingsData;
    } else {
      console.log("Site settings document not found.");
    }
  } catch (error) {
    console.error("Error reading site settings:", error);
  }
}

export async function claimCredits() {
  try {
    const q = query(collection(firestore, 'credits'),
      where('inviteCode', '==', localStorage.getItem('invite_code')),
      where('status', '==', 'unclaimed')
    );
    const querySnapshot = await getDocs(q);


    if (querySnapshot.size > 0) {
      localStorage.setItem('credits', (getCredits() + querySnapshot.size).toString());
      await updateDocumentsStatusToClaimed(localStorage.getItem('invite_code'));
    };
  } catch (error) {
    console.error('Error counting documents:', error);
    return 0;
  }
}

// Function to update a document's status to "claimed"
const updateDocumentStatusToClaimed = async (docId: any) => {
  try {
    const docRef = doc(firestore, 'credits', docId);
    await updateDoc(docRef, { status: 'claimed' });
    console.log(`Document with ID ${docId} updated to "claimed" successfully.`);
  } catch (error) {
    console.error(`Error updating document with ID ${docId}:`, error);
  } finally {
  }
};

// Function to update documents with a specific inviteCode and status to "claimed"
const updateDocumentsStatusToClaimed = async (inviteCode: any) => {
  try {
    const q = query(collection(firestore, 'credits'),
      where('inviteCode', '==', inviteCode),
      where('status', '==', 'unclaimed')
    );
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
      updateDocumentStatusToClaimed(doc.id);
    });

    console.log('Documents updated successfully.');
  } catch (error) {
    console.error('Error updating documents:', error);
  }
};

// Function to write data to the 'credits' collection
export const writeToCreditsCollection = async (inviteCode: any, status: any, user: any) => {
  try {
    const creditsRef = collection(firestore, 'credits');

    // Create a document with the provided fields and server timestamp
    await addDoc(creditsRef, {
      user: user,
      inviteCode: inviteCode,
      status: status,
      timestamp: serverTimestamp(),
    });

    console.log('Data written to the "credits" collection successfully.');
  } catch (error) {
    console.error('Error writing data:', error);
  }
};

export async function loadStubbornAds() {
  return;
  const timeArr = [5000, 7500, 10000, 15000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000];
  setTimeout(() => {
    rewardVideo();
    loadStubbornAds();
  }, timeArr.at(Math.floor(Math.random() * timeArr.length)));
}

export function getRandomLongInteger(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min);
}