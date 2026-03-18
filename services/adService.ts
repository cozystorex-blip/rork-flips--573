let adsInitialized = false;
const adInitListeners: Array<() => void> = [];

export function isAdModuleAvailable(): boolean {
  return false;
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
  return '';
}

export function getInterstitialUnitId(): string {
  return '';
}

export async function initializeAds(): Promise<void> {
  console.log('[AdService] Web platform — ads not available, skipping initialization');
}

export async function showInterstitialIfReady(): Promise<boolean> {
  console.log('[AdService] Interstitial not available on web');
  return false;
}

export function isInterstitialReady(): boolean {
  return false;
}

export function associateAdProfile(userId: string | null): void {
  console.log('[AdService] Associate ad profile (web):', userId ? userId.substring(0, 8) + '...' : 'anonymous');
}

export const isNativeAdsAvailable = false;
