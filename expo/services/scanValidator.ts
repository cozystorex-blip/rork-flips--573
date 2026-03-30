import type { SmartScanResult, SmartScanItemType } from '@/services/smartScanService';

export interface ScanValidationResult {
  isValid: boolean;
  score: number;
  totalChecks: number;
  passedChecks: number;
  warnings: string[];
  errors: string[];
  details: ScanFieldCheck[];
}

export interface ScanFieldCheck {
  field: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

function checkField(val: unknown, fieldName: string, required: boolean = false): ScanFieldCheck {
  if (val === null || val === undefined || val === '') {
    return {
      field: fieldName,
      status: required ? 'fail' : 'warn',
      message: required ? `Missing required field: ${fieldName}` : `Optional field empty: ${fieldName}`,
    };
  }
  if (Array.isArray(val) && val.length === 0) {
    return {
      field: fieldName,
      status: 'warn',
      message: `Empty array: ${fieldName}`,
    };
  }
  return {
    field: fieldName,
    status: 'pass',
    message: `${fieldName}: OK`,
  };
}

function validateCommonFields(result: SmartScanResult): ScanFieldCheck[] {
  const checks: ScanFieldCheck[] = [];
  checks.push(checkField(result.item_name, 'item_name', true));
  checks.push(checkField(result.item_type, 'item_type', true));
  checks.push(checkField(result.category, 'category', true));
  checks.push(checkField(result.confidence, 'confidence', true));
  checks.push(checkField(result.short_summary, 'short_summary'));
  checks.push(checkField(result.image_description, 'image_description'));

  if (result.confidence < 0.25) {
    checks.push({ field: 'confidence_level', status: 'fail', message: 'Confidence extremely low (<0.25)' });
  } else if (result.confidence < 0.4) {
    checks.push({ field: 'confidence_level', status: 'warn', message: 'Confidence low (<0.4)' });
  } else {
    checks.push({ field: 'confidence_level', status: 'pass', message: `Confidence: ${(result.confidence * 100).toFixed(0)}%` });
  }

  if (result.item_name === 'Unidentified Item' || result.item_name === 'Scanned Item') {
    checks.push({ field: 'item_name_quality', status: 'warn', message: 'Generic item name — not specific' });
  } else {
    checks.push({ field: 'item_name_quality', status: 'pass', message: 'Item name is specific' });
  }

  return checks;
}

function validateFoodDetails(result: SmartScanResult): ScanFieldCheck[] {
  if (!result.food_details) return [{ field: 'food_details', status: 'fail', message: 'food_details is null for food item' }];
  const fd = result.food_details;
  return [
    checkField(fd.serving_size, 'serving_size', true),
    checkField(fd.calories, 'calories', true),
    checkField(fd.protein_g, 'protein_g'),
    checkField(fd.health_summary, 'health_summary'),
    checkField(fd.ingredients, 'ingredients'),
    checkField(fd.recipe_ideas, 'recipe_ideas'),
    checkField(fd.allergens, 'allergens'),
    checkField(fd.dietary_info, 'dietary_info'),
    checkField(fd.preparation_tips, 'preparation_tips'),
    checkField(fd.storage_tip, 'storage_tip'),
    checkField(fd.estimated_price, 'estimated_price'),
    checkField(fd.tags, 'tags'),
    checkField(fd.complementary_items, 'complementary_items'),
    checkField(fd.purpose, 'purpose'),
    checkField(fd.pairs_with_drinks, 'pairs_with_drinks'),
    checkField(fd.substitutes, 'substitutes'),
    { field: 'recipe_count', status: (fd.recipe_ideas?.length ?? 0) >= 2 ? 'pass' : 'warn', message: `${fd.recipe_ideas?.length ?? 0} recipes provided` },
  ];
}

function validateGroceryDetails(result: SmartScanResult): ScanFieldCheck[] {
  if (!result.grocery_details) return [{ field: 'grocery_details', status: 'fail', message: 'grocery_details is null for grocery item' }];
  const gd = result.grocery_details;
  return [
    checkField(gd.brand, 'brand'),
    checkField(gd.package_size, 'package_size'),
    checkField(gd.estimated_price, 'estimated_price'),
    checkField(gd.ingredients_list, 'ingredients_list'),
    checkField(gd.allergens, 'allergens'),
    checkField(gd.dietary_info, 'dietary_info'),
    checkField(gd.recipe_ideas, 'recipe_ideas'),
    checkField(gd.preparation_tips, 'preparation_tips'),
    checkField(gd.storage_tip, 'storage_tip'),
    checkField(gd.nutrition_highlights, 'nutrition_highlights'),
    checkField(gd.tags, 'tags'),
    checkField(gd.complementary_items, 'complementary_items'),
    checkField(gd.purpose, 'purpose'),
    checkField(gd.substitutes, 'substitutes'),
    { field: 'recipe_count', status: (gd.recipe_ideas?.length ?? 0) >= 2 ? 'pass' : 'warn', message: `${gd.recipe_ideas?.length ?? 0} recipes provided` },
  ];
}

function validateFashionDetails(result: SmartScanResult): ScanFieldCheck[] {
  if (!result.fashion_details) return [{ field: 'fashion_details', status: 'fail', message: 'fashion_details is null for fashion item' }];
  const fd = result.fashion_details;
  return [
    checkField(fd.subcategory, 'subcategory', true),
    checkField(fd.item_description, 'item_description', true),
    checkField(fd.brand, 'brand'),
    checkField(fd.model, 'model'),
    checkField(fd.material, 'material'),
    checkField(fd.color, 'color'),
    checkField(fd.condition, 'condition'),
    checkField(fd.estimated_retail_price, 'estimated_retail_price'),
    checkField(fd.estimated_resale_value, 'estimated_resale_value'),
    checkField(fd.best_selling_platform, 'best_selling_platform'),
    checkField(fd.resale_demand, 'resale_demand'),
    checkField(fd.value_verdict, 'value_verdict'),
    checkField(fd.care_tip, 'care_tip'),
    checkField(fd.tags, 'tags'),
    checkField(fd.complementary_items, 'complementary_items'),
    checkField(fd.purpose, 'purpose'),
  ];
}

function validateElectronicsDetails(result: SmartScanResult): ScanFieldCheck[] {
  if (!result.electronics_details) return [{ field: 'electronics_details', status: 'fail', message: 'electronics_details is null for electronics item' }];
  const ed = result.electronics_details;
  return [
    checkField(ed.product_type, 'product_type', true),
    checkField(ed.brand, 'brand'),
    checkField(ed.model, 'model'),
    checkField(ed.condition, 'condition'),
    checkField(ed.estimated_retail_price, 'estimated_retail_price'),
    checkField(ed.estimated_resale_value, 'estimated_resale_value'),
    checkField(ed.best_selling_platform, 'best_selling_platform'),
    checkField(ed.depreciation_note, 'depreciation_note'),
    checkField(ed.care_tip, 'care_tip'),
    checkField(ed.tags, 'tags'),
    checkField(ed.complementary_items, 'complementary_items'),
    checkField(ed.purpose, 'purpose'),
  ];
}

function validateFurnitureDetails(result: SmartScanResult): ScanFieldCheck[] {
  if (!result.furniture_details) return [{ field: 'furniture_details', status: 'fail', message: 'furniture_details is null for furniture item' }];
  const fd = result.furniture_details;
  return [
    checkField(fd.item_type_specific, 'item_type_specific', true),
    checkField(fd.material, 'material'),
    checkField(fd.finish_color, 'finish_color'),
    checkField(fd.estimated_dimensions, 'estimated_dimensions'),
    checkField(fd.estimated_retail_price, 'estimated_retail_price'),
    checkField(fd.estimated_resale_value, 'estimated_resale_value'),
    checkField(fd.assembly_required, 'assembly_required'),
    checkField(fd.use_case, 'use_case'),
    checkField(fd.room_fit, 'room_fit'),
    checkField(fd.care_tip, 'care_tip'),
    checkField(fd.tags, 'tags'),
    checkField(fd.complementary_items, 'complementary_items'),
    checkField(fd.purpose, 'purpose'),
    checkField(fd.best_selling_platform, 'best_selling_platform'),
  ];
}

function validateHouseholdDetails(result: SmartScanResult): ScanFieldCheck[] {
  if (!result.household_details) return [{ field: 'household_details', status: 'fail', message: 'household_details is null for household item' }];
  const hd = result.household_details;
  return [
    checkField(hd.item_description, 'item_description', true),
    checkField(hd.subcategory, 'subcategory', true),
    checkField(hd.brand, 'brand'),
    checkField(hd.material, 'material'),
    checkField(hd.condition, 'condition'),
    checkField(hd.estimated_price, 'estimated_price'),
    checkField(hd.estimated_resale_value, 'estimated_resale_value'),
    checkField(hd.care_tip, 'care_tip'),
    checkField(hd.tags, 'tags'),
    checkField(hd.complementary_items, 'complementary_items'),
    checkField(hd.purpose, 'purpose'),
    checkField(hd.best_selling_platform, 'best_selling_platform'),
  ];
}

function validateGeneralDetails(result: SmartScanResult): ScanFieldCheck[] {
  if (!result.general_details) return [{ field: 'general_details', status: 'fail', message: 'general_details is null for general item' }];
  const gd = result.general_details;
  return [
    checkField(gd.item_description, 'item_description', true),
    checkField(gd.subcategory, 'subcategory'),
    checkField(gd.brand, 'brand'),
    checkField(gd.material, 'material'),
    checkField(gd.color, 'color'),
    checkField(gd.condition, 'condition'),
    checkField(gd.estimated_retail_price, 'estimated_retail_price'),
    checkField(gd.estimated_resale_value, 'estimated_resale_value'),
    checkField(gd.care_tip, 'care_tip'),
    checkField(gd.tags, 'tags'),
    checkField(gd.complementary_items, 'complementary_items'),
    checkField(gd.purpose, 'purpose'),
  ];
}

function validateDocumentDetails(result: SmartScanResult): ScanFieldCheck[] {
  if (!result.document_details) return [{ field: 'document_details', status: 'fail', message: 'document_details is null for document item' }];
  const dd = result.document_details;
  return [
    checkField(dd.content_description, 'content_description', true),
    checkField(dd.document_type, 'document_type', true),
    checkField(dd.main_topic, 'main_topic'),
    checkField(dd.detected_items, 'detected_items'),
    checkField(dd.key_information, 'key_information'),
    checkField(dd.suggested_actions, 'suggested_actions'),
    checkField(dd.tags, 'tags'),
  ];
}

const TYPE_VALIDATORS: Partial<Record<SmartScanItemType, (r: SmartScanResult) => ScanFieldCheck[]>> = {
  food: validateFoodDetails,
  grocery: validateGroceryDetails,
  fashion: validateFashionDetails,
  electronics: validateElectronicsDetails,
  furniture: validateFurnitureDetails,
  household: validateHouseholdDetails,
  general: validateGeneralDetails,
  document: validateDocumentDetails,
};

export function validateScanResult(result: SmartScanResult): ScanValidationResult {
  const allChecks: ScanFieldCheck[] = [];

  allChecks.push(...validateCommonFields(result));

  const typeValidator = TYPE_VALIDATORS[result.item_type];
  if (typeValidator) {
    allChecks.push(...typeValidator(result));
  }

  const detailsMap: Record<string, unknown> = {
    food: result.food_details,
    grocery: result.grocery_details,
    household: result.household_details,
    furniture: result.furniture_details,
    fashion: result.fashion_details,
    electronics: result.electronics_details,
    general: result.general_details,
    document: result.document_details,
  };
  const wrongDetails = Object.entries(detailsMap)
    .filter(([key, val]) => key !== result.item_type && val != null)
    .map(([key]) => key);
  if (wrongDetails.length > 0) {
    allChecks.push({
      field: 'wrong_detail_fields',
      status: 'warn',
      message: `Non-matching detail fields populated: ${wrongDetails.join(', ')}`,
    });
  } else {
    allChecks.push({ field: 'detail_field_alignment', status: 'pass', message: 'Only correct detail field is populated' });
  }

  const passed = allChecks.filter(c => c.status === 'pass').length;
  const warnings = allChecks.filter(c => c.status === 'warn');
  const errors = allChecks.filter(c => c.status === 'fail');
  const total = allChecks.length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;

  const validation: ScanValidationResult = {
    isValid: errors.length === 0,
    score,
    totalChecks: total,
    passedChecks: passed,
    warnings: warnings.map(w => w.message),
    errors: errors.map(e => e.message),
    details: allChecks,
  };

  console.log(`[ScanValidator] Result: ${result.item_type} "${result.item_name}" | Score: ${score}% | ${passed}/${total} passed | ${errors.length} errors | ${warnings.length} warnings`);
  if (errors.length > 0) {
    console.log('[ScanValidator] Errors:', errors.map(e => e.message).join('; '));
  }
  if (warnings.length > 0) {
    console.log('[ScanValidator] Warnings:', warnings.map(w => w.message).join('; '));
  }

  return validation;
}

export function getScanHealthLabel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Excellent', color: '#16A34A' };
  if (score >= 70) return { label: 'Good', color: '#2563EB' };
  if (score >= 50) return { label: 'Fair', color: '#D97706' };
  return { label: 'Needs Improvement', color: '#DC2626' };
}
