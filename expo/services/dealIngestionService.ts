import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { STORE_BRANDS, BRAND_CATEGORY_MAP } from '@/services/dealSources';
import type { StoreBrandSource, NormalizedDeal } from '@/types';

const SYNC_INTERVAL_MS = 60 * 60 * 1000;
const SYNC_KEY = 'deals_last_sync';
const DEALS_STORAGE_KEY = 'ingested_deals';
const MAX_DEALS_PER_BRAND = 6;
const STALE_THRESHOLD_HOURS = 48;
const EXPIRED_CLEANUP_HOURS = 72;

const ParsedDealSchema = z.object({
  deals: z.array(
    z.object({
      product_title: z.string(),
      current_price: z.number().nullable(),
      original_price: z.number().nullable(),
      savings_amount: z.number().nullable(),
      savings_percent: z.number().nullable(),
      short_description: z.string().nullable(),
      category: z.enum(['Deals', 'Budget', 'Healthy', 'Bulk']),
      image_url: z.string().nullable(),
      valid_until: z.string().nullable(),
    })
  ),
});

function stripHtml(html: string): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length > 8000) {
    text = text.substring(0, 8000);
  }
  return text;
}

async function fetchPageContent(url: string): Promise<string | null> {
  try {
    console.log('[DealIngestion] Fetching:', url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.log('[DealIngestion] Fetch failed:', response.status, url);
      return null;
    }

    const html = await response.text();
    const textContent = stripHtml(html);

    if (textContent.length < 100) {
      console.log('[DealIngestion] Page content too short, skipping:', url);
      return null;
    }

    console.log('[DealIngestion] Fetched', textContent.length, 'chars from', url);
    return textContent;
  } catch (err) {
    console.log('[DealIngestion] Fetch error for', url, ':', err instanceof Error ? err.message : 'Unknown');
    return null;
  }
}

async function parseDealsFromContent(
  brand: StoreBrandSource,
  textContent: string,
  sourceUrl: string
): Promise<NormalizedDeal[]> {
  try {
    console.log('[DealIngestion] Parsing deals for', brand.name, 'with AI...');

    const defaultCategory = BRAND_CATEGORY_MAP[brand.slug] ?? 'Deals';

    const result = await generateObject({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text' as const,
              text: `You are extracting real deals from a store's deals page content. You must be EXTREMELY strict — ONLY extract deals with CLEAR, EXPLICIT prices or savings stated directly in the text. Do NOT invent, guess, estimate, or assume any deal that is not explicitly written.

Store: ${brand.name}
Default category: ${defaultCategory}

Extract deals for ALL product types found on the page.

Strict rules:
- ONLY extract products where the EXACT price or EXACT savings amount is clearly written in the content
- If a price is ambiguous, vague, or not explicitly stated as a number, skip that item entirely
- Do NOT estimate prices based on typical store pricing — only use what the text says
- Do NOT include items that only mention a product name without a clear price or discount
- If original price is not explicitly mentioned, set it to null
- Calculate savings_amount only if BOTH current and original prices are explicitly clear
- Calculate savings_percent only if you can derive it from explicit data
- Category should be one of: Deals, Budget, Healthy, Bulk
- Default to "${defaultCategory}" if unclear
- image_url should be null unless a clear product image URL is found in the content
- valid_until should be an ISO date string if an expiration date is explicitly mentioned, otherwise null
- short_description should be a brief 1-sentence factual description of the deal
- Return FEWER high-confidence deals rather than many uncertain ones
- Return an empty array if no real deals can be confidently extracted
- Maximum 6 deals — only the most clearly stated ones

Page content:
${textContent}`,
            },
          ],
        },
      ],
      schema: ParsedDealSchema,
    });

    if (!result || !result.deals || result.deals.length === 0) {
      console.log('[DealIngestion] No deals parsed for', brand.name);
      return [];
    }

    const now = new Date().toISOString();
    const normalized: NormalizedDeal[] = result.deals
      .slice(0, MAX_DEALS_PER_BRAND)
      .filter((d) => d.product_title && d.product_title.trim().length > 2)
      .filter((d) => {
        if (d.valid_until) {
          const expiryTime = new Date(d.valid_until).getTime();
          if (expiryTime < Date.now()) {
            console.log('[DealIngestion] Skipping expired deal:', d.product_title);
            return false;
          }
        }
        return true;
      })
      .map((d) => {
        let savingsAmount = d.savings_amount;
        let savingsPercent = d.savings_percent;
        if (!savingsAmount && d.current_price && d.original_price && d.original_price > d.current_price) {
          savingsAmount = Math.round((d.original_price - d.current_price) * 100) / 100;
        }
        if (!savingsPercent && savingsAmount && d.original_price && d.original_price > 0) {
          savingsPercent = Math.round((savingsAmount / d.original_price) * 100);
        }
        return {
          store_name: brand.name,
          brand_slug: brand.slug,
          title: d.product_title.trim(),
          description: d.short_description?.trim() ?? null,
          category: d.category,
          price: d.current_price,
          original_price: d.original_price,
          savings_amount: savingsAmount,
          savings_percent: savingsPercent,
          photo_url: d.image_url,
          source_url: sourceUrl,
          source_type: 'store_brand' as const,
          is_active: true,
          is_verified: true,
          last_verified: now,
          deal_expires_at: d.valid_until,
        };
      });

    console.log('[DealIngestion] Parsed', normalized.length, 'deals for', brand.name);
    return normalized;
  } catch (err) {
    console.log('[DealIngestion] AI parse error for', brand.name, ':', err instanceof Error ? err.message : 'Unknown');
    return [];
  }
}

