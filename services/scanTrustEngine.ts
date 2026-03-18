import {
  ScanTrustResult,
  TrustField,
  TrustPriceField,
  TrustDimensionField,
  TrustSectionItem,
  VerificationStatus,
  SourceType,
  getVerificationStatus,
} from '@/types/scanTrust';
import { SmartScanResult } from '@/services/smartScanService';

const KNOWN_BRANDS = [
  'ikea', 'nike', 'adidas', 'apple', 'samsung', 'sony', 'lg', 'bose', 'jbl',
  'barilla', 'kraft', 'nestle', 'coca-cola', 'pepsi', 'kellogg', 'general mills',
  'melissa & doug', 'childcraft', 'lakeshore', 'guidecraft', 'ecr4kids',
  'target', 'walmart', 'costco', 'amazon basics', 'rubbermaid', 'sterilite',
  'dewalt', 'makita', 'bosch', 'black+decker', 'milwaukee', 'ryobi',
  'herman miller', 'steelcase', 'west elm', 'pottery barn', 'crate & barrel',
  'ashley', 'wayfair', 'zara', 'h&m', 'uniqlo', 'levi', 'gap', 'old navy',
];

const EXACT_MATCH_KEYWORDS = [
  'model number', 'sku', 'upc', 'item #', 'article number', 'art.', 'product code',
];

function inferSourceType(
  fieldName: string,
  value: string | null,
  overallConfidence: number,
  visualCues: string[],
  itemName: string,
): SourceType {
  if (!value) return 'generic_knowledge';

  const combined = (visualCues.join(' ') + ' ' + itemName).toLowerCase();
  const valueLower = value.toLowerCase();

  if (EXACT_MATCH_KEYWORDS.some(k => combined.includes(k))) {
    return 'exact_listing_match';
  }

  if (fieldName === 'brand') {
    if (KNOWN_BRANDS.some(b => valueLower.includes(b) || combined.includes(b))) {
      if (overallConfidence >= 0.75) return 'ocr_text';
      return 'visual_match';
    }
    return 'heuristic_inference';
  }

  if (fieldName === 'price' || fieldName === 'dimensions') {
    if (overallConfidence >= 0.85 && combined.includes('label')) return 'ocr_text';
    if (overallConfidence >= 0.7) return 'similar_listing_match';
    return 'heuristic_inference';
  }

  if (fieldName === 'material' || fieldName === 'color') {
    if (overallConfidence >= 0.7) return 'visual_match';
    return 'heuristic_inference';
  }

  if (overallConfidence >= 0.8) return 'visual_match';
  if (overallConfidence >= 0.6) return 'heuristic_inference';
  return 'generic_knowledge';
}

function scoreField(
  fieldName: string,
  value: string | null,
  overallConfidence: number,
  visualCues: string[],
  itemName: string,
): { confidence: number; sourceType: SourceType; verificationStatus: VerificationStatus } {
  if (!value) {
    return { confidence: 0, sourceType: 'generic_knowledge', verificationStatus: 'unknown' };
  }

  const sourceType = inferSourceType(fieldName, value, overallConfidence, visualCues, itemName);

  let fieldConfidence = overallConfidence;

  switch (sourceType) {
    case 'exact_listing_match':
    case 'barcode':
      fieldConfidence = Math.max(overallConfidence, 0.9);
      break;
    case 'ocr_text':
      fieldConfidence = Math.max(overallConfidence * 0.95, 0.75);
      break;
    case 'visual_match':
      fieldConfidence = overallConfidence * 0.85;
      break;
    case 'similar_listing_match':
      fieldConfidence = Math.min(overallConfidence * 0.7, 0.72);
      break;
    case 'heuristic_inference':
      fieldConfidence = Math.min(overallConfidence * 0.55, 0.6);
      break;
    case 'generic_knowledge':
      fieldConfidence = Math.min(overallConfidence * 0.35, 0.45);
      break;
  }

  if (fieldName === 'price' && sourceType !== 'exact_listing_match' && sourceType !== 'ocr_text' && sourceType !== 'barcode') {
    fieldConfidence = Math.min(fieldConfidence, 0.55);
  }
  if (fieldName === 'dimensions' && sourceType !== 'exact_listing_match' && sourceType !== 'ocr_text') {
    fieldConfidence = Math.min(fieldConfidence, 0.5);
  }

  return {
    confidence: Math.round(fieldConfidence * 100) / 100,
    sourceType,
    verificationStatus: getVerificationStatus(fieldConfidence),
  };
}

