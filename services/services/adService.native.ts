import { Platform } from 'react-native';

let mobileAds: any = null;
let RNBannerAd: any = null;
let BannerAdSize: any = {};
let InterstitialAd: any = null;
let AdEventType: any = {};
let TestIds: any = { BANNER: 'ca-app-pub-3940256099942544/6300978111', INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712' };

let nativeModuleAvailable = false;
try {
  const mod = require('react-native-google-mobile-ads');
  mobileAds = mod.default ?? mod;
  RNBannerAd = mod.BannerAd;
  BannerAdSize = mod.BannerAdSize ?? {};
  InterstitialAd = mod.InterstitialAd;
  AdEventType = mod.AdEventType ?? {};
  TestIds = mod.TestIds ?? TestIds;
  nativeModuleAvailable = true;
  console.log('[AdService] react-native-google-mobile-ads module loaded');
} catch (e) {
  console.warn('[AdService] react-native-google-mobile-ads not available:', e);
}

let adsInitialized = false;
const adInitListeners: Array<() => void> = [];
let interstitialAd: any = null;
let interstitialLoaded = false;

const IOS_BANNER_ID = process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID || TestIds.BANNER;
const ANDROID_BANNER_ID = process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID || TestIds.BANNER;
const IOS_INTERSTITIAL_ID = process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID || TestIds.INTERSTITIAL;
const ANDROID_INTERSTITIAL_ID = process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID || TestIds.INTERSTITIAL;

export function isAdModuleAvailable(): boolean {
  return nativeModuleAvailable;
}

export function isAdsInitialized(): boolean {
  return adsInitialized;
}

export function onAdsInitialized(cb: () => void): () => void {
  if (adsInitialized) {
    cb();
    return () => {};
  }
  adInitListeners.push(cb);
  return () => {
    const idx = adInitListeners.indexOf(cb);
    if (idx >= 0) adInitListeners.splice(idx, 1);
  };
}

export function getBannerUnitId(): string {
  return Platform.OS === 'ios' ? IOS_BANNER_ID : ANDROID_BANNER_ID;
}

export function getInterstitialUnitId(): string {
  return Platform.OS === 'ios' ? IOS_INTERSTITIAL_ID : ANDROID_INTERSTITIAL_ID;
}

function loadInterstitial(): void {
  if (!nativeModuleAvailable || !InterstitialAd) {
    console.log('[AdService] Interstitial not available — native module missing');
    return;
  }
  try {
    const unitId = getInterstitialUnitId();
    console.log('[AdService] Loading interstitial with unit ID:', unitId);
    interstitialAd = InterstitialAd.createForAdRequest(unitId);
    interstitialLoaded = false;

    interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      console.log('[AdService] Interstitial loaded');
      interstitialLoaded = true;
    });

    interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[AdService] Interstitial closed, preloading next');
      interstitialLoaded = false;
      setTimeout(() => loadInterstitial(), 1000);
    });

    interstitialAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
      console.log('[AdService] Interstitial error:', error);
      interstitialLoaded = false;
      setTimeout(() => loadInterstitial(), 30000);
    });

    interstitialAd.load();
  } catch (e) {
    console.log('[AdService] Failed to create interstitial:', e);
  }
}

export async function initializeAds(): Promise<void> {
  if (!nativeModuleAvailable || !mobileAds) {
    console.log('[AdService] Native ads module not available — skipping initialization');
    return;
  }
  try {
    console.log('[AdService] Initializing mobile ads SDK...');
    console.log('[AdService] Banner ID:', getBannerUnitId());
    console.log('[AdService] Interstitial ID:', getInterstitialUnitId());

    await mobileAds().initialize();
    adsInitialized = true;
    console.log('[AdService] Mobile ads SDK initialized successfully');

    adInitListeners.forEach((cb) => {
      try { cb(); } catch (e) { console.log('[AdService] Init listener error:', e); }
    });
    adInitListeners.length = 0;

    loadInterstitial();
  } catch (e) {
    console.log('[AdService] Failed to initialize ads:', e);
  }
}

export async function showInterstitialIfReady(): Promise<boolean> {
  if (!adsInitialized) {
    console.log('[AdService] Ads not initialized, cannot show interstitial');
    return false;
  }
  if (!interstitialLoaded || !interstitialAd) {
    console.log('[AdService] Interstitial not loaded yet');
    return false;
  }
  try {
    console.log('[AdService] Showing interstitial');
    void interstitialAd.show();
    return true;
  } catch (e) {
    console.log('[AdService] Failed to show interstitial:', e);
    return false;
  }
}

export function associateAdProfile(userId: string | null): void {
  console.log('[AdService] Associate ad profile:', userId ? userId.substring(0, 8) + '...' : 'anonymous');
}

export { RNBannerAd as BannerAd, BannerAdSize, nativeModuleAvailable as isNativeAdsAvailable };
