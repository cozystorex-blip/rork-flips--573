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

export type SmartScanResult = z.infer<typeof smartScanSchema>;

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

  if (resaleVal === null || resaleVal < 1) {
    return null;
  }

  if (retailVal !== null && retailVal > 0) {
    if (resaleVal > retailVal * 1.15) {
      console.log(`[SmartScan] Resale (${resaleVal}) exceeds retail (${retailVal}) — capping`);
      const capped = Math.round(retailVal * 0.7 * 100) / 100;
      return `${capped.toFixed(2)}`;
    }

    if (resaleVal > retailVal * 0.95 && (condition === 'good' || condition === 'fair' || condition === 'worn')) {
      console.log(`[SmartScan] Resale too close to retail for ${condition} condition — adjusting`);
      const adjusted = Math.round(retailVal * 0.55 * 100) / 100;
      return `${adjusted.toFixed(2)}`;
    }
  }

  if (retailVal !== null && retailVal < 5 && resaleVal > 3) {
    console.log('[SmartScan] Cheap item with inflated resale — nullifying');
    return null;
  }

  if (retailVal !== null && retailVal < 15 && resaleVal > retailVal * 0.8) {
    console.log('[SmartScan] Low-cost item with high resale ratio — capping');
    const capped = Math.round(retailVal * 0.4 * 100) / 100;
    return capped >= 1 ? `${capped.toFixed(2)}` : null;
  }

  return resale;
}

function normalizePriceField(price: string | null): string | null {
  if (!price) return null;
  const lower = price.toLowerCase().trim();
  if (
    lower === 'free' ||
    lower === 'free with purchase' ||
    lower === 'n/a' ||
    lower === 'none' ||
    lower === 'not sold separately' ||
    lower === 'not for sale' ||
    lower === 'included' ||
    lower === 'complimentary' ||
    lower.includes('free with')
  ) {
    return null;
  }
  const numMatch = lower.replace(/[^0-9.]/g, '');
  const numVal = parseFloat(numMatch);
  if (!isNaN(numVal) && numVal < 0.05) {
    return null;
  }
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
  const hasPackagingSignal = PACKAGING_SIGNALS.some(s => combined.includes(s));
  const hasRestaurantBrand = RESTAURANT_PACKAGING_BRANDS.some(s => combined.includes(s));
  return hasPackagingSignal && hasRestaurantBrand;
}

function stabilizePricing(result: SmartScanResult): SmartScanResult {
  const stabilized = { ...result };
  const cues: string[] = [];

  const isPackaging = isPackagingItem(
    stabilized.item_name ?? '',
    stabilized.category ?? '',
    cues
  );

  if (isPackaging) {
    console.log('[SmartScan] Packaging item detected — nullifying prices for consistency');
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
    stabilized.food_details = {
      ...stabilized.food_details,
      estimated_price: normalizePriceField(stabilized.food_details.estimated_price),
      price_range: normalizePriceField(stabilized.food_details.price_range),
      unit_price: normalizePriceField(stabilized.food_details.unit_price),
    };
  }
  if (stabilized.grocery_details) {
    stabilized.grocery_details = {
      ...stabilized.grocery_details,
      estimated_price: normalizePriceField(stabilized.grocery_details.estimated_price),
      price_range: normalizePriceField(stabilized.grocery_details.price_range),
      unit_price: normalizePriceField(stabilized.grocery_details.unit_price),
    };
  }
  if (stabilized.household_details) {
    const hd = stabilized.household_details;
    stabilized.household_details = {
      ...hd,
      estimated_price: normalizePriceField(hd.estimated_price),
      price_range: normalizePriceField(hd.price_range),
      estimated_resale_value: normalizeResaleValue(
        hd.estimated_resale_value,
        hd.estimated_price,
        stabilized.item_name,
        stabilized.category,
        hd.condition
      ),
    };
  }
  if (stabilized.fashion_details) {
    const fd = stabilized.fashion_details;
    stabilized.fashion_details = {
      ...fd,
      estimated_retail_price: normalizePriceField(fd.estimated_retail_price),
      estimated_resale_value: normalizeResaleValue(
        fd.estimated_resale_value,
        fd.estimated_retail_price,
        stabilized.item_name,
        stabilized.category,
        fd.condition
      ),
      price_range: normalizePriceField(fd.price_range),
    };
  }
  if (stabilized.electronics_details) {
    const ed = stabilized.electronics_details;
    stabilized.electronics_details = {
      ...ed,
      estimated_retail_price: normalizePriceField(ed.estimated_retail_price),
      estimated_resale_value: normalizeResaleValue(
        ed.estimated_resale_value,
        ed.estimated_retail_price,
        stabilized.item_name,
        stabilized.category,
        ed.condition
      ),
      price_range: normalizePriceField(ed.price_range),
    };
  }
  if (stabilized.furniture_details) {
    const fud = stabilized.furniture_details;
    stabilized.furniture_details = {
      ...fud,
      estimated_retail_price: normalizePriceField(fud.estimated_retail_price),
      estimated_resale_value: normalizeResaleValue(
        fud.estimated_resale_value,
        fud.estimated_retail_price,
        stabilized.item_name,
        stabilized.category,
        null
      ),
      estimated_price_range: normalizePriceField(fud.estimated_price_range),
    };
  }
  if (stabilized.general_details) {
    const gd = stabilized.general_details;
    stabilized.general_details = {
      ...gd,
      estimated_retail_price: normalizePriceField(gd.estimated_retail_price),
      estimated_resale_value: normalizeResaleValue(
        gd.estimated_resale_value,
        gd.estimated_retail_price,
        stabilized.item_name,
        stabilized.category,
        gd.condition
      ),
      price_range: normalizePriceField(gd.price_range),
    };
  }

  return stabilized;
}