function buildTrustField(
  fieldName: string,
  value: string | null,
  overallConfidence: number,
  visualCues: string[],
  itemName: string,
): TrustField {
  const scored = scoreField(fieldName, value, overallConfidence, visualCues, itemName);
  return {
    value,
    ...scored,
  };
}

function buildPriceField(
  price: string | null,
  priceRange: string | null,
  overallConfidence: number,
  visualCues: string[],
  itemName: string,
): TrustPriceField {
  const scored = scoreField('price', price, overallConfidence, visualCues, itemName);

  let mode: TrustPriceField['mode'] = 'unavailable';
  if (price && scored.verificationStatus === 'confirmed') {
    mode = 'exactPrice';
  } else if (price || priceRange) {
    mode = 'estimatedRange';
  }

  return {
    value: price,
    mode,
    rangeValue: priceRange,
    ...scored,
  };
}

function buildDimensionField(
  dimensions: string | null,
  overallConfidence: number,
  visualCues: string[],
  itemName: string,
): TrustDimensionField {
  const scored = scoreField('dimensions', dimensions, overallConfidence, visualCues, itemName);

  let mode: TrustDimensionField['mode'] = 'unavailable';
  let sizeEstimate: string | null = null;

  if (dimensions && scored.verificationStatus === 'confirmed') {
    mode = 'verifiedDimensions';
  } else if (dimensions) {
    mode = 'visualSizeEstimate';
    sizeEstimate = dimensions;
  }

  return {
    value: scored.verificationStatus === 'confirmed' ? dimensions : null,
    mode,
    sizeEstimate,
    ...scored,
  };
}

function determineSourceQuality(
  overallConfidence: number,
  visualCues: string[],
): string[] {
  const sources: string[] = [];
  const combined = visualCues.join(' ').toLowerCase();

  if (combined.includes('barcode') || combined.includes('upc') || combined.includes('qr')) {
    sources.push('Barcode detected');
  }
  if (combined.includes('label') || combined.includes('text') || combined.includes('logo') || combined.includes('brand')) {
    sources.push('OCR text / logo detected');
  }
  if (overallConfidence >= 0.85) {
    sources.push('Strong visual match');
  } else if (overallConfidence >= 0.65) {
    sources.push('Moderate visual match');
  } else {
    sources.push('Based on image analysis only');
  }

  if (sources.length === 1 && sources[0] === 'Based on image analysis only') {
    sources.push('No text, barcode, or brand markings detected');
  }

  return sources;
}

function getSourceQualityLabel(sources: string[]): string {
  if (sources.some(s => s.includes('Barcode'))) return 'Based on barcode + visual match';
  if (sources.some(s => s.includes('OCR'))) return 'Based on OCR + visual match';
  if (sources.some(s => s.includes('Strong'))) return 'Based on strong visual match';
  if (sources.some(s => s.includes('Moderate'))) return 'Based on moderate visual match';
  return 'Based on image analysis only';
}

function getVerificationSummary(trustResult: ScanTrustResult): string {
  const confirmed = trustResult.sections.confirmedFacts.length;
  const likely = trustResult.sections.likelyDetails.length;

  if (confirmed >= 3) return 'Multiple details confirmed';
  if (confirmed >= 1) return `${confirmed} confirmed, ${likely} estimated`;
  if (likely >= 2) return 'Estimated details only';
  return 'Limited data available';
}