function deduplicateDeals(deals: NormalizedDeal[]): NormalizedDeal[] {
  const seen = new Map<string, NormalizedDeal>();

  for (const deal of deals) {
    const key = `${deal.store_name}::${deal.title}`.toLowerCase().replace(/\s+/g, ' ');
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, deal);
    } else if (deal.price !== null && (existing.price === null || (deal.last_verified ?? '') > (existing.last_verified ?? ''))) {
      seen.set(key, deal);
    }
  }

  return Array.from(seen.values());
}

async function saveDealsLocally(deals: NormalizedDeal[]): Promise<number> {
  if (deals.length === 0) return 0;
  try {
    const raw = await AsyncStorage.getItem(DEALS_STORAGE_KEY);
    const existing: NormalizedDeal[] = raw ? JSON.parse(raw) : [];
    const existingKeys = new Set(existing.map((d) => `${d.store_name}::${d.title}`.toLowerCase()));
    const newDeals = deals.filter((d) => !existingKeys.has(`${d.store_name}::${d.title}`.toLowerCase()));
    const merged = [...newDeals, ...existing].slice(0, 200);
    await AsyncStorage.setItem(DEALS_STORAGE_KEY, JSON.stringify(merged));
    console.log('[DealIngestion] Saved', newDeals.length, 'new deals locally, total:', merged.length);
    return newDeals.length;
  } catch (e) {
    console.log('[DealIngestion] Local save error:', e);
    return 0;
  }
}

async function deactivateStaleDeals(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(DEALS_STORAGE_KEY);
    if (!raw) return;
    const deals: NormalizedDeal[] = JSON.parse(raw);
    const now = Date.now();
    const filtered = deals.filter((d) => {
      if (d.deal_expires_at) {
        const expiryTime = new Date(d.deal_expires_at).getTime();
        if (expiryTime < now) return false;
      }
      const createdTime = d.last_verified ? new Date(d.last_verified).getTime() : now;
      const hoursOld = (now - createdTime) / 3600000;
      if (d.source_type === 'store_brand' && hoursOld > STALE_THRESHOLD_HOURS) return false;
      if (d.source_type === 'user' && hoursOld > EXPIRED_CLEANUP_HOURS) return false;
      return true;
    });
    if (filtered.length !== deals.length) {
      await AsyncStorage.setItem(DEALS_STORAGE_KEY, JSON.stringify(filtered));
      console.log('[DealIngestion] Cleaned up', deals.length - filtered.length, 'stale deals');
    }
  } catch (err) {
    console.log('[DealIngestion] Stale cleanup error:', err instanceof Error ? err.message : 'Unknown');
  }
}

export type TrustLevel = 'high' | 'medium' | 'low' | 'unverified';

export interface DealTrustInfo {
  level: TrustLevel;
  score: number;
  reasons: string[];
  freshnessHours: number;
  isStale: boolean;
  isExpired: boolean;
}

export function computeDealTrust(deal: {
  is_verified?: boolean | null;
  source_type?: string | null;
  source_url?: string | null;
  last_verified?: string | null;
  created_at?: string | null;
  deal_expires_at?: string | null;
  price?: number | null;
  store_name?: string | null;
  brand_slug?: string | null;
}): DealTrustInfo {
  let score = 0;
  const reasons: string[] = [];

  if (deal.is_verified === true) {
    score += 30;
    reasons.push('Verified deal');
  }

  if (deal.source_type === 'store_brand') {
    score += 25;
    reasons.push('Store brand source');
  } else if (deal.source_type === 'user') {
    score += 5;
    reasons.push('Community reported');
  }

  if (deal.source_url) {
    score += 10;
    reasons.push('Linked to store listing');
  }

  if (deal.brand_slug) {
    score += 5;
    reasons.push('Matched to known retailer');
  }

  if (deal.price !== null && deal.price !== undefined && deal.price > 0) {
    score += 10;
    reasons.push('Real price data');
  }

  if (deal.store_name) {
    score += 5;
    reasons.push('Store identified');
  }

  const verifyRef = deal.last_verified || deal.created_at;
  let freshnessHours = 999;
  if (verifyRef) {
    freshnessHours = (Date.now() - new Date(verifyRef).getTime()) / 3600000;
    if (freshnessHours < 6) {
      score += 15;
      reasons.push('Checked recently');
    } else if (freshnessHours < 24) {
      score += 10;
      reasons.push('Checked today');
    } else if (freshnessHours < 48) {
      score += 5;
      reasons.push('Checked within 2 days');
    } else {
      reasons.push('Not recently verified');
    }
  }

  let isExpired = false;
  if (deal.deal_expires_at) {
    const expiryTime = new Date(deal.deal_expires_at).getTime();
    if (expiryTime < Date.now()) {
      isExpired = true;
      score = Math.max(0, score - 40);
      reasons.push('Deal expired');
    } else {
      const hoursLeft = (expiryTime - Date.now()) / 3600000;
      if (hoursLeft > 24) {
        score += 5;
        reasons.push('Still valid');
      }
    }
  }

  const isStale = freshnessHours > STALE_THRESHOLD_HOURS;
  if (isStale && !isExpired) {
    score = Math.max(0, score - 15);
  }

  let level: TrustLevel;
  if (score >= 70) level = 'high';
  else if (score >= 45) level = 'medium';
  else if (score >= 20) level = 'low';
  else level = 'unverified';

  return {
    level,
    score: Math.min(100, Math.max(0, score)),
    reasons,
    freshnessHours,
    isStale,
    isExpired,
  };
}