const CLASSIFICATION_PROMPT = `You are an expert IKEA product classifier. Your primary job is to identify IKEA products, furniture, and home items from images taken while shopping at IKEA.

RULES:
1. RECEIPT CHECK: If you see printed text with prices, totals, barcodes, store headers → receipt. Set is_receipt=true.
2. If NOT a receipt, classify:
   - "furniture" = THE PRIMARY CATEGORY. Desks, tables, chairs, sofas, beds, shelving, cabinets, bookcases, TV stands, wardrobes, dressers, nightstands, kitchen islands, bathroom vanities, storage units, shoe racks, coat racks, side tables, coffee tables, dining sets, office chairs, stools, benches, room dividers, modular storage, flat-pack items, ANY IKEA product tag/shelf label/barcode label, ANY item that looks like it could be from IKEA or a furniture store. When in doubt between furniture and household, choose furniture.
   - "household" = smaller home items: kitchenware, storage containers, organizing bins, candles, picture frames, mirrors, lamps, rugs, curtains, pillows, throws, towels, bathroom accessories, kitchen tools, plant pots. Items that DON'T need assembly.
   - "food" = fresh/prepared food, IKEA food court items, Swedish meatballs, food items.
   - "grocery" = packaged food items from IKEA Swedish Food Market, lingonberry jam, cookies, etc.
   - "electronics" = smart home devices, LED lighting systems, phone chargers, speakers.
   - "fashion" = wearable items (rare in IKEA context).
   - "general" = anything else that doesn't fit above.
   - "unknown" = ONLY if truly unrecognizable. Very rare.

3. IKEA BIAS: If you see any IKEA branding, yellow/blue color schemes, shelf tags with article numbers, flat-pack boxes, Allen keys, or typical IKEA showroom settings → classify as furniture with high confidence.
4. NAMING: Read visible text/labels/logos first. If you see an IKEA product name (like KALLAX, BILLY, MALM, LACK, HEMNES, etc.), use it. Never invent brands not visible. If unsure, describe what you see honestly.
5. CONFIDENCE: Clear IKEA product=0.85-0.95, clear furniture no brand=0.7-0.84, slightly unclear=0.5-0.69, blurry/dark=0.35-0.55, very unclear=below 0.35.
6. Even blurry/angled photos of identifiable furniture should get "furniture", not "unknown". Lower confidence instead.
7. Imperfect camera photos are normal. A blurry shelf is still furniture. A dark table is still furniture.`;