function extractCareTips(result: SmartScanResult): string[] {
  const tips: string[] = [];

  const careTip = result.furniture_details?.care_tip
    ?? result.household_details?.care_tip
    ?? result.fashion_details?.care_tip
    ?? result.electronics_details?.care_tip
    ?? result.general_details?.care_tip
    ?? null;

  if (careTip) {
    tips.push(careTip);
  }

  const itemType = result.item_type;
  const material = result.furniture_details?.material
    ?? result.household_details?.material
    ?? result.fashion_details?.material
    ?? result.general_details?.material
    ?? null;

  if (material && tips.length === 0) {
    const materialLower = (material ?? '').toLowerCase();
    if (materialLower.includes('wood') || materialLower.includes('mdf') || materialLower.includes('plywood')) {
      tips.push('Wipe with a damp cloth');
      tips.push('Avoid prolonged moisture exposure');
    } else if (materialLower.includes('metal') || materialLower.includes('steel') || materialLower.includes('iron')) {
      tips.push('Wipe dry to prevent rust');
      tips.push('Apply protective coating periodically');
    } else if (materialLower.includes('fabric') || materialLower.includes('upholster') || materialLower.includes('cotton')) {
      tips.push('Vacuum regularly to remove dust');
      tips.push('Spot clean stains promptly');
    } else if (materialLower.includes('plastic') || materialLower.includes('polymer')) {
      tips.push('Clean with mild soap and water');
      tips.push('Avoid harsh chemical cleaners');
    } else if (materialLower.includes('leather') || materialLower.includes('faux leather')) {
      tips.push('Condition leather periodically');
      tips.push('Avoid direct sunlight to prevent fading');
    }
  }

  if (tips.length === 0 && (itemType === 'furniture' || itemType === 'household')) {
    tips.push('Wipe clean with a damp cloth');
    tips.push('Follow manufacturer care instructions if available');
  }

  return tips;
}

function extractAssemblyInfo(result: SmartScanResult): TrustSectionItem[] {
  const items: TrustSectionItem[] = [];
  const fd = result.furniture_details;
  if (!fd) return items;

  const overallConf = result.confidence;

  if (fd.assembly_required === false) {
    items.push({
      label: 'Assembly',
      value: 'No assembly required — ready to use',
      verificationStatus: overallConf >= 0.85 ? 'confirmed' : 'likely',
    });
    return items;
  }

  if (fd.assembly_difficulty) {
    const status: VerificationStatus = overallConf >= 0.8 ? 'likely' : 'generic';
    items.push({
      label: 'Difficulty',
      value: fd.assembly_difficulty.charAt(0).toUpperCase() + fd.assembly_difficulty.slice(1),
      verificationStatus: status,
    });
  }

  if (fd.estimated_build_time) {
    items.push({
      label: 'Build Time',
      value: fd.estimated_build_time,
      verificationStatus: overallConf >= 0.85 ? 'likely' : 'generic',
    });
  }

  if (fd.people_needed) {
    const label = fd.people_needed === '1' ? '1 person' : fd.people_needed === '2' ? '2 people' : '2+ people';
    items.push({
      label: 'People',
      value: label,
      verificationStatus: 'generic',
    });
  }

  if (fd.likely_tools_needed && fd.likely_tools_needed.length > 0) {
    items.push({
      label: 'Tools',
      value: fd.likely_tools_needed.join(', '),
      verificationStatus: 'generic',
    });
  }

  if (fd.assembly_summary) {
    items.push({
      label: 'Summary',
      value: fd.assembly_summary,
      verificationStatus: 'generic',
    });
  }

  return items;
}

function extractCompanionItems(result: SmartScanResult): string[] {
  const complementary = result.food_details?.complementary_items
    ?? result.grocery_details?.complementary_items
    ?? result.household_details?.complementary_items
    ?? result.furniture_details?.complementary_items
    ?? result.fashion_details?.complementary_items
    ?? result.electronics_details?.complementary_items
    ?? result.general_details?.complementary_items
    ?? [];

  const matching = result.furniture_details?.matching_products ?? [];

  const all = [...complementary, ...matching];
  const unique = Array.from(new Set(all.map(s => s.trim()).filter(Boolean)));
  return unique;
}

