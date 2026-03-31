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
  Lightbulb,
  ChevronDown,
  Package,
  Trash2,
  Wrench,
  Clock,
  Users,
  Ruler,
  Shield,
  Home,
  Sofa,
  Heart,
  Star,
  AlertTriangle,
  Hammer,
  Drill,
  Gauge,
  DollarSign,
  ShoppingBag,
  Leaf,
  UtensilsCrossed,
  CookingPot,
  Cherry,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import type { SmartScanResult } from '@/services/smartScanService';
import { ScannerColors, ScannerRadius, ScannerSpacing } from '@/constants/scannerTheme';

const JUNK_VALUES = ['unknown', 'n/a', 'none', 'mixed', 'various', 'unbranded', 'generic', 'other', 'item', 'personal', 'general use', 'standard', 'typical', 'regular', 'basic', 'normal', 'not available', 'not applicable', 'unspecified', 'undetermined', 'general', 'commodity', 'average', 'fair', 'common', 'null', 'undefined', 'mixed materials', 'various materials', 'multiple', 'assorted', 'miscellaneous', 'misc', 'similar items in this category', 'similar devices in this category', 'similar household items', 'similar furniture items in this style', 'estimated based on visual category match', 'estimated from visual category', 'estimated from item category', 'estimated based on product category'];

function isRealValue(val: string | null | undefined): val is string {
  if (!val || val.trim().length === 0) return false;
  return !JUNK_VALUES.includes(val.trim().toLowerCase());
}

function getIkeaPrice(result: SmartScanResult): string | null {
  if (result.furniture_details) {
    return result.furniture_details.estimated_retail_price
      ?? result.furniture_details.estimated_price_range
      ?? null;
  }
  if (result.household_details) return result.household_details.estimated_price ?? result.household_details.price_range ?? null;
  if (result.fashion_details) return result.fashion_details.estimated_retail_price ?? result.fashion_details.price_range ?? null;
  if (result.electronics_details) return result.electronics_details.estimated_retail_price ?? result.electronics_details.price_range ?? null;
  if (result.general_details) return result.general_details.estimated_retail_price ?? result.general_details.price_range ?? null;
  if (result.food_details) return result.food_details.estimated_price ?? result.food_details.price_range ?? null;
  if (result.grocery_details) return result.grocery_details.estimated_price ?? result.grocery_details.price_range ?? null;
  return null;
}

function formatPrice(val: string | null): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (trimmed.length === 0) return null;
  return trimmed.startsWith('$') ? trimmed : `$${trimmed}`;
}

function getCategoryLabel(result: SmartScanResult): string {
  if (result.furniture_details) {
    if (result.furniture_details.is_likely_ikea && isRealValue(result.furniture_details.ikea_category)) {
      return result.furniture_details.ikea_category!;
    }
    return result.furniture_details.item_type_specific ?? 'Furniture';
  }
  if (result.household_details) {
    const map: Record<string, string> = { tools: 'Tools', fitness: 'Fitness', kitchenware: 'Kitchenware', cleaning: 'Cleaning', bathroom: 'Bathroom', decor: 'Decor', garden: 'Garden', storage: 'Storage', lighting: 'Lighting', small_appliance: 'Appliance', other: 'Household' };
    return map[result.household_details.subcategory] ?? 'Household';
  }
  if (result.fashion_details) {
    const map: Record<string, string> = { shoes: 'Shoes', clothing: 'Clothing', outerwear: 'Outerwear', accessories: 'Accessories', bags: 'Bags', jewelry: 'Jewelry', activewear: 'Activewear', other: 'Fashion' };
    return map[result.fashion_details.subcategory] ?? 'Fashion';
  }
  if (result.electronics_details) return result.electronics_details.product_type ?? 'Electronics';
  if (result.food_details) return 'Food';
  if (result.grocery_details) return 'Grocery';
  if (result.general_details) {
    const sub = result.general_details.subcategory;
    return sub ? sub.charAt(0).toUpperCase() + sub.slice(1).replace(/_/g, ' ') : 'General';
  }
  return result.category ?? 'Item';
}