function getDetailPrompt(itemType: SmartScanItemType): string {
  const base = `You are a product scanner. Provide accurate details about this item.

PRICING RULES:
- Use real current retail prices from major retailers. Do not invent prices.
- Be consistent: same item should get same price every time.
- Price range should be tight (within ~15% of estimate).
- Unit pricing must be mathematically correct.
- Use 2025-2026 current pricing.
- If an item is packaging (bag, wrapper, box) from a restaurant or store, set estimated_price to null. Do not guess packaging prices.
- Never output "Free with purchase" or "$0.00" — if item has no retail price, set price fields to null.
- Always use dollar format like "$X.XX" for real prices. Never use words like "Free" or "Included" as a price.

RESALE PRICING RULES:
- Resale value must ALWAYS be LOWER than retail price. Used items lose value.
- For items in "new" condition, resale is typically 60-80% of retail.
- For "like-new" condition, resale is 50-70% of retail.
- For "good" condition, resale is 35-55% of retail.
- For "fair" or "worn" condition, resale is 20-40% of retail.
- Cheap items under $10 retail usually have no meaningful resale value — set resale to null.
- Common household consumables (cleaning supplies, toiletries, disposables) have NO resale value — set resale to null.
- Basic packaging, bags, containers have NO resale value — set resale to null.
- Only provide resale values for items that people actually buy secondhand.
- If unsure about resale demand, set resale to null rather than guessing.
- Never set resale higher than retail. Never.\n\n`;

  switch (itemType) {
    case 'food':
      return base + `Analyze this FOOD item. Fill food_details with:
- Accurate nutrition per serving (calories, protein, carbs, fat, fiber, sugar)
- key_nutrients, health_benefits (always 2+ items), health_summary, quick_tip
- estimated_price (real current price, REQUIRED), price_range (tight range, REQUIRED)
- unit_price if calculable, value_rating, budget_insight, cheaper_alternative
- tags (healthy, budget, bulk, organic, etc)
- complementary_items: 3-5 items that pair well with this food (e.g. sides, drinks, sauces, toppings)
Set all other detail fields to null.`;

    case 'grocery':
      return base + `Analyze this GROCERY item. Fill grocery_details with:
- brand (from visible label), package_size
- estimated_price (real retail price), price_range (tight range), unit_price
- value_rating, budget_insight, cheaper_alternative
- what_else_needed (complementary items), total_cost_note if applicable
- tags (budget-friendly, bulk, deal, organic, premium)
- complementary_items: 3-5 products that pair well or are commonly bought together with this item
Set all other detail fields to null.`;

    case 'household':
      return base + `Analyze this HOUSEHOLD item. Fill household_details with:
- item_description (specific description of item and use)
- subcategory (tools/fitness/kitchenware/cleaning/bathroom/decor/garden/storage/lighting/small_appliance/other)
- brand, model, material, condition
- estimated_price (real retail), price_range, estimated_resale_value
- value_rating, value_verdict, value_reasoning, resale_potential
- practical_recommendation (actionable advice specific to item)
- For heavy items: shipping_note, local_pickup_recommendation=true
- For paired items (dumbbells): set_or_pair_note
- buy_new_vs_used, comparable_model, resale_suggestion, best_selling_platform
- budget_insight, cheaper_alternative, care_tip
- tags (heavy, commodity, durable, budget, premium, used-ok, local-only)
- complementary_items: 3-5 products that complement or are commonly used alongside this item
Set all other detail fields to null.`;

    case 'fashion':
      return base + `Analyze this FASHION item. Fill fashion_details with:
- subcategory (shoes/clothing/outerwear/accessories/bags/jewelry/activewear/other)
- item_description (rich description: brand, model, material, style)
- brand (from visible logos/labels ONLY), model (if clearly identifiable)
- material, color, secondary_color, pattern, style, condition
- For clothing: fit, sleeve_length, neckline, closure_type, condition_notes, cleaning_recommendation, cleaning_reason
- For shoes: analyze silhouette, sole, upper construction. Set pattern/fit/sleeve_length/neckline to null.
- gender_target
- estimated_retail_price (real price), estimated_resale_value (real sold prices), price_range
- resale_demand, best_selling_platform, value_rating
- value_verdict, value_reasoning, comparable_model, resale_suggestion
- budget_insight, cheaper_alternative, care_tip
- tags (streetwear, designer, vintage, budget, athletic, sneaker, resale, etc)
- complementary_items: 3-5 items that pair well with this fashion item (e.g. matching shoes, accessories, outfits)
Set all other detail fields to null.`;

    case 'electronics':
      return base + `Analyze this ELECTRONICS item. Fill electronics_details with:
- product_type (smartphone, laptop, headphones, etc)
- brand (from visible logos), model (if identifiable), storage_or_spec, condition
- estimated_retail_price (real current price), estimated_resale_value (real sold prices), price_range
- depreciation_note, resale_demand, value_rating
- value_verdict, value_reasoning, comparable_model, resale_suggestion
- best_selling_platform, budget_insight, cheaper_alternative, care_tip
- tags (refurbished, budget, flagship, premium, resale, etc)
- complementary_items: 3-5 accessories or products that pair well with this device (e.g. cases, chargers, stands)
Set all other detail fields to null.`;

    case 'furniture':
      return base + `You are an IKEA shopping companion scanner. Analyze this furniture/home item as if the user is shopping at IKEA.

Fill furniture_details with:
- item_type_specific (bookshelf, desk, chair, wardrobe, shelving unit, etc)
- material, finish_color, style, estimated_dimensions
- estimated_retail_price (use real IKEA pricing if recognizable, otherwise best estimate), estimated_price_range
- estimated_resale_value: reframe as "long-term value" — what this item holds value-wise over time. If cheap IKEA item, set to null.
- value_level, value_rating
- resale_demand: treat as "popularity" — how sought-after this item is
- value_verdict, value_reasoning: frame as whether this is a smart purchase, not resale potential
- comparable_model: suggest similar IKEA alternatives if any
- resale_suggestion: reframe as a durability/longevity tip
- best_selling_platform: set to null (not relevant for IKEA shopping)
- use_case (what this item is best used for)
- room_fit (which room this works best in)
- budget_insight (IKEA-specific buying tip)
- cheaper_alternative (cheaper IKEA alternative if exists)
- care_tip (maintenance advice)
- assembly_required, assembly_difficulty, estimated_build_time, people_needed
- likely_tools_needed: ALWAYS include relevant tools. Common IKEA tools: Allen key (included), Phillips screwdriver, hammer, drill (optional for wall mounting), measuring tape, level. Be specific.
- likely_parts, mounting_type, assembly_summary
- similar_products: suggest matching or complementary IKEA products
- extra_purchase_items (with item, cost, reason): items you'll need to complete the setup — wall anchors, shelf pins, LED lights, drawer organizers, etc.
- total_estimated_cost
- worth_it_verdict: frame as smart-buy assessment
- room_fit_labels: array of room types this works well in. Pick from: "dorm room", "small apartment", "studio", "office", "kids room", "family room", "bedroom", "living room", "kitchen", "bathroom", "entryway", "garage". Include 2-4 labels.
- matching_products: array of 3-5 IKEA products that pair well with this item. Use real IKEA product names when possible (e.g. "SKADIS pegboard", "KALLAX insert", "LEDBERG LED strip").
- wall_anchor_note: if wall mounting is recommended or required, explain why and what type of anchors.
- setup_notes: any important setup tips, like "leave 2cm gap from wall for ventilation" or "attach to wall for stability".
- long_term_value: a brief note on durability and whether this item holds up over time.
- tags (budget, premium, ikea, flat-pack, modern, scandinavian, space-saving, family-friendly, dorm-friendly, etc)
- complementary_items: 3-5 items that complement this product (in addition to matching_products, think broader — rugs, lamps, organizers, etc)
Set all other detail fields to null.`;

    case 'general':
      return base + `Analyze this item. Fill general_details with:
- item_description (what it is and its purpose)
- subcategory (books, toys, beauty, automotive, collectibles, music, pet, sports, art, plants, office, baby, medical, vehicle, travel, vintage, craft, gaming, etc)
- brand, model, material, color, condition
- age_or_era (if applicable), rarity (common/uncommon/rare/very-rare/unique)
- estimated_retail_price (real price), estimated_resale_value, price_range
- value_rating, value_verdict, value_reasoning, resale_demand
- resale_suggestion, best_selling_platform, comparable_item
- budget_insight, cheaper_alternative, care_tip, fun_fact, practical_tip
- tags (vintage, collectible, budget, premium, rare, everyday, niche, resale)
- complementary_items: 3-5 items that pair well or are commonly used with this item
Set all other detail fields to null.`;

    default:
      return base + `Do your best to analyze this item. Fill general_details with whatever you can determine.
Set all other detail fields to null.`;
  }
}

