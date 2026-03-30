import AsyncStorage from '@react-native-async-storage/async-storage';

const STORE_IMAGE_CACHE_KEY = 'store_image_cache';

interface StoreImageCache {
  [storeName: string]: string;
}

let memoryCache: StoreImageCache = {};
let cacheLoaded = false;

async function loadCache(): Promise<StoreImageCache> {
  if (cacheLoaded) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(STORE_IMAGE_CACHE_KEY);
    if (raw) {
      memoryCache = JSON.parse(raw);
    }
    cacheLoaded = true;
  } catch (e) {
    console.log('[StoreImageService] Cache load error:', e);
  }
  return memoryCache;
}

async function saveCache(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORE_IMAGE_CACHE_KEY, JSON.stringify(memoryCache));
  } catch (e) {
    console.log('[StoreImageService] Cache save error:', e);
  }
}

export async function generateStoreImage(storeName: string): Promise<string | null> {
  if (!storeName.trim()) return null;

  const cache = await loadCache();
  const key = storeName.toLowerCase().trim();

  if (cache[key]) {
    console.log('[StoreImageService] Cache hit for:', key);
    return cache[key];
  }

  try {
    console.log('[StoreImageService] Generating image for:', storeName);
    const response = await fetch('https://toolkit.rork.com/images/generate/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `A photorealistic exterior photo of a ${storeName} retail store building, taken from the parking lot on a clear day. The store sign is clearly visible. Professional architectural photography style, well-lit, modern retail location.`,
        size: '1024x1024',
      }),
    });

    if (!response.ok) {
      console.log('[StoreImageService] API error:', response.status);
      return null;
    }

    const data = await response.json();
    if (data?.image?.base64Data && data?.image?.mimeType) {
      const dataUri = `data:${data.image.mimeType};base64,${data.image.base64Data}`;
      memoryCache[key] = dataUri;
      void saveCache();
      console.log('[StoreImageService] Image generated and cached for:', key);
      return dataUri;
    }
    return null;
  } catch (e) {
    console.log('[StoreImageService] Generation error:', e);
    return null;
  }
}

export function getCachedStoreImage(storeName: string): string | null {
  const key = storeName.toLowerCase().trim();
  return memoryCache[key] ?? null;
}

export async function preloadStoreImages(storeNames: string[]): Promise<void> {
  await loadCache();
  const uncached = storeNames.filter(name => {
    const key = name.toLowerCase().trim();
    return !memoryCache[key] && key.length > 0;
  });

  const unique = [...new Set(uncached)];
  for (const name of unique.slice(0, 5)) {
    await generateStoreImage(name);
  }
}
