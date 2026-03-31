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
  ChevronRight,
  AlertCircle,
  Lightbulb,
  Target,
  Camera,
  Package,
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

function getCompanionItems(result: SmartScanResult): { name: string; price: string }[] {
  const items: string[] = [];

  if (result.furniture_details) {
    if (result.furniture_details.matching_products?.length) items.push(...result.furniture_details.matching_products);
    if (result.furniture_details.complementary_items?.length) items.push(...result.furniture_details.complementary_items);
    if (result.furniture_details.likely_tools_needed?.length) items.push(...result.furniture_details.likely_tools_needed);
  } else if (result.fashion_details) {
    if (result.fashion_details.complementary_items?.length) items.push(...result.fashion_details.complementary_items);
  } else if (result.electronics_details) {
    if (result.electronics_details.complementary_items?.length) items.push(...result.electronics_details.complementary_items);
  } else if (result.household_details) {
    if (result.household_details.complementary_items?.length) items.push(...result.household_details.complementary_items);
  } else if (result.general_details) {
    if (result.general_details.complementary_items?.length) items.push(...result.general_details.complementary_items);
  } else if (result.food_details) {
    if (result.food_details.complementary_items?.length) items.push(...result.food_details.complementary_items);
  } else if (result.grocery_details) {
    if (result.grocery_details.complementary_items?.length) items.push(...result.grocery_details.complementary_items);
  }

  const unique = [...new Set(items)].slice(0, 6);
  const prices = ['$5', '$8', '$12', '$15', '$10', '$20', '$14', '$28', '$7', '$18'];
  return unique.map((name, i) => ({ name, price: prices[i % prices.length] }));
}

function getListingTips(result: SmartScanResult): string[] {
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

  const resaleSuggestion = result.fashion_details?.resale_suggestion
    ?? result.electronics_details?.resale_suggestion
    ?? result.furniture_details?.resale_suggestion
    ?? result.household_details?.resale_suggestion
    ?? result.general_details?.resale_suggestion;
  if (resaleSuggestion) tips.push(resaleSuggestion);

  const valueReasoning = result.fashion_details?.value_reasoning
    ?? result.electronics_details?.value_reasoning
    ?? result.furniture_details?.value_reasoning
    ?? result.household_details?.value_reasoning
    ?? result.general_details?.value_reasoning;
  if (valueReasoning) tips.push(valueReasoning);

  if (tips.length === 0) {
    tips.push('Photograph all sides of the item clearly');
    tips.push('Include brand labels or tags in photos');
    tips.push('Note the condition honestly in your listing');
    tips.push('Research similar sold listings for pricing');
  }

  return tips.slice(0, 5);
}

function getNextScanSuggestions(result: SmartScanResult): string[] {
  const suggestions: string[] = [];

  const nextScan = result.fashion_details?.next_scan_suggestion
    ?? result.electronics_details?.next_scan_suggestion
    ?? result.furniture_details?.next_scan_suggestion
    ?? result.household_details?.next_scan_suggestion
    ?? result.general_details?.next_scan_suggestion
    ?? result.food_details?.next_scan_suggestion
    ?? result.grocery_details?.next_scan_suggestion;
  if (nextScan) suggestions.push(nextScan);

  if (result.furniture_details?.best_next_scan?.length) {
    suggestions.push(...result.furniture_details.best_next_scan);
  }

  const hasBrand = !!(
    result.fashion_details?.brand
    ?? result.electronics_details?.brand
    ?? result.household_details?.brand
    ?? result.general_details?.brand
  );
  if (!hasBrand) suggestions.push('Scan brand label or logo for better identification');
  suggestions.push('Try scanning the barcode or product tag');
  suggestions.push('Scan packaging or box for model details');

  return [...new Set(suggestions)].slice(0, 4);
}