async function callWithRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries: number = 2
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
        await new Promise(r => setTimeout(r, 800));
      }
    }
  }
  throw lastError ?? new Error(`${label} failed after ${maxRetries} retries`);
}

function fixItemType(classification: z.infer<typeof classificationSchema>): z.infer<typeof classificationSchema> {
  const fixed = { ...classification };
  const name = (fixed.item_name ?? '').toLowerCase();
  const cues = (fixed.visual_cues ?? []).map(c => c.toLowerCase()).join(' ');
  const combined = name + ' ' + cues;

  if (fixed.item_type === 'unknown' || fixed.item_type === 'receipt') {
    return fixed;
  }

  const IKEA_SIGNALS = ['ikea', 'kallax', 'billy', 'malm', 'lack', 'hemnes', 'besta', 'poang', 'ektorp', 'gronlid', 'kivik', 'alex', 'linnmon', 'bekant', 'markus', 'detolf', 'fjalkinge', 'stuva', 'nordli', 'pax', 'brimnes', 'tarva', 'ivar', 'skadis', 'raskog', 'flat-pack', 'flat pack', 'article number', 'shelf tag'];
  const FURNITURE_SIGNALS = ['desk', 'table', 'chair', 'sofa', 'couch', 'bed', 'shelf', 'shelving', 'cabinet', 'wardrobe', 'dresser', 'nightstand', 'bookcase', 'bookshelf', 'tv stand', 'bench', 'stool', 'rack', 'storage unit', 'room divider'];
  const FASHION_SIGNALS = ['shoe', 'sneaker', 'boot', 'heel', 'sandal', 'sole', 'lace', 'swoosh', 'nike', 'adidas', 'jordan', 'puma', 'vans', 'converse', 'new balance', 'shirt', 'hoodie', 'jacket', 'pants', 'jeans', 'dress', 'hat', 'bag', 'purse', 'wallet', 'watch', 'belt', 'gucci', 'louis vuitton', 'coach'];
  const ELECTRONICS_SIGNALS = ['iphone', 'ipad', 'macbook', 'airpod', 'samsung galaxy', 'playstation', 'ps5', 'xbox', 'nintendo', 'laptop', 'tablet', 'headphones', 'earbuds', 'speaker', 'monitor', 'keyboard', 'charger', 'bose', 'jbl', 'sony'];
  const TOOL_SIGNALS = ['wrench', 'drill', 'hammer', 'saw', 'screwdriver', 'plier', 'socket', 'dewalt', 'milwaukee', 'makita', 'toolbox'];
  const FITNESS_SIGNALS = ['dumbbell', 'kettlebell', 'barbell', 'weight plate', 'resistance band', 'yoga mat', 'foam roller'];

  const hasIkea = IKEA_SIGNALS.some(s => combined.includes(s));
  const hasFurniture = FURNITURE_SIGNALS.some(s => combined.includes(s));
  const hasFashion = FASHION_SIGNALS.some(s => combined.includes(s));
  const hasElectronics = ELECTRONICS_SIGNALS.some(s => combined.includes(s));
  const hasTools = TOOL_SIGNALS.some(s => combined.includes(s));
  const hasFitness = FITNESS_SIGNALS.some(s => combined.includes(s));

  if (hasIkea && fixed.item_type !== 'furniture') {
    console.log('[SmartScan] IKEA signals detected, overriding from', fixed.item_type);
    fixed.item_type = 'furniture';
    fixed.confidence = Math.max(fixed.confidence, 0.8);
  } else if (hasFurniture && fixed.item_type !== 'furniture' && !hasFashion && !hasElectronics) {
    console.log('[SmartScan] Furniture signals detected, overriding from', fixed.item_type);
    fixed.item_type = 'furniture';
    fixed.confidence = Math.max(fixed.confidence, 0.6);
  } else if (hasFashion && fixed.item_type !== 'fashion' && !hasElectronics) {
    console.log('[SmartScan] Fashion signals detected, overriding from', fixed.item_type);
    fixed.item_type = 'fashion';
    fixed.confidence = Math.max(fixed.confidence, 0.45);
  } else if (hasElectronics && fixed.item_type !== 'electronics' && !hasFashion) {
    console.log('[SmartScan] Electronics signals detected, overriding from', fixed.item_type);
    fixed.item_type = 'electronics';
    fixed.confidence = Math.max(fixed.confidence, 0.5);
  } else if ((hasTools || hasFitness) && fixed.item_type !== 'household') {
    console.log('[SmartScan] Household signals detected, overriding from', fixed.item_type);
    fixed.item_type = 'household';
    fixed.category = hasTools ? 'Tools' : 'Fitness Equipment';
    fixed.confidence = Math.max(fixed.confidence, 0.5);
  }

  return fixed;
}