function extractCommonUse(result: SmartScanResult): string[] {
  const uses: string[] = [];

  if (result.furniture_details) {
    if (result.furniture_details.use_case) uses.push(result.furniture_details.use_case);
    if (result.furniture_details.room_fit) uses.push(`Fits in: ${result.furniture_details.room_fit}`);
    if (result.furniture_details.room_fit_labels?.length) {
      result.furniture_details.room_fit_labels.forEach(r => {
        if (!uses.some(u => u.toLowerCase().includes(r.toLowerCase()))) {
          uses.push(r);
        }
      });
    }
  }

  if (result.household_details?.practical_recommendation) {
    uses.push(result.household_details.practical_recommendation);
  }

  if (result.general_details?.practical_tip) {
    uses.push(result.general_details.practical_tip);
  }

  return uses;
}

function buildTitleField(
  result: SmartScanResult,
  overallConfidence: number,
  visualCues: string[],
): TrustField<string> {
  const name = result.item_name || 'Unknown Item';
  const combined = (visualCues.join(' ') + ' ' + name).toLowerCase();

  const hasExactMatch = EXACT_MATCH_KEYWORDS.some(k => combined.includes(k));
  const hasBrandMatch = KNOWN_BRANDS.some(b => combined.includes(b));

  let titleConfidence = overallConfidence;
  let sourceType: SourceType = 'visual_match';

  if (hasExactMatch) {
    titleConfidence = Math.max(overallConfidence, 0.9);
    sourceType = 'exact_listing_match';
  } else if (hasBrandMatch && overallConfidence >= 0.75) {
    titleConfidence = Math.max(overallConfidence * 0.9, 0.78);
    sourceType = 'ocr_text';
  } else if (overallConfidence >= 0.7) {
    titleConfidence = overallConfidence * 0.8;
    sourceType = 'visual_match';
  } else {
    titleConfidence = overallConfidence * 0.6;
    sourceType = 'heuristic_inference';
  }

  return {
    value: name,
    confidence: Math.round(titleConfidence * 100) / 100,
    sourceType,
    verificationStatus: getVerificationStatus(titleConfidence),
  };
}