function getDescription(result: SmartScanResult): string {
  if (result.short_summary) return result.short_summary;
  if (result.furniture_details?.assembly_summary) return result.furniture_details.assembly_summary;
  if (result.household_details?.item_description) return result.household_details.item_description;
  if (result.general_details?.item_description) return result.general_details.item_description;
  if (result.fashion_details?.item_description) return result.fashion_details.item_description;
  return '';
}

interface SpecItem { label: string; value: string }

function getSpecs(result: SmartScanResult): SpecItem[] {
  const specs: SpecItem[] = [];
  const push = (label: string, value: string | null | undefined) => {
    if (isRealValue(value)) specs.push({ label, value: value! });
  };

  if (result.furniture_details) {
    const fd = result.furniture_details;
    push('Color', fd.finish_color);
    push('Material', fd.material);
    push('Dimensions', fd.estimated_dimensions);
    push('Style', fd.style);
    if (fd.is_likely_ikea) {
      push('IKEA Name', fd.ikea_product_name);
      push('Article #', fd.ikea_article_number);
      push('Family', fd.ikea_product_family);
    }
  } else if (result.household_details) {
    const hd = result.household_details;
    push('Material', hd.material);
    push('Brand', hd.brand);
    push('Model', hd.model);
    if (hd.condition) push('Condition', hd.condition.charAt(0).toUpperCase() + hd.condition.slice(1));
  } else if (result.fashion_details) {
    const fd = result.fashion_details;
    push('Color', fd.color);
    push('Material', fd.material);
    push('Brand', fd.brand);
    push('Model', fd.model);
    if (fd.condition) push('Condition', fd.condition.charAt(0).toUpperCase() + fd.condition.slice(1));
  } else if (result.electronics_details) {
    const ed = result.electronics_details;
    push('Brand', ed.brand);
    push('Model', ed.model);
    push('Spec', ed.storage_or_spec);
    if (ed.condition) push('Condition', ed.condition.charAt(0).toUpperCase() + ed.condition.slice(1));
  } else if (result.general_details) {
    const gd = result.general_details;
    push('Color', gd.color);
    push('Material', gd.material);
    push('Brand', gd.brand);
  } else if (result.food_details) {
    if (result.food_details.calories > 0) specs.push({ label: 'Calories', value: `${result.food_details.calories}` });
    if (result.food_details.protein_g > 0) specs.push({ label: 'Protein', value: `${result.food_details.protein_g}g` });
    push('Serving', result.food_details.serving_size);
  } else if (result.grocery_details) {
    push('Brand', result.grocery_details.brand);
    push('Size', result.grocery_details.package_size);
  }

  return specs.slice(0, 6);
}

function getToolsNeeded(result: SmartScanResult): string[] {
  if (result.furniture_details?.likely_tools_needed?.length) {
    return result.furniture_details.likely_tools_needed;
  }
  return [];
}

interface AssemblyInfo {
  difficulty: string | null;
  time: string | null;
  people: string | null;
  wallAnchor: string | null;
  setupNotes: string | null;
  summary: string | null;
}

function getAssemblyInfo(result: SmartScanResult): AssemblyInfo | null {
  if (!result.furniture_details) return null;
  const fd = result.furniture_details;
  if (!fd.assembly_required && !fd.assembly_difficulty && !fd.estimated_build_time) return null;
  return {
    difficulty: fd.assembly_difficulty ? fd.assembly_difficulty.charAt(0).toUpperCase() + fd.assembly_difficulty.slice(1) : null,
    time: fd.estimated_build_time ?? null,
    people: fd.people_needed ?? null,
    wallAnchor: fd.wall_anchor_note ?? null,
    setupNotes: fd.setup_notes ?? null,
    summary: fd.assembly_summary ?? null,
  };
}

function getMatchingProducts(result: SmartScanResult): string[] {
  if (result.furniture_details?.matching_products?.length) return result.furniture_details.matching_products;
  const complementary = result.furniture_details?.complementary_items
    ?? result.household_details?.complementary_items
    ?? result.electronics_details?.complementary_items
    ?? result.fashion_details?.complementary_items
    ?? result.general_details?.complementary_items
    ?? [];
  return complementary;
}