function recoverUnknown(classification: z.infer<typeof classificationSchema>): z.infer<typeof classificationSchema> {
  if (classification.item_type !== 'unknown') return classification;

  const fixed = { ...classification };
  const combined = ((fixed.visual_cues ?? []).join(' ') + ' ' + (fixed.item_name ?? '')).toLowerCase();

  const checks: [string[], SmartScanItemType, string][] = [
    [['shoe', 'sneaker', 'boot', 'sole', 'lace', 'swoosh', 'nike', 'adidas', 'jordan', 'shirt', 'hoodie', 'jacket', 'pants', 'dress', 'bag', 'hat', 'belt'], 'fashion', 'Fashion'],
    [['phone', 'laptop', 'tablet', 'headphone', 'earbuds', 'speaker', 'screen', 'charger', 'controller', 'console'], 'electronics', 'Electronics'],
    [['dumbbell', 'kettlebell', 'wrench', 'drill', 'hammer', 'pan', 'pot', 'skillet', 'vacuum', 'broom', 'towel', 'blanket', 'pillow'], 'household', 'Household'],
    [['desk', 'table', 'chair', 'sofa', 'couch', 'bed', 'shelf', 'cabinet', 'dresser', 'ikea'], 'furniture', 'Furniture'],
    [['cereal', 'bottle', 'can', 'package', 'barcode', 'nutrition facts', 'grocery'], 'grocery', 'Grocery'],
    [['meal', 'food', 'fruit', 'vegetable', 'cooked', 'pizza', 'burger', 'sandwich'], 'food', 'Food'],
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
    if (validated.fashion_details) { validated.fashion_details = null; }
    if (validated.electronics_details) { validated.electronics_details = null; }
    if (validated.household_details) { validated.household_details = null; }
    if (validated.furniture_details) { validated.furniture_details = null; }
    if (validated.general_details) { validated.general_details = null; }
  }

  if (RESELLABLE_TYPES.includes(validated.item_type)) {
    if (validated.food_details) { validated.food_details = null; }
    if (validated.grocery_details) { validated.grocery_details = null; }
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
  if (!expectedKey || repaired[expectedKey] != null) {
    return repaired;
  }

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
    brand: null,
    model: null,
    material: null,
    color: null,
    condition: null,
    estimated_retail_price: null,
    estimated_resale_value: null,
    price_range: null,
    value_rating: null,
    value_verdict: null,
    value_reasoning: null,
    resale_demand: null,
    resale_suggestion: null,
    best_selling_platform: null,
    comparable_item: null,
    budget_insight: null,
    cheaper_alternative: null,
    care_tip: null,
    fun_fact: null,
    practical_tip: null,
    age_or_era: null,
    rarity: null,
    tags: (classification.visual_cues ?? []).slice(0, 5),
    complementary_items: [],
  };
  repaired.confidence = Math.min(repaired.confidence, 0.4);
  return repaired;
}