export function buildScanTrustResult(result: SmartScanResult, visualCues: string[] = []): ScanTrustResult {
  console.log('[TrustEngine] Building trust result for:', result.item_name, 'type:', result.item_type, 'conf:', result.confidence);

  const overallConfidence = result.confidence;

  const brandRaw = result.fashion_details?.brand
    ?? result.electronics_details?.brand
    ?? result.household_details?.brand
    ?? result.general_details?.brand
    ?? null;

  const material = result.furniture_details?.material
    ?? result.household_details?.material
    ?? result.fashion_details?.material
    ?? result.general_details?.material
    ?? null;

  const color = result.furniture_details?.finish_color
    ?? result.fashion_details?.color
    ?? result.general_details?.color
    ?? null;

  const condition = result.fashion_details?.condition
    ?? result.electronics_details?.condition
    ?? result.household_details?.condition
    ?? result.general_details?.condition
    ?? null;

  const model = result.fashion_details?.model
    ?? result.electronics_details?.model
    ?? result.household_details?.model
    ?? result.general_details?.model
    ?? null;

  const price = result.furniture_details?.estimated_retail_price
    ?? result.fashion_details?.estimated_retail_price
    ?? result.electronics_details?.estimated_retail_price
    ?? result.household_details?.estimated_price
    ?? result.general_details?.estimated_retail_price
    ?? result.food_details?.estimated_price
    ?? result.grocery_details?.estimated_price
    ?? null;

  const priceRange = result.furniture_details?.estimated_price_range
    ?? result.fashion_details?.price_range
    ?? result.electronics_details?.price_range
    ?? result.household_details?.price_range
    ?? result.general_details?.price_range
    ?? result.food_details?.price_range
    ?? result.grocery_details?.price_range
    ?? null;

  const dimensions = result.furniture_details?.estimated_dimensions ?? null;

  const itemTypeValue = result.furniture_details?.item_type_specific
    ?? result.fashion_details?.subcategory
    ?? result.electronics_details?.product_type
    ?? result.household_details?.subcategory
    ?? result.general_details?.subcategory
    ?? null;

  const titleField = buildTitleField(result, overallConfidence, visualCues);
  const brandField = buildTrustField('brand', brandRaw, overallConfidence, visualCues, result.item_name);
  const priceField = buildPriceField(price, priceRange, overallConfidence, visualCues, result.item_name);
  const dimensionField = buildDimensionField(dimensions, overallConfidence, visualCues, result.item_name);
  const materialField = buildTrustField('material', material, overallConfidence, visualCues, result.item_name);
  const itemTypeField = buildTrustField('itemType', itemTypeValue, overallConfidence, visualCues, result.item_name);
  const modelField = buildTrustField('model', model, overallConfidence, visualCues, result.item_name);
  const conditionField = buildTrustField('condition', condition, overallConfidence, visualCues, result.item_name);
  const colorField = buildTrustField('color', color, overallConfidence, visualCues, result.item_name);

  const confirmedFacts: TrustSectionItem[] = [];
  const likelyDetails: TrustSectionItem[] = [];

  const addToSection = (label: string, field: TrustField) => {
    if (!field.value) return;
    const item: TrustSectionItem = {
      label,
      value: field.value,
      verificationStatus: field.verificationStatus,
      sourceType: field.sourceType,
    };
    if (field.verificationStatus === 'confirmed') {
      confirmedFacts.push(item);
    } else if (field.verificationStatus === 'likely' || field.verificationStatus === 'generic') {
      likelyDetails.push(item);
    }
  };

  addToSection('Category', { value: result.category, confidence: overallConfidence, sourceType: 'visual_match', verificationStatus: getVerificationStatus(overallConfidence) });
  addToSection('Item Type', itemTypeField);
  addToSection('Brand', brandField);
  addToSection('Model', modelField);
  addToSection('Material', materialField);
  addToSection('Color / Finish', colorField);
  addToSection('Condition', conditionField);

  if (priceField.mode === 'exactPrice' && priceField.value) {
    confirmedFacts.push({
      label: 'Price',
      value: priceField.value.startsWith('$') ? priceField.value : `$${priceField.value}`,
      verificationStatus: 'confirmed',
      sourceType: priceField.sourceType,
    });
  } else if (priceField.mode === 'estimatedRange') {
    const displayPrice = priceField.rangeValue || priceField.value;
    if (displayPrice) {
      likelyDetails.push({
        label: 'Estimated Price Range',
        value: displayPrice.startsWith('$') ? displayPrice : `$${displayPrice}`,
        verificationStatus: 'likely',
        sourceType: priceField.sourceType,
      });
    }
  }

  if (dimensionField.mode === 'verifiedDimensions' && dimensionField.value) {
    confirmedFacts.push({
      label: 'Dimensions',
      value: dimensionField.value,
      verificationStatus: 'confirmed',
      sourceType: dimensionField.sourceType,
    });
  } else if (dimensionField.mode === 'visualSizeEstimate' && dimensionField.sizeEstimate) {
    likelyDetails.push({
      label: 'Approximate Size',
      value: dimensionField.sizeEstimate,
      verificationStatus: 'likely',
      sourceType: dimensionField.sourceType,
    });
  }

  const commonUse = extractCommonUse(result);
  const careTips = extractCareTips(result);
  const assemblyInfo = extractAssemblyInfo(result);
  const companionItems = extractCompanionItems(result);
  const sourceQuality = determineSourceQuality(overallConfidence, visualCues);
  const sourceQualityLabel = getSourceQualityLabel(sourceQuality);

  const trustResult: ScanTrustResult = {
    title: titleField,
    overallConfidence,
    category: result.category,
    verificationSummary: '',
    sourceQualityLabel,
    fields: {
      brand: brandField,
      price: priceField,
      dimensions: dimensionField,
      material: materialField,
      itemType: itemTypeField,
      model: modelField,
      condition: conditionField,
      color: colorField,
    },
    sections: {
      confirmedFacts,
      likelyDetails,
      commonUse,
      generalCareTips: careTips,
      typicalAssembly: assemblyInfo,
      companionItems,
      sourceQuality,
    },
  };

  trustResult.verificationSummary = getVerificationSummary(trustResult);

  console.log('[TrustEngine] Result:', confirmedFacts.length, 'confirmed,', likelyDetails.length, 'likely,', sourceQualityLabel);

  return trustResult;
}
