import { StoreInsight, StoreType, StoreDeal, CategoryType } from '@/types';

const STORE_TYPE_MAP: Record<string, StoreType> = {
  "Trader Joe's": 'grocery',
  'Whole Foods Market': 'grocery',
  'Costco': 'warehouse',
  'Aldi': 'discount',
  'Sprouts Farmers Market': 'grocery',
  'Walmart Grocery': 'grocery',
  'Corner Deli & Grocery': 'convenience',
  'International Foods Market': 'specialty',
};

const CATEGORY_INSIGHTS: Record<CategoryType, string[]> = {
  budget: [
    'Store-brand items here are typically 20-30% cheaper than name brands',
    'Weekly ad deals drop every Wednesday — check early for best selection',
    'Users report the best produce prices on weekday mornings',
    'Frozen aisle often has unadvertised clearance items',
  ],
  healthy: [
    'Organic produce tends to be freshest early in the week',
    'Bulk bins offer better per-unit prices on grains and nuts',
    'Look for seasonal produce — it\'s usually cheaper and fresher',
    'Users find the best supplement deals during monthly sales events',
  ],
  bulk: [
    'Buying proteins in bulk here saves roughly 25% vs regular stores',
    'Paper goods and cleaning supplies have the best per-unit value',
    'Check the back of the store for unadvertised manager specials',
    'Seasonal items rotate frequently — stock up when you see them',
  ],
  deals: [
    'Flash sales happen most often on Thursdays and Fridays',
    'Clearance sections restock mid-week with deep discounts',
    'Coupon stacking with weekly ads can save an extra 15-20%',
    'Users report the best snack and cereal deals at this location',
  ],
};

const STORE_TYPE_INSIGHTS: Record<StoreType, string[]> = {
  grocery: [
    'Eggs and dairy are often discounted here mid-week',
    'Produce tends to be cheapest early in the week',
    'Check the weekly circular for rotating BOGO deals',
    'Bakery items are marked down in the evening hours',
  ],
  warehouse: [
    'Membership pays for itself in about 3 bulk trips for most users',
    'Rotisserie chickens are consistently the best deal in store',
    'Kirkland brand items typically match or beat name-brand quality',
    'Gas savings add up — factor that into your trip value',
  ],
  discount: [
    'Aldi Finds aisle rotates weekly with surprise deep discounts',
    'Bring your own bags — it saves time and a few cents each trip',
    'Store-brand quality is rated highly by community members',
    'Best time to shop is right after morning restock',
  ],
  convenience: [
    'Prices are higher but useful for quick single-item runs',
    'Check for daily sandwich or coffee specials',
    'Some items are competitively priced — milk and bread especially',
    'Community members suggest comparing before buying snacks here',
  ],
  specialty: [
    'Great for hard-to-find international ingredients',
    'Spices and seasonings tend to be much cheaper here than chain stores',
    'Fresh produce from specialty suppliers may vary in price weekly',
    'Users recommend checking for imported snack deals',
  ],
};

function getStoreType(storeName: string): StoreType {
  return STORE_TYPE_MAP[storeName] ?? 'grocery';
}

function shuffleAndPick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function generateStoreInsights(
  storeName: string,
  category?: CategoryType,
  communityDeals?: StoreDeal[],
): StoreInsight[] {
  const storeType = getStoreType(storeName);
  const typeInsights = STORE_TYPE_INSIGHTS[storeType] ?? STORE_TYPE_INSIGHTS.grocery;
  const categoryInsights = category ? (CATEGORY_INSIGHTS[category] ?? []) : [];

  const combined = [...typeInsights, ...categoryInsights];
  const unique = Array.from(new Set(combined));
  const selected = shuffleAndPick(unique, 3);

  const hasActivity = (communityDeals?.length ?? 0) > 0;

  return selected.map((text, i) => ({
    text,
    confidence: hasActivity
      ? (i === 0 ? 'high' : 'medium')
      : (i === 0 ? 'medium' : 'low'),
  }));
}

export function getStoreTypeLabel(storeName: string): string {
  const storeType = getStoreType(storeName);
  const labels: Record<StoreType, string> = {
    grocery: 'Grocery Store',
    warehouse: 'Warehouse Club',
    discount: 'Discount Grocery',
    convenience: 'Convenience Store',
    specialty: 'Specialty Market',
  };
  return labels[storeType];
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): string {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  if (d < 0.1) return `${Math.round(d * 5280)} ft`;
  return `${d.toFixed(1)} mi`;
}
