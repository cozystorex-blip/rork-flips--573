import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import {
  Camera,
  CheckCircle,
  Lightbulb,
  ChevronRight,
  Package,
  TrendingUp,
  Trash2,
  Leaf,
  UtensilsCrossed,
  CookingPot,
  Cherry,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import type { SmartScanResult } from '@/services/smartScanService';
import { ScannerColors, ScannerRadius, ScannerSpacing } from '@/constants/scannerTheme';

interface PriceInfo {
  originalPrice: string | null;
  valuePrice: string | null;
  priceRange: string | null;
  originalLabel: string;
}

function extractPriceInfo(result: SmartScanResult): PriceInfo {
  let retailVal: string | null = null;
  let resaleVal: string | null = null;
  let priceRange: string | null = null;
  let originalLabel = 'Original Price';

  if (result.fashion_details) {
    retailVal = result.fashion_details.estimated_retail_price;
    resaleVal = result.fashion_details.estimated_resale_value;
    priceRange = result.fashion_details.price_range;
    originalLabel = 'Retail Price';
  } else if (result.electronics_details) {
    retailVal = result.electronics_details.estimated_retail_price;
    resaleVal = result.electronics_details.estimated_resale_value;
    priceRange = result.electronics_details.price_range;
    originalLabel = 'Retail Price';
  } else if (result.furniture_details) {
    retailVal = result.furniture_details.estimated_retail_price;
    resaleVal = result.furniture_details.estimated_resale_value;
    priceRange = result.furniture_details.estimated_price_range;
    originalLabel = result.furniture_details.is_likely_ikea ? 'IKEA Price' : 'Retail Price';
  } else if (result.household_details) {
    retailVal = result.household_details.estimated_price;
    resaleVal = result.household_details.estimated_resale_value;
    priceRange = result.household_details.price_range;
    originalLabel = 'Est. Price';
  } else if (result.general_details) {
    retailVal = result.general_details.estimated_retail_price;
    resaleVal = result.general_details.estimated_resale_value;
    priceRange = result.general_details.price_range;
    originalLabel = 'Retail Price';
  }

  const formatPrice = (val: string | null): string | null => {
    if (!val) return null;
    const trimmed = val.trim();
    if (trimmed.length === 0) return null;
    return trimmed.startsWith('$') ? trimmed : `$${trimmed}`;
  };

  return {
    originalPrice: formatPrice(retailVal),
    valuePrice: formatPrice(resaleVal),
    priceRange: priceRange?.trim() || null,
    originalLabel,
  };
}

function getCategoryLabel(result: SmartScanResult): string {
  if (result.fashion_details) {
    const map: Record<string, string> = { shoes: 'Shoes', clothing: 'Clothing', outerwear: 'Outerwear', accessories: 'Accessories', bags: 'Bags', jewelry: 'Jewelry', activewear: 'Activewear', other: 'Fashion' };
    return map[result.fashion_details.subcategory] ?? 'Fashion';
  }
  if (result.electronics_details) return result.electronics_details.product_type ?? 'Electronics';
  if (result.furniture_details) return result.furniture_details.item_type_specific ?? 'Furniture';
  if (result.household_details) {
    const map: Record<string, string> = { tools: 'Tools', fitness: 'Fitness', kitchenware: 'Kitchenware', cleaning: 'Cleaning', bathroom: 'Bathroom', decor: 'Decor', garden: 'Garden', storage: 'Storage', lighting: 'Lighting', small_appliance: 'Appliance', other: 'Household' };
    return map[result.household_details.subcategory] ?? 'Household';
  }
  if (result.food_details) return 'Food';
  if (result.grocery_details) return 'Grocery';
  if (result.general_details) {
    const sub = result.general_details.subcategory;
    return sub ? sub.charAt(0).toUpperCase() + sub.slice(1).replace(/_/g, ' ') : 'General';
  }
  return result.category ?? 'Item';
}

interface AttributeChip {
  label: string;
  value: string;
}

const JUNK_VALUES = ['unknown', 'n/a', 'none', 'mixed', 'various', 'unbranded', 'generic', 'other', 'item', 'personal', 'general use', 'standard', 'typical', 'regular', 'basic', 'normal', 'not available', 'not applicable', 'unspecified', 'undetermined', 'general', 'commodity', 'average', 'fair', 'common', 'null', 'undefined', 'mixed materials', 'various materials', 'multiple', 'assorted', 'miscellaneous', 'misc', 'similar items in this category', 'similar devices in this category', 'similar household items', 'similar furniture items in this style', 'estimated based on visual category match', 'estimated from visual category', 'estimated from item category', 'estimated based on product category'];

function isRealValue(val: string | null | undefined): val is string {
  if (!val || val.trim().length === 0) return false;
  return !JUNK_VALUES.includes(val.trim().toLowerCase());
}

function pushIfReal(chips: AttributeChip[], label: string, value: string | null | undefined): void {
  if (isRealValue(value)) {
    chips.push({ label, value: value!.trim() });
  }
}

function getAttributeChips(result: SmartScanResult): AttributeChip[] {
  const chips: AttributeChip[] = [];

  if (result.fashion_details) {
    const fd = result.fashion_details;
    const typeMap: Record<string, string> = { shoes: 'Footwear', clothing: 'Clothing', outerwear: 'Outerwear', accessories: 'Accessories', bags: 'Bags', jewelry: 'Jewelry', activewear: 'Activewear', other: 'Fashion' };
    pushIfReal(chips, 'Type', typeMap[fd.subcategory] ?? fd.subcategory);
    const colorVal = fd.color ? (fd.secondary_color && isRealValue(fd.secondary_color) ? `${fd.color} / ${fd.secondary_color}` : fd.color) : null;
    pushIfReal(chips, 'Color', colorVal);
    pushIfReal(chips, 'Material', fd.material);
    if (fd.condition) pushIfReal(chips, 'Condition', fd.condition.charAt(0).toUpperCase() + fd.condition.slice(1));
    pushIfReal(chips, 'Brand', fd.brand);
    const forVal = fd.gender_target ? fd.gender_target.charAt(0).toUpperCase() + fd.gender_target.slice(1) : (isRealValue(fd.style) ? fd.style!.split(' ')[0] : null);
    pushIfReal(chips, 'For', forVal);
  } else if (result.electronics_details) {
    const ed = result.electronics_details;
    pushIfReal(chips, 'Type', ed.product_type);
    pushIfReal(chips, 'Brand', ed.brand);
    pushIfReal(chips, 'Model', ed.model);
    if (ed.condition) pushIfReal(chips, 'Condition', ed.condition.charAt(0).toUpperCase() + ed.condition.slice(1));
    pushIfReal(chips, 'Spec', ed.storage_or_spec);
  } else if (result.furniture_details) {
    const fd = result.furniture_details;
    pushIfReal(chips, 'Type', fd.item_type_specific);
    pushIfReal(chips, 'Color', fd.finish_color);
    pushIfReal(chips, 'Material', fd.material);
    if (fd.condition_estimate) {
      const condStr = fd.condition_estimate.replace(/-/g, ' ');
      pushIfReal(chips, 'Condition', condStr.charAt(0).toUpperCase() + condStr.slice(1));
    }
    if (fd.is_likely_ikea && isRealValue(fd.ikea_product_name)) {
      pushIfReal(chips, 'Brand', 'IKEA');
    }
    pushIfReal(chips, 'Room', fd.room_fit);
  } else if (result.household_details) {
    const hd = result.household_details;
    const subcatMap: Record<string, string> = { tools: 'Tools', fitness: 'Fitness', kitchenware: 'Kitchenware', cleaning: 'Cleaning', bathroom: 'Bathroom', decor: 'Decor', garden: 'Garden', storage: 'Storage', lighting: 'Lighting', small_appliance: 'Appliance', other: 'Household' };
    pushIfReal(chips, 'Type', subcatMap[hd.subcategory] ?? hd.subcategory);
    pushIfReal(chips, 'Material', hd.material);
    if (hd.condition) pushIfReal(chips, 'Condition', hd.condition.charAt(0).toUpperCase() + hd.condition.slice(1));
    pushIfReal(chips, 'Brand', hd.brand);
  } else if (result.general_details) {
    const gd = result.general_details;
    if (gd.subcategory) pushIfReal(chips, 'Type', gd.subcategory.charAt(0).toUpperCase() + gd.subcategory.slice(1).replace(/_/g, ' '));
    pushIfReal(chips, 'Color', gd.color);
    pushIfReal(chips, 'Material', gd.material);
    if (gd.condition) pushIfReal(chips, 'Condition', gd.condition.charAt(0).toUpperCase() + gd.condition.slice(1));
    pushIfReal(chips, 'Brand', gd.brand);
  } else if (result.food_details) {
    if (result.food_details.calories > 0) chips.push({ label: 'Calories', value: `${result.food_details.calories}` });
    if (result.food_details.protein_g > 0) chips.push({ label: 'Protein', value: `${result.food_details.protein_g}g` });
    if (result.food_details.carbs_g > 0) chips.push({ label: 'Carbs', value: `${result.food_details.carbs_g}g` });
    if (result.food_details.fat_g > 0) chips.push({ label: 'Fat', value: `${result.food_details.fat_g}g` });
    if (result.food_details.fiber_g > 0) chips.push({ label: 'Fiber', value: `${result.food_details.fiber_g}g` });
    pushIfReal(chips, 'Serving', result.food_details.serving_size);
  } else if (result.grocery_details) {
    pushIfReal(chips, 'Brand', result.grocery_details.brand);
    pushIfReal(chips, 'Size', result.grocery_details.package_size);
  }

  return chips.slice(0, 6);
}

function hasStrongPricingData(result: SmartScanResult): boolean {
  if (result.confidence < 0.65) return false;
  const priceInfo = extractPriceInfo(result);
  return !!(priceInfo.originalPrice || priceInfo.valuePrice);
}

function getInsightText(result: SmartScanResult): { title: string; description: string } {
  const isFood = result.item_type === 'food' || result.item_type === 'grocery';

  if (isFood) {
    const healthSummary = result.food_details?.health_summary ?? result.grocery_details?.nutrition_highlights;
    const quickTip = result.food_details?.quick_tip;
    const cuisineType = result.food_details?.cuisine_type;
    const purpose = result.food_details?.purpose ?? result.grocery_details?.purpose;

    if (healthSummary) {
      return {
        title: healthSummary,
        description: quickTip ?? purpose ?? '',
      };
    }
    if (quickTip) {
      return {
        title: quickTip,
        description: purpose ?? '',
      };
    }
    if (purpose) {
      return {
        title: purpose,
        description: cuisineType ? `Cuisine: ${cuisineType}` : '',
      };
    }
    if (result.short_summary) {
      return { title: result.short_summary, description: '' };
    }
    return {
      title: 'Food item identified with ingredient pairings and recipe ideas.',
      description: '',
    };
  }

  const resaleSuggestion = result.fashion_details?.resale_suggestion
    ?? result.electronics_details?.resale_suggestion
    ?? result.furniture_details?.resale_suggestion
    ?? result.household_details?.resale_suggestion
    ?? result.general_details?.resale_suggestion;

  const valueReasoning = result.fashion_details?.value_reasoning
    ?? result.electronics_details?.value_reasoning
    ?? result.furniture_details?.value_reasoning
    ?? result.household_details?.value_reasoning
    ?? result.general_details?.value_reasoning;

  if (resaleSuggestion) {
    return {
      title: resaleSuggestion,
      description: valueReasoning ?? result.short_summary ?? '',
    };
  }

  if (valueReasoning) {
    return {
      title: valueReasoning,
      description: result.short_summary ?? '',
    };
  }

  if (result.short_summary) {
    return {
      title: result.short_summary,
      description: '',
    };
  }

  const insightItemName = result.item_name ?? 'This item';
  const typeInsights: Record<string, string> = {
    fashion: `${insightItemName} — check brand labels, size tags, and condition details for a more accurate resale estimate.`,
    electronics: `${insightItemName} — scan serial numbers or model stickers for exact specs and market pricing.`,
    furniture: `${insightItemName} — check the underside for brand stamps and measure dimensions for listing.`,
    household: `${insightItemName} — verify brand markings and test functionality for the best resale outcome.`,
    food: 'Food item identified with ingredient pairings and recipe ideas.',
    grocery: 'Grocery product identified with cooking suggestions.',
    general: `${insightItemName} — photograph all sides and any labels for better identification accuracy.`,
  };

  return {
    title: typeInsights[result.item_type] ?? 'Item identified successfully.',
    description: '',
  };
}

function getSubtleTips(result: SmartScanResult): string[] {
  const tips: string[] = [];

  const careTip = result.fashion_details?.care_tip
    ?? result.electronics_details?.care_tip
    ?? result.furniture_details?.care_tip
    ?? result.household_details?.care_tip
    ?? result.general_details?.care_tip;
  if (careTip) tips.push(careTip);

  const budgetInsight = result.fashion_details?.budget_insight
    ?? result.electronics_details?.budget_insight
    ?? result.furniture_details?.budget_insight
    ?? result.household_details?.budget_insight
    ?? result.general_details?.budget_insight
    ?? result.food_details?.budget_insight
    ?? result.grocery_details?.budget_insight;
  if (budgetInsight) tips.push(budgetInsight);

  const practicalTip = result.general_details?.practical_tip;
  if (practicalTip) tips.push(practicalTip);

  const quickTip = result.food_details?.quick_tip;
  if (quickTip) tips.push(quickTip);

  const storageTip = result.food_details?.storage_tip ?? result.grocery_details?.storage_tip;
  if (storageTip) tips.push(storageTip);

  if (tips.length === 0) {
    const itemType = result.item_type;
    const _tipItemName = (result.item_name ?? 'item').toLowerCase();
    if (itemType === 'fashion') {
      tips.push(`Check inside labels and size tags for brand and model info`);
      tips.push(`Photograph sole wear, stitching, and any visible branding`);
      tips.push(`Clean and photograph in natural light for best listing results`);
    } else if (itemType === 'electronics') {
      tips.push(`Look for serial numbers or model stickers on the back or bottom`);
      tips.push(`Check power-on status and screen condition before listing`);
      tips.push(`Include original box and accessories for higher resale value`);
    } else if (itemType === 'furniture') {
      tips.push(`Check the underside for manufacturer stamps or labels`);
      tips.push(`Photograph any scratches, dents, or wear on surfaces`);
      tips.push(`Measure dimensions and include them in your listing`);
    } else if (itemType === 'household') {
      tips.push(`Check the base or back for brand markings and model numbers`);
      tips.push(`Test functionality before listing — buyers expect working items`);
      tips.push(`Clean thoroughly and photograph from multiple angles`);
    } else {
      tips.push(`Look for brand labels, barcodes, or model numbers on the item`);
      tips.push(`Photograph from multiple angles in good lighting`);
      tips.push(`Include close-ups of any identifying marks or unique features`);
    }
  }

  return tips.slice(0, 3);
}

function getFoodSubstitutes(result: SmartScanResult): string[] {
  if (result.food_details?.substitutes?.length) return result.food_details.substitutes;
  if (result.grocery_details?.substitutes?.length) return result.grocery_details.substitutes;
  return [];
}

function getFoodDrinkPairings(result: SmartScanResult): string[] {
  if (result.food_details?.pairs_with_drinks?.length) return result.food_details.pairs_with_drinks;
  return [];
}

function getResaleDisplayPrice(result: SmartScanResult, priceInfo: PriceInfo, isNonResale: boolean): string | null {
  if (isNonResale) return null;
  if (result.confidence < 0.6) return null;
  if (priceInfo.priceRange) return priceInfo.priceRange;
  if (priceInfo.valuePrice && priceInfo.originalPrice) {
    return `${priceInfo.valuePrice} – ${priceInfo.originalPrice}`;
  }
  if (priceInfo.valuePrice) return priceInfo.valuePrice;
  if (priceInfo.originalPrice) return priceInfo.originalPrice;
  return null;
}

interface ScanResultViewProps {
  result: SmartScanResult;
  scannedImageUri: string | null;
  referenceImageUrl: string | null;
  _generatingImage?: boolean;
  resultFade: Animated.Value;
  onScanAgain: () => void;
  onScanGallery?: () => void;
  isLowConfidence?: boolean;
  viewingEntryId: string | null;
  onDelete?: () => void;
}

function SectionHeader({ icon: Icon, title, color }: { icon: React.ComponentType<{ size: number; color: string }>; title: string; color: string }) {
  return (
    <View style={st.sectionHeader}>
      <View style={[st.sectionHeaderIcon, { backgroundColor: `${color}14` }]}>
        <Icon size={14} color={color} />
      </View>
      <Text style={st.sectionHeaderText}>{title}</Text>
    </View>
  );
}

export default function ScanResultView({
  result,
  scannedImageUri,
  referenceImageUrl,
  resultFade,
  onScanAgain,
  viewingEntryId,
  onDelete,
}: ScanResultViewProps) {
  const categoryLabel = useMemo(() => getCategoryLabel(result), [result]);
  const priceInfo = useMemo(() => extractPriceInfo(result), [result]);
  const attributeChips = useMemo(() => getAttributeChips(result), [result]);
  const _hasPricing = useMemo(() => hasStrongPricingData(result), [result]);
  const insightData = useMemo(() => getInsightText(result), [result]);
  const subtleTips = useMemo(() => getSubtleTips(result), [result]);
  const isLowConf = result.confidence < 0.5;
  const isVeryLowConf = result.confidence < 0.35;
  const _isMediumConf = result.confidence >= 0.5 && result.confidence < 0.65;




  const heroImageUri = referenceImageUrl ?? scannedImageUri;
  const hasReferenceImage = !!referenceImageUrl;
  const hasBothImages = !!scannedImageUri && !!referenceImageUrl;
  const isNonResale = result.item_type === 'food' || result.item_type === 'grocery' || result.item_type === 'receipt' || result.item_type === 'document' || result.item_type === 'unknown';
  const isFood = result.item_type === 'food' || result.item_type === 'grocery';


  const resaleDisplayPrice = useMemo(
    () => getResaleDisplayPrice(result, priceInfo, isNonResale),
    [result, priceInfo, isNonResale]
  );

  const demandLevel = useMemo(() => {
    return result.fashion_details?.resale_demand
      ?? result.electronics_details?.resale_demand
      ?? result.furniture_details?.resale_demand
      ?? result.household_details?.resale_potential
      ?? result.general_details?.resale_demand
      ?? null;
  }, [result]);

  const [tipsExpanded, setTipsExpanded] = useState(false);
  const [ingredientsExpanded, setIngredientsExpanded] = useState(isFood);
  const [recipesExpanded, setRecipesExpanded] = useState(isFood);
  const [substitutesExpanded, setSubstitutesExpanded] = useState(false);


  const handleToggleTips = useCallback(() => {
    void Haptics.selectionAsync();
    setTipsExpanded(prev => !prev);
  }, []);

  const handleToggleIngredients = useCallback(() => {
    void Haptics.selectionAsync();
    setIngredientsExpanded(prev => !prev);
  }, []);

  const handleToggleRecipes = useCallback(() => {
    void Haptics.selectionAsync();
    setRecipesExpanded(prev => !prev);
  }, []);

  const handleToggleSubstitutes = useCallback(() => {
    void Haptics.selectionAsync();
    setSubstitutesExpanded(prev => !prev);
  }, []);

  const foodIngredients = useMemo(() => {
    if (result.food_details?.ingredients?.length) return result.food_details.ingredients;
    if (result.grocery_details?.ingredients_list?.length) return result.grocery_details.ingredients_list;
    return [];
  }, [result]);

  const foodIngredientsGoWith = useMemo(() => {
    const items: string[] = [];
    if (result.food_details?.complementary_items?.length) items.push(...result.food_details.complementary_items);
    else if (result.grocery_details?.complementary_items?.length) items.push(...result.grocery_details.complementary_items);
    if (result.grocery_details?.what_else_needed?.length) items.push(...result.grocery_details.what_else_needed);
    return [...new Set(items)].slice(0, 10);
  }, [result]);

  const foodDrinkPairings = useMemo(() => getFoodDrinkPairings(result), [result]);
  const foodSubstitutes = useMemo(() => getFoodSubstitutes(result), [result]);

  const foodRecipes = useMemo(() => {
    if (result.food_details?.recipe_ideas?.length) return result.food_details.recipe_ideas;
    if (result.grocery_details?.recipe_ideas?.length) return result.grocery_details.recipe_ideas;
    return [];
  }, [result]);

  const foodCookingTips = useMemo(() => {
    const tips: string[] = [];
    if (result.food_details?.preparation_tips?.length) tips.push(...result.food_details.preparation_tips);
    else if (result.grocery_details?.preparation_tips?.length) tips.push(...result.grocery_details.preparation_tips);
    if (result.food_details?.storage_tip) tips.push(result.food_details.storage_tip);
    else if (result.grocery_details?.storage_tip) tips.push(result.grocery_details.storage_tip);
    return tips.slice(0, 5);
  }, [result]);



  return (
    <Animated.View style={[st.root, { opacity: resultFade }]}>
      {hasBothImages ? (
        <View style={st.dualImageRow}>
          <View style={st.dualImageWrap}>
            <ExpoImage
              source={{ uri: referenceImageUrl }}
              style={st.dualImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <View style={st.dualImageBadge}>
              <Text style={st.dualImageBadgeText}>AI Enhanced</Text>
            </View>
          </View>
          <View style={st.dualImageWrap}>
            <ExpoImage
              source={{ uri: scannedImageUri }}
              style={st.dualImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <View style={st.dualImageBadge}>
              <Camera size={9} color="#FFFFFF" />
              <Text style={st.dualImageBadgeText}>Your Photo</Text>
            </View>
          </View>
        </View>
      ) : heroImageUri ? (
        <View style={st.heroImageWrap}>
          <ExpoImage
            source={{ uri: heroImageUri }}
            style={st.heroImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          {hasReferenceImage && (
            <View style={st.heroImageBadge}>
              <Text style={st.heroImageBadgeText}>AI Enhanced</Text>
            </View>
          )}
        </View>
      ) : null}

      <View style={st.contentSection}>
        {isLowConf && (
          <View style={st.lowConfCard}>
            <View style={st.lowConfIconRow}>
              <Camera size={18} color="#D97706" />
              <Text style={st.lowConfTitle}>{isVeryLowConf ? 'Could Not Identify' : 'Needs a Clearer Image'}</Text>
            </View>
            <Text style={st.lowConfDesc}>
              {isVeryLowConf
                ? 'We were unable to reliably identify this item. The details below may not be accurate.'
                : 'We couldn\'t identify this item with high accuracy. For better results:'}
            </Text>
            <View style={st.lowConfTipRow}>
              <Text style={st.lowConfBullet}>•</Text>
              <Text style={st.lowConfTip}>Get closer and center the item in the frame</Text>
            </View>
            <View style={st.lowConfTipRow}>
              <Text style={st.lowConfBullet}>•</Text>
              <Text style={st.lowConfTip}>Use good lighting — avoid shadows and glare</Text>
            </View>
            <View style={st.lowConfTipRow}>
              <Text style={st.lowConfBullet}>•</Text>
              <Text style={st.lowConfTip}>Show labels, logos, or brand markings if visible</Text>
            </View>
            <View style={st.lowConfTipRow}>
              <Text style={st.lowConfBullet}>•</Text>
              <Text style={st.lowConfTip}>Capture the full object — avoid extreme close-ups</Text>
            </View>
          </View>
        )}

        <Text style={st.insightItemName}>{result.item_name}</Text>

        <View style={st.metaRow}>
          <Text style={st.categoryText}>{categoryLabel}</Text>

        </View>

        {isFood && result.food_details && (
          <View style={st.calorieHighlight}>
            <Text style={st.calorieNumber}>{result.food_details.calories}</Text>
            <Text style={st.calorieUnit}>CAL</Text>
          </View>
        )}

        {isFood && result.grocery_details && !result.food_details && result.grocery_details.nutrition_highlights && (
          <View style={st.groceryNutritionCard}>
            <Text style={st.groceryNutritionText}>{result.grocery_details.nutrition_highlights}</Text>
          </View>
        )}

        {!isNonResale && !isVeryLowConf && !isLowConf && resaleDisplayPrice && (
          <View style={st.resaleCard}>
            <View style={st.resalePriceRow}>
              <View>
                <Text style={st.resalePrice}>{resaleDisplayPrice}</Text>
                <Text style={st.resaleLabel}>{result.confidence >= 0.75 ? 'Estimated Value' : 'Rough Estimate'}</Text>
              </View>
              {demandLevel && result.confidence >= 0.7 && (
                <View style={st.demandBadge}>
                  <TrendingUp size={12} color="#10B981" />
                  <Text style={st.demandText}>{demandLevel.charAt(0).toUpperCase() + demandLevel.slice(1)} demand</Text>
                </View>
              )}
            </View>
            {priceInfo.originalPrice && priceInfo.valuePrice && priceInfo.originalPrice !== priceInfo.valuePrice && result.confidence >= 0.65 && (
              <View style={st.retailRow}>
                <Text style={st.retailLabel}>{priceInfo.originalLabel}</Text>
                <Text style={st.retailValue}>{priceInfo.originalPrice}</Text>
              </View>
            )}
          </View>
        )}

        <View style={st.insightCard}>
          <View style={st.insightIconWrap}>
            <CheckCircle size={18} color="#059669" />
          </View>
          <View style={st.insightTextWrap}>
            <Text style={st.insightTitle}>{insightData.title}</Text>
            {insightData.description ? (
              <Text style={st.insightDescription}>{insightData.description}</Text>
            ) : null}
          </View>
        </View>

        {attributeChips.length > 0 && !isVeryLowConf && !isLowConf && (
          <View style={st.attributeGrid}>
            {attributeChips.map((chip, i) => (
              <View key={`chip-${i}`} style={st.attributeChip}>
                <Text style={st.attributeChipLabel}>{chip.label}</Text>
                <Text style={st.attributeChipValue} numberOfLines={2}>{chip.value}</Text>
              </View>
            ))}
          </View>
        )}



        {isFood && foodIngredients.length > 0 && (
          <View style={st.collapsibleSection}>
            <Pressable style={st.collapsibleHeaderRow} onPress={handleToggleIngredients}>
              <View style={st.collapsibleHeaderLeft}>
                <Leaf size={14} color="#16A34A" />
                <Text style={st.collapsibleHeaderTitle}>Ingredients</Text>
                <View style={st.foodBadgeCount}>
                  <Text style={st.foodBadgeCountText}>{foodIngredients.length}</Text>
                </View>
              </View>
              <ChevronRight
                size={14}
                color="#AEAEB2"
                style={{ transform: [{ rotate: ingredientsExpanded ? '90deg' : '0deg' }] }}
              />
            </Pressable>
            {ingredientsExpanded && (
              <View style={st.collapsibleContent}>
                {foodIngredients.map((ing, i) => (
                  <View key={`ing-${i}`} style={st.ingredientRow}>
                    <View style={st.ingredientDot} />
                    <Text style={st.bulletText}>{ing}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {isFood && foodIngredientsGoWith.length > 0 && (
          <View style={st.foodPairsSection}>
            <SectionHeader icon={Cherry} title="Ingredients That Go With This" color="#E11D48" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={st.foodPairsScroll}
            >
              {foodIngredientsGoWith.map((item, i) => (
                <View key={`pair-${i}`} style={st.foodPairCard}>
                  <View style={st.foodPairIconWrap}>
                    <UtensilsCrossed size={16} color="#E11D48" />
                  </View>
                  <Text style={st.foodPairText} numberOfLines={2}>{item}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {isFood && foodDrinkPairings.length > 0 && (
          <View style={st.foodPairsSection}>
            <SectionHeader icon={Cherry} title="Pairs Well With" color="#7C3AED" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={st.foodPairsScroll}
            >
              {foodDrinkPairings.map((item, i) => (
                <View key={`drink-${i}`} style={[st.foodPairCard, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
                  <View style={[st.foodPairIconWrap, { backgroundColor: '#EDE9FE' }]}>
                    <Cherry size={16} color="#7C3AED" />
                  </View>
                  <Text style={st.foodPairText} numberOfLines={2}>{item}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {isFood && foodRecipes.length > 0 && (
          <View style={st.collapsibleSection}>
            <Pressable style={st.collapsibleHeaderRow} onPress={handleToggleRecipes}>
              <View style={st.collapsibleHeaderLeft}>
                <CookingPot size={14} color="#EA580C" />
                <Text style={st.collapsibleHeaderTitle}>What You Can Cook</Text>
                <View style={[st.foodBadgeCount, { backgroundColor: '#EA580C14' }]}>
                  <Text style={[st.foodBadgeCountText, { color: '#EA580C' }]}>{foodRecipes.length}</Text>
                </View>
              </View>
              <ChevronRight
                size={14}
                color="#AEAEB2"
                style={{ transform: [{ rotate: recipesExpanded ? '90deg' : '0deg' }] }}
              />
            </Pressable>
            {recipesExpanded && (
              <View style={st.collapsibleContent}>
                {foodRecipes.map((recipe, i) => {
                  const diffColor = recipe.difficulty === 'easy' ? '#16A34A' : recipe.difficulty === 'medium' ? '#D97706' : '#DC2626';
                  const diffBg = recipe.difficulty === 'easy' ? '#16A34A14' : recipe.difficulty === 'medium' ? '#D9770614' : '#DC262614';
                  return (
                    <View key={`recipe-${i}`} style={st.recipeCard}>
                      <View style={st.recipeHeader}>
                        <Text style={st.recipeName}>{recipe.name}</Text>
                        <View style={[st.recipeDiffBadge, { backgroundColor: diffBg }]}>
                          <Text style={[st.recipeDiffText, { color: diffColor }]}>
                            {recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)}
                          </Text>
                        </View>
                      </View>
                      <Text style={st.recipeDesc}>{recipe.description}</Text>
                      <Text style={st.recipeTime}>{recipe.prep_time}</Text>
                      {recipe.key_ingredients.length > 0 && (
                        <View style={st.recipeIngRow}>
                          {recipe.key_ingredients.map((ing, j) => (
                            <View key={`ring-${j}`} style={st.recipeIngChip}>
                              <Text style={st.recipeIngText}>{ing}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {isFood && foodSubstitutes.length > 0 && (
          <View style={st.collapsibleSection}>
            <Pressable style={st.collapsibleHeaderRow} onPress={handleToggleSubstitutes}>
              <View style={st.collapsibleHeaderLeft}>
                <Package size={14} color="#0D9488" />
                <Text style={st.collapsibleHeaderTitle}>Substitutes</Text>
                <View style={[st.foodBadgeCount, { backgroundColor: '#0D948814' }]}>
                  <Text style={[st.foodBadgeCountText, { color: '#0D9488' }]}>{foodSubstitutes.length}</Text>
                </View>
              </View>
              <ChevronRight
                size={14}
                color="#AEAEB2"
                style={{ transform: [{ rotate: substitutesExpanded ? '90deg' : '0deg' }] }}
              />
            </Pressable>
            {substitutesExpanded && (
              <View style={st.collapsibleContent}>
                {foodSubstitutes.map((sub, i) => (
                  <View key={`sub-${i}`} style={st.ingredientRow}>
                    <View style={[st.ingredientDot, { backgroundColor: '#0D9488' }]} />
                    <Text style={st.bulletText}>{sub}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <Pressable
          style={({ pressed }) => [st.scanAnotherBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          onPress={onScanAgain}
          testID="scan-another-btn"
        >
          <Camera size={18} color={ScannerColors.accent} />
          <Text style={st.scanAnotherText}>Scan Another</Text>
        </Pressable>

        {(isFood && foodCookingTips.length > 0 ? foodCookingTips : subtleTips).length > 0 && (
          <View style={st.collapsibleSection}>
            <Pressable style={st.collapsibleHeaderRow} onPress={handleToggleTips}>
              <View style={st.collapsibleHeaderLeft}>
                <Lightbulb size={14} color="#F59E0B" />
                <Text style={st.collapsibleHeaderTitle}>{isFood ? 'Cooking & Storage Tips' : 'Tips'}</Text>
              </View>
              <ChevronRight
                size={14}
                color="#AEAEB2"
                style={{ transform: [{ rotate: tipsExpanded ? '90deg' : '0deg' }] }}
              />
            </Pressable>
            {tipsExpanded && (
              <View style={st.collapsibleContent}>
                {(isFood && foodCookingTips.length > 0 ? foodCookingTips : subtleTips).map((tip, i) => (
                  <View key={`tip-${i}`} style={st.bulletRow}>
                    <Text style={st.bulletChar}>→</Text>
                    <Text style={st.bulletText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {onDelete && viewingEntryId && (
          <Pressable
            style={({ pressed }) => [st.deleteBtn, pressed && { opacity: 0.7 }]}
            onPress={onDelete}
            testID="delete-scan-result"
          >
            <Trash2 size={13} color="#EF4444" />
            <Text style={st.deleteText}>Delete This Scan</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  root: {
    flex: 1,
  },
  heroImageWrap: {
    width: '100%',
    height: 300,
    backgroundColor: '#F0F0F0',
    borderRadius: ScannerRadius.xxl,
    overflow: 'hidden',
    marginBottom: ScannerSpacing.lg,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImageBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ScannerRadius.sm,
  },
  heroImageBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  contentSection: {
    paddingBottom: 20,
  },
  insightItemName: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: ScannerSpacing.lg,
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: ScannerRadius.sm,
    borderWidth: 1,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confidenceBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  calorieHighlight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    marginBottom: ScannerSpacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: ScannerRadius.lg,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  calorieNumber: {
    fontSize: 42,
    fontWeight: '900' as const,
    color: '#1C1C1E',
    letterSpacing: -1,
  },
  calorieUnit: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#8E8E93',
    letterSpacing: 2,
  },
  resaleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: ScannerRadius.lg,
    paddingHorizontal: ScannerSpacing.lg,
    paddingVertical: 16,
    marginBottom: ScannerSpacing.lg,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  resalePriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  resalePrice: {
    fontSize: 28,
    fontWeight: '900' as const,
    color: '#1C1C1E',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  resaleLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  demandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B98114',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: ScannerRadius.sm,
  },
  demandText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#10B981',
  },
  retailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  retailLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  retailValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#3C3C43',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: ScannerRadius.lg,
    padding: 14,
    marginBottom: ScannerSpacing.lg,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  insightIconWrap: {
    marginTop: 1,
  },
  insightTextWrap: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#166534',
    lineHeight: 20,
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#4B5563',
    lineHeight: 19,
  },
  attributeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: ScannerSpacing.lg,
  },
  attributeChip: {
    width: '31%' as unknown as number,
    flexGrow: 1,
    flexBasis: '30%' as unknown as number,
    backgroundColor: '#FFFFFF',
    borderRadius: ScannerRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  attributeChipLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#8E8E93',
    marginBottom: 3,
  },
  attributeChipValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    lineHeight: 17,
  },
  soldSection: {
    marginBottom: ScannerSpacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderIcon: {
    width: 26,
    height: 26,
    borderRadius: ScannerRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  soldScroll: {
    gap: 10,
  },
  soldCard: {
    width: 150,
    borderRadius: ScannerRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#F5F5F7',
  },
  soldCardImageWrap: {
    width: '100%',
    height: 110,
    position: 'relative',
  },
  soldCardImage: {
    width: '100%',
    height: '100%',
  },
  soldCardImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E5EA',
  },
  soldCardPriceBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  soldCardPriceText: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
  soldCardBottomRow: {
    position: 'absolute',
    bottom: 6,
    left: 8,
  },
  soldCardTimeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  soldCardFooter: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  soldCardLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  collapsibleSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: ScannerRadius.lg,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: ScannerSpacing.sm,
    overflow: 'hidden',
  },
  collapsibleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ScannerSpacing.lg,
    paddingVertical: 14,
  },
  collapsibleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapsibleHeaderTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  collapsibleContent: {
    paddingHorizontal: ScannerSpacing.lg,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
    gap: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 2,
  },
  bulletChar: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#AEAEB2',
    width: 16,
  },
  bulletText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#3C3C43',
    flex: 1,
    lineHeight: 19,
  },
  scanAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: ScannerRadius.xl,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: ScannerColors.accent,
    marginTop: ScannerSpacing.md,
    marginBottom: ScannerSpacing.md,
    shadowColor: ScannerColors.accent,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  scanAnotherText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: ScannerColors.accent,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 2,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
  foodBadgeCount: {
    backgroundColor: '#16A34A14',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: ScannerRadius.sm,
    marginLeft: 2,
  },
  foodBadgeCountText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#16A34A',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  foodPairsSection: {
    marginBottom: ScannerSpacing.lg,
  },
  foodPairsScroll: {
    gap: 10,
  },
  foodPairCard: {
    width: 120,
    backgroundColor: '#FFF1F2',
    borderRadius: ScannerRadius.lg,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  foodPairIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodPairText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    textAlign: 'center' as const,
    lineHeight: 16,
  },
  groceryNutritionCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: ScannerRadius.lg,
    padding: 14,
    marginBottom: ScannerSpacing.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  groceryNutritionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#166534',
    lineHeight: 20,
    textAlign: 'center' as const,
  },
  recipeCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: ScannerRadius.lg,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  recipeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recipeName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    flex: 1,
    marginRight: 8,
  },
  recipeDiffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recipeDiffText: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  recipeDesc: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#6B7280',
    lineHeight: 17,
    marginBottom: 6,
  },
  recipeTime: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#8E8E93',
    marginBottom: 6,
  },
  recipeIngRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  recipeIngChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  recipeIngText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  lowConfCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: ScannerRadius.lg,
    padding: 16,
    marginBottom: ScannerSpacing.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  lowConfIconRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 10,
  },
  lowConfTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#92400E',
  },
  lowConfDesc: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#78716C',
    lineHeight: 19,
    marginBottom: 10,
  },
  lowConfTipRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 6,
    paddingVertical: 2,
  },
  lowConfBullet: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#D97706',
    width: 12,
  },
  lowConfTip: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#78716C',
    flex: 1,
    lineHeight: 19,
  },
  dualImageRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: ScannerSpacing.lg,
  },
  dualImageWrap: {
    flex: 1,
    height: 220,
    borderRadius: ScannerRadius.xxl,
    overflow: 'hidden' as const,
    backgroundColor: '#F0F0F0',
    position: 'relative' as const,
  },
  dualImage: {
    width: '100%' as const,
    height: '100%' as const,
  },
  dualImageBadge: {
    position: 'absolute' as const,
    bottom: 8,
    left: 8,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ScannerRadius.sm,
  },
  dualImageBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