export async function shouldSync(): Promise<boolean> {
  try {
    const lastSync = await AsyncStorage.getItem(SYNC_KEY);
    if (!lastSync) return true;
    const elapsed = Date.now() - parseInt(lastSync, 10);
    return elapsed > SYNC_INTERVAL_MS;
  } catch {
    return true;
  }
}

export async function syncStoreBrandDeals(
  onProgress?: (message: string) => void
): Promise<{ totalDeals: number; brandsProcessed: number; errors: string[] }> {
  console.log('[DealIngestion] Starting store brand deal sync...');
  const errors: string[] = [];
  let allDeals: NormalizedDeal[] = [];
  let brandsProcessed = 0;

  if (Platform.OS === 'web') {
    console.log('[DealIngestion] Web platform - using cached deals only');
    onProgress?.('Loading cached deals...');
    await AsyncStorage.setItem(SYNC_KEY, Date.now().toString());
    return { totalDeals: 0, brandsProcessed: 0, errors: ['Web platform: using cached deals only'] };
  }

  for (const brand of STORE_BRANDS) {
    onProgress?.(`Checking ${brand.name}...`);

    let pageContent: string | null = null;

    for (const feedUrl of brand.feedUrls) {
      pageContent = await fetchPageContent(feedUrl);
      if (pageContent) {
        const deals = await parseDealsFromContent(brand, pageContent, feedUrl);
        if (deals.length > 0) {
          allDeals = allDeals.concat(deals);
          brandsProcessed++;
          console.log('[DealIngestion]', brand.name, ':', deals.length, 'deals from', feedUrl);
          break;
        }
      }
    }

    if (!pageContent) {
      const errMsg = `Could not fetch deals from ${brand.name}`;
      errors.push(errMsg);
      console.log('[DealIngestion]', errMsg);
    }
  }

  onProgress?.('Deduplicating deals...');
  const deduplicated = deduplicateDeals(allDeals);
  console.log('[DealIngestion] After dedup:', deduplicated.length, 'unique deals');

  onProgress?.('Saving verified deals...');
  const totalInserted = await saveDealsLocally(deduplicated);

  await deactivateStaleDeals();

  await AsyncStorage.setItem(SYNC_KEY, Date.now().toString());

  console.log('[DealIngestion] Sync complete:', totalInserted, 'deals from', brandsProcessed, 'brands');

  return {
    totalDeals: totalInserted,
    brandsProcessed,
    errors,
  };
}

export async function syncSingleBrand(
  brandSlug: string,
  onProgress?: (message: string) => void
): Promise<NormalizedDeal[]> {
  const brand = STORE_BRANDS.find((b) => b.slug === brandSlug);
  if (!brand) {
    console.log('[DealIngestion] Brand not found:', brandSlug);
    return [];
  }

  if (Platform.OS === 'web') {
    console.log('[DealIngestion] Web: skipping live fetch for', brand.name);
    return [];
  }

  onProgress?.(`Fetching ${brand.name} deals...`);

  for (const feedUrl of brand.feedUrls) {
    const content = await fetchPageContent(feedUrl);
    if (content) {
      const deals = await parseDealsFromContent(brand, content, feedUrl);
      if (deals.length > 0) {
        onProgress?.('Saving deals...');
        await saveDealsLocally(deduplicateDeals(deals));
        return deals;
      }
    }
  }

  return [];
}

export async function getLastSyncTime(): Promise<number | null> {
  try {
    const val = await AsyncStorage.getItem(SYNC_KEY);
    return val ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
}

export async function clearSyncCache(): Promise<void> {
  await AsyncStorage.removeItem(SYNC_KEY);
}
