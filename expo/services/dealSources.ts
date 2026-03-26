import { StoreBrandSource } from '@/types';

export const STORE_BRANDS: StoreBrandSource[] = [
  {
    slug: 'home-depot',
    name: 'Home Depot',
    category: 'deals',
    feedUrls: [
      'https://www.homedepot.com/c/deals',
      'https://www.homedepot.com/b/Tools/Special-Values/N-5yc1vZc1xy',
    ],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/TheHomeDepot.svg/220px-TheHomeDepot.svg.png',
    websiteUrl: 'https://www.homedepot.com',
  },
  {
    slug: 'lowes',
    name: "Lowe's",
    category: 'deals',
    feedUrls: [
      'https://www.lowes.com/l/shop/deals-of-the-day',
      'https://www.lowes.com/l/Tools/shop-all-tool-deals/4294857975',
    ],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Lowes_logo.svg/220px-Lowes_logo.svg.png',
    websiteUrl: 'https://www.lowes.com',
  },
  {
    slug: 'ace-hardware',
    name: 'Ace Hardware',
    category: 'budget',
    feedUrls: [
      'https://www.acehardware.com/departments/deals-and-savings',
    ],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Ace_Hardware_Logo.svg/220px-Ace_Hardware_Logo.svg.png',
    websiteUrl: 'https://www.acehardware.com',
  },
  {
    slug: 'harbor-freight',
    name: 'Harbor Freight',
    category: 'budget',
    feedUrls: [
      'https://www.harborfreight.com/deals',
      'https://www.harborfreight.com/super-coupons.html',
    ],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Harbor_Freight_Tools_logo.svg/220px-Harbor_Freight_Tools_logo.svg.png',
    websiteUrl: 'https://www.harborfreight.com',
  },
  {
    slug: 'menards',
    name: 'Menards',
    category: 'bulk',
    feedUrls: [
      'https://www.menards.com/main/deals-on-tools/c-12655.htm',
    ],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a3/Menards_logo.svg/220px-Menards_logo.svg.png',
    websiteUrl: 'https://www.menards.com',
  },
  {
    slug: 'tractor-supply',
    name: 'Tractor Supply Co.',
    category: 'deals',
    feedUrls: [
      'https://www.tractorsupply.com/tsc/cms/deals',
    ],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Tractor_Supply_Company_logo.svg/220px-Tractor_Supply_Company_logo.svg.png',
    websiteUrl: 'https://www.tractorsupply.com',
  },
  {
    slug: 'northern-tool',
    name: 'Northern Tool',
    category: 'deals',
    feedUrls: [
      'https://www.northerntool.com/shop/tools/deals',
    ],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/60/Northern_Tool_logo.svg/220px-Northern_Tool_logo.svg.png',
    websiteUrl: 'https://www.northerntool.com',
  },
  {
    slug: 'walmart-hardware',
    name: 'Walmart',
    category: 'budget',
    feedUrls: [
      'https://www.walmart.com/shop/deals/home-improvement',
      'https://www.walmart.com/browse/tools/4044_1029071',
    ],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Walmart_logo.svg/220px-Walmart_logo.svg.png',
    websiteUrl: 'https://www.walmart.com',
  },
  {
    slug: 'aldi',
    name: 'Aldi',
    category: 'budget',
    feedUrls: [
      'https://www.aldi.us/weekly-specials/this-weeks-aldi-finds/',
    ],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/ALDI_2017.svg/220px-ALDI_2017.svg.png',
    websiteUrl: 'https://www.aldi.us',
  },
  {
    slug: 'costco',
    name: 'Costco',
    category: 'bulk',
    feedUrls: [
      'https://www.costco.com/warehouse-savings.html',
      'https://www.costco.com/grocery-household.html',
    ],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Costco_Wholesale_logo_2010-10-26.svg/220px-Costco_Wholesale_logo_2010-10-26.svg.png',
    websiteUrl: 'https://www.costco.com',
  },
  {
    slug: 'kroger',
    name: 'Kroger',
    category: 'deals',
    feedUrls: [
      'https://www.kroger.com/savings/cl/deals/',
    ],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Kroger_logo_%281961-2019%29.svg/220px-Kroger_logo_%281961-2019%29.svg.png',
    websiteUrl: 'https://www.kroger.com',
  },
  {
    slug: 'trader-joes',
    name: "Trader Joe's",
    category: 'budget',
    feedUrls: [
      'https://www.traderjoes.com/home/products/category/food-8',
    ],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/1/13/Trader_Joe%27s_logo.svg/220px-Trader_Joe%27s_logo.svg.png',
    websiteUrl: 'https://www.traderjoes.com',
  },
  {
    slug: 'whole-foods',
    name: 'Whole Foods',
    category: 'healthy',
    feedUrls: [
      'https://www.wholefoodsmarket.com/sales-flyer',
    ],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Whole_Foods_Market_201x_logo.svg/220px-Whole_Foods_Market_201x_logo.svg.png',
    websiteUrl: 'https://www.wholefoodsmarket.com',
  },
  {
    slug: 'sprouts',
    name: 'Sprouts',
    category: 'healthy',
    feedUrls: [
      'https://www.sprouts.com/weekly-ads/',
    ],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c4/Sprouts_Farmers_Market_logo.svg/220px-Sprouts_Farmers_Market_logo.svg.png',
    websiteUrl: 'https://www.sprouts.com',
  },
  {
    slug: 'target-grocery',
    name: 'Target',
    category: 'deals',
    feedUrls: [
      'https://www.target.com/c/grocery-deals/-/N-k4uyq',
      'https://www.target.com/c/food-beverage/-/N-5xt0a',
    ],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Target_Corporation_logo_%28vector%29.svg/220px-Target_Corporation_logo_%28vector%29.svg.png',
    websiteUrl: 'https://www.target.com',
  },
  {
    slug: 'walmart-grocery',
    name: 'Walmart Grocery',
    category: 'budget',
    feedUrls: [
      'https://www.walmart.com/shop/deals/food',
      'https://www.walmart.com/browse/food/976759',
    ],
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Walmart_logo.svg/220px-Walmart_logo.svg.png',
    websiteUrl: 'https://www.walmart.com',
  },
];

export const BRAND_CATEGORY_MAP: Record<string, 'Deals' | 'Budget' | 'Healthy' | 'Bulk'> = {
  'home-depot': 'Deals',
  'lowes': 'Deals',
  'ace-hardware': 'Budget',
  'harbor-freight': 'Budget',
  'menards': 'Bulk',
  'tractor-supply': 'Deals',
  'northern-tool': 'Deals',
  'walmart-hardware': 'Budget',
  'aldi': 'Budget',
  'costco': 'Bulk',
  'kroger': 'Deals',
  'trader-joes': 'Budget',
  'whole-foods': 'Healthy',
  'sprouts': 'Healthy',
  'target-grocery': 'Deals',
  'walmart-grocery': 'Budget',
};

export function getStoreBrandBySlug(slug: string): StoreBrandSource | undefined {
  return STORE_BRANDS.find((b) => b.slug === slug);
}

export function getStoreBrandByName(name: string): StoreBrandSource | undefined {
  const lower = name.toLowerCase().trim();
  return STORE_BRANDS.find(
    (b) => b.name.toLowerCase() === lower || b.slug === lower
  );
}