function getSubtleTip(result: SmartScanResult): string | null {
  const quickTip = result.food_details?.quick_tip;
  if (quickTip) return quickTip;

  const practicalTip = result.general_details?.practical_tip;
  if (practicalTip) return practicalTip;

  const funFact = result.general_details?.fun_fact;
  if (funFact) return funFact;

  const valueTip = result.fashion_details?.value_insight
    ?? result.electronics_details?.value_insight
    ?? result.furniture_details?.value_insight
    ?? result.household_details?.value_insight
    ?? result.general_details?.value_insight;
  if (valueTip) return valueTip;

  const storageTip = result.food_details?.storage_tip ?? result.grocery_details?.storage_tip;
  if (storageTip) return storageTip;

  return null;
}

interface ScanResultViewProps {
  result: SmartScanResult;
  scannedImageUri: string | null;
  referenceImageUrl: string | null;
  _generatingImage?: boolean;
  resultFade: Animated.Value;
  onScanAgain: () => void;
  onScanGallery: () => void;
  isLowConfidence: boolean;
  viewingEntryId: string | null;
  onDelete?: () => void;
}

function CollapsibleRow({ icon: Icon, iconColor, title, children }: { icon: React.ComponentType<{ size: number; color: string }>; iconColor: string; title: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    void Haptics.selectionAsync();
    setExpanded(prev => !prev);
  }, []);

  return (
    <View style={st.collapsibleContainer}>
      <Pressable
        style={st.collapsibleRow}
        onPress={handleToggle}
        testID={`collapsible-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <View style={[st.collapsibleIconWrap, { backgroundColor: `${iconColor}14` }]}>
          <Icon size={16} color={iconColor} />
        </View>
        <Text style={st.collapsibleTitle}>{title}</Text>
        <ChevronRight
          size={16}
          color="#AEAEB2"
          style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
        />
      </Pressable>
      {expanded && (
        <View style={st.collapsibleContent}>
          {children}
        </View>
      )}
    </View>
  );
}

function CompanionItemCard({ name, price }: { name: string; price: string }) {
  return (
    <View style={st.companionCard}>
      <View style={st.companionImagePlaceholder}>
        <Package size={20} color="#C7C7CC" />
      </View>
      <Text style={st.companionName} numberOfLines={2}>{name}</Text>
      <Text style={st.companionPrice}>{price} est.</Text>
    </View>
  );
}

export default function ScanResultView({
  result,
  scannedImageUri,
  referenceImageUrl,
  _generatingImage,
  resultFade,
  onScanAgain,
  onScanGallery,
  isLowConfidence,
  viewingEntryId,
  onDelete,
}: ScanResultViewProps) {
  const categoryLabel = useMemo(() => getCategoryLabel(result), [result]);
  const priceInfo = useMemo(() => extractPriceInfo(result), [result]);
  const companionItems = useMemo(() => getCompanionItems(result), [result]);
  const listingTips = useMemo(() => getListingTips(result), [result]);
  const nextScanSuggestions = useMemo(() => getNextScanSuggestions(result), [result]);
  const subtleTip = useMemo(() => getSubtleTip(result), [result]);

  const confidenceBadgeLabel = useMemo(() => {
    if (result.confidence >= 0.70) return 'High conf.';
    if (result.confidence >= 0.40) return 'Med conf.';
    return 'Low conf.';
  }, [result.confidence]);

  const confidenceBadgeColor = useMemo(() => {
    if (result.confidence >= 0.70) return '#059669';
    if (result.confidence >= 0.40) return '#D97706';
    return '#EF4444';
  }, [result.confidence]);

  const heroImageUri = scannedImageUri ?? referenceImageUrl;

  const isNonResale = result.item_type === 'food' || result.item_type === 'grocery' || result.item_type === 'receipt' || result.item_type === 'document';

  return (
    <Animated.View style={[st.root, { opacity: resultFade }]}>
      {heroImageUri && (
        <View style={st.heroImageWrap}>
          <ExpoImage
            source={{ uri: heroImageUri }}
            style={st.heroImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          {scannedImageUri && referenceImageUrl && (
            <View style={st.heroImageBadge}>
              <Camera size={10} color="#FFFFFF" />
              <Text style={st.heroImageBadgeText}>Your Photo</Text>
            </View>
          )}
        </View>
      )}

      <View style={st.contentSection}>
        <Text style={st.itemName}>{result.item_name}</Text>

        <View style={st.metaRow}>
          <Text style={st.categoryText}>{categoryLabel}</Text>
          <View style={[st.confidenceBadge, { backgroundColor: `${confidenceBadgeColor}14`, borderColor: `${confidenceBadgeColor}30` }]}>
            <Text style={[st.confidenceBadgeText, { color: confidenceBadgeColor }]}>{confidenceBadgeLabel}</Text>
          </View>
        </View>

        {!isNonResale && (priceInfo.originalPrice || priceInfo.valuePrice) && (
          <View style={st.priceCard}>
            {priceInfo.originalPrice && (
              <View style={st.priceRow}>
                <Text style={st.priceRowLabel}>{priceInfo.originalLabel}</Text>
                <Text style={st.priceRowOriginal}>{priceInfo.originalPrice}</Text>
              </View>
            )}
            {priceInfo.originalPrice && priceInfo.valuePrice && (
              <View style={st.priceDivider} />
            )}
            {priceInfo.valuePrice && (
              <View style={st.priceRow}>
                <Text style={st.priceRowLabel}>Value Price</Text>
                <Text style={st.priceRowValue}>{priceInfo.valuePrice}</Text>
              </View>
            )}
            {priceInfo.priceRange && (
              <View style={st.priceRangeRow}>
                <Text style={st.priceRangeLabel}>Range</Text>
                <Text style={st.priceRangeText}>{priceInfo.priceRange}</Text>
              </View>
            )}
          </View>
        )}

        {isLowConfidence && (
          <View style={st.warningCard}>
            <View style={st.warningHeaderRow}>
              <AlertCircle size={16} color="#D97706" />
              <Text style={st.warningTitle}>
                Low-confidence match, but category and resale estimate are still usable.
              </Text>
            </View>
            <Text style={st.warningBody}>
              {result.short_summary ?? 'The image was unclear or ambiguous. Try scanning again with better lighting or a closer angle for more accurate results.'}
            </Text>
          </View>
        )}

        {!isLowConfidence && result.short_summary && (
          <View style={st.summaryCard}>
            <Text style={st.summaryText}>{result.short_summary}</Text>
          </View>
        )}

        {subtleTip && (
          <View style={st.tipCard}>
            <View style={st.tipIconWrap}>
              <Lightbulb size={14} color="#F59E0B" />
            </View>
            <Text style={st.tipText}>{subtleTip}</Text>
          </View>
        )}

        {companionItems.length > 0 && (
          <View style={st.companionSection}>
            <View style={st.companionHeaderRow}>
              <View style={st.companionHeaderLeft}>
                <View style={st.companionHeaderIcon}>
                  <Package size={14} color="#8B5CF6" />
                </View>
                <Text style={st.companionHeaderTitle}>Items That Go With This</Text>
              </View>
              <Text style={st.companionSeeAll}>See All ›</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={st.companionScroll}
            >
              {companionItems.map((item, i) => (
                <CompanionItemCard key={`companion-${i}`} name={item.name} price={item.price} />
              ))}
            </ScrollView>
          </View>
        )}

        {!isNonResale && (
          <CollapsibleRow icon={Lightbulb} iconColor="#0EA5E9" title="Listing Tips">
            {listingTips.map((tip, i) => (
              <View key={`tip-${i}`} style={st.bulletRow}>
                <Text style={st.bulletChar}>→</Text>
                <Text style={st.bulletText}>{tip}</Text>
              </View>
            ))}
          </CollapsibleRow>
        )}

        <CollapsibleRow icon={Target} iconColor="#EC4899" title="Best Next Scan">
          {nextScanSuggestions.map((sug, i) => (
            <View key={`ns-${i}`} style={st.bulletRow}>
              <Text style={st.bulletChar}>◎</Text>
              <Text style={st.bulletText}>{sug}</Text>
            </View>
          ))}
        </CollapsibleRow>

        <Pressable
          style={({ pressed }) => [st.scanAnotherBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          onPress={onScanAgain}
          testID="scan-another-btn"
        >
          <Camera size={18} color={ScannerColors.accent} />
          <Text style={st.scanAnotherText}>Scan Another</Text>
        </Pressable>

        {isLowConfidence && (
          <Pressable
            style={({ pressed }) => [st.tryDifferentBtn, pressed && { opacity: 0.7 }]}
            onPress={onScanGallery}
            testID="try-different-photo"
          >
            <Text style={st.tryDifferentText}>Try a Different Photo</Text>
          </Pressable>
        )}

        {onDelete && viewingEntryId && (
          <Pressable
            style={({ pressed }) => [st.deleteBtn, pressed && { opacity: 0.7 }]}
            onPress={onDelete}
            testID="delete-scan-result"
          >
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
    height: 280,
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
  itemName: {
    fontSize: 24,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: ScannerRadius.sm,
    borderWidth: 1,
  },
  confidenceBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  priceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: ScannerRadius.lg,
    paddingHorizontal: ScannerSpacing.lg,
    paddingVertical: 12,
    marginBottom: ScannerSpacing.lg,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  priceRowLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#8E8E93',
  },
  priceRowOriginal: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    letterSpacing: -0.4,
  },
  priceRowValue: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#10B981',
    letterSpacing: -0.4,
  },
  priceDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginVertical: 4,
  },
  priceRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    marginTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F0F0F0',
  },
  priceRangeLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#AEAEB2',
  },
  priceRangeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#8E8E93',
  },
  warningCard: {
    backgroundColor: '#FFF9EB',
    borderRadius: ScannerRadius.lg,
    padding: 14,
    marginBottom: ScannerSpacing.lg,
    borderWidth: 1,
    borderColor: '#FFE5A0',
  },
  warningHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#92400E',
    flex: 1,
    lineHeight: 20,
  },
  warningBody: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#78716C',
    lineHeight: 19,
  },
  summaryCard: {
    backgroundColor: '#F8F8FA',
    borderRadius: ScannerRadius.lg,
    padding: 14,
    marginBottom: ScannerSpacing.lg,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#3C3C43',
    lineHeight: 21,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: ScannerRadius.lg,
    padding: 12,
    marginBottom: ScannerSpacing.lg,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  tipIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  tipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#78716C',
    flex: 1,
    lineHeight: 19,
  },
  companionSection: {
    marginBottom: ScannerSpacing.lg,
  },
  companionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  companionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  companionHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: ScannerRadius.sm,
    backgroundColor: '#8B5CF614',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companionHeaderTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  companionSeeAll: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#8E8E93',
  },
  companionScroll: {
    gap: 10,
    paddingRight: ScannerSpacing.lg,
  },
  companionCard: {
    width: 130,
    backgroundColor: '#FFFFFF',
    borderRadius: ScannerRadius.lg,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  companionImagePlaceholder: {
    width: '100%',
    height: 90,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companionName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    paddingHorizontal: 10,
    paddingTop: 8,
    lineHeight: 17,
  },
  companionPrice: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#8E8E93',
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 2,
  },
  collapsibleContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: ScannerRadius.lg,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 10,
    overflow: 'hidden',
  },
  collapsibleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ScannerSpacing.lg,
    paddingVertical: 14,
    gap: 10,
  },
  collapsibleIconWrap: {
    width: 32,
    height: 32,
    borderRadius: ScannerRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapsibleTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    flex: 1,
  },
  collapsibleContent: {
    paddingHorizontal: ScannerSpacing.lg,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
    gap: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
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
  tryDifferentBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  tryDifferentText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8E8E93',
  },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 2,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
});
