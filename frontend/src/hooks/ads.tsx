import { AdMob, AdMobRewardItem, RewardAdOptions } from '@capacitor-community/admob';
import { BannerAdOptions, BannerAdSize, BannerAdPosition, BannerAdPluginEvents, RewardAdPluginEvents, AdMobBannerSize, InterstitialAdPluginEvents, AdOptions, AdLoadInfo } from '@capacitor-community/admob';
import { collection, setDoc, doc } from 'firebase/firestore';
import { firestore } from '../firebase';
import { IAPProduct, InAppPurchase2 as iap } from '@ionic-native/in-app-purchase-2';

export async function initAds(logAds: Function): Promise<void> {
    return;
    AdMob.initialize({
        initializeForTesting: false,
    }).then(() => {
        //Banner events
        AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
            // Subscribe Banner Event Listener
            logAds('Admob banner have been successfully set');
        });

        AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
            // Subscribe Banner Event Listener
            logAds('Admob banner failed to load');
        });

        AdMob.addListener(BannerAdPluginEvents.Opened, () => {
            // Subscribe Banner Event Listener
            logAds('Admob banner opened');
        });

        AdMob.addListener(BannerAdPluginEvents.AdImpression, () => {
            // Subscribe Banner Event Listener
            logAds('Admob banner ad impression');
        });

        //Interstitial ads
        AdMob.addListener(InterstitialAdPluginEvents.Loaded, (info: AdLoadInfo) => {
            // Subscribe prepared interstitial
            logAds({ msg: 'Admob interstitial have been successfully set', meta: info });
        });
        AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
            // Subscribe Banner Event Listener
            logAds('Admob interstitial failed to load');
        });

        AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
            // Subscribe Banner Event Listener
            logAds('Admob interstitial dismissed');
        });

        AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
            // Subscribe Banner Event Listener
            logAds('Admob interstitial ad failed to show');
        });

        //Reward video ads
        AdMob.addListener(RewardAdPluginEvents.Loaded, (info: AdLoadInfo) => {
            // Subscribe prepared interstitial
            logAds({ msg: 'Admob reward ad have been successfully set', meta: info });
        });
        AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
            // Subscribe Banner Event Listener
            logAds('Admob reward ad failed to load');
        });

        AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
            // Subscribe Banner Event Listener
            logAds('Admob reward ad dismissed');
        });

        AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
            // Subscribe Banner Event Listener
            logAds('Admob reward ad failed to show');
        });

        AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
            // Subscribe Banner Event Listener
            logAds('Admob reward ad rewarded');
        });
        logAds('Ads initialized successfully');
    }).catch(() => {
        logAds('Ads failed to initialize');
    })
}

export async function banner(): Promise<void> {

    return;
    const options: BannerAdOptions = {
        adId: 'ca-app-pub-7045822077342097/4044540183',
        adSize: BannerAdSize.BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        // isTesting: true
        // npa: true
    };
    AdMob.showBanner(options).then(() => logAds('Banner shown!')).catch(() => logAds('Banner not shown!'));
}

export async function interstitial(): Promise<void> {
    return;
    if (localStorage.getItem('subscribed') == null || localStorage.getItem('subscribed')) {
        const options: AdOptions = {
            adId: 'ca-app-pub-7045822077342097/9268946701',
            // isTesting: true
            // npa: true
        };
        await AdMob.prepareInterstitial(options);
        await AdMob.showInterstitial();
    }
}


export async function rewardVideo(): Promise<void> {
    return;
    iap.verbosity = iap.DEBUG;
    iap.register({
        id: 'sub_main',
        alias: 'Sub Main',
        type: iap.PAID_SUBSCRIPTION
    });

    iap.refresh();

    iap.once('sub_main', 'registered', async (e: IAPProduct) => {

        if (!e.owned) {
            const options: RewardAdOptions = {
                adId: 'ca-app-pub-7045822077342097/4044540183',
                // isTesting: true
                // npa: true
                // ssv: {
                //   userId: "A user ID to send to your SSV"
                //   customData: JSON.stringify({ ...MyCustomData })
                //}
            };
            await AdMob.prepareRewardVideoAd(options);
            const rewardItem = await AdMob.showRewardVideoAd();
        }
    });
}

export const logAds = async (data: any) => {
    /*
    const adLogsRef = collection(firestore, 'adsLogs');
    console.log({ data: data });
    await setDoc(doc(adLogsRef), { data: data });
    */
}