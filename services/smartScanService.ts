import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { preprocessReceiptImage } from '@/services/receiptImagePreprocess';

export type SmartScanItemType = 'food' | 'grocery' | 'household' | 'furniture' | 'fashion' | 'electronics' | 'general' | 'receipt' | 'unknown';

const classificationSchema = z.object({
  item_type: z.enum(['food', 'grocery', 'household', 'furniture', 'fashion', 'electronics', 'general', 'receipt', 'unknown']),
  confidence: z.number().min(0).max(1),
  is_receipt: z.boolean(),
  item_name: z.string(),
  category: z.string(),
  secondary_type: z.enum(['food', 'grocery', 'household', 'furniture', 'fashion', 'electronics', 'general', 'receipt', 'unknown']).nullable(),
  visual_cues: z.array(z.string()),
  short_summary: z.string(),
  image_description: z.string(),
});

const foodDetailsSchema = z.object({
  serving_size: z.string(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  fiber_g: z.number(),
  sugar_g: z.number(),
  key_nutrients: z.array(z.string()),
  health_benefits: z.array(z.string()),
  health_summary: z.string(),
  quick_tip: z.string(),
  estimated_price: z.string().nullable(),
  price_range: z.string().nullable(),
  unit_price: z.string().nullable(),
  value_rating: z.enum(['great', 'good', 'average', 'poor']).nullable(),
  budget_insight: z.string().nullable(),
  cheaper_alternative: z.string().nullable(),
  tags: z.array(z.string()),
  complementary_items: z.array(z.string()),
});

const groceryDetailsSchema = z.object({
  brand: z.string().nullable(),
  package_size: z.string().nullable(),
  estimated_price: z.string().nullable(),
  price_range: z.string().nullable(),
  unit_price: z.string().nullable(),
  value_rating: z.enum(['great', 'good', 'average', 'poor']).nullable(),
  budget_insight: z.string().nullable(),
  cheaper_alternative: z.string().nullable(),
  what_else_needed: z.array(z.string()),
  total_cost_note: z.string().nullable(),
  tags: z.array(z.string()),
  complementary_items: z.array(z.string()),
});

const householdDetailsSchema = z.object({
  item_description: z.string(),
  subcategory: z.enum(['tools', 'fitness', 'kitchenware', 'cleaning', 'bathroom', 'decor', 'garden', 'storage', 'lighting', 'small_appliance', 'other']),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  material: z.string().nullable(),
  condition: z.enum(['new', 'like-new', 'good', 'fair', 'worn']).nullable(),
  estimated_price: z.string().nullable(),
  price_range: z.string().nullable(),
  estimated_resale_value: z.string().nullable(),
  value_rating: z.enum(['great', 'good', 'average', 'poor']).nullable(),
  value_verdict: z.enum(['strong', 'good', 'fair', 'weak']).nullable(),
  value_reasoning: z.string().nullable(),
  comparable_model: z.string().nullable(),
  resale_suggestion: z.string().nullable(),
  resale_potential: z.enum(['high', 'moderate', 'low', 'minimal']).nullable(),
  buy_new_vs_used: z.string().nullable(),
  set_or_pair_note: z.string().nullable(),
  shipping_note: z.string().nullable(),
  local_pickup_recommendation: z.boolean().nullable(),
  commodity_vs_collectible: z.enum(['commodity', 'collectible', 'niche']).nullable(),
  practical_recommendation: z.string(),
  budget_insight: z.string().nullable(),
  cheaper_alternative: z.string().nullable(),
  best_selling_platform: z.string().nullable(),
  care_tip: z.string().nullable(),
  tags: z.array(z.string()),
  complementary_items: z.array(z.string()),
});

const fashionDetailsSchema = z.object({
  subcategory: z.enum(['shoes', 'clothing', 'outerwear', 'accessories', 'bags', 'jewelry', 'activewear', 'other']),
  item_description: z.string(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  material: z.string().nullable(),
  color: z.string().nullable(),
  secondary_color: z.string().nullable(),
  pattern: z.string().nullable(),
  fit: z.string().nullable(),
  sleeve_length: z.string().nullable(),
  neckline: z.string().nullable(),
  closure_type: z.string().nullable(),
  style: z.string().nullable(),
  condition: z.enum(['new', 'like-new', 'good', 'fair', 'worn']).nullable(),
  condition_notes: z.string().nullable(),
  cleaning_recommendation: z.enum(['none', 'light', 'moderate', 'professional']).nullable(),
  cleaning_reason: z.string().nullable(),
  gender_target: z.enum(['men', 'women', 'unisex', 'kids']).nullable(),
  estimated_retail_price: z.string().nullable(),
  estimated_resale_value: z.string().nullable(),
  price_range: z.string().nullable(),
  resale_demand: z.enum(['high', 'moderate', 'low', 'minimal']).nullable(),
  best_selling_platform: z.string().nullable(),
  value_rating: z.enum(['great', 'good', 'average', 'poor']).nullable(),
  budget_insight: z.string().nullable(),
  cheaper_alternative: z.string().nullable(),
  care_tip: z.string().nullable(),
  value_verdict: z.enum(['strong', 'good', 'fair', 'weak']).nullable(),
  value_reasoning: z.string().nullable(),
  comparable_model: z.string().nullable(),
  resale_suggestion: z.string().nullable(),
  tags: z.array(z.string()),
  complementary_items: z.array(z.string()),
});

const electronicsDetailsSchema = z.object({
  product_type: z.string(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  storage_or_spec: z.string().nullable(),
  condition: z.enum(['new', 'like-new', 'good', 'fair', 'poor']).nullable(),
  estimated_retail_price: z.string().nullable(),
  estimated_resale_value: z.string().nullable(),
  price_range: z.string().nullable(),
  depreciation_note: z.string().nullable(),
  resale_demand: z.enum(['high', 'moderate', 'low', 'minimal']).nullable(),
  value_rating: z.enum(['great', 'good', 'average', 'poor']).nullable(),
  value_verdict: z.enum(['strong', 'good', 'fair', 'weak']).nullable(),
  value_reasoning: z.string().nullable(),
  comparable_model: z.string().nullable(),
  resale_suggestion: z.string().nullable(),
  budget_insight: z.string().nullable(),
  cheaper_alternative: z.string().nullable(),
  best_selling_platform: z.string().nullable(),
  care_tip: z.string().nullable(),
  tags: z.array(z.string()),
  complementary_items: z.array(z.string()),
});

const generalDetailsSchema = z.object({
  item_description: z.string(),
  subcategory: z.string(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  material: z.string().nullable(),
  color: z.string().nullable(),
  condition: z.enum(['new', 'like-new', 'good', 'fair', 'worn', 'damaged']).nullable(),
  estimated_retail_price: z.string().nullable(),
  estimated_resale_value: z.string().nullable(),
  price_range: z.string().nullable(),
  value_rating: z.enum(['great', 'good', 'average', 'poor']).nullable(),
  value_verdict: z.enum(['strong', 'good', 'fair', 'weak']).nullable(),
  value_reasoning: z.string().nullable(),
  resale_demand: z.enum(['high', 'moderate', 'low', 'minimal']).nullable(),
  resale_suggestion: z.string().nullable(),
  best_selling_platform: z.string().nullable(),
  comparable_item: z.string().nullable(),
  budget_insight: z.string().nullable(),
  cheaper_alternative: z.string().nullable(),
  care_tip: z.string().nullable(),
  fun_fact: z.string().nullable(),
  practical_tip: z.string().nullable(),
  age_or_era: z.string().nullable(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'very-rare', 'unique']).nullable(),
  tags: z.array(z.string()),
  complementary_items: z.array(z.string()),
});

const furnitureDetailsSchema = z.object({
  item_type_specific: z.string(),
  material: z.string().nullable(),
  finish_color: z.string().nullable(),
  style: z.string().nullable(),
  estimated_dimensions: z.string().nullable(),
  estimated_price_range: z.string().nullable(),
  estimated_retail_price: z.string().nullable(),
  estimated_resale_value: z.string().nullable(),
  value_level: z.enum(['budget', 'mid-range', 'premium']).nullable(),
  value_rating: z.enum(['great', 'good', 'average', 'poor']).nullable(),
  resale_demand: z.enum(['high', 'moderate', 'low', 'minimal']).nullable(),
  value_verdict: z.enum(['strong', 'good', 'fair', 'weak']).nullable(),
  value_reasoning: z.string().nullable(),
  comparable_model: z.string().nullable(),
  resale_suggestion: z.string().nullable(),
  best_selling_platform: z.string().nullable(),
  use_case: z.string().nullable(),
  room_fit: z.string().nullable(),
  budget_insight: z.string().nullable(),
  cheaper_alternative: z.string().nullable(),
  care_tip: z.string().nullable(),
  assembly_required: z.boolean().nullable(),
  assembly_difficulty: z.enum(['easy', 'moderate', 'complex']).nullable(),
  estimated_build_time: z.string().nullable(),
  people_needed: z.enum(['1', '2', '2+']).nullable(),
  likely_tools_needed: z.array(z.string()),
  likely_parts: z.array(z.string()),
  mounting_type: z.enum(['wall-mounted', 'freestanding', 'modular', 'flat-pack', 'unknown']).nullable(),
  assembly_summary: z.string().nullable(),
  similar_products: z.string().nullable(),
  extra_purchase_items: z.array(z.object({
    item: z.string(),
    estimated_cost: z.string().nullable(),
    reason: z.string(),
  })),
  total_estimated_cost: z.string().nullable(),
  worth_it_verdict: z.string().nullable(),
  room_fit_labels: z.array(z.string()),
  matching_products: z.array(z.string()),
  wall_anchor_note: z.string().nullable(),
  setup_notes: z.string().nullable(),
  long_term_value: z.string().nullable(),
  tags: z.array(z.string()),
  complementary_items: z.array(z.string()),
});

const smartScanSchema = z.object({
  item_type: z.enum(['food', 'grocery', 'household', 'furniture', 'fashion', 'electronics', 'general', 'receipt', 'unknown']),
  confidence: z.number().min(0).max(1),
  item_name: z.string(),
  category: z.string(),
  food_details: foodDetailsSchema.nullable(),
  grocery_details: groceryDetailsSchema.nullable(),
  household_details: householdDetailsSchema.nullable(),
  furniture_details: furnitureDetailsSchema.nullable(),
  fashion_details: fashionDetailsSchema.nullable(),
  electronics_details: electronicsDetailsSchema.nullable(),
  general_details: generalDetailsSchema.nullable(),
  is_receipt: z.boolean(),
});

export type SmartScanResult = z.infer<typeof smartScanSchema> & {
  reference_image_url?: string | null;
  short_summary?: string;
  image_description?: string;
  scanned_image_uri?: string;
};

function extractDollarAmount(price: string | null): number | null {
  if (!price) return null;
  const match = price.replace(/[^0-9.]/g, '');
  const val = parseFloat(match);
  return isNaN(val) ? null : val;
}

const NON_RESELLABLE_SIGNALS = [
  'paper bag', 'plastic bag', 'napkin', 'wrapper', 'straw', 'cup sleeve',
  'takeout container', 'disposable', 'single-use', 'paper plate', 'paper cup',
  'grocery bag', 'trash bag', 'ziplock', 'aluminum foil', 'cling wrap',
  'paper towel', 'tissue', 'cotton ball', 'q-tip', 'band-aid',
  'toothpick', 'rubber band', 'twist tie', 'bread tie',
];

const LOW_RESALE_CATEGORIES = [
  'cleaning', 'bathroom', 'disposable', 'consumable', 'toiletries',
  'hygiene', 'paper goods', 'food storage',
];

function normalizeResaleValue(
  resale: string | null,
  retail: string | null,
  itemName: string,
  category: string,
  condition: string | null
): string | null {
  if (!resale) return null;
  const combined = (itemName + ' ' + category).toLowerCase();
  if (NON_RESELLABLE_SIGNALS.some(s => combined.includes(s))) {
    console.log('[SmartScan] Non-resellable item detected, nullifying resale');
    return null;
  }
  if (LOW_RESALE_CATEGORIES.some(s => combined.includes(s))) {
    console.log('[SmartScan] Low-resale category detected, nullifying resale');
    return null;
  }
  const resaleVal = extractDollarAmount(resale);
  const retailVal = extractDollarAmount(retail);
  if (resaleVal === null || resaleVal < 1) return null;
  if (retailVal !== null && retailVal > 0) {
    if (resaleVal > retailVal * 1.15) {
      const capped = Math.round(retailVal * 0.7 * 100) / 100;
      return `${capped.toFixed(2)}`;
    }
    if (resaleVal > retailVal * 0.95 && (condition === 'good' || condition === 'fair' || condition === 'worn')) {
      const adjusted = Math.round(retailVal * 0.55 * 100) / 100;
      return `${adjusted.toFixed(2)}`;
    }
  }
  if (retailVal !== null && retailVal < 5 && resaleVal > 3) return null;
  if (retailVal !== null && retailVal < 15 && resaleVal > retailVal * 0.8) {
    const capped = Math.round(retailVal * 0.4 * 100) / 100;
    return capped >= 1 ? `${capped.toFixed(2)}` : null;
  }
  return resale;
}

function normalizePriceField(price: string | null): string | null {
  if (!price) return null;
  const lower = price.toLowerCase().trim();
  if (['free', 'free with purchase', 'n/a', 'none', 'not sold separately', 'not for sale', 'included', 'complimentary'].includes(lower) || lower.includes('free with')) {
    return null;
  }
  const numMatch = lower.replace(/[^0-9.]/g, '');
  const numVal = parseFloat(numMatch);
  if (!isNaN(numVal) && numVal < 0.05) return null;
  return price;
}

const PACKAGING_SIGNALS = [
  'paper bag', 'shopping bag', 'takeout bag', 'carry bag', 'brown bag',
  'plastic bag', 'grocery bag', 'to-go bag', 'carryout bag', 'delivery bag',
  'wrapper', 'packaging', 'box only', 'empty box', 'shipping box',
  'receipt holder', 'napkin', 'cup sleeve',
];

const RESTAURANT_PACKAGING_BRANDS = [
  'chipotle', 'mcdonalds', "mcdonald's", 'starbucks', 'chick-fil-a',
  'taco bell', 'wendy', 'burger king', 'subway', 'popeyes',
  'panera', 'five guys', 'shake shack', 'in-n-out', 'domino',
  'pizza hut', 'panda express', 'kfc', 'dunkin', 'tim hortons',
];

function isPackagingItem(itemName: string, category: string, cues: string[]): boolean {
  const combined = (itemName + ' ' + category + ' ' + cues.join(' ')).toLowerCase();
  return PACKAGING_SIGNALS.some(s => combined.includes(s)) && RESTAURANT_PACKAGING_BRANDS.some(s => combined.includes(s));
}

function stabilizePricing(result: SmartScanResult): SmartScanResult {
  const stabilized = { ...result };
  const cues: string[] = [];
  const isPackaging = isPackagingItem(stabilized.item_name ?? '', stabilized.category ?? '', cues);

  if (isPackaging) {
    console.log('[SmartScan] Packaging item detected — nullifying prices');
    if (stabilized.food_details) {
      stabilized.food_details = { ...stabilized.food_details, estimated_price: null, price_range: null, unit_price: null, value_rating: null, budget_insight: 'This is restaurant packaging, not a purchasable item.', cheaper_alternative: null };
    }
    if (stabilized.grocery_details) {
      stabilized.grocery_details = { ...stabilized.grocery_details, estimated_price: null, price_range: null, unit_price: null, value_rating: null, budget_insight: 'This is restaurant packaging, not a purchasable item.', cheaper_alternative: null };
    }
    if (stabilized.general_details) {
      stabilized.general_details = { ...stabilized.general_details, estimated_retail_price: null, estimated_resale_value: null, price_range: null, value_rating: null, budget_insight: 'This is restaurant packaging, not a purchasable item.', cheaper_alternative: null };
    }
    if (stabilized.household_details) {
      stabilized.household_details = { ...stabilized.household_details, estimated_price: null, price_range: null, estimated_resale_value: null, value_rating: null, budget_insight: 'This is restaurant packaging, not a purchasable item.', cheaper_alternative: null };
    }
    return stabilized;
  }

  if (stabilized.food_details) {
    stabilized.food_details = { ...stabilized.food_details, estimated_price: normalizePriceField(stabilized.food_details.estimated_price), price_range: normalizePriceField(stabilized.food_details.price_range), unit_price: normalizePriceField(stabilized.food_details.unit_price) };
  }
  if (stabilized.grocery_details) {
    stabilized.grocery_details = { ...stabilized.grocery_details, estimated_price: normalizePriceField(stabilized.grocery_details.estimated_price), price_range: normalizePriceField(stabilized.grocery_details.price_range), unit_price: normalizePriceField(stabilized.grocery_details.unit_price) };
  }
  if (stabilized.household_details) {
    const hd = stabilized.household_details;
    stabilized.household_details = { ...hd, estimated_price: normalizePriceField(hd.estimated_price), price_range: normalizePriceField(hd.price_range), estimated_resale_value: normalizeResaleValue(hd.estimated_resale_value, hd.estimated_price, stabilized.item_name, stabilized.category, hd.condition) };
  }
  if (stabilized.fashion_details) {
    const fd = stabilized.fashion_details;
    stabilized.fashion_details = { ...fd, estimated_retail_price: normalizePriceField(fd.estimated_retail_price), estimated_resale_value: normalizeResaleValue(fd.estimated_resale_value, fd.estimated_retail_price, stabilized.item_name, stabilized.category, fd.condition), price_range: normalizePriceField(fd.price_range) };
  }
  if (stabilized.electronics_details) {
    const ed = stabilized.electronics_details;
    stabilized.electronics_details = { ...ed, estimated_retail_price: normalizePriceField(ed.estimated_retail_price), estimated_resale_value: normalizeResaleValue(ed.estimated_resale_value, ed.estimated_retail_price, stabilized.item_name, stabilized.category, ed.condition), price_range: normalizePriceField(ed.price_range) };
  }
  if (stabilized.furniture_details) {
    const fud = stabilized.furniture_details;
    stabilized.furniture_details = { ...fud, estimated_retail_price: normalizePriceField(fud.estimated_retail_price), estimated_resale_value: normalizeResaleValue(fud.estimated_resale_value, fud.estimated_retail_price, stabilized.item_name, stabilized.category, null), estimated_price_range: normalizePriceField(fud.estimated_price_range) };
  }
  if (stabilized.general_details) {
    const gd = stabilized.general_details;
    stabilized.general_details = { ...gd, estimated_retail_price: normalizePriceField(gd.estimated_retail_price), estimated_resale_value: normalizeResaleValue(gd.estimated_resale_value, gd.estimated_retail_price, stabilized.item_name, stabilized.category, gd.condition), price_range: normalizePriceField(gd.price_range) };
  }

  return stabilized;
}

const CLASSIFICATION_PROMPT = `You are an expert universal product identifier. Analyze ONLY what is visible in the image. Do NOT default to any category — pick the single best match.

STEP 1 — DETERMINE WHAT THE OBJECT ACTUALLY IS:
Before choosing a category, describe to yourself what you literally see: shape, color, material, text, labels, packaging, context. Then match to a category.

STEP 2 — PICK EXACTLY ONE CATEGORY:
- "receipt" = printed receipt, invoice, price tag with totals, shelf label with barcodes/prices. Set is_receipt=true.
- "food" = prepared/fresh food, meals, fruits, vegetables, cooked dishes, snacks being eaten, bakery items, food court items, restaurant plates, loose produce
- "grocery" = packaged food products — cans, boxes, bottles, bags, jars, frozen meals, condiments, cereal, pasta, chips, soda, candy bars, protein bars, anything with a nutrition label or barcode from a grocery aisle
- "fashion" = ANY wearable item: shoes, sneakers, boots, sandals, clothing, shirts, pants, jackets, coats, dresses, hats, bags, purses, backpacks, wallets, watches, jewelry, belts, scarves, sunglasses, gloves
- "electronics" = phones, laptops, tablets, headphones, earbuds, speakers, gaming consoles, controllers, chargers, cables, monitors, keyboards, cameras, smart home devices, drones, power banks
- "furniture" = LARGE home items that typically sit on the floor or mount to walls: desks, tables, chairs, sofas, couches, beds, shelving units, bookshelves, cabinets, wardrobes, dressers, nightstands, TV stands, benches. Must require placement/assembly in a room.
- "household" = smaller home/lifestyle items: kitchenware, pots, pans, utensils, storage containers, lamps, rugs, curtains, pillows, towels, blankets, cleaning supplies, tools (drills, hammers), fitness equipment (dumbbells, kettlebells, yoga mats), bathroom items, candles, decor, beauty/skincare/makeup products, small appliances (toasters, blenders, coffee makers)
- "general" = identifiable item that doesn't clearly fit the above
- "unknown" = truly unrecognizable, very blurry, completely dark, or abstract with no identifiable object

MISCLASSIFICATION RULES — CRITICAL:
1. Spaghetti, pasta, cereal, canned food, snack bags, drink bottles = "grocery". NEVER "furniture" or "household".
2. Shoes, sneakers, boots, sandals = "fashion". NEVER "furniture" or "household".
3. Dumbbells, kettlebells, yoga mats, resistance bands = "household". NEVER "furniture".
4. Kitchen utensils, pans, small appliances = "household". NEVER "furniture".
5. Skincare, moisturizer, shampoo, makeup = "household". NEVER "grocery".
6. Chairs, desks, shelves, sofas = "furniture". NEVER "household".
7. Phones, laptops, headphones, earbuds = "electronics". NEVER "general".
8. Clothing on hangers or folded = "fashion". NEVER "household".
9. If you see food INSIDE a bag/box with packaging = "grocery". If food is loose/plated = "food".
10. Do NOT classify based on brand alone. Nike shoe = fashion. Nike shipping box = general.
11. If the image shows a food product but your first instinct is "furniture" — STOP and reconsider. Food is never furniture.
12. If the image shows a shoe/sneaker but your first instinct is "furniture" — STOP and reconsider. Shoes are never furniture.

NAMING:
- Read visible text/labels/logos FIRST. Use the actual product name if readable.
- Include brand only if visible on the item. Never invent brands.
- Use descriptive names like "Barilla Spaghetti" or "Nike Air Max 90" — not "Item" or "Product".

CONFIDENCE (be strictly honest):
- 0.85-0.95: Clear product, visible label/brand, obvious category, no ambiguity
- 0.70-0.84: Clear product, obvious category, no label but recognizable
- 0.50-0.69: Partially visible, angled, or slightly ambiguous
- 0.35-0.49: Blurry or dark but shape identifiable
- Below 0.35: Very unclear, guessing
- NEVER give 0.85+ if category could be something else
- NEVER give 0.75+ for blurry/distant/dark photos
- If you had to override your first instinct, cap confidence at 0.65

short_summary: 1-2 sentence summary of the item and its key use or characteristic.
image_description: Detailed visual description — color, shape, material, texture, brand elements, notable features, approximate size. Specific enough to recreate as a clean product photo.`;

function getDetailPrompt(itemType: SmartScanItemType): string {
  const base = `You are a product analyzer. Provide accurate, category-appropriate details about this item.

PRICING RULES:
- Use real current retail prices as of March 2026. Do not invent prices.
- Price range should be tight (within ~15% of estimate).
- Use current 2026 market pricing — not outdated or historical prices.
- If item is packaging, set price fields to null.
- Never output "Free" or "$0.00" — set to null instead.
- Use dollar format like "$X.XX" for real prices.

RESALE VALUE RULES (CRITICAL — must reflect current 2026 market):
- Resale value must reflect the CURRENT secondhand market price as of March 2026.
- Use real current resale prices from platforms like eBay, StockX, Poshmark, Facebook Marketplace, OfferUp, Mercari, Grailed.
- Resale must be LOWER than retail unless the item is a limited edition, rare, or hyped release with genuine above-retail demand.
- For hyped/limited items (e.g. sold-out sneakers, rare collectibles), resale CAN exceed retail — use real current aftermarket prices.
- Cheap items under $10 usually have no resale value — set to null.
- Consumables, food, groceries, and single-use items have NO resale value.
- Only provide resale for items people actually buy and sell secondhand.
- If you are unsure of the current resale price, give a conservative estimate rather than inflating.
- Never use old or outdated resale prices — always estimate based on current 2026 demand and availability.\n\n`;

  switch (itemType) {
    case 'food':
      return base + `Analyze this FOOD item. Fill food_details ONLY. Set all other detail fields to null.
- Accurate nutrition per serving (calories, protein, carbs, fat, fiber, sugar)
- key_nutrients, health_benefits (2+ items), health_summary, quick_tip
- estimated_price, price_range, value_rating, budget_insight
- tags and complementary_items
DO NOT fill furniture_details, fashion_details, electronics_details, household_details, or general_details.`;

    case 'grocery':
      return base + `Analyze this GROCERY/PACKAGED FOOD item. Fill grocery_details ONLY. Set all other detail fields to null.
- brand (from label), package_size, estimated_price, price_range, unit_price
- value_rating, budget_insight, cheaper_alternative
- what_else_needed, tags, complementary_items
DO NOT fill furniture_details, fashion_details, electronics_details, household_details, or general_details.`;

    case 'household':
      return base + `Analyze this HOUSEHOLD item. Fill household_details ONLY. Set all other detail fields to null.
- item_description, subcategory (tools/fitness/kitchenware/cleaning/bathroom/decor/garden/storage/lighting/small_appliance/other)
- brand, model, material, condition
- estimated_price, price_range, estimated_resale_value (only if item has real resale market)
- practical_recommendation, care_tip
- tags, complementary_items
DO NOT fill furniture_details, fashion_details, electronics_details, food_details, grocery_details, or general_details.`;

    case 'fashion':
      return base + `Analyze this FASHION item. Fill fashion_details ONLY. Set all other detail fields to null.
- subcategory (shoes/clothing/outerwear/accessories/bags/jewelry/activewear/other)
- item_description, brand (from visible logos ONLY), model, material, color, style, condition
- For shoes: analyze silhouette, sole, upper. Set sleeve_length/neckline to null.
- For clothing: fit, pattern, neckline, sleeve_length if visible
- estimated_retail_price, estimated_resale_value, resale_demand
- value_verdict, care_tip, tags, complementary_items
DO NOT fill furniture_details, electronics_details, food_details, grocery_details, household_details, or general_details.`;

    case 'electronics':
      return base + `Analyze this ELECTRONICS item. Fill electronics_details ONLY. Set all other detail fields to null.
- product_type, brand, model, storage_or_spec, condition
- estimated_retail_price, estimated_resale_value, depreciation_note
- resale_demand, value_verdict, care_tip
- tags, complementary_items
DO NOT fill furniture_details, fashion_details, food_details, grocery_details, household_details, or general_details.`;

    case 'furniture':
      return base + `Analyze this FURNITURE item. Fill furniture_details ONLY. Set all other detail fields to null.
- item_type_specific, material, finish_color, style, estimated_dimensions
- estimated_retail_price, estimated_price_range, value_level, value_rating
- assembly_required, assembly_difficulty, estimated_build_time, people_needed
- likely_tools_needed, likely_parts, mounting_type, assembly_summary
- use_case, room_fit, room_fit_labels, matching_products
- extra_purchase_items, total_estimated_cost, worth_it_verdict
- care_tip, setup_notes, wall_anchor_note, long_term_value
- tags, complementary_items
If you recognize an IKEA product, use real IKEA product names and pricing.
DO NOT fill fashion_details, electronics_details, food_details, grocery_details, household_details, or general_details.`;

    case 'general':
      return base + `Analyze this item. Fill general_details ONLY. Set all other detail fields to null.
- item_description, subcategory, brand, model, material, color, condition
- estimated_retail_price, estimated_resale_value, price_range
- value_rating, fun_fact, practical_tip, care_tip
- tags, complementary_items
DO NOT fill furniture_details, fashion_details, electronics_details, food_details, grocery_details, or household_details.`;

    default:
      return base + `Do your best to analyze this item. Fill general_details. Set all other detail fields to null.`;
  }
}

async function callWithRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries: number = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[SmartScan] ${label} attempt ${attempt}/${maxRetries}`);
      const result = await fn();
      if (result) return result;
      console.log(`[SmartScan] ${label} returned empty, retrying...`);
    } catch (err) {
      lastError = err;
      console.log(`[SmartScan] ${label} attempt ${attempt} failed:`, err);
      if (attempt < maxRetries) {
        const delay = 800 * attempt;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError ?? new Error(`${label} failed after ${maxRetries} retries`);
}

function fixItemType(classification: z.infer<typeof classificationSchema>): z.infer<typeof classificationSchema> {
  const fixed = { ...classification };
  const name = (fixed.item_name ?? '').toLowerCase();
  const cat = (fixed.category ?? '').toLowerCase();
  const cues = (fixed.visual_cues ?? []).map(c => c.toLowerCase()).join(' ');
  const combined = name + ' ' + cat + ' ' + cues;

  if (fixed.item_type === 'unknown' || fixed.item_type === 'receipt') {
    return fixed;
  }

  const FOOD_SIGNALS = ['spaghetti', 'pasta', 'rice', 'cereal', 'soup', 'sauce', 'bread', 'chips', 'cookie', 'cracker', 'candy', 'chocolate', 'granola', 'yogurt', 'milk', 'juice', 'soda', 'water bottle', 'snack', 'nutrition facts', 'ingredients:', 'serving size', 'calories per', 'canned', 'frozen meal', 'instant', 'ramen', 'noodle', 'protein bar', 'energy drink', 'oatmeal', 'flour', 'sugar', 'honey', 'jam', 'peanut butter', 'ketchup', 'mustard', 'mayo', 'vinegar', 'olive oil', 'cooking oil', 'spice', 'seasoning', 'tea bag', 'coffee ground', 'coffee bean', 'creamer', 'almond milk', 'oat milk', 'frozen pizza', 'ice cream', 'popcorn', 'pretzel', 'trail mix', 'beef jerky', 'tuna can', 'sardine', 'salsa', 'hummus', 'tortilla', 'wrap', 'bagel', 'muffin', 'croissant', 'macaroni', 'penne', 'linguine', 'fettuccine', 'orzo', 'ravioli', 'lasagna', 'tomato sauce', 'marinara', 'alfredo', 'barilla', 'de cecco', 'ronzoni', 'kraft', 'campbells', 'progresso'];
  const FASHION_SIGNALS = ['shoe', 'sneaker', 'boot', 'heel', 'sandal', 'sole', 'lace', 'swoosh', 'nike', 'adidas', 'jordan', 'puma', 'vans', 'converse', 'new balance', 'shirt', 'hoodie', 'jacket', 'pants', 'jeans', 'dress', 'hat', 'handbag', 'purse', 'wallet', 'watch', 'belt', 'gucci', 'louis vuitton', 'coach', 'yeezy', 'air max', 'air force', 'reebok', 'asics', 'skechers', 'under armour', 'lululemon', 'zara', 'h&m', 'uniqlo', 'polo', 'ralph lauren', 'tommy hilfiger', 'levis', 'wrangler', 'north face', 'patagonia', 'columbia', 'timberland', 'birkenstock', 'crocs', 'ugg', 'ray-ban', 'oakley', 'skirt', 'blazer', 'cardigan', 'sweater', 'vest', 'scarf', 'glove', 'beanie', 'cap', 'snapback', 'backpack', 'tote bag', 'crossbody', 'loafer', 'oxford', 'stiletto', 'flip flop', 'slipper', 'running shoe', 'basketball shoe', 'tennis shoe', 'trail shoe', 'cleat', 'footwear', 'kicks', 'trainers'];
  const ELECTRONICS_SIGNALS = ['iphone', 'ipad', 'macbook', 'airpod', 'samsung galaxy', 'playstation', 'ps5', 'ps4', 'xbox', 'nintendo', 'switch', 'laptop', 'tablet', 'headphones', 'earbuds', 'speaker', 'monitor', 'keyboard', 'charger', 'bose', 'jbl', 'sony', 'dell', 'hp', 'lenovo', 'asus', 'acer', 'surface', 'pixel', 'galaxy watch', 'apple watch', 'fitbit', 'garmin', 'gopro', 'drone', 'dji', 'roku', 'fire stick', 'chromecast', 'echo', 'alexa', 'google home', 'smart plug', 'ring', 'nest', 'power bank', 'usb', 'hdmi', 'mouse', 'webcam', 'microphone', 'printer', 'scanner', 'projector', 'tv', 'television', 'soundbar', 'subwoofer', 'amplifier', 'turntable', 'kindle', 'e-reader', 'smartphone', 'cell phone', 'mobile phone'];
  const FITNESS_SIGNALS = ['dumbbell', 'kettlebell', 'barbell', 'weight plate', 'resistance band', 'yoga mat', 'foam roller', 'exercise', 'gym equipment', 'pull-up bar', 'jump rope', 'ab roller', 'medicine ball', 'stability ball', 'exercise bike', 'treadmill', 'elliptical', 'rowing machine', 'bench press', 'squat rack', 'boxing glove', 'punching bag', 'weight bench', 'battle rope'];
  const FURNITURE_SIGNALS = ['desk', 'table', 'chair', 'sofa', 'couch', 'bed', 'shelf', 'shelving', 'cabinet', 'wardrobe', 'dresser', 'nightstand', 'bookcase', 'bookshelf', 'tv stand', 'bench', 'stool', 'rack', 'storage unit', 'room divider', 'ikea', 'kallax', 'billy', 'malm', 'lack', 'hemnes', 'expedit', 'poang', 'ektorp', 'detolf', 'besta', 'pax', 'alex', 'linnmon', 'micke', 'dining table', 'coffee table', 'end table', 'console table', 'ottoman', 'recliner', 'loveseat', 'futon', 'bunk bed', 'crib', 'headboard', 'vanity', 'hutch', 'armoire', 'credenza', 'sideboard', 'bar cart', 'shoe rack', 'coat rack'];
  const BEAUTY_SIGNALS = ['moisturizer', 'serum', 'sunscreen', 'cleanser', 'toner', 'foundation', 'concealer', 'mascara', 'lipstick', 'lip gloss', 'eyeshadow', 'blush', 'bronzer', 'primer', 'setting spray', 'face wash', 'face cream', 'eye cream', 'retinol', 'vitamin c', 'hyaluronic', 'niacinamide', 'shampoo', 'conditioner', 'hair mask', 'dry shampoo', 'hair spray', 'curling iron', 'flat iron', 'blow dryer', 'trimmer', 'razor', 'cologne', 'perfume', 'deodorant', 'body lotion', 'body wash', 'hand cream', 'nail polish', 'skincare', 'makeup', 'cosmetic', 'beauty'];

  const hasFood = FOOD_SIGNALS.some(s => combined.includes(s));
  const hasFashion = FASHION_SIGNALS.some(s => combined.includes(s));
  const hasElectronics = ELECTRONICS_SIGNALS.some(s => combined.includes(s));
  const hasFitness = FITNESS_SIGNALS.some(s => combined.includes(s));
  const hasFurniture = FURNITURE_SIGNALS.some(s => combined.includes(s));
  const hasBeauty = BEAUTY_SIGNALS.some(s => combined.includes(s));

  const countSignals = (signals: string[]) => signals.filter(s => combined.includes(s)).length;

  if (hasFood && (fixed.item_type === 'furniture' || fixed.item_type === 'household' || fixed.item_type === 'general' || fixed.item_type === 'fashion' || fixed.item_type === 'electronics')) {
    const foodCount = countSignals(FOOD_SIGNALS);
    const otherMax = Math.max(
      hasFashion ? countSignals(FASHION_SIGNALS) : 0,
      hasElectronics ? countSignals(ELECTRONICS_SIGNALS) : 0,
      hasFurniture ? countSignals(FURNITURE_SIGNALS) : 0
    );
    if (foodCount >= otherMax) {
      console.log('[SmartScan] Food signals strongest (' + foodCount + '), correcting from', fixed.item_type, 'to grocery');
      fixed.item_type = 'grocery';
      fixed.confidence = Math.min(fixed.confidence, 0.7);
      return fixed;
    }
  }

  if (hasFashion && fixed.item_type !== 'fashion') {
    const fashionCount = countSignals(FASHION_SIGNALS);
    const foodCount = hasFood ? countSignals(FOOD_SIGNALS) : 0;
    const electronicsCount = hasElectronics ? countSignals(ELECTRONICS_SIGNALS) : 0;
    if (fashionCount > foodCount && fashionCount > electronicsCount) {
      console.log('[SmartScan] Fashion signals strongest (' + fashionCount + '), correcting from', fixed.item_type);
      fixed.item_type = 'fashion';
      fixed.confidence = Math.min(Math.max(fixed.confidence, 0.5), 0.75);
      return fixed;
    }
  }

  if (hasElectronics && fixed.item_type !== 'electronics') {
    const elecCount = countSignals(ELECTRONICS_SIGNALS);
    const foodCount = hasFood ? countSignals(FOOD_SIGNALS) : 0;
    const fashionCount = hasFashion ? countSignals(FASHION_SIGNALS) : 0;
    if (elecCount > foodCount && elecCount > fashionCount) {
      console.log('[SmartScan] Electronics signals strongest (' + elecCount + '), correcting from', fixed.item_type);
      fixed.item_type = 'electronics';
      fixed.confidence = Math.min(Math.max(fixed.confidence, 0.5), 0.75);
      return fixed;
    }
  }

  if (hasFitness && fixed.item_type !== 'household') {
    console.log('[SmartScan] Fitness signals detected, correcting from', fixed.item_type);
    fixed.item_type = 'household';
    fixed.category = 'Fitness Equipment';
    fixed.confidence = Math.min(Math.max(fixed.confidence, 0.55), 0.75);
    return fixed;
  }

  if (hasBeauty && fixed.item_type !== 'household' && !hasFood && !hasFashion && !hasElectronics) {
    console.log('[SmartScan] Beauty signals detected, correcting from', fixed.item_type);
    fixed.item_type = 'household';
    fixed.category = 'Beauty & Personal Care';
    fixed.confidence = Math.min(Math.max(fixed.confidence, 0.55), 0.75);
    return fixed;
  }

  if (hasFurniture && !hasFood && !hasFashion && !hasElectronics && !hasFitness && !hasBeauty && fixed.item_type !== 'furniture') {
    console.log('[SmartScan] Furniture signals detected, correcting from', fixed.item_type);
    fixed.item_type = 'furniture';
    fixed.confidence = Math.min(Math.max(fixed.confidence, 0.6), 0.8);
    return fixed;
  }

  return fixed;
}

function recoverUnknown(classification: z.infer<typeof classificationSchema>): z.infer<typeof classificationSchema> {
  if (classification.item_type !== 'unknown') return classification;
  const fixed = { ...classification };
  const combined = ((fixed.visual_cues ?? []).join(' ') + ' ' + (fixed.item_name ?? '')).toLowerCase();

  const checks: [string[], SmartScanItemType, string][] = [
    [['shoe', 'sneaker', 'boot', 'sole', 'lace', 'swoosh', 'nike', 'adidas', 'jordan', 'shirt', 'hoodie', 'jacket', 'pants', 'dress', 'bag', 'hat', 'belt', 'watch', 'purse', 'sandal', 'heel', 'jeans', 'skirt', 'blazer', 'backpack'], 'fashion', 'Fashion'],
    [['phone', 'laptop', 'tablet', 'headphone', 'earbuds', 'speaker', 'screen', 'charger', 'controller', 'console', 'keyboard', 'mouse', 'monitor', 'camera', 'drone', 'smart', 'airpod', 'iphone', 'ipad', 'macbook', 'samsung', 'power bank'], 'electronics', 'Electronics'],
    [['dumbbell', 'kettlebell', 'wrench', 'drill', 'hammer', 'pan', 'pot', 'skillet', 'vacuum', 'broom', 'towel', 'blanket', 'pillow', 'candle', 'lamp', 'rug', 'curtain', 'moisturizer', 'shampoo', 'skincare', 'makeup', 'yoga mat', 'blender', 'toaster', 'coffee maker'], 'household', 'Household'],
    [['desk', 'table', 'chair', 'sofa', 'couch', 'bed', 'shelf', 'cabinet', 'dresser', 'wardrobe', 'bookcase', 'nightstand', 'bench', 'ottoman', 'recliner', 'futon'], 'furniture', 'Furniture'],
    [['cereal', 'bottle', 'can', 'package', 'barcode', 'nutrition facts', 'grocery', 'pasta', 'sauce', 'snack', 'chips', 'crackers', 'soda', 'juice', 'milk', 'yogurt', 'bread', 'rice', 'frozen', 'canned'], 'grocery', 'Grocery'],
    [['meal', 'food', 'fruit', 'vegetable', 'cooked', 'pizza', 'burger', 'sandwich', 'salad', 'steak', 'chicken', 'sushi', 'taco', 'soup bowl', 'plate of'], 'food', 'Food'],
  ];

  for (const [signals, type, category] of checks) {
    if (signals.some(s => combined.includes(s))) {
      console.log('[SmartScan] Recovering unknown as', type);
      fixed.item_type = type;
      fixed.category = category;
      fixed.confidence = Math.max(fixed.confidence, 0.35);
      return fixed;
    }
  }

  console.log('[SmartScan] Could not recover unknown, falling back to general');
  fixed.item_type = 'general';
  fixed.category = 'General';
  fixed.confidence = Math.max(fixed.confidence, 0.2);
  return fixed;
}

function validateResult(result: SmartScanResult, classification: z.infer<typeof classificationSchema>): SmartScanResult {
  const validated = { ...result };
  const CONSUMABLE_TYPES: SmartScanItemType[] = ['food', 'grocery'];
  const RESELLABLE_TYPES: SmartScanItemType[] = ['fashion', 'electronics', 'household', 'furniture', 'general'];

  if (CONSUMABLE_TYPES.includes(validated.item_type)) {
    validated.fashion_details = null;
    validated.electronics_details = null;
    validated.household_details = null;
    validated.furniture_details = null;
    validated.general_details = null;
  }

  if (RESELLABLE_TYPES.includes(validated.item_type)) {
    validated.food_details = null;
    validated.grocery_details = null;
  }

  if (validated.item_type === 'food') {
    validated.grocery_details = null;
    validated.household_details = null;
    validated.furniture_details = null;
    validated.fashion_details = null;
    validated.electronics_details = null;
    validated.general_details = null;
  }
  if (validated.item_type === 'grocery') {
    validated.food_details = null;
    validated.household_details = null;
    validated.furniture_details = null;
    validated.fashion_details = null;
    validated.electronics_details = null;
    validated.general_details = null;
  }
  if (validated.item_type === 'furniture') {
    validated.food_details = null;
    validated.grocery_details = null;
    validated.household_details = null;
    validated.fashion_details = null;
    validated.electronics_details = null;
    validated.general_details = null;
  }
  if (validated.item_type === 'fashion') {
    validated.food_details = null;
    validated.grocery_details = null;
    validated.household_details = null;
    validated.furniture_details = null;
    validated.electronics_details = null;
    validated.general_details = null;
  }
  if (validated.item_type === 'electronics') {
    validated.food_details = null;
    validated.grocery_details = null;
    validated.household_details = null;
    validated.furniture_details = null;
    validated.fashion_details = null;
    validated.general_details = null;
  }
  if (validated.item_type === 'household') {
    validated.food_details = null;
    validated.grocery_details = null;
    validated.furniture_details = null;
    validated.fashion_details = null;
    validated.electronics_details = null;
    validated.general_details = null;
  }

  if (!validated.item_name || validated.item_name.length < 3 || validated.item_name === 'Unknown') {
    validated.item_name = classification.item_name || `${classification.category} Item`;
    validated.confidence = Math.min(validated.confidence, 0.4);
  }

  return validated;
}

function repairMissingDetails(result: SmartScanResult, classification: z.infer<typeof classificationSchema>): SmartScanResult {
  const repaired = { ...result };
  const type = repaired.item_type;

  const detailsMap: Record<string, keyof SmartScanResult> = {
    food: 'food_details',
    grocery: 'grocery_details',
    household: 'household_details',
    furniture: 'furniture_details',
    fashion: 'fashion_details',
    electronics: 'electronics_details',
    general: 'general_details',
  };

  const expectedKey = detailsMap[type];
  if (!expectedKey || repaired[expectedKey] != null) return repaired;

  console.log(`[SmartScan] WARNING: ${type} scan returned null ${expectedKey} — repairing`);

  const anyPopulated = (
    Object.entries(detailsMap) as [string, keyof SmartScanResult][]
  ).find(([t, key]) => t !== type && repaired[key] != null);

  if (anyPopulated) {
    const [foundType] = anyPopulated;
    console.log(`[SmartScan] Switching item_type to match populated details: ${foundType}`);
    repaired.item_type = foundType as SmartScanItemType;
    repaired.confidence = Math.min(repaired.confidence, 0.55);
    return repaired;
  }

  console.log('[SmartScan] No details populated — building fallback general_details');
  repaired.item_type = 'general';
  repaired.general_details = {
    item_description: classification.item_name || 'Scanned item',
    subcategory: classification.category || 'other',
    brand: null, model: null, material: null, color: null, condition: null,
    estimated_retail_price: null, estimated_resale_value: null, price_range: null,
    value_rating: null, value_verdict: null, value_reasoning: null,
    resale_demand: null, resale_suggestion: null, best_selling_platform: null,
    comparable_item: null, budget_insight: null, cheaper_alternative: null,
    care_tip: null, fun_fact: null, practical_tip: null, age_or_era: null, rarity: null,
    tags: (classification.visual_cues ?? []).slice(0, 5),
    complementary_items: [],
  };
  repaired.confidence = Math.min(repaired.confidence, 0.4);
  return repaired;
}

export async function generateReferenceImage(description: string, scannedImageBase64?: string): Promise<string | null> {
  try {
    console.log('[SmartScan] Generating reference image for:', description.substring(0, 80));

    if (scannedImageBase64) {
      console.log('[SmartScan] Using image edit API with scanned image');
      const editPrompt = `Transform this photo into a clean, professional product catalog image. Instructions:
- Remove all background clutter and replace with a clean white or light gradient background
- Keep the EXACT same item — do not change, replace, or alter the product
- Center the item with studio-quality lighting
- Make it look like an e-commerce product listing photo
- Sharp focus, clean edges, no shadows except subtle product shadow
- No text overlays, no watermarks, no hands, no other objects`;
      try {
        const editResponse = await fetch('https://toolkit.rork.com/images/edit/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: editPrompt,
            images: [{ type: 'image', image: `data:image/jpeg;base64,${scannedImageBase64}` }],
            aspectRatio: '1:1',
          }),
        });

        if (editResponse.ok) {
          const editData = await editResponse.json() as { image?: { base64Data?: string; mimeType?: string } };
          if (editData.image?.base64Data) {
            const mimeType = editData.image.mimeType || 'image/png';
            const dataUrl = `data:${mimeType};base64,${editData.image.base64Data}`;
            console.log('[SmartScan] Reference image created via edit API');
            return dataUrl;
          }
        }
        console.log('[SmartScan] Edit API response not ok, falling back to generation');
      } catch (editErr) {
        console.log('[SmartScan] Edit API error, falling back to generation:', editErr);
      }
    }

    const prompt = `Professional product photography, single item centered on plain white background, studio lighting, high quality, sharp detail, e-commerce style: ${description}. No text, no watermarks, no hands, isolated product only, clean composition.`;

    const response = await fetch('https://toolkit.rork.com/images/generate/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, size: '1024x1024' }),
    });

    if (!response.ok) {
      console.log('[SmartScan] Image generation failed:', response.status);
      return null;
    }

    const data = await response.json() as { image?: { base64Data?: string; mimeType?: string } };
    if (data.image?.base64Data) {
      const mimeType = data.image.mimeType || 'image/png';
      const dataUrl = `data:${mimeType};base64,${data.image.base64Data}`;
      console.log('[SmartScan] Reference image generated successfully');
      return dataUrl;
    }
    return null;
  } catch (err) {
    console.log('[SmartScan] Reference image generation error:', err);
    return null;
  }
}

let lastProcessedBase64: string | null = null;

export function getLastProcessedBase64(): string | null {
  return lastProcessedBase64;
}

export async function runSmartScan(imageUri: string): Promise<SmartScanResult> {
  console.log('[SmartScan] Starting scan for:', imageUri.substring(0, 60));

  lastProcessedBase64 = null;
  let processed;
  try {
    processed = await preprocessReceiptImage(imageUri, 'smart');
    console.log('[SmartScan] Preprocessed:', processed.width, 'x', processed.height, processed.sizeKB, 'KB');
  } catch (prepErr) {
    console.log('[SmartScan] Preprocessing failed, trying fallback:', prepErr);
    processed = await preprocessReceiptImage(imageUri, 'auto');
  }
  lastProcessedBase64 = processed.base64;

  console.log('[SmartScan] Step 1: Classifying...');
  let classification = await callWithRetry(
    () => generateObject({
      messages: [{
        role: 'user',
        content: [
          { type: 'image', image: `data:image/jpeg;base64,${processed.base64}` },
          { type: 'text', text: CLASSIFICATION_PROMPT },
        ],
      }],
      schema: classificationSchema,
    }),
    'Classification'
  );
  console.log('[SmartScan] Classified:', classification.item_type, 'conf:', classification.confidence, 'name:', classification.item_name);

  if (classification.item_type === 'receipt' || classification.is_receipt) {
    console.log('[SmartScan] Receipt detected');
    return {
      item_type: 'receipt',
      confidence: Math.max(classification.confidence, 0.85),
      item_name: 'Receipt',
      category: 'receipt',
      food_details: null, grocery_details: null, household_details: null,
      furniture_details: null, fashion_details: null, electronics_details: null,
      general_details: null, is_receipt: true,
    };
  }

  classification = recoverUnknown(classification);
  classification = fixItemType(classification);

  if (classification.confidence < 0.25) {
    classification.confidence = 0.25;
  }

  console.log('[SmartScan] Step 2: Getting details for', classification.item_type);
  const detailPrompt = getDetailPrompt(classification.item_type);

  const fullPrompt = `${detailPrompt}

The item has been identified as: ${classification.item_name} (${classification.category}).
Visual cues: ${(classification.visual_cues ?? []).join(', ') || 'none'}.
item_type MUST be "${classification.item_type}". Do NOT change it. is_receipt must be false.
confidence should be ${classification.confidence.toFixed(2)}.
Keep item_name close to "${classification.item_name}" — only refine spelling/capitalization, don't replace with a different product.
CRITICAL: ONLY populate the ${classification.item_type}_details field. ALL other detail fields (*_details) MUST be null.
Do NOT invent information. If you don't know a value, set it to null.`;

  const result = await callWithRetry(
    () => generateObject({
      messages: [{
        role: 'user',
        content: [
          { type: 'image', image: `data:image/jpeg;base64,${processed.base64}` },
          { type: 'text', text: fullPrompt },
        ],
      }],
      schema: smartScanSchema,
    }),
    'Detail generation'
  );

  if (result.item_type !== classification.item_type) {
    console.log('[SmartScan] Detail pass changed type, correcting back to', classification.item_type);
    result.item_type = classification.item_type;
  }
  result.confidence = classification.confidence;
  result.is_receipt = false;

  const repaired = repairMissingDetails(result, classification);
  const validated = validateResult(repaired, classification);
  const stabilized = stabilizePricing(validated);

  stabilized.short_summary = classification.short_summary ?? '';
  stabilized.image_description = classification.image_description ?? '';

  stabilized.scanned_image_uri = imageUri;

  console.log('[SmartScan] Done:', stabilized.item_name, 'type:', stabilized.item_type, 'conf:', stabilized.confidence);
  return stabilized;
}