function getRoomFitLabels(result: SmartScanResult): string[] {
  if (result.furniture_details?.room_fit_labels?.length) return result.furniture_details.room_fit_labels;
  const purpose = result.furniture_details?.purpose ?? result.household_details?.purpose ?? result.general_details?.purpose ?? null;
  if (purpose) return [purpose];
  return [];
}

function getValueInsight(result: SmartScanResult): { label: string; text: string } | null {
  const vi = result.furniture_details?.value_insight
    ?? result.household_details?.value_insight
    ?? result.electronics_details?.value_insight
    ?? result.fashion_details?.value_insight
    ?? result.general_details?.value_insight
    ?? result.food_details?.value_insight
    ?? result.grocery_details?.value_insight;

  const longTerm = result.furniture_details?.long_term_value;
  const worthIt = result.furniture_details?.worth_it_verdict;
  const budgetInsight = result.furniture_details?.budget_insight
    ?? result.household_details?.budget_insight
    ?? result.electronics_details?.budget_insight
    ?? result.fashion_details?.budget_insight
    ?? result.general_details?.budget_insight
    ?? result.food_details?.budget_insight
    ?? result.grocery_details?.budget_insight;

  if (vi) return { label: 'Value Insight', text: vi };
  if (worthIt) return { label: 'Worth It?', text: worthIt };
  if (longTerm) return { label: 'Long-Term Value', text: longTerm };
  if (budgetInsight) return { label: 'Budget Insight', text: budgetInsight };
  return null;
}

function getCareTip(result: SmartScanResult): string | null {
  return result.furniture_details?.care_tip
    ?? result.household_details?.care_tip
    ?? result.electronics_details?.care_tip
    ?? result.fashion_details?.care_tip
    ?? result.general_details?.care_tip
    ?? null;
}

function getFoodIngredients(result: SmartScanResult): string[] {
  if (result.food_details?.ingredients?.length) return result.food_details.ingredients;
  if (result.grocery_details?.ingredients_list?.length) return result.grocery_details.ingredients_list;
  return [];
}

function getFoodGoWith(result: SmartScanResult): string[] {
  const items: string[] = [];
  if (result.food_details?.complementary_items?.length) items.push(...result.food_details.complementary_items);
  else if (result.grocery_details?.complementary_items?.length) items.push(...result.grocery_details.complementary_items);
  if (result.grocery_details?.what_else_needed?.length) items.push(...result.grocery_details.what_else_needed);
  return [...new Set(items)].slice(0, 10);
}

function getFoodRecipes(result: SmartScanResult) {
  if (result.food_details?.recipe_ideas?.length) return result.food_details.recipe_ideas;
  if (result.grocery_details?.recipe_ideas?.length) return result.grocery_details.recipe_ideas;
  return [];
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

const TOOL_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  'allen key': Wrench,
  'hex key': Wrench,
  'screwdriver': Wrench,
  'phillips screwdriver': Wrench,
  'flathead screwdriver': Wrench,
  'hammer': Hammer,
  'drill': Drill,
  'measuring tape': Ruler,
  'level': Gauge,
  'tape measure': Ruler,
};

function getToolIcon(tool: string): React.ComponentType<{ size: number; color: string }> {
  const lower = tool.toLowerCase();
  for (const [key, Icon] of Object.entries(TOOL_ICONS)) {
    if (lower.includes(key)) return Icon;
  }
  return Wrench;
}

const ROOM_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  'apartment': Home,
  'dorm': Home,
  'office': Sofa,
  'kids': Heart,
  'studio': Home,
  'family': Users,
  'bedroom': Home,
  'living': Sofa,
  'kitchen': UtensilsCrossed,
  'bathroom': Home,
  'small': Home,
};

