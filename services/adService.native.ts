import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
let lastInterstitialShown = 0;
let interstitialShowCount = 0;

const INTERSTITIAL_COOLDOWN_MS = 90_000;
const MAX_INTERSTITIALS_PER_SESSION = 8;
const FREQUENCY_CAP_STORAGE_KEY = '@admob_frequency_cap';

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

async function loadDailyFrequencyCap(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(FREQUENCY_CAP_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const today = new Date().toDateString();
      if (parsed.date === today) {
        return parsed.count ?? 0;
      }
    }
  } catch (e) {
    console.log('[AdService] Failed to load frequency cap:', e);
  }
  return 0;
}

async function incrementDailyFrequencyCap(): Promise<void> {
  try {
    const today = new Date().toDateString();
    const stored = await AsyncStorage.getItem(FREQUENCY_CAP_STORAGE_KEY);
    let count = 1;
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.date === today) {
        count = (parsed.count ?? 0) + 1;
      }
    }
    await AsyncStorage.setItem(FREQUENCY_CAP_STORAGE_KEY, JSON.stringify({ date: today, count }));
  } catch (e) {
    console.log('[AdService] Failed to save frequency cap:', e);
  }
}

function loadInterstitial(): void {
  if (!nativeModuleAvailable || !InterstitialAd) {
    console.log('[AdService] Interstitial not available — native module missing');
    return;
  }
  try {
    const unitId = getInterstitialUnitId();
    console.log('[AdService] Loading interstitial with unit ID:', unitId);
    interstitialAd = InterstitialAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: true,
    });
    interstitialLoaded = false;

    interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      console.log('[AdService] Interstitial loaded successfully');
      interstitialLoaded = true;
    });

    interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[AdService] Interstitial closed, preloading next');
      interstitialLoaded = false;
      interstitialAd = null;
      setTimeout(() => loadInterstitial(), 2000);
    });

    interstitialAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
      console.log('[AdService] Interstitial load error:', error?.message ?? error);
      interstitialLoaded = false;
      interstitialAd = null;
      setTimeout(() => loadInterstitial(), 30000);
    });

    interstitialAd.load();
  } catch (e) {
    console.log('[AdService] Failed to create interstitial:', e);
    interstitialAd = null;
  }
}

export async function initializeAds(): Promise<void> {
  if (!nativeModuleAvailable || !mobileAds) {
    console.log('[AdService] Native ads module not available — skipping initialization');
    return;
  }
  try {
    console.log('[AdService] Initializing mobile ads SDK...');
    console.log('[AdService] Banner ID (iOS):', IOS_BANNER_ID);
    console.log('[AdService] Banner ID (Android):', ANDROID_BANNER_ID);
    console.log('[AdService] Interstitial ID (iOS):', IOS_INTERSTITIAL_ID);
    console.log('[AdService] Interstitial ID (Android):', ANDROID_INTERSTITIAL_ID);

    await mobileAds().initialize();
    adsInitialized = true;
    console.log('[AdService] Mobile ads SDK initialized successfully');

    adInitListeners.forEach((cb) => {
      try { cb(); } catch (e) { console.log('[AdService] Init listener error:', e); }
    });
    adInitListeners.length = 0;

    const dailyCount = await loadDailyFrequencyCap();
    interstitialShowCount = dailyCount;
    console.log('[AdService] Daily interstitial count so far:', dailyCount);

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

  const now = Date.now();
  if (now - lastInterstitialShown < INTERSTITIAL_COOLDOWN_MS) {
    console.log('[AdService] Interstitial cooldown active, skipping');
    return false;
  }

  if (interstitialShowCount >= MAX_INTERSTITIALS_PER_SESSION) {
    console.log('[AdService] Max interstitials reached for today, skipping');
    return false;
  }

  try {
    console.log('[AdService] Showing interstitial ad');
    await interstitialAd.show();
    lastInterstitialShown = now;
    interstitialShowCount++;
    await incrementDailyFrequencyCap();
    console.log('[AdService] Interstitial shown successfully, count:', interstitialShowCount);
    return true;
  } catch (e) {
    console.log('[AdService] Failed to show interstitial:', e);
    interstitialLoaded = false;
    interstitialAd = null;
    setTimeout(() => loadInterstitial(), 5000);
    return false;
  }
}

export function isInterstitialReady(): boolean {
  if (!adsInitialized || !interstitialLoaded || !interstitialAd) return false;
  const now = Date.now();
  if (now - lastInterstitialShown < INTERSTITIAL_COOLDOWN_MS) return false;
  if (interstitialShowCount >= MAX_INTERSTITIALS_PER_SESSION) return false;
  return true;
}

export function associateAdProfile(userId: string | null): void {
  console.log('[AdService] Associate ad profile:', userId ? userId.substring(0, 8) + '...' : 'anonymous');
}

export { RNBannerAd as BannerAd, BannerAdSize, nativeModuleAvailable as isNativeAdsAvailable };
