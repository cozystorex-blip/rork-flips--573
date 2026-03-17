import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VerifiedDealRow } from '@/types';

const LOCAL_DEALS_KEY = 'local_posted_deals';

export async function getLocalDeals(): Promise<VerifiedDealRow[]> {
  try {
    const stored = await AsyncStorage.getItem(LOCAL_DEALS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as VerifiedDealRow[];
    console.log('[LocalDeals] Loaded', parsed.length, 'local deals');
    return parsed;
  } catch (err) {
    console.log('[LocalDeals] Error loading local deals:', err);
    return [];
  }
}

export async function saveLocalDeal(deal: VerifiedDealRow): Promise<void> {
  try {
    const existing = await getLocalDeals();
    const updated = [deal, ...existing];
    await AsyncStorage.setItem(LOCAL_DEALS_KEY, JSON.stringify(updated));
    console.log('[LocalDeals] Saved deal locally:', deal.id, deal.title);
  } catch (err) {
    console.log('[LocalDeals] Error saving local deal:', err);
  }
}

export async function removeLocalDeal(dealId: string): Promise<void> {
  try {
    const existing = await getLocalDeals();
    const updated = existing.filter((d) => d.id !== dealId);
    await AsyncStorage.setItem(LOCAL_DEALS_KEY, JSON.stringify(updated));
    console.log('[LocalDeals] Removed local deal:', dealId);
  } catch (err) {
    console.log('[LocalDeals] Error removing local deal:', err);
  }
}
