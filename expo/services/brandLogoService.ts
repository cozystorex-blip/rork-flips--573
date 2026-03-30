import AsyncStorage from '@react-native-async-storage/async-storage';

const LOGO_CACHE_KEY = 'brand_logo_cache';

interface LogoCache {
  [brandName: string]: string;
}

let memoryCache: LogoCache = {};
let cacheLoaded = false;

async function loadCache(): Promise<LogoCache> {
  if (cacheLoaded) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(LOGO_CACHE_KEY);
    if (raw) {
      memoryCache = JSON.parse(raw);
    }
    cacheLoaded = true;
  } catch (e) {
    console.log('[BrandLogoService] Cache load error:', e);
  }
  return memoryCache;
}

async function saveCache(): Promise<void> {
  try {
    await AsyncStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(memoryCache));
  } catch (e) {
    console.log('[BrandLogoService] Cache save error:', e);
  }
}

export async function generateBrandLogo(itemName: string, brandName?: string): Promise<string | null> {
  const label = (brandName || itemName || '').trim();
  if (!label) return null;

  const cache = await loadCache();
  const key = label.toLowerCase().trim();

  if (cache[key]) {
    console.log('[BrandLogoService] Cache hit for:', key);
    return cache[key];
  }

  try {
    console.log('[BrandLogoService] Generating logo for:', label);
    const response = await fetch('https://toolkit.rork.com/images/generate/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `A clean, professional product logo or brand icon for "${label}". Minimalist modern design on a pure white background. The logo should be simple, iconic, and recognizable — similar to how brands appear on product packaging. Sharp vector-style rendering, no text, no clutter. Corporate brand identity style.`,
        size: '1024x1024',
      }),
    });

    if (!response.ok) {
      console.log('[BrandLogoService] API error:', response.status);
      return null;
    }

    const data = await response.json();
    if (data?.image?.base64Data && data?.image?.mimeType) {
      const dataUri = `data:${data.image.mimeType};base64,${data.image.base64Data}`;
      memoryCache[key] = dataUri;
      void saveCache();
      console.log('[BrandLogoService] Logo generated and cached for:', key);
      return dataUri;
    }
    return null;
  } catch (e) {
    console.log('[BrandLogoService] Generation error:', e);
    return null;
  }
}

export function getCachedBrandLogo(itemName: string, brandName?: string): string | null {
  const label = (brandName || itemName || '').toLowerCase().trim();
  return memoryCache[label] ?? null;
}

export async function preloadBrandLogos(items: Array<{ name: string; brand?: string }>): Promise<void> {
  await loadCache();
  const uncached = items.filter(item => {
    const key = (item.brand || item.name || '').toLowerCase().trim();
    return !memoryCache[key] && key.length > 0;
  });

  const unique = [...new Set(uncached.map(i => i.brand || i.name))];
  for (const name of unique.slice(0, 3)) {
    await generateBrandLogo(name);
  }
}
