import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { preprocessReceiptImage } from '@/services/receiptImagePreprocess';

export type SmartScanItemType = 'food' | 'grocery' | 'household' | 'furniture' | 'fashion' | 'electronics' | 'general' | 'receipt' | 'document' | 'unknown';

export type ImageContentType = 'single_item' | 'multi_item_page' | 'printed_material' | 'screenshot' | 'document' | 'unclear';

const classificationSchema = z.object({
  item_type: z.enum(['food', 'grocery', 'household', 'furniture', 'fashion', 'electronics', 'general', 'receipt', 'document', 'unknown']),
  confidence: z.number().min(0).max(1),
  is_receipt: z.boolean(),
  item_name: z.string(),
  category: z.string(),
  secondary_type: z.enum(['food', 'grocery', 'household', 'furniture', 'fashion', 'electronics', 'general', 'receipt', 'document', 'unknown']).nullable(),
  visual_cues: z.array(z.string()),
  short_summary: z.string(),
  image_description: z.string(),
  image_content_type: z.enum(['single_item', 'multi_item_page', 'printed_material', 'screenshot', 'document', 'unclear']),
  detected_items_list: z.array(z.string()),
  page_topic: z.string(),
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

const documentDetailsSchema = z.object({
  content_description: z.string(),
  document_type: z.enum(['infographic', 'catalog', 'educational', 'poster', 'screenshot', 'chart', 'reference', 'other']),
  detected_items: z.array(z.string()),
  main_topic: z.string(),
  visible_text_summary: z.string(),
  key_information: z.array(z.string()),
  suggested_actions: z.array(z.string()),
  tags: z.array(z.string()),
});

const smartScanSchema = z.object({
  item_type: z.enum(['food', 'grocery', 'household', 'furniture', 'fashion', 'electronics', 'general', 'receipt', 'document', 'unknown']),
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
  document_details: documentDetailsSchema.nullable(),
  is_receipt: z.boolean(),
});

import type { ScanTrustResult } from '@/types/scanTrust';

export type SmartScanResult = z.infer<typeof smartScanSchema> & {
  reference_image_url?: string | null;
  short_summary?: string;
  image_description?: string;
  scanned_image_uri?: string;
  visual_cues?: string[];
  trustResult?: ScanTrustResult;
  image_content_type?: ImageContentType;
  detected_items_list?: string[];
  page_topic?: string;
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

const CLASSIFICATION_PROMPT = `You are an expert universal product and object identifier with years of retail, fashion, food, and electronics experience. Your job is to correctly identify what is in the image with HIGH ACCURACY. Analyze ONLY what is visible. Do NOT guess or assume. Do NOT default to any category.

STEP 0 — DETERMINE IMAGE CONTENT TYPE:
Before identifying any object, first determine what KIND of image this is:
- "single_item" = photo of one physical real-world object (product, food, furniture, etc.)
- "multi_item_page" = image showing multiple labeled items together (catalog page, comparison chart, product lineup, collage with labeled items)
- "printed_material" = poster, educational sheet, infographic, brochure, flyer, diagram, reference chart, informational page with text and graphics
- "screenshot" = screenshot from a phone/computer screen, digital graphic, app screen, website capture
- "document" = text document, article, printed page, report, form, letter
- "unclear" = too blurry or dark to determine anything

Set image_content_type accordingly. This is critical for correct routing.

IF image_content_type is "multi_item_page", "printed_material", "screenshot", or "document":
- Set item_type to "document"
- Set confidence to 0.70 or higher (you DID identify the content type)
- Set item_name to describe what the page/content is (e.g. "Building Materials Infographic", "Product Catalog Page", "Educational Poster")
- List any identifiable items or topics in detected_items_list
- Set page_topic to the main subject or topic of the content
- Do NOT set item_type to "unknown" just because it is not a single physical object
- Do NOT give low confidence for clearly readable printed content

IF image_content_type is "single_item" or "unclear":
- Set detected_items_list to empty array []
- Set page_topic to empty string ""
- Continue with normal single-item classification below

STEP 1 — DESCRIBE WHAT YOU SEE (critical for accuracy):
Before choosing a category, you MUST internally describe:
1. What is the overall SHAPE of the object? (round, rectangular, cylindrical, irregular, etc.)
2. What is the PRIMARY MATERIAL? (fabric, plastic, metal, wood, glass, paper, food, etc.)
3. What SIZE is it relative to common objects? (handheld, tabletop, floor-standing, etc.)
4. Is there any VISIBLE TEXT, LABEL, or LOGO? What does it say?
5. What is the CONTEXT/SETTING? (on a plate, on a shelf, being worn, in packaging, etc.)
6. Are there any DISTINCTIVE FEATURES? (laces, buttons, screen, handle, wheels, etc.)

Use these observations — NOT assumptions — to determine the category.

STEP 2 — PICK EXACTLY ONE CATEGORY:
- "receipt" = printed receipt, invoice, price tag with totals, shelf label with barcodes/prices. Set is_receipt=true.
- "food" = prepared/fresh food, meals, fruits, vegetables, cooked dishes, snacks being eaten, bakery items, food court items, restaurant plates, loose produce, food being served
- "grocery" = packaged food products still in retail packaging — cans, boxes, bottles, bags, jars, frozen meals, condiments, cereal, pasta, chips, soda, candy bars, protein bars, anything with a nutrition label or barcode from a grocery aisle. KEY: the packaging is the primary visible element.
- "fashion" = ANY wearable item or personal accessory: shoes, sneakers, boots, sandals, clothing, shirts, pants, jackets, coats, dresses, hats, bags, purses, backpacks, wallets, watches, jewelry, belts, scarves, sunglasses, gloves. KEY: it is worn on the body or carried as an accessory.
- "electronics" = devices with screens, circuits, batteries, or digital function: phones, laptops, tablets, headphones, earbuds, speakers, gaming consoles, controllers, chargers, cables, monitors, keyboards, cameras, smart home devices, drones, power banks. KEY: it uses electricity or batteries.
- "furniture" = LARGE home items that typically sit on the floor or mount to walls: desks, tables, chairs, sofas, couches, beds, shelving units, bookshelves, cabinets, wardrobes, dressers, nightstands, TV stands, benches. KEY: it requires placement/assembly in a room and you sit on it, store things in it, or put things on it.
- "household" = smaller home/lifestyle items that are NOT furniture and NOT food: kitchenware, pots, pans, utensils, storage containers, lamps, rugs, curtains, pillows, towels, blankets, cleaning supplies, tools (drills, hammers), fitness equipment (dumbbells, kettlebells, yoga mats), bathroom items, candles, decor, beauty/skincare/makeup products, small appliances (toasters, blenders, coffee makers). KEY: used around the home but not large enough to be furniture.
- "general" = clearly identifiable physical item that doesn't fit any above category (toys, books, sports equipment, musical instruments, art supplies, automotive parts, pet supplies, etc.)
- "unknown" = truly unrecognizable: extremely blurry, completely dark, abstract art with no identifiable object, or a close-up that shows no recognizable features

CATEGORY DECISION TREE — USE THIS ORDER:
1. Is it a receipt/price tag/invoice? → "receipt"
2. Is it a document/screenshot/poster/infographic? → "document" (set via image_content_type above)
3. Is it food on a plate/being eaten/fresh produce/prepared? → "food"
4. Is it a packaged food product in retail packaging? → "grocery"
5. Is it something you WEAR or carry as personal accessory? → "fashion"
6. Does it use electricity/batteries/have a screen? → "electronics"
7. Is it a large piece of home furniture? → "furniture"
8. Is it a smaller home/lifestyle item? → "household"
9. Is it identifiable but none of the above? → "general"
10. Is it truly unrecognizable? → "unknown"

MISCLASSIFICATION RULES — CRITICAL:
1. ANY food in packaging (pasta box, cereal box, canned soup, bottled drink, chip bag) = "grocery". NEVER "furniture" or "household".
2. ANY shoe/sneaker/boot/sandal/heel = "fashion". NEVER "furniture" or "household" or "general".
3. ANY clothing item (shirt, pants, jacket, dress) = "fashion". NEVER "household".
4. Dumbbells, kettlebells, yoga mats, resistance bands, exercise equipment = "household" (subcategory fitness). NEVER "furniture".
5. Kitchen utensils, pans, small appliances, blenders, coffee makers = "household". NEVER "furniture".
6. Skincare, moisturizer, shampoo, makeup, beauty products = "household". NEVER "grocery".
7. Chairs, desks, large shelving units, sofas, beds, tables = "furniture". NEVER "household".
8. Phones, laptops, headphones, earbuds, game controllers = "electronics". NEVER "general".
9. Fresh food on a plate or loose = "food". Packaged food with labels = "grocery".
10. Brand name on an item tells you the BRAND, not the category. Nike shoe = fashion. Nike box = general. Apple iPhone = electronics. Apple (fruit) = food.
11. If the image shows food but your first instinct is "furniture" — you are WRONG. Re-examine.
12. If the image shows a shoe but your first instinct is "furniture" — you are WRONG. Re-examine.
13. If you are unsure between two categories, look at the PHYSICAL PROPERTIES (material, shape, size) not the brand.
14. Bags, backpacks, purses, luggage = "fashion" (accessories). NEVER "household" or "general".
15. Books, board games, toys, sports balls = "general". NEVER "household" or "furniture".

NAMING — TRUTH-FIRST RULES:
- Read visible text/labels/logos FIRST. Use the actual product name ONLY if clearly readable.
- Include brand only if visibly printed or embossed on the item. Never invent brands.
- If the exact product name is NOT readable, use a descriptive name based on what you see:
  GOOD: "8-Shelf Wooden Puzzle Rack", "Black Running Shoes", "Stainless Steel Water Bottle", "Red Plaid Flannel Shirt"
  BAD: Inventing specific model names or brand names that are not visible.
- Be SPECIFIC in naming: "White Nike Air Force 1 Low" (if visible) is better than "White Sneakers" which is better than "Shoes"
- Describe the PRIMARY distinguishing features: color, material, brand (if visible), type
- Use descriptive names like "Barilla Spaghetti No. 5" (label visible) or "Black Mesh Running Shoes" (no label visible) — not "Item" or "Product".

CONFIDENCE (be strictly calibrated):
- 0.90-0.95: Crystal clear image, visible brand/label/text, zero ambiguity about what this is, could list on eBay with this info
- 0.80-0.89: Clear product photo, obvious what category it is, main features visible, minor details uncertain
- 0.70-0.79: Good photo, category is clear, but details like brand/model not fully visible
- 0.55-0.69: Reasonable photo but partially obscured, angled, or slightly ambiguous between 2 categories
- 0.40-0.54: Blurry, dark, distant, or significantly obscured — shape recognizable but details lost
- 0.25-0.39: Very poor quality — mostly guessing from shape/context alone
- Below 0.25: Essentially unidentifiable
- RULE: If you had ANY hesitation about the category, cap confidence at 0.75
- RULE: If the photo is not well-lit and centered, cap confidence at 0.80
- RULE: If you had to override your first instinct, cap confidence at 0.65
- RULE: Never give 0.90+ unless you can read text/brand on the item

visual_cues: List 4-8 SPECIFIC things you actually see. These MUST be real observations from the image:
- Text/labels: "brand logo Nike visible on side", "nutrition label on back", "price tag $12.99"
- Materials: "wood grain texture visible", "brushed stainless steel", "leather upper", "mesh fabric"
- Features: "rubber outsole", "four metal legs", "glass screen", "zipper closure", "barcode on packaging"
- Context: "on white background", "held in hand", "on store shelf", "next to ruler for scale"
Do NOT list vague observations like "product" or "item" or "object".

short_summary: 1-2 sentence summary of the item focusing on: what it IS, what it's USED FOR, and one KEY distinguishing feature.
image_description: Detailed visual description — color, shape, material, texture, brand elements, notable features, approximate size. Must be specific enough that someone could identify this exact item from the description alone.`;

function getDetailPrompt(itemType: SmartScanItemType): string {
  const base = `You are an expert product analyst with deep knowledge of pricing, materials, brands, and market values. Analyze the item in this image with HIGH ACCURACY.

ACCURACY RULES (CRITICAL — follow these strictly):
1. Only state facts you can VERIFY from the image or from well-known product knowledge.
2. If you recognize the EXACT product (brand + model visible), use real-world data you know about it.
3. If you recognize the brand but not the exact model, use the brand's typical price range for that product type.
4. If you see NO brand/model, estimate based on the item's apparent quality, material, and size — but be honest about uncertainty.
5. Do NOT invent specific dollar amounts like "$47.99" unless you have strong evidence. Use ranges instead.
6. Do NOT invent specific dimensions unless visible on packaging or you recognize the exact product.
7. Do NOT state specific brand names unless visible on the item (logo, label, text).
8. For materials: say "likely wood" or "appears to be metal" if not 100% certain. But if you CAN tell (e.g. clearly canvas, obviously leather, visibly glass), state it.
9. For assembly info: use general language like "basic assembly likely" unless you recognize the specific product.
10. For companion/matching products: suggest item TYPES, not specific branded products, unless verified.
11. Never use "Worth it", "Good value", "Great deal" without real comparison data. Set value_verdict and value_rating to null if uncertain.

PRICING ACCURACY RULES:
- If you recognize the exact product, give its real retail price (or close estimate).
- If you recognize the brand + category, give the brand's typical range for that product type.
- If you don't recognize the brand, give a market-typical range for that type of item based on apparent quality.
- Always provide price_range when possible — this is more useful than a potentially wrong exact price.
- If item is clearly cheap (under $5), say so. If clearly premium ($100+), say so. Do not default to mid-range.
- Never output "Free" or "$0.00" — set to null instead.
- Use dollar format like "$X.XX" for specific prices.

RESALE VALUE RULES:
- Only provide resale value for items with real secondhand markets (fashion, electronics, furniture, collectibles).
- Resale must be LOWER than retail unless genuinely hyped/limited edition.
- Cheap items under $10 retail: set resale to null.
- Consumables (food, grocery, cleaning supplies): NO resale value ever.
- Used condition reduces value by 30-60% typically.
- If unsure, set to null rather than guess.

QUALITY CHECK — before returning your answer:
- Does the item_name accurately describe what is in the image?
- Are the details consistent with the category?
- Are prices realistic for this type of item?
- Did you fill ONLY the correct detail field for this category?
\n\n`;

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
- item_type_specific: describe what kind of furniture (e.g. "puzzle storage rack", "bookshelf", "desk")
- material: ONLY if you can tell from the image. Use "likely wood" or "likely MDF" — not specific wood species unless visible.
- finish_color, style: describe what you see
- estimated_dimensions: set to null UNLESS you recognize the exact product or see dimensions on packaging. Do NOT invent inch measurements from visual guessing.
- estimated_retail_price: set to null UNLESS you can match to a known product listing. Use estimated_price_range instead if uncertain.
- estimated_price_range: provide a realistic range based on similar items if you cannot confirm exact price.
- value_level, value_rating: set to null unless you have real comparison data.
- assembly_required, assembly_difficulty: use general terms. "Basic assembly likely" is fine if you're not sure.
- estimated_build_time: set to null unless confirmed from listing data.
- people_needed: set to null unless confirmed.
- likely_tools_needed: only list tools that are TYPICAL for this category (e.g. "screwdriver" for flat-pack). Label these as typical, not confirmed.
- likely_parts: set to empty array unless you can count or confirm parts.
- mounting_type: infer only if obvious (wall-mounted vs freestanding).
- assembly_summary: keep general. "Typical flat-pack assembly" is fine. Do not invent specific step counts.
- use_case, room_fit, room_fit_labels: describe typical usage settings.
- matching_products: suggest item TYPES only (e.g. "large knob puzzles", "storage bins"), NOT specific brand+model products unless verified.
- extra_purchase_items: only suggest categories of items that are typically needed. Do not invent specific costs unless verified.
- total_estimated_cost: set to null unless you have verified component prices.
- worth_it_verdict: set to null. Do not make subjective value judgments without real data.
- care_tip: provide GENERAL care guidance appropriate for the material type.
- setup_notes, wall_anchor_note, long_term_value: keep general or set to null.
- tags, complementary_items: item types only, not specific products.
If you recognize an IKEA product by name/label, use real IKEA product names and pricing.
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

  if (fixed.item_type === 'unknown' || fixed.item_type === 'receipt' || fixed.item_type === 'document') {
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

function crossValidateClassification(classification: z.infer<typeof classificationSchema>): z.infer<typeof classificationSchema> {
  const fixed = { ...classification };
  const name = (fixed.item_name ?? '').toLowerCase();
  const desc = (fixed.image_description ?? '').toLowerCase();
  const summary = (fixed.short_summary ?? '').toLowerCase();
  const cues = (fixed.visual_cues ?? []).map(c => c.toLowerCase());
  const allText = name + ' ' + desc + ' ' + summary + ' ' + cues.join(' ');

  const hasShoeWords = /\b(shoe|sneaker|boot|sandal|heel|loafer|slipper|trainer|kick|footwear|sole|lace-up|air force|air max|jordan|yeezy|dunk|retro)\b/.test(allText);
  const hasClothingWords = /\b(shirt|pants|jeans|jacket|coat|dress|skirt|hoodie|sweater|cardigan|blazer|vest|legging|shorts|t-shirt|polo|blouse|top|tunic|romper|jumpsuit|overalls)\b/.test(allText);
  const hasAccessoryWords = /\b(bag|purse|wallet|backpack|tote|clutch|watch|bracelet|necklace|ring|earring|sunglasses|glasses|hat|cap|beanie|scarf|belt|tie|bow tie)\b/.test(allText);
  const hasFoodWords = /\b(spaghetti|pasta|rice|cereal|soup|sauce|bread|chips|cookie|cracker|candy|chocolate|granola|yogurt|milk|juice|soda|snack|nutrition|calories|protein bar|frozen meal|canned|ramen|noodle|oatmeal|flour|sugar|honey|jam|peanut butter|ketchup|mustard|mayo|vinegar|oil|spice|coffee|tea|cream|cheese|butter|egg|meat|chicken|beef|pork|fish|shrimp|fruit|vegetable|apple|banana|orange|grape|berry|tomato|lettuce|onion|potato|carrot|broccoli|pepper|corn|bean|lentil|pizza|burger|taco|sandwich|wrap|salad|steak|sushi|donut|cake|pie|muffin|bagel|croissant|waffle|pancake)\b/.test(allText);
  const hasElectronicsWords = /\b(phone|laptop|tablet|headphone|earbuds|speaker|monitor|keyboard|mouse|charger|cable|usb|hdmi|controller|console|tv|television|camera|drone|smartwatch|power bank|printer|router|projector|microphone|webcam|iphone|ipad|macbook|airpod|samsung|pixel|dell|hp|lenovo|asus|sony|bose|jbl|playstation|xbox|nintendo|switch|roku|echo|alexa|kindle)\b/.test(allText);
  const hasFurnitureWords = /\b(desk|table|chair|sofa|couch|bed|shelf|shelving|cabinet|wardrobe|dresser|nightstand|bookcase|bookshelf|bench|stool|ottoman|recliner|futon|loveseat|sectional|headboard|bed frame|mattress|tv stand|entertainment center|armoire|credenza|sideboard|hutch|vanity|bar cart|dining set)\b/.test(allText);

  if (fixed.item_type === 'furniture' && hasFoodWords && !hasFurnitureWords) {
    console.log('[SmartScan] Cross-validation: food item wrongly classified as furniture, correcting');
    const hasPackaging = /\b(package|box|bag|can|bottle|jar|wrapper|label|barcode|nutrition)\b/.test(allText);
    fixed.item_type = hasPackaging ? 'grocery' : 'food';
    fixed.category = hasPackaging ? 'Grocery' : 'Food';
    fixed.confidence = Math.min(fixed.confidence, 0.65);
    return fixed;
  }

  if (fixed.item_type === 'furniture' && (hasShoeWords || hasClothingWords || hasAccessoryWords) && !hasFurnitureWords) {
    console.log('[SmartScan] Cross-validation: fashion item wrongly classified as furniture, correcting');
    fixed.item_type = 'fashion';
    fixed.category = 'Fashion';
    fixed.confidence = Math.min(fixed.confidence, 0.65);
    return fixed;
  }

  if (fixed.item_type === 'furniture' && hasElectronicsWords && !hasFurnitureWords) {
    console.log('[SmartScan] Cross-validation: electronics item wrongly classified as furniture, correcting');
    fixed.item_type = 'electronics';
    fixed.category = 'Electronics';
    fixed.confidence = Math.min(fixed.confidence, 0.65);
    return fixed;
  }

  if (fixed.item_type === 'household' && (hasShoeWords || hasClothingWords) && !(/\b(kitchen|clean|bath|tool|fitness|decor|beauty|skincare|appliance)\b/.test(allText))) {
    console.log('[SmartScan] Cross-validation: fashion item wrongly classified as household, correcting');
    fixed.item_type = 'fashion';
    fixed.category = 'Fashion';
    fixed.confidence = Math.min(fixed.confidence, 0.65);
    return fixed;
  }

  if (fixed.item_type === 'general' && hasElectronicsWords) {
    console.log('[SmartScan] Cross-validation: electronics item classified as general, upgrading');
    fixed.item_type = 'electronics';
    fixed.category = 'Electronics';
    fixed.confidence = Math.min(fixed.confidence, 0.7);
    return fixed;
  }

  if (fixed.item_type === 'general' && (hasShoeWords || hasClothingWords || hasAccessoryWords)) {
    console.log('[SmartScan] Cross-validation: fashion item classified as general, upgrading');
    fixed.item_type = 'fashion';
    fixed.category = 'Fashion';
    fixed.confidence = Math.min(fixed.confidence, 0.7);
    return fixed;
  }

  if (fixed.item_type === 'general' && hasFoodWords) {
    const hasPackaging = /\b(package|box|bag|can|bottle|jar|wrapper|label|barcode|nutrition)\b/.test(allText);
    console.log('[SmartScan] Cross-validation: food item classified as general, upgrading');
    fixed.item_type = hasPackaging ? 'grocery' : 'food';
    fixed.category = hasPackaging ? 'Grocery' : 'Food';
    fixed.confidence = Math.min(fixed.confidence, 0.65);
    return fixed;
  }

  if ((fixed.item_type === 'food' || fixed.item_type === 'grocery') && hasElectronicsWords && !hasFoodWords) {
    console.log('[SmartScan] Cross-validation: electronics item wrongly classified as food/grocery, correcting');
    fixed.item_type = 'electronics';
    fixed.category = 'Electronics';
    fixed.confidence = Math.min(fixed.confidence, 0.6);
    return fixed;
  }

  return fixed;
}

function recoverUnknown(classification: z.infer<typeof classificationSchema>): z.infer<typeof classificationSchema> {
  if (classification.item_type !== 'unknown') return classification;
  if (classification.image_content_type === 'printed_material' || classification.image_content_type === 'multi_item_page' || classification.image_content_type === 'screenshot' || classification.image_content_type === 'document') return classification;
  const fixed = { ...classification };
  const combined = ((fixed.visual_cues ?? []).join(' ') + ' ' + (fixed.item_name ?? '') + ' ' + (fixed.short_summary ?? '') + ' ' + (fixed.image_description ?? '')).toLowerCase();

  const checks: [string[], SmartScanItemType, string][] = [
    [['shoe', 'sneaker', 'boot', 'sole', 'lace', 'swoosh', 'nike', 'adidas', 'jordan', 'puma', 'new balance', 'converse', 'vans', 'shirt', 'hoodie', 'jacket', 'pants', 'dress', 'bag', 'hat', 'belt', 'watch', 'purse', 'sandal', 'heel', 'jeans', 'skirt', 'blazer', 'backpack', 'tote', 'scarf', 'glove', 'beanie', 'cap', 'wallet', 'sunglasses', 'legging', 'shorts', 'sweater', 'cardigan', 'coat', 'vest', 'tie', 'jewelry', 'bracelet', 'necklace', 'ring', 'earring'], 'fashion', 'Fashion'],
    [['phone', 'laptop', 'tablet', 'headphone', 'earbuds', 'speaker', 'screen', 'charger', 'controller', 'console', 'keyboard', 'mouse', 'monitor', 'camera', 'drone', 'smart', 'airpod', 'iphone', 'ipad', 'macbook', 'samsung', 'power bank', 'cable', 'usb', 'hdmi', 'printer', 'router', 'modem', 'battery', 'remote', 'projector', 'tv', 'television', 'microphone', 'webcam', 'gaming', 'playstation', 'xbox', 'nintendo'], 'electronics', 'Electronics'],
    [['dumbbell', 'kettlebell', 'wrench', 'drill', 'hammer', 'pan', 'pot', 'skillet', 'vacuum', 'broom', 'towel', 'blanket', 'pillow', 'candle', 'lamp', 'rug', 'curtain', 'moisturizer', 'shampoo', 'skincare', 'makeup', 'yoga mat', 'blender', 'toaster', 'coffee maker', 'iron', 'mop', 'sponge', 'soap', 'detergent', 'air freshener', 'vase', 'picture frame', 'clock', 'mirror', 'thermos', 'water filter', 'cutting board', 'knife set', 'bowl', 'plate set', 'mug', 'glass set', 'tupperware', 'container', 'basket', 'organizer', 'deodorant', 'perfume', 'cologne', 'lotion', 'cream', 'serum', 'mascara', 'lipstick', 'foundation'], 'household', 'Household'],
    [['desk', 'table', 'chair', 'sofa', 'couch', 'bed', 'shelf', 'shelving', 'cabinet', 'dresser', 'wardrobe', 'bookcase', 'bookshelf', 'nightstand', 'bench', 'ottoman', 'recliner', 'futon', 'armoire', 'credenza', 'sideboard', 'hutch', 'tv stand', 'entertainment center', 'dining set', 'bar stool', 'headboard', 'bed frame', 'mattress', 'loveseat', 'sectional'], 'furniture', 'Furniture'],
    [['cereal', 'bottle', 'can', 'package', 'barcode', 'nutrition facts', 'grocery', 'pasta', 'sauce', 'snack', 'chips', 'crackers', 'soda', 'juice', 'milk', 'yogurt', 'bread', 'rice', 'frozen', 'canned', 'protein bar', 'energy drink', 'granola', 'oatmeal', 'flour', 'sugar', 'condiment', 'ketchup', 'mustard', 'mayo', 'dressing', 'vinegar', 'oil', 'spice', 'seasoning', 'tea', 'coffee', 'creamer', 'popcorn', 'pretzel', 'cracker', 'cookie', 'candy', 'chocolate', 'gum', 'mint'], 'grocery', 'Grocery'],
    [['meal', 'food', 'fruit', 'vegetable', 'cooked', 'pizza', 'burger', 'sandwich', 'salad', 'steak', 'chicken', 'sushi', 'taco', 'soup', 'plate of', 'bowl of', 'rice dish', 'noodle', 'egg', 'pancake', 'waffle', 'toast', 'bagel', 'donut', 'cake', 'pie', 'muffin', 'croissant', 'smoothie', 'acai', 'avocado', 'banana', 'apple', 'orange', 'grape', 'berry', 'melon', 'prepared food', 'raw meat', 'fish fillet', 'shrimp', 'lobster', 'crab'], 'food', 'Food'],
  ];

  let bestMatch: [SmartScanItemType, string, number] | null = null;
  for (const [signals, type, category] of checks) {
    const matchCount = signals.filter(s => combined.includes(s)).length;
    if (matchCount > 0 && (!bestMatch || matchCount > bestMatch[2])) {
      bestMatch = [type, category, matchCount];
    }
  }

  if (bestMatch) {
    console.log('[SmartScan] Recovering unknown as', bestMatch[0], 'with', bestMatch[2], 'signal matches');
    fixed.item_type = bestMatch[0];
    fixed.category = bestMatch[1];
    fixed.confidence = Math.max(fixed.confidence, bestMatch[2] >= 3 ? 0.5 : 0.35);
    return fixed;
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
  if (validated.item_type === 'document') {
    validated.food_details = null;
    validated.grocery_details = null;
    validated.furniture_details = null;
    validated.fashion_details = null;
    validated.electronics_details = null;
    validated.household_details = null;
    validated.general_details = null;
  }

  if (!validated.item_name || validated.item_name.length < 3 || validated.item_name === 'Unknown') {
    validated.item_name = classification.item_name || `${classification.category} Item`;
    validated.confidence = Math.min(validated.confidence, 0.4);
  }

  return validated;
}

function recalibrateConfidence(result: SmartScanResult, _classification: z.infer<typeof classificationSchema>): SmartScanResult {
  const recalibrated = { ...result };
  const type = recalibrated.item_type;
  let detailRichness = 0;
  let maxPossible = 0;

  const checkField = (val: unknown) => {
    maxPossible++;
    if (val !== null && val !== undefined && val !== '' && val !== 'null') detailRichness++;
  };

  if (type === 'food' && recalibrated.food_details) {
    const fd = recalibrated.food_details;
    checkField(fd.serving_size);
    checkField(fd.calories);
    checkField(fd.health_summary);
    checkField(fd.key_nutrients?.length > 0 ? fd.key_nutrients : null);
    checkField(fd.tags?.length > 0 ? fd.tags : null);
  } else if (type === 'grocery' && recalibrated.grocery_details) {
    const gd = recalibrated.grocery_details;
    checkField(gd.brand);
    checkField(gd.package_size);
    checkField(gd.estimated_price);
    checkField(gd.tags?.length > 0 ? gd.tags : null);
  } else if (type === 'fashion' && recalibrated.fashion_details) {
    const fd = recalibrated.fashion_details;
    checkField(fd.subcategory);
    checkField(fd.brand);
    checkField(fd.material);
    checkField(fd.color);
    checkField(fd.style);
    checkField(fd.estimated_retail_price);
  } else if (type === 'electronics' && recalibrated.electronics_details) {
    const ed = recalibrated.electronics_details;
    checkField(ed.product_type);
    checkField(ed.brand);
    checkField(ed.model);
    checkField(ed.estimated_retail_price);
  } else if (type === 'furniture' && recalibrated.furniture_details) {
    const fd = recalibrated.furniture_details;
    checkField(fd.item_type_specific);
    checkField(fd.material);
    checkField(fd.finish_color);
    checkField(fd.estimated_price_range);
    checkField(fd.use_case);
  } else if (type === 'household' && recalibrated.household_details) {
    const hd = recalibrated.household_details;
    checkField(hd.item_description);
    checkField(hd.subcategory);
    checkField(hd.brand);
    checkField(hd.material);
    checkField(hd.estimated_price);
  } else if (type === 'general' && recalibrated.general_details) {
    const gd = recalibrated.general_details;
    checkField(gd.item_description);
    checkField(gd.subcategory);
    checkField(gd.brand);
    checkField(gd.material);
    checkField(gd.color);
  }

  if (maxPossible > 0) {
    const fillRate = detailRichness / maxPossible;
    const currentConf = recalibrated.confidence;

    if (fillRate >= 0.8 && currentConf < 0.7) {
      const boost = Math.min(0.1, (0.7 - currentConf) * 0.5);
      recalibrated.confidence = Math.min(currentConf + boost, 0.8);
      console.log('[SmartScan] Confidence boosted by detail richness:', currentConf.toFixed(2), '->', recalibrated.confidence.toFixed(2), 'fillRate:', fillRate.toFixed(2));
    } else if (fillRate < 0.3 && currentConf > 0.6) {
      const penalty = Math.min(0.15, (currentConf - 0.5) * 0.4);
      recalibrated.confidence = Math.max(currentConf - penalty, 0.35);
      console.log('[SmartScan] Confidence reduced by sparse details:', currentConf.toFixed(2), '->', recalibrated.confidence.toFixed(2), 'fillRate:', fillRate.toFixed(2));
    }
  }

  const name = (recalibrated.item_name ?? '').toLowerCase();
  if (name.length < 5 || name === 'item' || name === 'product' || name === 'unknown' || name === 'scanned item') {
    recalibrated.confidence = Math.min(recalibrated.confidence, 0.4);
    console.log('[SmartScan] Confidence capped due to generic item name:', name);
  }

  return recalibrated;
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

function buildDocumentResult(
  classification: z.infer<typeof classificationSchema>,
  imageUri: string
): SmartScanResult {
  const contentType = classification.image_content_type;
  const detectedItems = classification.detected_items_list ?? [];
  const pageTopic = classification.page_topic ?? '';
  const confidence = Math.max(classification.confidence, 0.70);

  const docTypeMap: Record<string, string> = {
    multi_item_page: 'catalog',
    printed_material: 'infographic',
    screenshot: 'screenshot',
    document: 'other',
    single_item: 'other',
    unclear: 'other',
  };

  const suggestedActions: string[] = [];
  if (detectedItems.length > 1) {
    suggestedActions.push('Crop a specific item for single-item identification');
  }
  suggestedActions.push('Try scanning a single product for detailed analysis');
  if (contentType === 'screenshot') {
    suggestedActions.push('Use the original source for more accurate results');
  }

  const keyInfo: string[] = [];
  if (pageTopic) keyInfo.push(`Topic: ${pageTopic}`);
  if (detectedItems.length > 0) {
    keyInfo.push(`${detectedItems.length} item${detectedItems.length === 1 ? '' : 's'} detected`);
  }

  const contentLabels: Record<string, string> = {
    multi_item_page: 'Multi-item reference page detected',
    printed_material: 'Printed material detected',
    screenshot: 'Screenshot / digital content detected',
    document: 'Document content detected',
  };
  const summary = contentLabels[contentType] ?? 'Non-product content detected';

  console.log('[SmartScan] Building document result:', summary, 'items:', detectedItems.length);

  return {
    item_type: 'document',
    confidence,
    item_name: classification.item_name || summary,
    category: 'Document / Printed Content',
    food_details: null,
    grocery_details: null,
    household_details: null,
    furniture_details: null,
    fashion_details: null,
    electronics_details: null,
    general_details: null,
    document_details: {
      content_description: classification.short_summary || summary,
      document_type: (docTypeMap[contentType] ?? 'other') as 'infographic' | 'catalog' | 'educational' | 'poster' | 'screenshot' | 'chart' | 'reference' | 'other',
      detected_items: detectedItems,
      main_topic: pageTopic,
      visible_text_summary: classification.short_summary || '',
      key_information: keyInfo,
      suggested_actions: suggestedActions,
      tags: (classification.visual_cues ?? []).slice(0, 8),
    },
    is_receipt: false,
    short_summary: classification.short_summary || summary,
    image_description: classification.image_description ?? '',
    visual_cues: classification.visual_cues ?? [],
    scanned_image_uri: imageUri,
    image_content_type: contentType,
    detected_items_list: detectedItems,
    page_topic: pageTopic,
  };
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
      general_details: null, document_details: null, is_receipt: true,
    };
  }

  const contentType = classification.image_content_type;
  console.log('[SmartScan] Content type:', contentType, 'detected_items:', classification.detected_items_list?.length ?? 0);

  if (contentType === 'printed_material' || contentType === 'multi_item_page' || contentType === 'screenshot' || contentType === 'document' || classification.item_type === 'document') {
    console.log('[SmartScan] Document/printed content detected — using document flow');
    const docResult = buildDocumentResult(classification, imageUri);
    lastProcessedBase64 = processed.base64;
    docResult.scanned_image_uri = imageUri;
    return docResult;
  }

  classification = recoverUnknown(classification);
  classification = fixItemType(classification);
  classification = crossValidateClassification(classification);

  if (classification.confidence < 0.25) {
    classification.confidence = 0.25;
  }

  console.log('[SmartScan] Step 2: Getting details for', classification.item_type);
  const detailPrompt = getDetailPrompt(classification.item_type);

  const fullPrompt = `${detailPrompt}

The item has been identified as: ${classification.item_name} (${classification.category}).
Visual description: ${classification.image_description || 'N/A'}.
Visual cues observed: ${(classification.visual_cues ?? []).join(', ') || 'none'}.
item_type MUST be "${classification.item_type}". Do NOT change it. is_receipt must be false.
confidence should be ${classification.confidence.toFixed(2)}.
Keep item_name close to "${classification.item_name}" — only refine spelling/capitalization, don't replace with a different product.
CRITICAL: ONLY populate the ${classification.item_type}_details field. ALL other detail fields (*_details) MUST be null.
Do NOT invent information you cannot see or confidently infer. If you don't know a value, set it to null.
Be ACCURATE: real prices for recognized products, realistic ranges for unrecognized ones. Do not hallucinate brand names, model numbers, or prices.`;

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
  const recalibrated = recalibrateConfidence(validated, classification);
  const stabilized = stabilizePricing(recalibrated);

  stabilized.short_summary = classification.short_summary ?? '';
  stabilized.image_description = classification.image_description ?? '';
  stabilized.visual_cues = classification.visual_cues ?? [];
  stabilized.scanned_image_uri = imageUri;

  const { buildScanTrustResult } = await import('@/services/scanTrustEngine');
  stabilized.trustResult = buildScanTrustResult(stabilized, classification.visual_cues ?? []);

  console.log('[SmartScan] Done:', stabilized.item_name, 'type:', stabilized.item_type, 'conf:', stabilized.confidence);
  return stabilized;
}