function getRoomIcon(label: string): React.ComponentType<{ size: number; color: string }> {
  const lower = label.toLowerCase();
  for (const [key, Icon] of Object.entries(ROOM_ICONS)) {
    if (lower.includes(key)) return Icon;
  }
  return Home;
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
  const description = useMemo(() => getDescription(result), [result]);
  const price = useMemo(() => formatPrice(getIkeaPrice(result)), [result]);
  const specs = useMemo(() => getSpecs(result), [result]);
  const tools = useMemo(() => getToolsNeeded(result), [result]);
  const assembly = useMemo(() => getAssemblyInfo(result), [result]);
  const matchingProducts = useMemo(() => getMatchingProducts(result), [result]);
  const roomFitLabels = useMemo(() => getRoomFitLabels(result), [result]);
  const valueInsight = useMemo(() => getValueInsight(result), [result]);
  const careTip = useMemo(() => getCareTip(result), [result]);

  const isLowConf = result.confidence < 0.5;
  const isVeryLowConf = result.confidence < 0.35;
  const isFood = result.item_type === 'food' || result.item_type === 'grocery';
  const _isFurniture = result.item_type === 'furniture';
  const isIkea = result.furniture_details?.is_likely_ikea ?? false;

  const heroImageUri = referenceImageUrl ?? scannedImageUri;
  const hasBothImages = !!scannedImageUri && !!referenceImageUrl;

  const foodIngredients = useMemo(() => getFoodIngredients(result), [result]);
  const foodGoWith = useMemo(() => getFoodGoWith(result), [result]);
  const foodRecipes = useMemo(() => getFoodRecipes(result), [result]);

  const [toolsExpanded, setToolsExpanded] = useState(true);
  const [assemblyExpanded, setAssemblyExpanded] = useState(true);
  const [matchesExpanded, setMatchesExpanded] = useState(true);
  const [ingredientsExpanded, setIngredientsExpanded] = useState(isFood);
  const [recipesExpanded, setRecipesExpanded] = useState(isFood);

  const toggleSection = useCallback((setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    void Haptics.selectionAsync();
    setter(prev => !prev);
  }, []);

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
            <View style={st.imageBadge}>
              <Text style={st.imageBadgeText}>AI Enhanced</Text>
            </View>
          </View>
          <View style={st.dualImageWrap}>
            <ExpoImage
              source={{ uri: scannedImageUri }}
              style={st.dualImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <View style={st.imageBadge}>
              <Camera size={9} color="#FFFFFF" />
              <Text style={st.imageBadgeText}>Your Photo</Text>
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
        </View>
      ) : null}

      <View style={st.contentSection}>
        {isLowConf && (
          <View style={st.lowConfCard}>
            <View style={st.lowConfIconRow}>
              <AlertTriangle size={18} color="#D97706" />
              <Text style={st.lowConfTitle}>{isVeryLowConf ? 'Could Not Identify' : 'Needs a Clearer Image'}</Text>
            </View>
            <Text style={st.lowConfDesc}>
              {isVeryLowConf
                ? 'We were unable to reliably identify this item. Try scanning the yellow price tag or article number label.'
                : 'For better results, scan the IKEA price tag, shelf label, or article number directly.'}
            </Text>
          </View>
        )}

        {isIkea && (
          <View style={st.ikeaBadgeRow}>
            <View style={st.ikeaBadge}>
              <Sofa size={12} color="#0058A3" />
              <Text style={st.ikeaBadgeText}>IKEA Product</Text>
            </View>
            {result.furniture_details?.ikea_match_confidence && (
              <View style={st.confidencePill}>
                <Text style={st.confidencePillText}>
                  {result.furniture_details.ikea_match_confidence === 'exact' ? 'Exact Match' :
                   result.furniture_details.ikea_match_confidence === 'strong' ? 'Strong Match' :
                   'Possible Match'}
                </Text>
              </View>
            )}
          </View>
        )}

        <Text style={st.itemName}>{result.item_name}</Text>

        <View style={st.metaRow}>
          <Text style={st.categoryText}>{categoryLabel}</Text>
          {price && (
            <View style={st.priceBadge}>
              <DollarSign size={12} color="#0058A3" />
              <Text style={st.priceText}>{price}</Text>
            </View>
          )}
        </View>

        {description.length > 0 && !isVeryLowConf && (
          <View style={st.descriptionCard}>
            <Text style={st.descriptionText}>{description}</Text>
          </View>
        )}

        {specs.length > 0 && !isVeryLowConf && (
          <View style={st.specsGrid}>
            {specs.map((spec, i) => (
              <View key={`spec-${i}`} style={st.specChip}>
                <Text style={st.specLabel}>{spec.label}</Text>
                <Text style={st.specValue} numberOfLines={2}>{spec.value}</Text>
              </View>
            ))}
          </View>
        )}

        {tools.length > 0 && (
          <View style={st.sectionCard}>
            <Pressable style={st.sectionHeader} onPress={() => toggleSection(setToolsExpanded)}>
              <View style={[st.sectionIconWrap, { backgroundColor: ScannerColors.toolsBg }]}>
                <Wrench size={16} color="#0058A3" />
              </View>
              <Text style={st.sectionTitle}>Tools You'll Need</Text>
              <ChevronDown
                size={16}
                color="#AEAEB2"
                style={{ transform: [{ rotate: toolsExpanded ? '0deg' : '-90deg' }] }}
              />
            </Pressable>
            {toolsExpanded && (
              <View style={st.sectionContent}>
                {tools.map((tool, i) => {
                  const ToolIcon = getToolIcon(tool);
                  return (
                    <View key={`tool-${i}`} style={st.toolRow}>
                      <View style={st.toolIconWrap}>
                        <ToolIcon size={14} color="#0058A3" />
                      </View>
                      <Text style={st.toolText}>{tool}</Text>
                    </View>
                  );
                })}
                {assembly?.people && assembly.people !== '1' && (
                  <View style={st.toolRow}>
                    <View style={[st.toolIconWrap, { backgroundColor: '#FEF3C7' }]}>
                      <Users size={14} color="#D97706" />
                    </View>
                    <Text style={[st.toolText, { color: '#92400E' }]}>
                      {assembly.people === '2+' ? '2+ people recommended' : '2 people recommended'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {assembly && (
          <View style={[st.sectionCard, { borderColor: ScannerColors.assemblyBorder }]}>
            <Pressable style={st.sectionHeader} onPress={() => toggleSection(setAssemblyExpanded)}>
              <View style={[st.sectionIconWrap, { backgroundColor: ScannerColors.assemblyBg }]}>
                <Clock size={16} color="#D97706" />
              </View>
              <Text style={st.sectionTitle}>Assembly Info</Text>
              <ChevronDown
                size={16}
                color="#AEAEB2"
                style={{ transform: [{ rotate: assemblyExpanded ? '0deg' : '-90deg' }] }}
              />
            </Pressable>
            {assemblyExpanded && (
              <View style={st.sectionContent}>
                <View style={st.assemblyGrid}>
                  {assembly.difficulty && (
                    <View style={st.assemblyItem}>
                      <Gauge size={16} color={
                        assembly.difficulty.toLowerCase() === 'easy' ? '#16A34A' :
                        assembly.difficulty.toLowerCase() === 'moderate' ? '#D97706' : '#DC2626'
                      } />
                      <Text style={st.assemblyLabel}>Difficulty</Text>
                      <Text style={[st.assemblyValue, {
                        color: assembly.difficulty.toLowerCase() === 'easy' ? '#16A34A' :
                        assembly.difficulty.toLowerCase() === 'moderate' ? '#D97706' : '#DC2626'
                      }]}>{assembly.difficulty}</Text>
                    </View>
                  )}
                  {assembly.time && (
                    <View style={st.assemblyItem}>
                      <Clock size={16} color="#0058A3" />
                      <Text style={st.assemblyLabel}>Est. Time</Text>
                      <Text style={st.assemblyValue}>{assembly.time}</Text>
                    </View>
                  )}
                  {assembly.people && (
                    <View style={st.assemblyItem}>
                      <Users size={16} color="#7C3AED" />
                      <Text style={st.assemblyLabel}>People</Text>
                      <Text style={st.assemblyValue}>{assembly.people === '1' ? '1 person' : `${assembly.people} people`}</Text>
                    </View>
                  )}
                </View>
                {assembly.wallAnchor && (
                  <View style={st.wallAnchorCard}>
                    <Shield size={14} color="#DC2626" />
                    <Text style={st.wallAnchorText}>{assembly.wallAnchor}</Text>
                  </View>
                )}
                {assembly.setupNotes && (
                  <View style={st.noteRow}>
                    <Lightbulb size={13} color="#D97706" />
                    <Text style={st.noteText}>{assembly.setupNotes}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {matchingProducts.length > 0 && !isVeryLowConf && (
          <View style={[st.sectionCard, { borderColor: ScannerColors.matchesBorder }]}>
            <Pressable style={st.sectionHeader} onPress={() => toggleSection(setMatchesExpanded)}>
              <View style={[st.sectionIconWrap, { backgroundColor: ScannerColors.matchesBg }]}>
                <ShoppingBag size={16} color="#059669" />
              </View>
              <Text style={st.sectionTitle}>What Goes With This</Text>
              <ChevronDown
                size={16}
                color="#AEAEB2"
                style={{ transform: [{ rotate: matchesExpanded ? '0deg' : '-90deg' }] }}
              />
            </Pressable>
            {matchesExpanded && (
              <View style={st.sectionContent}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.matchScroll}>
                  {matchingProducts.map((product, i) => (
                    <View key={`match-${i}`} style={st.matchCard}>
                      <View style={st.matchIconWrap}>
                        <Package size={16} color="#059669" />
                      </View>
                      <Text style={st.matchText} numberOfLines={2}>{product}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {roomFitLabels.length > 0 && !isVeryLowConf && (
          <View style={[st.sectionCard, { borderColor: ScannerColors.goodForBorder }]}>
            <View style={st.sectionHeader}>
              <View style={[st.sectionIconWrap, { backgroundColor: ScannerColors.goodForBg }]}>
                <Home size={16} color="#7C3AED" />
              </View>
              <Text style={st.sectionTitle}>Good For</Text>
            </View>
            <View style={st.goodForWrap}>
              {roomFitLabels.map((label, i) => {
                const RIcon = getRoomIcon(label);
                return (
                  <View key={`room-${i}`} style={st.goodForChip}>
                    <RIcon size={13} color="#7C3AED" />
                    <Text style={st.goodForText}>{label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {valueInsight && !isVeryLowConf && (
          <View style={[st.sectionCard, { borderColor: ScannerColors.valueBorder }]}>
            <View style={st.sectionHeader}>
              <View style={[st.sectionIconWrap, { backgroundColor: ScannerColors.valueBg }]}>
                <Star size={16} color="#D97706" />
              </View>
              <Text style={st.sectionTitle}>{valueInsight.label}</Text>
            </View>
            <View style={st.valueContent}>
              <Text style={st.valueText}>{valueInsight.text}</Text>
            </View>
          </View>
        )}

        {careTip && !isVeryLowConf && !isFood && (
          <View style={st.tipCard}>
            <Lightbulb size={14} color="#F59E0B" />
            <Text style={st.tipText}>{careTip}</Text>
          </View>
        )}

        {isFood && foodIngredients.length > 0 && (
          <View style={st.sectionCard}>
            <Pressable style={st.sectionHeader} onPress={() => toggleSection(setIngredientsExpanded)}>
              <View style={[st.sectionIconWrap, { backgroundColor: '#F0FDF4' }]}>
                <Leaf size={16} color="#16A34A" />
              </View>
              <Text style={st.sectionTitle}>Ingredients</Text>
              <View style={st.countBadge}>
                <Text style={st.countBadgeText}>{foodIngredients.length}</Text>
              </View>
              <ChevronDown
                size={16}
                color="#AEAEB2"
                style={{ transform: [{ rotate: ingredientsExpanded ? '0deg' : '-90deg' }] }}
              />
            </Pressable>
            {ingredientsExpanded && (
              <View style={st.sectionContent}>
                {foodIngredients.map((ing, i) => (
                  <View key={`ing-${i}`} style={st.bulletRow}>
                    <View style={[st.bulletDot, { backgroundColor: '#16A34A' }]} />
                    <Text style={st.bulletText}>{ing}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {isFood && foodGoWith.length > 0 && (
          <View style={[st.sectionCard, { borderColor: '#FECDD3' }]}>
            <View style={st.sectionHeader}>
              <View style={[st.sectionIconWrap, { backgroundColor: '#FFF1F2' }]}>
                <Cherry size={16} color="#E11D48" />
              </View>
              <Text style={st.sectionTitle}>Goes Well With</Text>
            </View>
            <View style={st.sectionContent}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.matchScroll}>
                {foodGoWith.map((item, i) => (
                  <View key={`pair-${i}`} style={[st.matchCard, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}>
                    <View style={[st.matchIconWrap, { backgroundColor: '#FFFFFF' }]}>
                      <UtensilsCrossed size={14} color="#E11D48" />
                    </View>
                    <Text style={st.matchText} numberOfLines={2}>{item}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {isFood && foodRecipes.length > 0 && (
          <View style={st.sectionCard}>
            <Pressable style={st.sectionHeader} onPress={() => toggleSection(setRecipesExpanded)}>
              <View style={[st.sectionIconWrap, { backgroundColor: '#FFFBEB' }]}>
                <CookingPot size={16} color="#EA580C" />
              </View>
              <Text style={st.sectionTitle}>Recipes</Text>
              <View style={[st.countBadge, { backgroundColor: '#EA580C14' }]}>
                <Text style={[st.countBadgeText, { color: '#EA580C' }]}>{foodRecipes.length}</Text>
              </View>
              <ChevronDown
                size={16}
                color="#AEAEB2"
                style={{ transform: [{ rotate: recipesExpanded ? '0deg' : '-90deg' }] }}
              />
            </Pressable>
            {recipesExpanded && (
              <View style={st.sectionContent}>
                {foodRecipes.map((recipe, i) => {
                  const diffColor = recipe.difficulty === 'easy' ? '#16A34A' : recipe.difficulty === 'medium' ? '#D97706' : '#DC2626';
                  return (
                    <View key={`recipe-${i}`} style={st.recipeCard}>
                      <View style={st.recipeHeaderRow}>
                        <Text style={st.recipeName}>{recipe.name}</Text>
                        <View style={[st.recipeDiffBadge, { backgroundColor: `${diffColor}14` }]}>
                          <Text style={[st.recipeDiffText, { color: diffColor }]}>
                            {recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)}
                          </Text>
                        </View>
                      </View>
                      <Text style={st.recipeDesc}>{recipe.description}</Text>
                      <Text style={st.recipeTime}>{recipe.prep_time}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <Pressable
          style={({ pressed }) => [st.scanAnotherBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          onPress={onScanAgain}
          testID="scan-another-btn"
        >
          <Camera size={18} color="#FFFFFF" />
          <Text style={st.scanAnotherText}>Scan Another Item</Text>
        </Pressable>

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
  root: { flex: 1 },

  heroImageWrap: {
    width: '100%',
    height: 280,
    backgroundColor: '#F0F0F0',
    borderRadius: ScannerRadius.xxl,
    overflow: 'hidden',
    marginBottom: ScannerSpacing.lg,
  },
  heroImage: { width: '100%', height: '100%' },

  dualImageRow: { flexDirection: 'row', gap: 10, marginBottom: ScannerSpacing.lg },
  dualImageWrap: { flex: 1, height: 200, borderRadius: ScannerRadius.xxl, overflow: 'hidden', backgroundColor: '#F0F0F0', position: 'relative' },
  dualImage: { width: '100%', height: '100%' },
  imageBadge: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: ScannerRadius.sm },
  imageBadgeText: { fontSize: 10, fontWeight: '600' as const, color: '#FFFFFF' },

  contentSection: { paddingBottom: 20 },

  lowConfCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: ScannerRadius.lg,
    padding: 16,
    marginBottom: ScannerSpacing.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  lowConfIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  lowConfTitle: { fontSize: 15, fontWeight: '700' as const, color: '#92400E' },
  lowConfDesc: { fontSize: 13, fontWeight: '500' as const, color: '#78716C', lineHeight: 19 },

  ikeaBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  ikeaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFDA1A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: ScannerRadius.sm,
  },
  ikeaBadgeText: { fontSize: 12, fontWeight: '700' as const, color: '#0058A3' },
  confidencePill: {
    backgroundColor: '#0058A312',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: ScannerRadius.sm,
  },
  confidencePillText: { fontSize: 11, fontWeight: '600' as const, color: '#0058A3' },

  itemName: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ScannerSpacing.lg,
  },
  categoryText: { fontSize: 15, fontWeight: '500' as const, color: '#8E8E93' },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#0058A310',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ScannerRadius.sm,
  },
  priceText: { fontSize: 18, fontWeight: '800' as const, color: '#0058A3', letterSpacing: -0.3 },

  descriptionCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: ScannerRadius.lg,
    padding: 14,
    marginBottom: ScannerSpacing.lg,
    borderWidth: 1,
    borderColor: '#B8D4F0',
  },
  descriptionText: { fontSize: 14, color: '#1E3A5F', lineHeight: 20 },

  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: ScannerSpacing.lg,
  },
  specChip: {
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
  specLabel: { fontSize: 11, fontWeight: '500' as const, color: '#8E8E93', marginBottom: 3 },
  specValue: { fontSize: 13, fontWeight: '700' as const, color: '#1C1C1E', lineHeight: 17 },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: ScannerRadius.xxl,
    overflow: 'hidden',
    marginBottom: ScannerSpacing.md,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
  },

  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  toolIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolText: { fontSize: 14, fontWeight: '600' as const, color: '#1C1C1E' },

  assemblyGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  assemblyItem: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: ScannerRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 6,
  },
  assemblyLabel: { fontSize: 11, fontWeight: '500' as const, color: '#8E8E93' },
  assemblyValue: { fontSize: 13, fontWeight: '800' as const, color: '#1C1C1E', textAlign: 'center' },

  wallAnchorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: ScannerRadius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  wallAnchorText: { flex: 1, fontSize: 12, fontWeight: '600' as const, color: '#991B1B', lineHeight: 17 },

  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
  },
  noteText: { flex: 1, fontSize: 12, fontWeight: '500' as const, color: '#78716C', lineHeight: 17 },

  matchScroll: { gap: 10, paddingRight: 4 },
  matchCard: {
    width: 110,
    backgroundColor: '#F0FDF4',
    borderRadius: ScannerRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  matchIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchText: { fontSize: 12, fontWeight: '600' as const, color: '#1C1C1E', textAlign: 'center', lineHeight: 16 },

  goodForWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  goodForChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: ScannerRadius.pill,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  goodForText: { fontSize: 12, fontWeight: '600' as const, color: '#5B21B6' },

  valueContent: { paddingHorizontal: 16, paddingBottom: 14 },
  valueText: { fontSize: 13, fontWeight: '500' as const, color: '#78716C', lineHeight: 19 },

  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: ScannerRadius.lg,
    padding: 14,
    marginBottom: ScannerSpacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipText: { flex: 1, fontSize: 13, fontWeight: '500' as const, color: '#78716C', lineHeight: 19 },

  countBadge: {
    backgroundColor: '#16A34A14',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: ScannerRadius.sm,
  },
  countBadgeText: { fontSize: 11, fontWeight: '700' as const, color: '#16A34A' },

  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  bulletDot: { width: 6, height: 6, borderRadius: 3 },
  bulletText: { fontSize: 13, fontWeight: '500' as const, color: '#3C3C43', flex: 1, lineHeight: 19 },

  recipeCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: ScannerRadius.lg,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  recipeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recipeName: { fontSize: 14, fontWeight: '700' as const, color: '#1C1C1E', flex: 1, marginRight: 8 },
  recipeDiffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  recipeDiffText: { fontSize: 10, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.3 },
  recipeDesc: { fontSize: 12, fontWeight: '500' as const, color: '#6B7280', lineHeight: 17, marginBottom: 4 },
  recipeTime: { fontSize: 11, fontWeight: '600' as const, color: '#8E8E93' },

  scanAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: ScannerRadius.xl,
    backgroundColor: '#0058A3',
    marginTop: ScannerSpacing.lg,
    marginBottom: ScannerSpacing.md,
    shadowColor: '#003E75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  scanAnotherText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 2,
  },
  deleteText: { fontSize: 13, fontWeight: '600' as const, color: '#EF4444' },
});
