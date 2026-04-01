import { generateObject, generateText } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { preprocessReceiptImage } from '@/services/receiptImagePreprocess';

const FILLER_PREFIXES = ['a ', 'an ', 'the ', 'some ', 'one ', 'single ', 'generic ', 'standard ', 'regular ', 'typical ', 'basic '];
const JUNK_SUFFIXES = [' item', ' product', ' object', ' thing', ' piece'];

function toTitleCase(str: string): string {
  return str
    .split(/\s+/)
    .filter(Boolean)
    .map(word => {
      if (['and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'vs', 'x'].includes(word.toLowerCase()) && word.length < 4) {
        return word.toLowerCase();
      }
      if (word === word.toUpperCase() && word.length <= 5) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .replace(/^\w/, c => c.toUpperCase());
}

function normalizeItemName(name: string | null | undefined): string {
  if (!name || name.trim().length < 2) return 'Unidentified Item';
  let cleaned = name.trim();
  cleaned = cleaned.replace(/^["']+|["']+$/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  let lower = cleaned.toLowerCase();
  for (const filler of FILLER_PREFIXES) {
    if (lower.startsWith(filler)) {
      cleaned = cleaned.substring(filler.length).trim();
      lower = cleaned.toLowerCase();
    }
  }
  for (const suffix of JUNK_SUFFIXES) {
    if (lower.endsWith(suffix) && cleaned.length > suffix.length + 3) {
      cleaned = cleaned.substring(0, cleaned.length - suffix.length).trim();
    }
  }
  if (cleaned.length < 2) return 'Unidentified Item';
  cleaned = toTitleCase(cleaned);
  if (cleaned.length > 80) cleaned = cleaned.substring(0, 77) + '...';
  return cleaned;
}

function normalizeTextField(text: string | null | undefined): string | null {
  if (!text || text.trim().length === 0) return null;
  let cleaned = text.trim();
  cleaned = cleaned.replace(/\s+/g, ' ');
  if (['n/a', 'none', 'unknown', 'null', 'undefined', 'not available', 'not applicable'].includes(cleaned.toLowerCase())) return null;
  return cleaned;
}

function normalizeCategory(category: string | null | undefined): string {
  if (!category || category.trim().length === 0) return 'General';
  return toTitleCase(category.trim());
}

function normalizeSummary(summary: string | null | undefined): string {
  if (!summary || summary.trim().length < 3) return '';
  let cleaned = summary.trim();
  cleaned = cleaned.replace(/\s+/g, ' ');
  if (!cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
    cleaned += '.';
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function normalizeTagsArray(tags: string[] | null | undefined): string[] {
  if (!tags || !Array.isArray(tags)) return [];
  return tags
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0 && t !== 'n/a' && t !== 'none' && t !== 'unknown')
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .slice(0, 10);
}

function normalizeStringArray(arr: string[] | null | undefined): string[] {
  if (!arr || !Array.isArray(arr)) return [];
  return arr
    .map(s => s.trim())
    .filter(s => s.length > 0 && !['n/a', 'none', 'unknown'].includes(s.toLowerCase()))
    .filter((s, i, a) => a.indexOf(s) === i);
}

function ensureDollarPrefix(price: string | null | undefined): string | null {
  if (!price) return null;
  const cleaned = price.trim();
  if (['free', 'n/a', 'none', 'not for sale', 'not sold separately', 'included', 'complimentary'].includes(cleaned.toLowerCase())) return null;
  const numMatch = cleaned.replace(/[^0-9.]/g, '');
  const numVal = parseFloat(numMatch);
  if (isNaN(numVal) || numVal < 0.01) return null;
  if (!cleaned.startsWith('$')) return `$${numMatch}`;
  return cleaned;
}

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

const recipeSchema = z.object({
  name: z.string(),
  description: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  prep_time: z.string(),
  key_ingredients: z.array(z.string()),
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
  purpose: z.string().nullable(),
  value_insight: z.string().nullable(),
  next_scan_suggestion: z.string().nullable(),
  ingredients: z.array(z.string()),
  allergens: z.array(z.string()),
  dietary_info: z.array(z.string()),
  recipe_ideas: z.array(recipeSchema),
  preparation_tips: z.array(z.string()),
  storage_tip: z.string().nullable(),
  season_availability: z.string().nullable(),
  origin_region: z.string().nullable(),
  cuisine_type: z.string().nullable(),
  pairs_with_drinks: z.array(z.string()),
  substitutes: z.array(z.string()),
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
  purpose: z.string().nullable(),
  value_insight: z.string().nullable(),
  next_scan_suggestion: z.string().nullable(),
  ingredients_list: z.array(z.string()),
  allergens: z.array(z.string()),
  dietary_info: z.array(z.string()),
  recipe_ideas: z.array(recipeSchema),
  preparation_tips: z.array(z.string()),
  storage_tip: z.string().nullable(),
  nutrition_highlights: z.string().nullable(),
  substitutes: z.array(z.string()),
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
  purpose: z.string().nullable(),
  value_insight: z.string().nullable(),
  next_scan_suggestion: z.string().nullable(),
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
  purpose: z.string().nullable(),
  value_insight: z.string().nullable(),
  next_scan_suggestion: z.string().nullable(),
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
  purpose: z.string().nullable(),
  value_insight: z.string().nullable(),
  next_scan_suggestion: z.string().nullable(),
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
  purpose: z.string().nullable(),
  value_insight: z.string().nullable(),
  next_scan_suggestion: z.string().nullable(),
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
  purpose: z.string().nullable(),
  value_insight: z.string().nullable(),
  next_scan_suggestion: z.string().nullable(),
  ikea_article_number: z.string().nullable(),
  ikea_product_name: z.string().nullable(),
  ikea_product_family: z.string().nullable(),
  ikea_variant: z.string().nullable(),
  ikea_category: z.string().nullable(),
  packaging_type: z.enum(['flat-pack', 'assembled', 'boxed', 'unpackaged', 'unknown']).nullable(),
  packaging_count: z.string().nullable(),
  is_likely_ikea: z.boolean().nullable(),
  ikea_match_confidence: z.enum(['exact', 'strong', 'possible', 'weak']).nullable(),
  manual_detected: z.boolean().nullable(),
  label_detected: z.boolean().nullable(),
  ikea_clues: z.array(z.string()),
  resale_title_suggestion: z.string().nullable(),
  condition_estimate: z.enum(['new-sealed', 'new-open', 'like-new', 'good', 'fair', 'worn', 'damaged']).nullable(),
  best_next_scan: z.array(z.string()),
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

CRITICAL CONSISTENCY RULES:
- Given the SAME image, you must always return the SAME item_type, item_name, and confidence range.
- Do NOT randomize or vary your answer. Be deterministic.
- Focus on the DOMINANT object in the image center. Ignore background items.
- Name items by their most common, widely-recognized name. Prefer simple names over elaborate ones.
- Example: "Red Nike Air Max 90" not "Nike Air Max 90 University Red OG Colorway Retro"
- Example: "Wooden Bookshelf" not "A Standard Wooden Multi-Tier Bookshelf Storage Unit"
- Keep item_name to 2-6 words. Be specific but concise.

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
- "household" = smaller home/lifestyle items that are NOT furniture and NOT food: kitchenware, pots, pans, utensils, cutting boards, colanders, mixing bowls, spatulas, ladles, tongs, whisks, peelers, graters, measuring cups, storage containers, food storage bags, tupperware, mason jars, bins, baskets, organizers, shelf organizers, drawer dividers, lamps, light bulbs, rugs, mats, curtains, pillows, cushions, throws, towels, blankets, bedding sets, cleaning supplies (spray bottles, sponges, mops, brooms, dustpans, brushes, detergent, dish soap, all-purpose cleaner), tools (drills, hammers, screwdrivers, pliers, wrenches, tape measures, levels, utility knives, saws), fitness equipment (dumbbells, kettlebells, yoga mats, resistance bands, jump ropes), bathroom items (soap dispensers, toothbrush holders, shower caddies, bath mats, toilet brushes), candles, air fresheners, diffusers, vases, picture frames, clocks, mirrors, wall hooks, coat hooks, hangers, laundry baskets, ironing boards, irons, decor items, plant pots, planters, watering cans, garden tools, beauty/skincare/makeup products, small appliances (toasters, blenders, coffee makers, kettles, rice cookers, air fryers, instant pots, food processors, mixers, slow cookers, can openers, electric grills). KEY: used around the home but not large enough to be furniture. This includes ALL kitchen tools, ALL cleaning products, ALL storage/organization items, ALL bathroom accessories, ALL home decor, ALL garden tools, and ALL small appliances.
- "general" = clearly identifiable physical item that doesn't fit any above category (toys, board games, puzzles, books, magazines, sports equipment, balls, rackets, musical instruments, art supplies, paints, brushes, automotive parts, car accessories, pet supplies, pet toys, pet beds, leashes, collars, stationery, pens, notebooks, planners, gift wrap, party supplies, seasonal decorations, craft supplies, sewing supplies, hobby items, collectibles, figurines, models, trading cards)
- "unknown" = truly unrecognizable: extremely blurry, completely dark, abstract art with no identifiable object, or a close-up that shows no recognizable features

CATEGORY DECISION TREE — USE THIS ORDER:
1. Is it a receipt/price tag/invoice? → "receipt"
2. Is it a document/screenshot/poster/infographic? → "document" (set via image_content_type above)
3. Is it food on a plate/being eaten/fresh produce/prepared? → "food"
4. Is it a packaged food product in retail packaging? → "grocery"
5. Is it something you WEAR or carry as personal accessory? → "fashion"
6. Does it use electricity/batteries/have a screen? → "electronics"
7. Is it a large piece of home furniture? → "furniture"
8. Is it a smaller home/lifestyle item (kitchenware, cleaning, tools, storage, decor, bathroom, garden, small appliance, beauty)? → "household"
9. Is it identifiable but none of the above (toys, books, sports, music, art, auto, pets, stationery)? → "general"
10. Is it truly unrecognizable? → "unknown"

EVERYDAY ITEM RECOGNITION GUIDANCE:
- Kitchen items (pots, pans, utensils, cutting boards, storage containers, small appliances) = ALWAYS "household"
- Cleaning products (sprays, sponges, mops, detergents, wipes, brushes) = ALWAYS "household"
- Storage/organization (bins, baskets, shelving inserts, drawer organizers, hangers, hooks) = ALWAYS "household"
- Bathroom accessories (soap dispensers, shower caddies, bath mats, toilet brushes) = ALWAYS "household"
- Home decor (candles, vases, picture frames, clocks, wall art, mirrors, throws, cushions) = ALWAYS "household"
- Garden/outdoor tools (watering cans, pruners, plant pots, garden gloves) = ALWAYS "household"
- Tools/hardware (hammers, screwdrivers, drills, tape, nails, screws, pliers) = ALWAYS "household"
- Packaged products with barcodes/labels (cleaning sprays, laundry pods, dishwasher tabs) = "household" NOT "grocery" (only packaged FOOD goes to grocery)

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

BANNED GENERIC NAMES (NEVER USE THESE):
- "Detected Item", "Scanned Item", "Unknown Item", "Item", "Product", "Object", "Thing"
- "Other", "General Item", "Unidentified", "Misc", "Miscellaneous"
- Any name that starts with "Detected" or "Scanned"
- If you cannot determine an exact name, ALWAYS use a descriptive broad name instead:
  Examples: "White Knit Running Shoe", "Ceramic Dinner Plate", "Wooden Cutting Board", "Red Canvas Backpack"
  NEVER fall back to placeholder names. Always describe what you see with [Color] [Material] [Item Type].

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

ITEM NAMING — CONSISTENCY RULES:
- Use the SIMPLEST accurate name. Prefer 2-6 words.
- Format: [Color/Size] [Brand if visible] [Product Type] [Model if visible]
- Examples: "Black Nike Air Force 1", "Stainless Steel Water Bottle", "IKEA KALLAX Shelf", "Granny Smith Apple"
- Do NOT add unnecessary adjectives like "beautiful", "nice", "quality", "premium" unless describing material grade.
- Do NOT add "- [Brand]" or "by [Brand]" at the end. Put brand BEFORE the product type.
- If brand is not visible, do NOT guess. Just describe what you see.
- ALWAYS produce a useful, descriptive item_name. Even if unsure, describe the dominant visible object.
- A name like "Blue Ceramic Mug" is infinitely better than "Detected Item" or "Unknown".

visual_cues: List 4-8 SPECIFIC things you actually see. These MUST be real observations from the image:
- Text/labels: "brand logo Nike visible on side", "nutrition label on back", "price tag $12.99"
- Materials: "wood grain texture visible", "brushed stainless steel", "leather upper", "mesh fabric"
- Features: "rubber outsole", "four metal legs", "glass screen", "zipper closure", "barcode on packaging"
- Context: "on white background", "held in hand", "on store shelf", "next to ruler for scale"
Do NOT list vague observations like "product" or "item" or "object".

short_summary: 1-2 sentence summary. Structure: "[What it is] used for [purpose]. [One key feature]." Keep factual and concise. No marketing language. NEVER use generic summaries like "An item was detected" — always describe the specific item.
image_description: Detailed visual description — color, shape, material, texture, brand elements, notable features, approximate size. Be factual, not creative. Must be specific enough for identification.`;

function getDetailPrompt(itemType: SmartScanItemType): string {
  const base = `You are an expert product analyst with deep knowledge of pricing, materials, brands, and market values. Analyze the item in this image with HIGH ACCURACY.

ACCURACY RULES (CRITICAL — follow these strictly):
1. Only state facts you can VERIFY from the image or from well-known product knowledge.
2. If you recognize the EXACT product (brand + model visible), use real-world data you know about it.
3. If you recognize the brand but not the exact model, use the brand's typical price range for that product type.
4. If you see NO brand/model, estimate based on the item's apparent quality, material, and size — but be honest about uncertainty.
5. Do NOT invent specific dollar amounts like "$47.99" unless you have strong evidence. Use ranges instead.
6. Do NOT invent specific dimensions unless visible on packaging or you recognize the exact product.
7. Do NOT state specific brand names unless visible on the item (logo, label, text). Use null instead of guessing.
8. For materials: say "likely wood" or "appears to be metal" if not 100% certain. But if you CAN tell (e.g. clearly canvas, obviously leather, visibly glass), state it. NEVER use "Mixed" or "Various" as lazy defaults — always pick the dominant visible material.
9. For assembly info: use general language like "basic assembly likely" unless you recognize the specific product.
10. For companion/matching products: suggest item TYPES, not specific branded products, unless verified.
11. Never use "Worth it", "Good value", "Great deal" without real comparison data. Set value_verdict and value_rating to null if uncertain.

TRUST-FIRST RULES (CRITICAL):
12. NEVER invent data to fill fields. It is ALWAYS better to return null than to make something up.
13. brand: ONLY fill if you can see a logo, label, or clearly recognize the brand from distinctive design. Otherwise null.
14. material: ONLY fill if you can visually determine or strongly infer the material. Otherwise null.
15. condition: ONLY fill if you can see enough of the item to assess wear. Otherwise null.
16. color: ALWAYS fill — describe the dominant visible color accurately.
17. Prices: Use ranges like "$20 - $40" when uncertain. NEVER give fake precision like "$37.99" unless you know the exact product.
18. resale_value: Set to null if you cannot confidently estimate. Do NOT fabricate resale numbers.
19. comparable_model / comparable_item: Set to null unless you can name a REAL, specific comparable product.
20. If the image is unclear, blurry, or partially obscured, SAY SO and reduce detail rather than guessing.

FIELD QUALITY RULES (CRITICAL — every field must be useful):
- color: Use the PRIMARY visible color (e.g. "White", "Black", "Navy Blue"). Never use "Various" unless truly 3+ equally dominant colors.
- material: Use the DOMINANT material you can see (e.g. "Mesh", "Leather", "Ceramic", "Stainless Steel"). Never use "Mixed" as a cop-out.
- condition: Assess honestly from visual wear signs: "New", "Very Good", "Good", "Fair", "Used".
- brand: Only include if clearly identifiable. Use null (not "Unbranded" or "Generic") if unknown.
- subcategory/type: Be as specific as possible ("Running Shoe" not "Other", "Dinner Plate" not "General").
- purpose: Describe a real use case ("Running", "Casual Wear", "Dining", "Cooking") — never use "General Use" unless no better option exists.

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
      return base + `Analyze this FOOD item like an expert chef, nutritionist, and cookbook author combined. Fill food_details ONLY. Set all other detail fields to null.

You are a FOOD GENIE. The user scanned food and wants EVERYTHING — think of this like opening a premium recipe book page for this exact item.

NUTRITION (be thorough and accurate):
- Accurate nutrition per serving (calories, protein, carbs, fat, fiber, sugar)
- key_nutrients: List 4-8 key nutrients (e.g. "Vitamin C", "Iron", "Omega-3", "Potassium", "Folate")
- health_benefits: List 3-5 real health benefits (e.g. "Supports heart health", "Rich in antioxidants", "Aids digestion")
- health_summary: A detailed 2-3 sentence health overview — think nutritionist advice
- quick_tip: A chef's insider tip about this food

PRICING:
- estimated_price, price_range, value_rating, budget_insight
- tags (8+)
- complementary_items: THIS IS CRITICAL FOR FOOD — list 6-10 COOKING INGREDIENTS that pair with this food item. Think like a chef building a meal:
  - For pasta sauce: pasta, garlic, parmesan, basil, ground beef, mozzarella, olive oil, crushed red pepper
  - For chicken breast: rice, garlic, lemon, olive oil, rosemary, potatoes, bell peppers, broccoli
  - For apples: peanut butter, cinnamon, honey, oats, caramel, walnuts, yogurt
  - For bread: butter, jam, cheese, deli meat, lettuce, tomato, mayo, mustard
  These should be INGREDIENTS a cook would naturally reach for, not random products.
- purpose: Detailed sentence about how this food is used, eaten, or enjoyed
- value_insight: Practical money/nutrition insight
- next_scan_suggestion: What to scan next

FOOD-SPECIFIC DETAIL FIELDS — FILL EVERY SINGLE ONE:
- ingredients: List ALL main ingredients. For whole foods (apple, chicken breast), list natural composition (water, fiber, vitamins, minerals). For prepared dishes, list every likely ingredient you can identify. Be thorough like a recipe book.
- allergens: ALL common allergens present or likely ("Gluten", "Dairy", "Nuts", "Soy", "Eggs", "Shellfish", "Sesame", "Sulfites"). Empty array ONLY if truly none.
- dietary_info: ALL applicable dietary classifications ("Vegan", "Vegetarian", "Gluten-Free", "Keto-Friendly", "High-Protein", "Low-Carb", "Dairy-Free", "Whole30", "Paleo", "Mediterranean", "FODMAP-Friendly", "Heart-Healthy")

- recipe_ideas: THIS IS CRITICAL — provide 3-4 DETAILED, CREATIVE recipe ideas using this food. Think like a cookbook author:
  Each recipe MUST have:
  - name: Creative, appetizing recipe title (e.g. "Honey-Glazed Salmon with Citrus Salsa" not just "Salmon Recipe")
  - description: 2-3 sentence vivid description that makes you want to cook it. Describe flavors, textures, and the experience.
  - difficulty: easy/medium/hard
  - prep_time: Realistic time (e.g. "25 min", "45 min", "1 hour 15 min")
  - key_ingredients: 4-6 OTHER ingredients needed — be specific ("2 cloves garlic, minced" not just "garlic")
  Include a MIX of difficulties — one easy weeknight recipe, one impressive dinner party dish, etc.

- preparation_tips: 3-5 expert tips. Think Gordon Ramsay meets home cooking:
  - How to select the best quality at the store
  - How to prep it properly
  - Cooking technique secrets
  - Common mistakes to avoid
  - How to know when it's perfectly done

- storage_tip: Detailed storage guidance — fridge life, freezer life, best container, signs of spoilage
- season_availability: Peak season and availability info. Include months.
- origin_region: Cultural and geographic origin. Be specific.
- cuisine_type: Primary cuisine association and common cross-cultural uses
- pairs_with_drinks: 3-5 drink pairings — include wine, non-alcoholic, and casual options
- substitutes: 3-5 substitutes with brief reasoning (e.g. "Cauliflower rice — lower carb, similar texture")
DO NOT fill furniture_details, fashion_details, electronics_details, household_details, or general_details.`;

    case 'grocery':
      return base + `Analyze this GROCERY/PACKAGED FOOD item like a combination of a nutritionist, chef, and smart shopper. Fill grocery_details ONLY. Set all other detail fields to null.

You are a GROCERY GENIE. The user scanned a packaged food product and wants the FULL breakdown — ingredients, nutrition, recipes, value, and alternatives. Think of this like scanning with a smart recipe book.

PRODUCT INFO:
- brand (from label — identify it!), package_size, estimated_price, price_range, unit_price
- value_rating: ALWAYS rate it. Compare to similar products.
- budget_insight: Smart shopping tip for this product
- cheaper_alternative: ALWAYS suggest a cheaper option if one exists
- what_else_needed: 5-8 items commonly bought/used with this to make a complete meal — think like a chef shopping list
- tags (8+)
- complementary_items: 6-10 COOKING INGREDIENTS that go with this item (e.g. for pasta: garlic, olive oil, parmesan, basil, tomatoes, onion, ground beef, red pepper flakes)
- purpose: What this product is used for in cooking/eating
- value_insight: Practical shopping/value insight
- next_scan_suggestion: What to scan next

GROCERY-SPECIFIC DETAIL FIELDS — FILL EVERY SINGLE ONE:
- ingredients_list: List ALL main ingredients in order of quantity. Read from label if visible. If not visible, list typical ingredients for this exact product type. Be thorough — list 8-15 ingredients.
- allergens: ALL common allergens ("Wheat", "Milk", "Soy", "Tree Nuts", "Peanuts", "Eggs", "Fish", "Sesame", "Sulfites"). Empty array ONLY if truly none.
- dietary_info: ALL applicable labels ("Organic", "Non-GMO", "Gluten-Free", "Vegan", "Vegetarian", "Sugar-Free", "Low-Sodium", "Kosher", "Halal", "Whole Grain", "High-Fiber", "Keto-Friendly")

- recipe_ideas: THIS IS CRITICAL — provide 3-4 COMPLETE, DELICIOUS recipes using this grocery product as a key ingredient:
  Each recipe MUST have:
  - name: Appetizing, specific recipe title (e.g. "Creamy Garlic Tuscan Pasta" not "Pasta Recipe")
  - description: 2-3 sentences describing the dish vividly — flavors, textures, who would love it
  - difficulty: easy/medium/hard
  - prep_time: Realistic total time
  - key_ingredients: 4-6 OTHER ingredients the user needs to buy — be specific with quantities when helpful
  Think cookbook quality. Include variety: quick weeknight meal, meal prep option, impressive dish.

- preparation_tips: 3-4 expert cooking/usage tips:
  - Best cooking technique for this product
  - Common mistakes to avoid
  - Pro tips for better results
  - How to elevate it from basic to restaurant-quality

- storage_tip: Detailed — shelf life unopened, after opening, refrigeration needs, freezing options, signs of spoilage
- nutrition_highlights: Key nutrition facts in one impactful line (e.g. "22g protein per serving, zero sugar, fortified with B12")
- substitutes: 3-5 alternatives with reasoning (e.g. "Chickpea pasta — higher protein, gluten-free option")
DO NOT fill furniture_details, fashion_details, electronics_details, household_details, or general_details.`;

    case 'household':
      return base + `Analyze this HOUSEHOLD item. Fill household_details ONLY. Set all other detail fields to null.
- item_description: Describe the item clearly — what it looks like and what makes it identifiable. Be specific about type (e.g. "Stainless steel 10-inch non-stick skillet" not just "pan").
- subcategory (tools/fitness/kitchenware/cleaning/bathroom/decor/garden/storage/lighting/small_appliance/other) — pick the most accurate one
- brand, model, material, condition — fill what you can see or confidently infer
- estimated_price, price_range, estimated_resale_value (only if item has real resale market)
- practical_recommendation: A genuinely useful recommendation about this specific item
- care_tip: How to maintain or care for this item
- tags, complementary_items
- purpose: One clear sentence about what this item is used for in everyday life (e.g. "Used for frying, sautéing, and searing foods on the stovetop" or "Organizes bathroom toiletries and keeps countertops tidy")
- value_insight: One practical insight about this item's value or usefulness (e.g. "Cast iron retains value well — a well-maintained pan can last decades" or "Budget option — premium brands offer better durability for heavy use")
- next_scan_suggestion: What to scan next for better accuracy (e.g. "Flip over and scan the bottom stamp for brand and model" or "Scan the product label or barcode on the packaging")

IMPORTANT FOR HOUSEHOLD ITEMS:
- Kitchen items: identify the specific tool type, material, and likely use
- Cleaning products: identify product type, what surfaces it's for, and if it's concentrated
- Storage items: identify capacity, material, and what it's designed to store
- Decor items: identify style, material, and where it would be placed
- Tools: identify tool type, size, and common uses
- Small appliances: identify type, likely wattage/capacity, and key features
DO NOT fill furniture_details, fashion_details, electronics_details, food_details, grocery_details, or general_details.`;

    case 'fashion':
      return base + `Analyze this FASHION item like a professional stylist, resale expert, and brand authenticator combined. Fill fashion_details ONLY. Set all other detail fields to null.

You are a FASHION GENIE. The user scanned clothing/shoes/accessories and wants EVERYTHING — brand identification, exact value, resale potential, styling advice, and care instructions. Think StockX meets Vogue meets a personal shopper.

IDENTIFICATION (be as specific as possible):
- subcategory (shoes/clothing/outerwear/accessories/bags/jewelry/activewear/other)
- item_description: Detailed 2-3 sentence description — materials, construction quality, design details, era/collection if identifiable
- brand: CRITICAL — identify the brand from ANY visual cue: logo, stitching pattern, sole design, label placement, hardware style, silhouette shape. If you recognize it, state it confidently. If likely but not 100%, say "Likely [Brand]".
- model: Identify the exact model/style name if possible (e.g. "Air Force 1 Low '07", "Classic Leather", "Old Skool")
- material, color, secondary_color, pattern, style, fit
- For shoes: analyze silhouette shape, sole type, upper material, midsole tech, lacing system, tongue style. Set sleeve_length/neckline to null.
- For clothing: fit, pattern, neckline, sleeve_length, closure_type if visible
- condition: Assess honestly — new/like-new/good/fair/worn
- condition_notes: Any visible wear, scuffs, stains, creasing
- gender_target: men/women/unisex/kids

VALUE & RESALE (this is what the user cares about most):
- estimated_retail_price: What this costs new. Be specific. For known brands, use real pricing.
- estimated_resale_value: What this sells for secondhand RIGHT NOW. Think eBay, StockX, Poshmark, Depop, Mercari.
- price_range: Realistic range based on condition
- resale_demand: high/moderate/low/minimal — be honest and specific about WHY
- best_selling_platform: Where this EXACT type of item sells best and fastest (StockX for hype shoes, Poshmark for women's fashion, eBay for vintage, Depop for streetwear, etc.)
- value_verdict: strong/good/fair/weak
- value_rating: great/good/average/poor
- value_reasoning: 2-3 sentences explaining the value assessment — compare to similar items, note what drives or hurts value
- comparable_model: A similar item at a different price point for comparison
- resale_suggestion: Specific actionable advice for selling this item (e.g. "List on StockX — similar pairs selling for $180-220. Include original box for 15-20% premium.")

CARE & STYLING:
- cleaning_recommendation: none/light/moderate/professional
- cleaning_reason: Why this level of cleaning is recommended
- care_tip: Specific care advice for this material/type
- budget_insight: Money-saving tip related to this type of fashion
- cheaper_alternative: A comparable style at a lower price point

- tags (8-12): Include brand, style, material, color, era, subcategory tags
- complementary_items (4-6): What to wear/pair with this item — be specific about styling
- purpose: Detailed description of when/where to wear this and what look it achieves
- value_insight: Key insight about this item's market position and value trajectory
- next_scan_suggestion: Where to look for more info (inside label, sole, tag, etc.)
DO NOT fill furniture_details, electronics_details, food_details, grocery_details, household_details, or general_details.`;

    case 'electronics':
      return base + `Analyze this ELECTRONICS item. Fill electronics_details ONLY. Set all other detail fields to null.
- product_type, brand, model, storage_or_spec, condition
- estimated_retail_price, estimated_resale_value, depreciation_note
- resale_demand, value_verdict, care_tip
- tags, complementary_items
- purpose: One sentence about what this device is used for (e.g. "Wireless noise-cancelling headphones for music, calls, and focused work" or "A portable power bank for charging phones and tablets on the go")
- value_insight: One practical insight (e.g. "Previous generation model — current version offers marginal improvements at 30% higher price" or "High depreciation rate — loses ~40% value in first year")
- next_scan_suggestion: What to scan next (e.g. "Scan the serial number sticker for exact model and storage capacity" or "Scan the box barcode for product verification")
DO NOT fill furniture_details, fashion_details, food_details, grocery_details, household_details, or general_details.`;

    case 'furniture':
      return base + `Analyze this FURNITURE item like a furniture expert, interior designer, and resale consultant combined. Fill furniture_details ONLY. Set all other detail fields to null.

You are a FURNITURE EXPERT. The user is scanning furniture they found — at a garage sale, thrift store, estate sale, or around the house. Identify the item, estimate its value, and give practical resale and usage advice.

BRAND IDENTIFICATION:
- Check if this is a recognizable brand (IKEA, West Elm, Pottery Barn, Crate & Barrel, Ashley, Restoration Hardware, etc.)
- Look for labels, stamps, stickers, or design signatures
- is_likely_ikea: Set true only if there is clear IKEA branding or a recognizable IKEA product
- ikea_match_confidence: exact / strong / possible / weak
- ikea_article_number, ikea_product_name, ikea_product_family, ikea_variant, ikea_category: Fill if IKEA identified
- packaging_type: flat-pack / assembled / boxed / unpackaged / unknown
- packaging_count: if visible
- manual_detected: true if instruction manual visible
- label_detected: true if product label visible
- ikea_clues: List visual clues if IKEA-related
- resale_title_suggestion: Suggested marketplace listing title (e.g. "Mid-Century Walnut Dresser" or "IKEA KALLAX 4x2 Shelf - White")
- condition_estimate: new-sealed / new-open / like-new / good / fair / worn / damaged
- best_next_scan: 2-4 suggestions for what to scan next

IDENTIFICATION:
- item_type_specific: Be very specific (e.g. "4-cube storage shelving unit", "mid-century modern accent chair", "oak farmhouse dining table")
- material: Identify from image — "Solid oak", "Engineered wood with walnut veneer", "Powder-coated steel frame"
- finish_color, style: Describe precisely what you see
- estimated_dimensions: Estimate based on proportions

PRICE & VALUE (focus on garage sale / resale context):
- estimated_retail_price: What this would cost new
- estimated_price_range: Always provide a realistic range
- estimated_resale_value: What this sells for on Facebook Marketplace, Craigslist, OfferUp. Consider condition heavily.
- value_level: budget/mid-range/premium
- value_rating, value_verdict: Always assess
- worth_it_verdict: Give an honest "is it worth buying at a garage sale" assessment

ASSEMBLY:
- assembly_required, assembly_difficulty, estimated_build_time, people_needed
- likely_tools_needed, likely_parts
- mounting_type: wall-mounted/freestanding/modular/flat-pack/unknown
- assembly_summary, wall_anchor_note, setup_notes

ROOM & STYLING:
- use_case, room_fit, room_fit_labels, matching_products

EXTRA COSTS:
- extra_purchase_items, total_estimated_cost

RESALE:
- resale_demand, best_selling_platform, resale_suggestion, comparable_model, long_term_value

CARE:
- care_tip, budget_insight, cheaper_alternative

- tags (8-12), complementary_items (5+)
- purpose: What this furniture is for and who it's ideal for
- value_insight: Key insight about quality, durability, and value
- next_scan_suggestion: Where to find model info (back sticker, underside label, etc.)

DO NOT fill fashion_details, electronics_details, food_details, grocery_details, household_details, or general_details.`;

    case 'general':
      return base + `Analyze this item. Fill general_details ONLY. Set all other detail fields to null.
- item_description: Describe the item clearly and specifically — what it is, what it looks like, key identifying features
- subcategory: Be specific (e.g. "board game", "art supplies", "pet toy", "sports equipment", "book", "collectible")
- brand, model, material, color, condition
- estimated_retail_price, estimated_resale_value, price_range
- value_rating, fun_fact, practical_tip, care_tip
- tags, complementary_items
- purpose: One clear sentence about what this item is used for (e.g. "A strategy board game for 2-4 players, typically played in 30-60 minute sessions" or "A dog chew toy designed to clean teeth while keeping pets entertained")
- value_insight: One practical insight (e.g. "Popular title with strong secondhand demand" or "Consumable item — needs periodic replacement")
- next_scan_suggestion: What to scan next (e.g. "Scan the barcode or product label for exact identification" or "Scan the back of the packaging for more details")
DO NOT fill furniture_details, fashion_details, electronics_details, food_details, grocery_details, or household_details.`;

    default:
      return base + `Do your best to analyze this item. Fill general_details. Set all other detail fields to null.
- purpose: What is this item used for?
- value_insight: One useful practical insight about this item's value
- next_scan_suggestion: What should the user scan next for better results?`;
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
  const HOUSEHOLD_GENERAL_SIGNALS = ['pan', 'skillet', 'pot', 'saucepan', 'wok', 'baking sheet', 'cutting board', 'knife', 'spatula', 'ladle', 'tongs', 'whisk', 'peeler', 'grater', 'colander', 'strainer', 'mixing bowl', 'measuring cup', 'measuring spoon', 'rolling pin', 'can opener', 'bottle opener', 'corkscrew', 'tupperware', 'food container', 'storage bin', 'storage box', 'basket', 'organizer', 'drawer divider', 'shelf liner', 'hanger', 'coat hook', 'wall hook', 'command strip', 'adhesive hook', 'laundry basket', 'hamper', 'ironing board', 'iron', 'lint roller', 'steamer', 'spray bottle', 'sponge', 'scrub brush', 'dish soap', 'dish rack', 'drying mat', 'paper towel holder', 'trash can', 'recycling bin', 'dustpan', 'broom', 'mop', 'vacuum', 'duster', 'cleaning cloth', 'microfiber', 'wipe', 'detergent', 'bleach', 'all-purpose cleaner', 'glass cleaner', 'disinfectant', 'air freshener', 'candle', 'diffuser', 'essential oil', 'vase', 'picture frame', 'photo frame', 'wall art', 'clock', 'mirror', 'throw pillow', 'cushion', 'throw blanket', 'rug', 'mat', 'curtain', 'blinds', 'lamp', 'light bulb', 'nightlight', 'extension cord', 'power strip', 'surge protector', 'timer', 'thermometer', 'scale', 'soap dispenser', 'toothbrush holder', 'shower caddy', 'bath mat', 'toilet brush', 'plunger', 'towel rack', 'robe hook', 'shower curtain', 'plant pot', 'planter', 'watering can', 'garden glove', 'pruner', 'trowel', 'garden hose', 'sprinkler', 'toaster', 'blender', 'coffee maker', 'kettle', 'rice cooker', 'air fryer', 'instant pot', 'slow cooker', 'food processor', 'mixer', 'electric grill', 'sandwich maker', 'waffle maker', 'juicer', 'ice maker', 'water filter', 'pitcher', 'thermos', 'insulated bottle', 'lunch box', 'bento box', 'wine opener', 'ice tray', 'oven mitt', 'pot holder', 'apron', 'dish towel', 'kitchen towel', 'napkin holder', 'salt shaker', 'pepper mill', 'spice rack', 'utensil holder', 'knife block', 'bread box', 'fruit bowl', 'trivet', 'coaster', 'placemat', 'tablecloth'];
  const FURNITURE_SIGNALS = ['desk', 'table', 'chair', 'sofa', 'couch', 'bed', 'shelf', 'shelving', 'cabinet', 'wardrobe', 'dresser', 'nightstand', 'bookcase', 'bookshelf', 'tv stand', 'bench', 'stool', 'rack', 'storage unit', 'room divider', 'ikea', 'kallax', 'billy', 'malm', 'lack', 'hemnes', 'expedit', 'poang', 'ektorp', 'detolf', 'besta', 'pax', 'alex', 'linnmon', 'micke', 'dining table', 'coffee table', 'end table', 'console table', 'ottoman', 'recliner', 'loveseat', 'futon', 'bunk bed', 'crib', 'headboard', 'vanity', 'hutch', 'armoire', 'credenza', 'sideboard', 'bar cart', 'shoe rack', 'coat rack'];
  const BEAUTY_SIGNALS = ['moisturizer', 'serum', 'sunscreen', 'cleanser', 'toner', 'foundation', 'concealer', 'mascara', 'lipstick', 'lip gloss', 'eyeshadow', 'blush', 'bronzer', 'primer', 'setting spray', 'face wash', 'face cream', 'eye cream', 'retinol', 'vitamin c', 'hyaluronic', 'niacinamide', 'shampoo', 'conditioner', 'hair mask', 'dry shampoo', 'hair spray', 'curling iron', 'flat iron', 'blow dryer', 'trimmer', 'razor', 'cologne', 'perfume', 'deodorant', 'body lotion', 'body wash', 'hand cream', 'nail polish', 'skincare', 'makeup', 'cosmetic', 'beauty'];

  const hasFood = FOOD_SIGNALS.some(s => combined.includes(s));
  const hasFashion = FASHION_SIGNALS.some(s => combined.includes(s));
  const hasElectronics = ELECTRONICS_SIGNALS.some(s => combined.includes(s));
  const hasFitness = FITNESS_SIGNALS.some(s => combined.includes(s));
  const hasFurniture = FURNITURE_SIGNALS.some(s => combined.includes(s));
  const hasBeauty = BEAUTY_SIGNALS.some(s => combined.includes(s));
  const hasHouseholdGeneral = HOUSEHOLD_GENERAL_SIGNALS.some(s => combined.includes(s));

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

  if (hasHouseholdGeneral && fixed.item_type !== 'household' && !hasFood && !hasFashion && !hasElectronics && !hasFurniture) {
    const householdCount = countSignals(HOUSEHOLD_GENERAL_SIGNALS);
    const foodCount = hasFood ? countSignals(FOOD_SIGNALS) : 0;
    if (householdCount > foodCount) {
      console.log('[SmartScan] Household general signals strongest (' + householdCount + '), correcting from', fixed.item_type);
      fixed.item_type = 'household';
      fixed.confidence = Math.min(Math.max(fixed.confidence, 0.55), 0.8);
      return fixed;
    }
  }

  if (fixed.item_type === 'general') {
    const generalFoodCount = countSignals(FOOD_SIGNALS);
    const generalFashionCount = countSignals(FASHION_SIGNALS);
    const generalElectronicsCount = countSignals(ELECTRONICS_SIGNALS);
    const generalFitnessCount = countSignals(FITNESS_SIGNALS);
    const generalFurnitureCount = countSignals(FURNITURE_SIGNALS);
    const generalHouseholdCount = countSignals(HOUSEHOLD_GENERAL_SIGNALS);
    const generalBeautyCount = countSignals(BEAUTY_SIGNALS);

    const bestCount = Math.max(generalFoodCount, generalFashionCount, generalElectronicsCount, generalFitnessCount, generalFurnitureCount, generalHouseholdCount, generalBeautyCount);
    if (bestCount >= 1) {
      if (generalFashionCount === bestCount) {
        console.log('[SmartScan] Upgrading general -> fashion (' + generalFashionCount + ' signals)');
        fixed.item_type = 'fashion';
        fixed.confidence = Math.min(Math.max(fixed.confidence, 0.55), 0.75);
        return fixed;
      }
      if (generalElectronicsCount === bestCount) {
        console.log('[SmartScan] Upgrading general -> electronics (' + generalElectronicsCount + ' signals)');
        fixed.item_type = 'electronics';
        fixed.confidence = Math.min(Math.max(fixed.confidence, 0.55), 0.75);
        return fixed;
      }
      if (generalFoodCount === bestCount) {
        const hasPackaging = combined.includes('package') || combined.includes('box') || combined.includes('can') || combined.includes('bottle') || combined.includes('jar') || combined.includes('barcode') || combined.includes('nutrition');
        console.log('[SmartScan] Upgrading general -> ' + (hasPackaging ? 'grocery' : 'food') + ' (' + generalFoodCount + ' signals)');
        fixed.item_type = hasPackaging ? 'grocery' : 'food';
        fixed.confidence = Math.min(Math.max(fixed.confidence, 0.50), 0.70);
        return fixed;
      }
      if (generalFurnitureCount === bestCount) {
        console.log('[SmartScan] Upgrading general -> furniture (' + generalFurnitureCount + ' signals)');
        fixed.item_type = 'furniture';
        fixed.confidence = Math.min(Math.max(fixed.confidence, 0.55), 0.75);
        return fixed;
      }
      if (generalFitnessCount === bestCount || generalBeautyCount === bestCount || generalHouseholdCount === bestCount) {
        console.log('[SmartScan] Upgrading general -> household (' + Math.max(generalFitnessCount, generalBeautyCount, generalHouseholdCount) + ' signals)');
        fixed.item_type = 'household';
        fixed.confidence = Math.min(Math.max(fixed.confidence, 0.55), 0.75);
        return fixed;
      }
    }
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
  const hasHouseholdWords = /\b(pan|skillet|pot|saucepan|wok|cutting board|spatula|ladle|tongs|whisk|peeler|grater|colander|mixing bowl|measuring cup|tupperware|storage bin|storage box|basket|organizer|hanger|hook|laundry basket|ironing board|spray bottle|sponge|dish soap|dish rack|broom|mop|vacuum|duster|detergent|bleach|cleaner|disinfectant|air freshener|candle|diffuser|vase|picture frame|clock|mirror|throw pillow|cushion|blanket|rug|mat|curtain|lamp|light bulb|soap dispenser|shower caddy|bath mat|toilet brush|plunger|plant pot|planter|watering can|toaster|blender|coffee maker|kettle|rice cooker|air fryer|slow cooker|food processor|mixer|thermos|lunch box|oven mitt|apron|coaster|placemat|knife block|spice rack|trivet)\b/.test(allText);

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

  if (fixed.item_type === 'general' && hasHouseholdWords && !hasElectronicsWords && !hasFurnitureWords && !hasShoeWords && !hasClothingWords) {
    console.log('[SmartScan] Cross-validation: household item classified as general, upgrading');
    fixed.item_type = 'household';
    fixed.category = 'Household';
    fixed.confidence = Math.min(fixed.confidence, 0.7);
    return fixed;
  }

  if (fixed.item_type === 'furniture' && hasHouseholdWords && !hasFurnitureWords) {
    console.log('[SmartScan] Cross-validation: household item wrongly classified as furniture, correcting');
    fixed.item_type = 'household';
    fixed.category = 'Household';
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

  if (!validated.item_name || validated.item_name.length < 3 || validated.item_name === 'Unknown' || validated.item_name.toLowerCase() === 'detected item' || validated.item_name.toLowerCase() === 'scanned item') {
    const fallbackName = classification.item_name && classification.item_name.length > 3 && !['unknown', 'detected item', 'scanned item', 'item', 'other'].includes(classification.item_name.toLowerCase())
      ? classification.item_name
      : (classification.short_summary?.split('.')[0]?.trim() || `${classification.category || 'General'} Item`);
    validated.item_name = fallbackName;
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

  const name = (recalibrated.item_name ?? '').toLowerCase().trim();
  const GENERIC_NAMES = ['item', 'product', 'unknown', 'scanned item', 'detected item', 'object', 'thing', 'other', 'general item', 'unidentified', 'misc', 'miscellaneous'];
  if (name.length < 5 || GENERIC_NAMES.includes(name) || name.startsWith('detected ') || name.startsWith('scanned ')) {
    const desc = (recalibrated.short_summary ?? '').trim();
    const cues = (recalibrated.visual_cues ?? []).slice(0, 3).join(', ');
    const cat = recalibrated.category ?? '';
    if (desc && desc.length > 10) {
      const extracted = desc.split('.')[0].trim().substring(0, 60);
      if (extracted.length > 5) {
        recalibrated.item_name = extracted;
        console.log('[SmartScan] Replaced generic name with summary excerpt:', extracted);
      }
    } else if (cues.length > 5) {
      recalibrated.item_name = cat ? `${cat} Item` : cues.split(',')[0].trim();
      console.log('[SmartScan] Replaced generic name with cue/cat:', recalibrated.item_name);
    } else if (cat && cat.length > 2 && cat.toLowerCase() !== 'other') {
      recalibrated.item_name = `${cat} Item`;
      console.log('[SmartScan] Replaced generic name with category:', recalibrated.item_name);
    }
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
    item_description: classification.item_name && classification.item_name.toLowerCase() !== 'scanned item' && classification.item_name.toLowerCase() !== 'detected item' ? classification.item_name : (classification.short_summary?.split('.')[0] ?? classification.category ?? 'Unidentified Item'),
    subcategory: classification.category || 'other',
    brand: null, model: null, material: null, color: null, condition: null,
    estimated_retail_price: null, estimated_resale_value: null, price_range: null,
    value_rating: null, value_verdict: null, value_reasoning: null,
    resale_demand: null, resale_suggestion: null, best_selling_platform: null,
    comparable_item: null, budget_insight: null, cheaper_alternative: null,
    care_tip: null, fun_fact: null, practical_tip: null, age_or_era: null, rarity: null,
    tags: (classification.visual_cues ?? []).slice(0, 5),
    complementary_items: [],
    purpose: null,
    value_insight: null,
    next_scan_suggestion: 'Try scanning the product label or barcode for better identification',
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

function truncateBase64ForEdit(base64: string, maxSizeKB: number = 800): string {
  const currentSizeKB = Math.round((base64.length * 3) / 4 / 1024);
  if (currentSizeKB <= maxSizeKB) return base64;
  console.log('[SmartScan] Base64 too large for edit API:', currentSizeKB, 'KB — truncation not possible, will skip edit');
  return '';
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 45000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function tryEditApi(toolkitUrl: string, description: string, base64: string): Promise<string | null> {
  const usableBase64 = truncateBase64ForEdit(base64, 800);
  if (!usableBase64) {
    console.log('[SmartScan] Skipping edit API — base64 too large for edit');
    return null;
  }

  const editPrompt = `Transform this photo into a clean, professional product reference image.
This is: ${description}
Place on clean white background, studio lighting, keep exact item details, colors, logos.
Center the item, photorealistic, no text/watermarks added. Product listing style.`;

  const editUrl = new URL('/images/edit/', toolkitUrl).toString();
  console.log('[SmartScan] Edit API URL:', editUrl, 'base64 length:', usableBase64.length);

  const editResponse = await fetchWithTimeout(editUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: editPrompt,
      images: [{ type: 'image', image: `data:image/jpeg;base64,${usableBase64}` }],
      aspectRatio: '1:1',
    }),
  }, 30000);

  console.log('[SmartScan] Edit API response status:', editResponse.status);
  if (editResponse.ok) {
    const editData = await editResponse.json() as { image?: { base64Data?: string; mimeType?: string } };
    if (editData.image?.base64Data) {
      const mimeType = editData.image.mimeType || 'image/png';
      const dataUrl = `data:${mimeType};base64,${editData.image.base64Data}`;
      console.log('[SmartScan] Reference image created via edit API, dataUrl length:', dataUrl.length);
      return dataUrl;
    }
    console.log('[SmartScan] Edit API response missing image data:', JSON.stringify(editData).substring(0, 200));
  } else {
    const errorText = await editResponse.text().catch(() => 'unknown');
    console.log('[SmartScan] Edit API failed:', editResponse.status, errorText.substring(0, 300));
  }
  return null;
}

async function tryGenerateApi(toolkitUrl: string, description: string, attempt: number = 1): Promise<string | null> {
  const dallePrompt = `Professional product photography of ${description}. Clean white background, studio lighting, photorealistic, centered, high detail, sharp focus, no text overlays, no watermarks. E-commerce product listing style photo.`;

  const genUrl = new URL('/images/generate/', toolkitUrl).toString();
  console.log(`[SmartScan] Generate API attempt #${attempt}, URL:`, genUrl);

  const genResponse = await fetchWithTimeout(genUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: dallePrompt, size: '1024x1024' }),
  }, 45000);

  console.log('[SmartScan] Generate API response status:', genResponse.status);
  if (genResponse.ok) {
    const genData = await genResponse.json() as { image?: { base64Data?: string; mimeType?: string } };
    if (genData.image?.base64Data) {
      const mimeType = genData.image.mimeType || 'image/png';
      const dataUrl = `data:${mimeType};base64,${genData.image.base64Data}`;
      console.log('[SmartScan] Reference image created via DALL-E, dataUrl length:', dataUrl.length);
      return dataUrl;
    }
    console.log('[SmartScan] DALL-E response missing image data:', JSON.stringify(genData).substring(0, 200));
  } else {
    const errorText = await genResponse.text().catch(() => 'unknown');
    console.log('[SmartScan] DALL-E failed:', genResponse.status, errorText.substring(0, 300));
  }
  return null;
}

export async function generateReferenceImage(description: string, scannedImageBase64?: string, confidence?: number): Promise<string | null> {
  const toolkitUrl = process.env.EXPO_PUBLIC_TOOLKIT_URL || 'https://toolkit.rork.com';
  try {
    if (confidence !== undefined && confidence < 0.25) {
      console.log('[SmartScan] Skipping reference image generation — confidence too low:', confidence);
      return null;
    }

    if (!description || description.length < 3) {
      console.log('[SmartScan] Skipping reference image — description too short:', description);
      return null;
    }

    const base64SizeKB = scannedImageBase64 ? Math.round((scannedImageBase64.length * 3) / 4 / 1024) : 0;
    console.log('[SmartScan] Generating reference image for:', description.substring(0, 80), 'confidence:', confidence, 'hasBase64:', !!scannedImageBase64, 'base64SizeKB:', base64SizeKB);

    const editPromise = (scannedImageBase64 && base64SizeKB <= 800)
      ? tryEditApi(toolkitUrl, description, scannedImageBase64).catch((err) => {
          console.log('[SmartScan] Edit API error:', err);
          return null;
        })
      : Promise.resolve(null);

    const generatePromise = tryGenerateApi(toolkitUrl, description, 1).catch((err) => {
      console.log('[SmartScan] Generate API attempt #1 error:', err);
      return null;
    });

    const [editResult, genResult] = await Promise.all([editPromise, generatePromise]);

    if (editResult) {
      console.log('[SmartScan] Using edit API result for reference image');
      return editResult;
    }
    if (genResult) {
      console.log('[SmartScan] Using generate API result for reference image');
      return genResult;
    }

    console.log('[SmartScan] Both parallel attempts failed, trying generate API once more...');
    try {
      await new Promise(r => setTimeout(r, 500));
      const retryResult = await tryGenerateApi(toolkitUrl, description, 2);
      if (retryResult) return retryResult;
    } catch (retryErr) {
      console.log('[SmartScan] Generate API retry error:', retryErr);
    }

    console.log('[SmartScan] All image generation methods failed');
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

export type IkeaScanMode = 'box_label' | 'product_tag' | 'manual' | 'assembled' | 'room_scene' | 'food_scan' | 'fashion_scan' | 'electronics_scan' | 'household_scan' | 'general_scan' | null;

const SCAN_MODE_HINTS: Record<string, string> = {
  box_label: `SCAN MODE HINT: The user is scanning a PRODUCT BOX LABEL or sticker. Prioritize:
- Reading any article numbers, model numbers, or product codes
- Reading the product name from the label
- Identifying brand and packaging details
- If IKEA: look for 8-digit or 10-digit article numbers like 302.758.75
- Classify based on what the product actually is.`,
  product_tag: `SCAN MODE HINT: The user is scanning a PRODUCT TAG or shelf label. Prioritize:
- Reading price, product codes, product name from the tag
- Identifying brand and product family
- Classify based on what the product actually is.`,
  manual: `SCAN MODE HINT: The user is scanning an INSTRUCTION MANUAL or product guide page. Prioritize:
- Reading model numbers, product names, and brand from the manual
- Identifying the product type from assembly diagrams or instructions
- Classify as "furniture" if it's furniture assembly, otherwise classify correctly.`,
  assembled: `SCAN MODE HINT: The user is scanning an ASSEMBLED piece of furniture or large item. Prioritize:
- Identifying the product line, brand, and style from visual design
- Noting material, color/finish, dimensions from visual inspection
- Checking for any visible labels, brand marks, or distinguishing features
- Classify as "furniture" if it is furniture.`,
  room_scene: `SCAN MODE HINT: The user is scanning a ROOM SCENE. Prioritize:
- Identifying the dominant item or product in the scene
- Focus on the most prominent item, not the whole room
- Classify based on what the dominant item actually is.`,
  food_scan: `SCAN MODE HINT: The user is scanning a FOOD or GROCERY item. Prioritize:
- Identifying the exact food item, dish, or packaged product
- Reading any visible labels, nutrition facts, brand names, ingredients
- If it is fresh/prepared food, classify as "food". If packaged with labels/barcodes, classify as "grocery".
- Provide maximum detail: nutrition, recipes, ingredients, allergens, dietary info
- Be the ultimate food expert — think chef + nutritionist + cookbook author.`,
  fashion_scan: `SCAN MODE HINT: The user is scanning a FASHION item (clothing, shoes, accessories). Prioritize:
- Identifying brand from ANY visual cue: logos, stitching, sole design, label placement, hardware
- Identifying exact model/style if possible
- Assessing condition, material, color, fit, style
- Providing accurate resale values and best selling platforms
- Classify as "fashion". Be the ultimate fashion expert — think StockX + personal stylist.`,
  electronics_scan: `SCAN MODE HINT: The user is scanning an ELECTRONICS item. Prioritize:
- Identifying brand, model, specifications from any visible text/labels
- Assessing condition and generation/version
- Providing accurate retail and resale pricing
- Noting depreciation and best resale platforms
- Classify as "electronics". Be the ultimate tech expert.`,
  household_scan: `SCAN MODE HINT: The user is scanning a HOUSEHOLD item (kitchenware, tools, cleaning, decor, storage, bathroom, garden, small appliance). Prioritize:
- Identifying the specific type of household item
- Noting brand, material, condition, and practical use
- Providing care tips, value assessment, and alternatives
- Classify as "household". Be the ultimate home expert.`,
  general_scan: `SCAN MODE HINT: The user is scanning a GENERAL item (toys, books, sports, collectibles, art, etc). Prioritize:
- Identifying exactly what the item is
- Noting brand, condition, rarity, and any identifying marks
- Providing value and resale assessment
- Classify as "general" unless it clearly fits a more specific category.`,
};

function getScanModePromptAddition(scanMode: IkeaScanMode): string {
  if (!scanMode || !SCAN_MODE_HINTS[scanMode]) return '';
  return '\n\n' + SCAN_MODE_HINTS[scanMode];
}

function applyIkeaBrandDetection(classification: z.infer<typeof classificationSchema>, scanMode: IkeaScanMode): z.infer<typeof classificationSchema> {
  const fixed = { ...classification };
  const combined = (
    (fixed.item_name ?? '') + ' ' +
    (fixed.category ?? '') + ' ' +
    (fixed.visual_cues ?? []).join(' ') + ' ' +
    (fixed.short_summary ?? '') + ' ' +
    (fixed.image_description ?? '')
  ).toLowerCase();

  const ikeaSignals = [
    'ikea', 'kallax', 'billy', 'malm', 'lack', 'hemnes', 'besta', 'bestå',
    'pax', 'alex', 'detolf', 'poäng', 'poang', 'ektorp', 'linnmon', 'micke',
    'fjalkinge', 'fjälkinge', 'expedit', 'stuva', 'trofast', 'brimnes',
    'nordli', 'kullen', 'tarva', 'rast', 'ivar', 'eket', 'havsta',
    'article number', 'art.no', 'flat-pack', 'flat pack', 'cam lock',
    'assembly instruction', 'hex key included',
  ];

  const articleNumberPattern = /\b\d{3}\.\d{3}\.\d{2}\b/;
  const hasArticleNumber = articleNumberPattern.test(combined);
  const ikeaMatchCount = ikeaSignals.filter(s => combined.includes(s)).length;

  const IKEA_SPECIFIC_MODES: IkeaScanMode[] = ['box_label', 'product_tag', 'manual', 'assembled'];
  const isIkeaScanMode = scanMode != null && IKEA_SPECIFIC_MODES.includes(scanMode);
  const isIkeaLikely = hasArticleNumber || ikeaMatchCount >= 2 || isIkeaScanMode;

  if (isIkeaLikely && fixed.item_type !== 'furniture' && fixed.item_type !== 'receipt' && fixed.item_type !== 'document') {
    console.log('[SmartScan] IKEA brand detection: routing to furniture. signals:', ikeaMatchCount, 'articleNum:', hasArticleNumber, 'scanMode:', scanMode);
    fixed.item_type = 'furniture';
    fixed.category = 'IKEA / Furniture';
    if (hasArticleNumber) {
      fixed.confidence = Math.max(fixed.confidence, 0.8);
    } else if (ikeaMatchCount >= 2) {
      fixed.confidence = Math.max(fixed.confidence, 0.7);
    } else {
      fixed.confidence = Math.max(fixed.confidence, 0.6);
    }
  }

  return fixed;
}

const SCAN_MODE_TO_TYPE: Record<string, SmartScanItemType> = {
  food_scan: 'food',
  fashion_scan: 'fashion',
  electronics_scan: 'electronics',
  household_scan: 'household',
  assembled: 'furniture',
};

const SCAN_MODE_COMPATIBLE_TYPES: Record<string, SmartScanItemType[]> = {
  food_scan: ['food', 'grocery'],
  fashion_scan: ['fashion'],
  electronics_scan: ['electronics'],
  household_scan: ['household'],
  assembled: ['furniture'],
  general_scan: ['food', 'grocery', 'household', 'furniture', 'fashion', 'electronics', 'general', 'receipt', 'document', 'unknown'],
  product_tag: ['receipt', 'food', 'grocery', 'household', 'furniture', 'fashion', 'electronics', 'general'],
};

function applyScanModeEnforcement(
  classification: z.infer<typeof classificationSchema>,
  scanMode: IkeaScanMode
): z.infer<typeof classificationSchema> {
  if (!scanMode || scanMode === 'general_scan' || scanMode === 'product_tag') return classification;
  if (classification.item_type === 'receipt' || classification.item_type === 'document') return classification;

  const compatible = SCAN_MODE_COMPATIBLE_TYPES[scanMode] ?? [];
  if (compatible.includes(classification.item_type)) {
    console.log('[SmartScan] Scan mode', scanMode, 'compatible with classified type', classification.item_type);
    return classification;
  }

  const targetType = SCAN_MODE_TO_TYPE[scanMode];
  if (!targetType) return classification;

  const combined = (
    (classification.item_name ?? '') + ' ' +
    (classification.category ?? '') + ' ' +
    (classification.visual_cues ?? []).join(' ') + ' ' +
    (classification.image_description ?? '')
  ).toLowerCase();

  const strongCounterSignals: Record<string, RegExp> = {
    food: /\b(shoe|sneaker|laptop|phone|headphone|chair|desk|table|sofa|couch|bed|shelf|cabinet|shirt|pants|jacket|dress|bag|watch|bracelet|necklace|earring|sunglasses|hat|belt|wallet|purse|backpack|monitor|keyboard|speaker|charger|controller|console|camera|drone)\b/,
    fashion: /\b(pasta|rice|cereal|bread|chips|cookie|milk|juice|soda|pizza|burger|taco|steak|chicken|sushi|apple|banana|chair|desk|table|sofa|couch|bed|shelf|laptop|phone|headphone|speaker|monitor|keyboard|blender|toaster|vacuum|pan|pot|skillet|knife|sponge|detergent)\b/,
    electronics: /\b(shoe|sneaker|shirt|pants|dress|jacket|bag|hat|chair|desk|table|sofa|bed|shelf|pasta|rice|bread|chips|pizza|burger|apple|banana|pan|pot|knife|sponge|candle|vase|pillow|rug|curtain)\b/,
    household: /\b(shoe|sneaker|shirt|pants|dress|jacket|laptop|phone|headphone|speaker|chair|desk|table|sofa|couch|bed|shelf|pasta|rice|bread|pizza|burger|steak|sushi)\b/,
    furniture: /\b(shoe|sneaker|shirt|pants|dress|jacket|laptop|phone|headphone|speaker|pasta|rice|bread|pizza|pan|pot|knife|sponge|candle|moisturizer|shampoo)\b/,
  };

  const counterSignal = strongCounterSignals[targetType];
  if (counterSignal && counterSignal.test(combined)) {
    console.log('[SmartScan] Scan mode', scanMode, 'overridden — strong counter-signals in content for target', targetType);
    return classification;
  }

  console.log('[SmartScan] ENFORCING scan mode:', scanMode, '| Overriding', classification.item_type, '->', targetType, '(was:', classification.item_name, ')');
  const fixed = { ...classification };
  fixed.item_type = targetType;

  const categoryMap: Record<string, string> = {
    food: 'Food',
    grocery: 'Grocery',
    fashion: 'Fashion',
    electronics: 'Electronics',
    household: 'Household',
    furniture: 'Furniture',
  };
  fixed.category = categoryMap[targetType] ?? fixed.category;
  fixed.confidence = Math.max(Math.min(fixed.confidence, 0.75), 0.55);
  return fixed;
}

export async function runSmartScan(imageUri: string, scanMode?: IkeaScanMode): Promise<SmartScanResult> {
  console.log('[SmartScan] Starting scan for:', imageUri.substring(0, 60), 'mode:', scanMode ?? 'auto');

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

  const imageDataUri = `data:image/jpeg;base64,${processed.base64}`;

  console.log('[SmartScan] Step 0: AI pre-analysis...');
  let preAnalysis = '';
  try {
    preAnalysis = await generateText({
      messages: [{
        role: 'user',
        content: [
          { type: 'image', image: imageDataUri },
          { type: 'text', text: `Look at this image carefully. Describe EXACTLY what you see in 4-6 factual sentences:
1. What is the main object? Be very specific about what kind of item it is (e.g. "a pair of white Nike running shoes" not "footwear").
2. Quote any visible text, labels, logos, brand names, or numbers EXACTLY as written.
3. Describe the dominant color, material/texture, and apparent condition.
4. What is the context/setting? (on a table, being worn, in packaging, on store shelf, etc.)
5. Is this a single physical item, prepared food, packaged product, receipt/document, or screenshot?
Be precise and observational. Do not guess or assume — only state what is clearly visible.` },
        ],
      }],
    });
    console.log('[SmartScan] Pre-analysis result:', preAnalysis.substring(0, 250));
  } catch (preErr) {
    console.log('[SmartScan] Pre-analysis failed, continuing without it:', preErr);
  }

  console.log('[SmartScan] Step 1: Classifying...');
  const preAnalysisAddition = preAnalysis
    ? `\n\nAI PRE-ANALYSIS OF THIS IMAGE (use as a strong starting reference, but VERIFY against the image):\n"${preAnalysis}"\n\nUse the above description to anchor your classification. The pre-analysis was generated by examining the actual image — trust it unless you see clear evidence otherwise.`
    : '';
  const classificationPromptWithHint = CLASSIFICATION_PROMPT + getScanModePromptAddition(scanMode ?? null) + preAnalysisAddition;

  let classification = await callWithRetry(
    () => generateObject({
      messages: [{
        role: 'user',
        content: [
          { type: 'image', image: imageDataUri },
          { type: 'text', text: classificationPromptWithHint },
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
  classification = applyIkeaBrandDetection(classification, scanMode ?? null);
  classification = fixItemType(classification);
  classification = crossValidateClassification(classification);
  classification = applyScanModeEnforcement(classification, scanMode ?? null);

  if (classification.confidence < 0.25) {
    classification.confidence = 0.25;
  }

  console.log('[SmartScan] Step 2: Getting details for', classification.item_type);
  const detailPrompt = getDetailPrompt(classification.item_type);

  const preAnalysisContext = preAnalysis
    ? `\nAI IMAGE DESCRIPTION (generated from examining this exact photo — use as your primary reference):\n"${preAnalysis}"\n`
    : '';

  const fullPrompt = `${detailPrompt}

CONTEXT FROM PRIOR ANALYSIS:
- Item identified as: ${classification.item_name} (${classification.category})
- Classification confidence: ${classification.confidence.toFixed(2)}
- Visual cues: ${(classification.visual_cues ?? []).join(', ') || 'none'}${scanMode ? `\n- User scan mode: "${scanMode.replace(/_/g, ' ')}"` : ''}${preAnalysisContext}

STRICT RULES:
1. item_type MUST be "${classification.item_type}". is_receipt must be false.
2. confidence: ${classification.confidence.toFixed(2)}
3. item_name: Keep "${classification.item_name}" unless you can clearly see a more specific name. Never make it MORE generic.
4. ONLY populate ${classification.item_type}_details. ALL other *_details MUST be null.
5. LOOK AT THE IMAGE: verify colors, materials, brands, condition against what is ACTUALLY visible.
6. Prices: use $ format. Use ranges when uncertain. Do NOT invent specific prices.
7. brand: ONLY if visible or confidently identifiable. Otherwise null.
8. material/color/condition: ONLY from visual evidence. null if uncertain.
9. Use null instead of "n/a", "none", "unknown", "generic", "mixed", "various".
10. Tags: lowercase, 6-10 relevant tags. Arrays: ordered by relevance.
11. Every field must be TRUSTWORTHY. null is always better than fabricated data.`;

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

  const normalized = normalizeFullResult(stabilized);
  const withResale = ensureResaleData(normalized);

  const { buildScanTrustResult } = await import('@/services/scanTrustEngine');
  withResale.trustResult = buildScanTrustResult(withResale, classification.visual_cues ?? []);

  console.log('[SmartScan] Done:', withResale.item_name, 'type:', withResale.item_type, 'conf:', withResale.confidence);
  return withResale;
}

function ensureResaleData(result: SmartScanResult): SmartScanResult {
  const r = { ...result };
  const CONSUMABLE: SmartScanItemType[] = ['food', 'grocery', 'receipt', 'document', 'unknown'];
  if (CONSUMABLE.includes(r.item_type)) return r;

  if (r.confidence < 0.72) {
    console.log('[SmartScan] ensureResaleData: confidence too low (' + r.confidence.toFixed(2) + '), skipping fallback resale data to avoid fake values');
    return r;
  }

  if (r.fashion_details) {
    const fd = { ...r.fashion_details };
    if (!fd.best_selling_platform) fd.best_selling_platform = fd.subcategory === 'shoes' ? 'eBay, StockX, Mercari' : 'Poshmark, Mercari, Depop';
    if (!fd.resale_suggestion) fd.resale_suggestion = 'Take clear photos of labels, tags, and any brand markings for best resale results.';
    r.fashion_details = fd;
  }

  if (r.electronics_details) {
    const ed = { ...r.electronics_details };
    if (!ed.best_selling_platform) ed.best_selling_platform = 'eBay, Facebook Marketplace, Swappa';
    if (!ed.resale_suggestion) ed.resale_suggestion = 'Include all accessories and show the device powered on for best resale results.';
    r.electronics_details = ed;
  }

  if (r.furniture_details) {
    const fd = { ...r.furniture_details };
    if (!fd.best_selling_platform) fd.best_selling_platform = 'Facebook Marketplace, Craigslist, OfferUp';
    if (!fd.resale_suggestion) fd.resale_suggestion = 'Photograph all sides including brand labels. Note any damage or missing hardware.';
    if (!fd.resale_title_suggestion) fd.resale_title_suggestion = r.item_name;
    r.furniture_details = fd;
  }

  if (r.household_details) {
    const hd = { ...r.household_details };
    if (!hd.best_selling_platform) hd.best_selling_platform = 'Facebook Marketplace, OfferUp, Mercari';
    if (!hd.resale_suggestion) hd.resale_suggestion = 'Clean the item and photograph any brand markings or labels for best listing results.';
    r.household_details = hd;
  }

  if (r.general_details) {
    const gd = { ...r.general_details };
    if (!gd.best_selling_platform) gd.best_selling_platform = 'eBay, Facebook Marketplace, Mercari';
    if (!gd.resale_suggestion) gd.resale_suggestion = 'Photograph all identifying marks and include accurate descriptions for best resale results.';
    r.general_details = gd;
  }

  console.log('[SmartScan] ensureResaleData: filled missing resale fields for', r.item_type, 'at confidence', r.confidence.toFixed(2));
  return r;
}

function normalizeFullResult(result: SmartScanResult): SmartScanResult {
  const n = { ...result };

  n.item_name = normalizeItemName(n.item_name);
  n.category = normalizeCategory(n.category);
  n.short_summary = normalizeSummary(n.short_summary);
  n.image_description = normalizeTextField(n.image_description) ?? '';
  n.visual_cues = normalizeStringArray(n.visual_cues);

  if (n.food_details) {
    const fd = { ...n.food_details };
    fd.estimated_price = ensureDollarPrefix(fd.estimated_price);
    fd.price_range = normalizeTextField(fd.price_range);
    fd.unit_price = ensureDollarPrefix(fd.unit_price);
    fd.tags = normalizeTagsArray(fd.tags);
    fd.complementary_items = normalizeStringArray(fd.complementary_items);
    fd.health_summary = normalizeTextField(fd.health_summary) ?? fd.health_summary;
    fd.quick_tip = normalizeTextField(fd.quick_tip) ?? fd.quick_tip;
    fd.budget_insight = normalizeTextField(fd.budget_insight);
    fd.cheaper_alternative = normalizeTextField(fd.cheaper_alternative);
    fd.purpose = normalizeTextField(fd.purpose);
    fd.value_insight = normalizeTextField(fd.value_insight);
    fd.next_scan_suggestion = normalizeTextField(fd.next_scan_suggestion);
    fd.ingredients = normalizeStringArray(fd.ingredients);
    fd.allergens = normalizeStringArray(fd.allergens);
    fd.dietary_info = normalizeStringArray(fd.dietary_info);
    fd.preparation_tips = normalizeStringArray(fd.preparation_tips);
    fd.storage_tip = normalizeTextField(fd.storage_tip);
    fd.season_availability = normalizeTextField(fd.season_availability);
    fd.origin_region = normalizeTextField(fd.origin_region);
    fd.cuisine_type = normalizeTextField(fd.cuisine_type);
    fd.pairs_with_drinks = normalizeStringArray(fd.pairs_with_drinks);
    fd.substitutes = normalizeStringArray(fd.substitutes);
    if (!fd.recipe_ideas) fd.recipe_ideas = [];
    n.food_details = fd;
  }

  if (n.grocery_details) {
    const gd = { ...n.grocery_details };
    gd.brand = normalizeTextField(gd.brand);
    gd.estimated_price = ensureDollarPrefix(gd.estimated_price);
    gd.price_range = normalizeTextField(gd.price_range);
    gd.unit_price = ensureDollarPrefix(gd.unit_price);
    gd.tags = normalizeTagsArray(gd.tags);
    gd.complementary_items = normalizeStringArray(gd.complementary_items);
    gd.what_else_needed = normalizeStringArray(gd.what_else_needed);
    gd.budget_insight = normalizeTextField(gd.budget_insight);
    gd.cheaper_alternative = normalizeTextField(gd.cheaper_alternative);
    gd.purpose = normalizeTextField(gd.purpose);
    gd.value_insight = normalizeTextField(gd.value_insight);
    gd.next_scan_suggestion = normalizeTextField(gd.next_scan_suggestion);
    gd.ingredients_list = normalizeStringArray(gd.ingredients_list);
    gd.allergens = normalizeStringArray(gd.allergens);
    gd.dietary_info = normalizeStringArray(gd.dietary_info);
    gd.preparation_tips = normalizeStringArray(gd.preparation_tips);
    gd.storage_tip = normalizeTextField(gd.storage_tip);
    gd.nutrition_highlights = normalizeTextField(gd.nutrition_highlights);
    gd.substitutes = normalizeStringArray(gd.substitutes);
    if (!gd.recipe_ideas) gd.recipe_ideas = [];
    n.grocery_details = gd;
  }

  if (n.household_details) {
    const hd = { ...n.household_details };
    hd.brand = normalizeTextField(hd.brand);
    hd.model = normalizeTextField(hd.model);
    hd.material = normalizeTextField(hd.material);
    hd.estimated_price = ensureDollarPrefix(hd.estimated_price);
    hd.price_range = normalizeTextField(hd.price_range);
    hd.estimated_resale_value = ensureDollarPrefix(hd.estimated_resale_value);
    hd.tags = normalizeTagsArray(hd.tags);
    hd.complementary_items = normalizeStringArray(hd.complementary_items);
    hd.budget_insight = normalizeTextField(hd.budget_insight);
    hd.cheaper_alternative = normalizeTextField(hd.cheaper_alternative);
    hd.care_tip = normalizeTextField(hd.care_tip);
    hd.purpose = normalizeTextField(hd.purpose);
    hd.value_insight = normalizeTextField(hd.value_insight);
    hd.next_scan_suggestion = normalizeTextField(hd.next_scan_suggestion);
    hd.value_reasoning = normalizeTextField(hd.value_reasoning);
    hd.resale_suggestion = normalizeTextField(hd.resale_suggestion);
    hd.comparable_model = normalizeTextField(hd.comparable_model);
    hd.best_selling_platform = normalizeTextField(hd.best_selling_platform);
    n.household_details = hd;
  }

  if (n.fashion_details) {
    const fd = { ...n.fashion_details };
    fd.brand = normalizeTextField(fd.brand);
    fd.model = normalizeTextField(fd.model);
    fd.material = normalizeTextField(fd.material);
    fd.color = normalizeTextField(fd.color);
    fd.estimated_retail_price = ensureDollarPrefix(fd.estimated_retail_price);
    fd.estimated_resale_value = ensureDollarPrefix(fd.estimated_resale_value);
    fd.price_range = normalizeTextField(fd.price_range);
    fd.tags = normalizeTagsArray(fd.tags);
    fd.complementary_items = normalizeStringArray(fd.complementary_items);
    fd.budget_insight = normalizeTextField(fd.budget_insight);
    fd.cheaper_alternative = normalizeTextField(fd.cheaper_alternative);
    fd.care_tip = normalizeTextField(fd.care_tip);
    fd.purpose = normalizeTextField(fd.purpose);
    fd.value_insight = normalizeTextField(fd.value_insight);
    fd.next_scan_suggestion = normalizeTextField(fd.next_scan_suggestion);
    fd.value_reasoning = normalizeTextField(fd.value_reasoning);
    fd.resale_suggestion = normalizeTextField(fd.resale_suggestion);
    fd.comparable_model = normalizeTextField(fd.comparable_model);
    fd.best_selling_platform = normalizeTextField(fd.best_selling_platform);
    n.fashion_details = fd;
  }

  if (n.electronics_details) {
    const ed = { ...n.electronics_details };
    ed.brand = normalizeTextField(ed.brand);
    ed.model = normalizeTextField(ed.model);
    ed.estimated_retail_price = ensureDollarPrefix(ed.estimated_retail_price);
    ed.estimated_resale_value = ensureDollarPrefix(ed.estimated_resale_value);
    ed.price_range = normalizeTextField(ed.price_range);
    ed.tags = normalizeTagsArray(ed.tags);
    ed.complementary_items = normalizeStringArray(ed.complementary_items);
    ed.budget_insight = normalizeTextField(ed.budget_insight);
    ed.cheaper_alternative = normalizeTextField(ed.cheaper_alternative);
    ed.care_tip = normalizeTextField(ed.care_tip);
    ed.purpose = normalizeTextField(ed.purpose);
    ed.value_insight = normalizeTextField(ed.value_insight);
    ed.next_scan_suggestion = normalizeTextField(ed.next_scan_suggestion);
    ed.depreciation_note = normalizeTextField(ed.depreciation_note);
    ed.value_reasoning = normalizeTextField(ed.value_reasoning);
    ed.resale_suggestion = normalizeTextField(ed.resale_suggestion);
    ed.comparable_model = normalizeTextField(ed.comparable_model);
    ed.best_selling_platform = normalizeTextField(ed.best_selling_platform);
    n.electronics_details = ed;
  }

  if (n.furniture_details) {
    const fd = { ...n.furniture_details };
    fd.material = normalizeTextField(fd.material);
    fd.estimated_retail_price = ensureDollarPrefix(fd.estimated_retail_price);
    fd.estimated_resale_value = ensureDollarPrefix(fd.estimated_resale_value);
    fd.estimated_price_range = normalizeTextField(fd.estimated_price_range);
    fd.tags = normalizeTagsArray(fd.tags);
    fd.complementary_items = normalizeStringArray(fd.complementary_items);
    fd.likely_tools_needed = normalizeStringArray(fd.likely_tools_needed);
    fd.likely_parts = normalizeStringArray(fd.likely_parts);
    fd.room_fit_labels = normalizeStringArray(fd.room_fit_labels);
    fd.matching_products = normalizeStringArray(fd.matching_products);
    fd.budget_insight = normalizeTextField(fd.budget_insight);
    fd.cheaper_alternative = normalizeTextField(fd.cheaper_alternative);
    fd.care_tip = normalizeTextField(fd.care_tip);
    fd.purpose = normalizeTextField(fd.purpose);
    fd.value_insight = normalizeTextField(fd.value_insight);
    fd.next_scan_suggestion = normalizeTextField(fd.next_scan_suggestion);
    fd.value_reasoning = normalizeTextField(fd.value_reasoning);
    fd.resale_suggestion = normalizeTextField(fd.resale_suggestion);
    fd.comparable_model = normalizeTextField(fd.comparable_model);
    fd.best_selling_platform = normalizeTextField(fd.best_selling_platform);
    fd.assembly_summary = normalizeTextField(fd.assembly_summary);
    fd.setup_notes = normalizeTextField(fd.setup_notes);
    fd.wall_anchor_note = normalizeTextField(fd.wall_anchor_note);
    fd.long_term_value = normalizeTextField(fd.long_term_value);
    fd.worth_it_verdict = normalizeTextField(fd.worth_it_verdict);
    fd.ikea_article_number = normalizeTextField(fd.ikea_article_number);
    fd.ikea_product_name = normalizeTextField(fd.ikea_product_name);
    fd.ikea_product_family = normalizeTextField(fd.ikea_product_family);
    fd.ikea_variant = normalizeTextField(fd.ikea_variant);
    fd.ikea_category = normalizeTextField(fd.ikea_category);
    fd.packaging_count = normalizeTextField(fd.packaging_count);
    fd.resale_title_suggestion = normalizeTextField(fd.resale_title_suggestion);
    fd.ikea_clues = normalizeStringArray(fd.ikea_clues);
    fd.best_next_scan = normalizeStringArray(fd.best_next_scan);
    n.furniture_details = fd;
  }

  if (n.general_details) {
    const gd = { ...n.general_details };
    gd.brand = normalizeTextField(gd.brand);
    gd.model = normalizeTextField(gd.model);
    gd.material = normalizeTextField(gd.material);
    gd.color = normalizeTextField(gd.color);
    gd.estimated_retail_price = ensureDollarPrefix(gd.estimated_retail_price);
    gd.estimated_resale_value = ensureDollarPrefix(gd.estimated_resale_value);
    gd.price_range = normalizeTextField(gd.price_range);
    gd.tags = normalizeTagsArray(gd.tags);
    gd.complementary_items = normalizeStringArray(gd.complementary_items);
    gd.budget_insight = normalizeTextField(gd.budget_insight);
    gd.cheaper_alternative = normalizeTextField(gd.cheaper_alternative);
    gd.care_tip = normalizeTextField(gd.care_tip);
    gd.fun_fact = normalizeTextField(gd.fun_fact);
    gd.practical_tip = normalizeTextField(gd.practical_tip);
    gd.purpose = normalizeTextField(gd.purpose);
    gd.value_insight = normalizeTextField(gd.value_insight);
    gd.next_scan_suggestion = normalizeTextField(gd.next_scan_suggestion);
    gd.value_reasoning = normalizeTextField(gd.value_reasoning);
    gd.resale_suggestion = normalizeTextField(gd.resale_suggestion);
    gd.comparable_item = normalizeTextField(gd.comparable_item);
    gd.best_selling_platform = normalizeTextField(gd.best_selling_platform);
    n.general_details = gd;
  }

  if (n.document_details) {
    const dd = { ...n.document_details };
    dd.tags = normalizeTagsArray(dd.tags);
    dd.detected_items = normalizeStringArray(dd.detected_items);
    dd.key_information = normalizeStringArray(dd.key_information);
    dd.suggested_actions = normalizeStringArray(dd.suggested_actions);
    n.document_details = dd;
  }

  console.log('[SmartScan] Normalized result:', n.item_name, 'category:', n.category);
  return n;
}