export async function runSmartScan(imageUri: string): Promise<SmartScanResult> {
  console.log('[SmartScan] Starting scan for:', imageUri.substring(0, 60));

  let processed;
  try {
    processed = await preprocessReceiptImage(imageUri, 'smart');
    console.log('[SmartScan] Preprocessed:', processed.width, 'x', processed.height, processed.sizeKB, 'KB');
  } catch (prepErr) {
    console.log('[SmartScan] Preprocessing failed, trying fallback:', prepErr);
    processed = await preprocessReceiptImage(imageUri, 'auto');
  }

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
      food_details: null,
      grocery_details: null,
      household_details: null,
      furniture_details: null,
      fashion_details: null,
      electronics_details: null,
      general_details: null,
      is_receipt: true,
    };
  }

  classification = recoverUnknown(classification);
  classification = fixItemType(classification);

  if (classification.confidence < 0.3) {
    classification.confidence = 0.35;
  }

  console.log('[SmartScan] Step 2: Getting details for', classification.item_type);
  const detailPrompt = getDetailPrompt(classification.item_type);

  const fullPrompt = `${detailPrompt}

The item has been identified as: ${classification.item_name} (${classification.category}).
Visual cues: ${(classification.visual_cues ?? []).join(', ') || 'none'}.
item_type must be "${classification.item_type}". is_receipt must be false.
confidence should be ${classification.confidence.toFixed(2)}.
Keep item_name close to "${classification.item_name}" — only refine, don't replace with unrelated product.`;

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

  console.log('[SmartScan] Done:', stabilized.item_name, 'type:', stabilized.item_type, 'conf:', stabilized.confidence);
  return stabilized;
}
