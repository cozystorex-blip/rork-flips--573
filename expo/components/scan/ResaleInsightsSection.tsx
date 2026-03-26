import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  TrendingUp,
  Tag,
  DollarSign,
  CheckSquare,
  Package,
  Lightbulb,
  Target,
  AlertTriangle,
} from 'lucide-react-native';

import { SmartScanResult, SmartScanItemType } from '@/services/smartScanService';
import { ScannerColors, ScannerRadius, ScannerSpacing } from '@/constants/scannerTheme';

const RESALE_ELIGIBLE_TYPES: SmartScanItemType[] = [
  'furniture', 'household', 'fashion', 'electronics', 'general',
];

const DOCUMENT_TYPES: SmartScanItemType[] = ['document', 'receipt'];
const CONSUMABLE_TYPES: SmartScanItemType[] = ['food', 'grocery'];

interface ResaleCategory {
  label: string;
  color: string;
}

const RESALE_CATEGORY_MAP: Record<string, ResaleCategory> = {
  furniture: { label: 'Furniture', color: '#0058A3' },
  household: { label: 'Home & Household', color: '#7C3AED' },
  fashion: { label: 'Fashion & Apparel', color: '#E11D48' },
  electronics: { label: 'Electronics', color: '#0284C7' },
  general: { label: 'General Goods', color: '#0D9488' },
};

function getSubcategoryLabel(result: SmartScanResult): string | null {
  if (result.furniture_details) {
    const t = result.furniture_details.item_type_specific;
    if (t) return t;
    return 'Furniture';
  }
  if (result.household_details) {
    const sub = result.household_details.subcategory;
    const map: Record<string, string> = {
      tools: 'Tools & Hardware',
      fitness: 'Fitness Equipment',
      kitchenware: 'Kitchenware',
      cleaning: 'Cleaning Supplies',
      bathroom: 'Bathroom',
      decor: 'Home Decor',
      garden: 'Garden & Outdoor',
      storage: 'Storage & Organization',
      lighting: 'Lighting',
      small_appliance: 'Small Appliances',
      other: 'Household',
    };
    return map[sub] ?? 'Household';
  }
  if (result.fashion_details) {
    const sub = result.fashion_details.subcategory;
    const map: Record<string, string> = {
      shoes: 'Footwear',
      clothing: 'Clothing',
      outerwear: 'Outerwear',
      accessories: 'Accessories',
      bags: 'Bags & Luggage',
      jewelry: 'Jewelry',
      activewear: 'Activewear',
      other: 'Fashion',
    };
    return map[sub] ?? 'Fashion';
  }
  if (result.electronics_details) {
    return result.electronics_details.product_type ?? 'Electronics';
  }
  if (result.general_details) {
    return result.general_details.subcategory
      ? result.general_details.subcategory.charAt(0).toUpperCase() + result.general_details.subcategory.slice(1).replace(/_/g, ' ')
      : 'General';
  }
  return null;
}

function extractPriceNumber(price: string | null | undefined): number | null {
  if (!price) return null;
  const cleaned = price.replace(/[^0-9.]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

interface ResaleEstimate {
  low: string;
  typical: string;
  high: string;
  confidence: 'high' | 'moderate' | 'low';
}

function computeResaleEstimate(result: SmartScanResult): ResaleEstimate | null {
  let retailVal: number | null = null;
  let resaleVal: number | null = null;
  let rangeVal: number | null = null;
  let condition: string | null = null;

  if (result.furniture_details) {
    retailVal = extractPriceNumber(result.furniture_details.estimated_retail_price);
    resaleVal = extractPriceNumber(result.furniture_details.estimated_resale_value);
    rangeVal = extractPriceNumber(result.furniture_details.estimated_price_range);
  } else if (result.household_details) {
    retailVal = extractPriceNumber(result.household_details.estimated_price);
    resaleVal = extractPriceNumber(result.household_details.estimated_resale_value);
    rangeVal = extractPriceNumber(result.household_details.price_range);
    condition = result.household_details.condition;
  } else if (result.fashion_details) {
    retailVal = extractPriceNumber(result.fashion_details.estimated_retail_price);
    resaleVal = extractPriceNumber(result.fashion_details.estimated_resale_value);
    rangeVal = extractPriceNumber(result.fashion_details.price_range);
    condition = result.fashion_details.condition;
  } else if (result.electronics_details) {
    retailVal = extractPriceNumber(result.electronics_details.estimated_retail_price);
    resaleVal = extractPriceNumber(result.electronics_details.estimated_resale_value);
    rangeVal = extractPriceNumber(result.electronics_details.price_range);
    condition = result.electronics_details.condition;
  } else if (result.general_details) {
    retailVal = extractPriceNumber(result.general_details.estimated_retail_price);
    resaleVal = extractPriceNumber(result.general_details.estimated_resale_value);
    rangeVal = extractPriceNumber(result.general_details.price_range);
    condition = result.general_details.condition;
  }

  const basePrice = retailVal ?? resaleVal ?? rangeVal;
  if (!basePrice || basePrice < 2) return null;

  let lowMult = 0.25;
  let typMult = 0.45;
  let highMult = 0.65;
  let confidence: 'high' | 'moderate' | 'low' = 'low';

  if (resaleVal && retailVal) {
    const ratio = resaleVal / retailVal;
    lowMult = Math.max(ratio * 0.7, 0.1);
    typMult = ratio;
    highMult = Math.min(ratio * 1.3, 0.95);
    confidence = 'moderate';
  } else if (retailVal) {
    if (condition === 'new' || condition === 'like-new') {
      lowMult = 0.4; typMult = 0.6; highMult = 0.75;
    } else if (condition === 'good') {
      lowMult = 0.3; typMult = 0.45; highMult = 0.6;
    } else if (condition === 'fair' || condition === 'worn') {
      lowMult = 0.15; typMult = 0.3; highMult = 0.45;
    } else {
      lowMult = 0.25; typMult = 0.45; highMult = 0.65;
    }
    confidence = 'moderate';
  }

  if (!retailVal && !resaleVal) {
    confidence = 'low';
  }

  const refPrice = retailVal ?? basePrice;
  const low = Math.max(Math.round(refPrice * lowMult), 1);
  const typical = Math.max(Math.round(refPrice * typMult), low + 1);
  const high = Math.max(Math.round(refPrice * highMult), typical + 1);

  return {
    low: `$${low}`,
    typical: `$${typical}`,
    high: `$${high}`,
    confidence,
  };
}

function getValueFactors(result: SmartScanResult): string[] {
  const factors: string[] = ['Condition'];

  const hasBrand = !!(
    result.fashion_details?.brand ??
    result.electronics_details?.brand ??
    result.household_details?.brand ??
    result.general_details?.brand
  );
  if (hasBrand) {
    factors.push('Brand identification');
  } else {
    factors.push('Brand (not detected)');
  }

  factors.push('Size / dimensions');

  if (result.furniture_details) {
    factors.push('Missing parts or hardware');
    factors.push('Assembly completeness');
  }
  if (result.fashion_details) {
    factors.push('Wear and tear');
    factors.push('Current demand / season');
  }
  if (result.electronics_details) {
    factors.push('Working condition');
    factors.push('Included accessories');
  }

  factors.push('Material quality');
  factors.push('Market demand');
  factors.push('Completeness');

  return factors.slice(0, 7);
}

function getCompanionItems(result: SmartScanResult): string[] {
  const items: string[] = [];

  if (result.furniture_details) {
    const fd = result.furniture_details;
    if (fd.matching_products?.length) {
      items.push(...fd.matching_products.slice(0, 3));
    }
    if (fd.likely_tools_needed?.length) {
      items.push(...fd.likely_tools_needed.slice(0, 2).map(t => `${t} (tool)`));
    }
    if (items.length < 3) {
      items.push('Mounting hardware', 'Replacement parts', 'Compatible accessories');
    }
  } else if (result.household_details) {
    const comp = result.household_details.complementary_items ?? [];
    items.push(...comp.slice(0, 4));
    if (items.length < 3) {
      items.push('Replacement parts', 'Compatible accessories');
    }
  } else if (result.fashion_details) {
    const comp = result.fashion_details.complementary_items ?? [];
    items.push(...comp.slice(0, 4));
    if (items.length < 3) {
      items.push('Matching accessories', 'Care products');
    }
  } else if (result.electronics_details) {
    const comp = result.electronics_details.complementary_items ?? [];
    items.push(...comp.slice(0, 4));
    if (items.length < 3) {
      items.push('Charger / cable', 'Protective case', 'Screen protector');
    }
  } else if (result.general_details) {
    const comp = result.general_details.complementary_items ?? [];
    items.push(...comp.slice(0, 4));
    if (items.length < 3) {
      items.push('Related accessories', 'Replacement parts');
    }
  }

  const unique = [...new Set(items)];
  return unique.slice(0, 5);
}

function getListingTips(result: SmartScanResult): string[] {
  const tips = [
    'Photograph labels or brand marks',
    'Include dimensions in your listing',
    'Photograph all sides of the item',
    'Show condition clearly in photos',
  ];

  if (result.furniture_details) {
    tips.push('Note if assembly instructions are included');
    tips.push('Mention all included hardware and parts');
  }
  if (result.fashion_details) {
    tips.push('Show size tags and care labels');
    tips.push('Note any defects or wear');
  }
  if (result.electronics_details) {
    tips.push('Show the item powered on if possible');
    tips.push('Include all cables and accessories');
  }

  tips.push('Include accessories if available');
  return tips.slice(0, 6);
}

function getNextScanSuggestions(result: SmartScanResult): string[] {
  const suggestions: string[] = [];
  const hasBrand = !!(
    result.fashion_details?.brand ??
    result.electronics_details?.brand ??
    result.household_details?.brand ??
    result.general_details?.brand
  );

  if (!hasBrand) {
    suggestions.push('A brand label or logo');
  }
  suggestions.push('Product packaging or box');
  suggestions.push('Instruction manual or model tag');
  suggestions.push('Barcode or item tag');
  suggestions.push('The object alone with clear background');

  return suggestions.slice(0, 4);
}

function SectionHeader({ icon: Icon, title, color }: { icon: React.ComponentType<{ size: number; color: string }>; title: string; color: string }) {
  return (
    <View style={st.sectionHeader}>
      <View style={[st.sectionHeaderIcon, { backgroundColor: `${color}18` }]}>
        <Icon size={14} color={color} />
      </View>
      <Text style={st.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function BulletItem({ text, char }: { text: string; char?: string }) {
  return (
    <View style={st.bulletRow}>
      <Text style={st.bulletChar}>{char ?? '•'}</Text>
      <Text style={st.bulletText}>{text}</Text>
    </View>
  );
}

export function ResaleInsightsSection({ result }: { result: SmartScanResult }) {
  if (CONSUMABLE_TYPES.includes(result.item_type)) {
    console.log('[ResaleInsights] Skipping — consumable item type:', result.item_type);
    return null;
  }

  const isDocument = DOCUMENT_TYPES.includes(result.item_type) || result.image_content_type === 'printed_material' || result.image_content_type === 'multi_item_page';
  const isResaleEligible = RESALE_ELIGIBLE_TYPES.includes(result.item_type);

  if (!isDocument && !isResaleEligible) {
    return null;
  }

  if (result.confidence < 0.2) {
    return null;
  }

  const resaleCategory = RESALE_CATEGORY_MAP[result.item_type];
  const subcategoryLabel = getSubcategoryLabel(result);
  const estimate = isResaleEligible ? computeResaleEstimate(result) : null;
  const valueFactors = isResaleEligible ? getValueFactors(result) : [];
  const companionItems = isResaleEligible ? getCompanionItems(result) : [];
  const listingTips = isResaleEligible ? getListingTips(result) : [];
  const nextScanSuggestions = getNextScanSuggestions(result);

  return (
    <View style={st.container} testID="resale-insights-section">
      <View style={st.headerRow}>
        <View style={st.headerIconWrap}>
          <TrendingUp size={16} color="#10B981" />
        </View>
        <Text style={st.headerTitle}>Resale Insights</Text>
      </View>

      {isDocument && (
        <View style={st.documentNotice}>
          <AlertTriangle size={14} color={ScannerColors.amber} />
          <Text style={st.documentNoticeText}>
            This appears to be a reference or informational image rather than a single resale item. Scan one specific object for accurate resale analysis.
          </Text>
        </View>
      )}

      {isResaleEligible && (
        <>
          <SectionHeader icon={Tag} title="Resale Category" color="#8B5CF6" />
          <View style={st.categoryCard}>
            <View style={st.categoryRow}>
              <Text style={st.categoryLabel}>Likely category</Text>
              <View style={[st.categoryBadge, { backgroundColor: `${resaleCategory?.color ?? '#6B7280'}18` }]}>
                <Text style={[st.categoryBadgeText, { color: resaleCategory?.color ?? '#6B7280' }]}>
                  {resaleCategory?.label ?? 'General'}
                </Text>
              </View>
            </View>
            {subcategoryLabel && (
              <View style={st.categoryRow}>
                <Text style={st.categoryLabel}>Subcategory</Text>
                <Text style={st.categoryValue}>{subcategoryLabel}</Text>
              </View>
            )}
          </View>

          <SectionHeader icon={DollarSign} title="Estimated Resale Value" color="#10B981" />
          {estimate ? (
            <View style={st.estimateCard}>
              <View style={st.estimateRow}>
                <View style={st.estimateCol}>
                  <Text style={st.estimateLabelSm}>Low</Text>
                  <Text style={st.estimateValueLow}>{estimate.low}</Text>
                </View>
                <View style={[st.estimateCol, st.estimateColCenter]}>
                  <Text style={st.estimateLabelSm}>Typical</Text>
                  <Text style={st.estimateValueTypical}>{estimate.typical}</Text>
                </View>
                <View style={st.estimateCol}>
                  <Text style={st.estimateLabelSm}>High</Text>
                  <Text style={st.estimateValueHigh}>{estimate.high}</Text>
                </View>
              </View>
              <View style={st.estimateBar}>
                <View style={st.estimateBarTrack} />
                <View style={st.estimateBarFill} />
              </View>
              <Text style={st.estimateDisclaimer}>
                Value depends on condition, completeness, brand, and demand.
              </Text>
              {estimate.confidence === 'low' && (
                <View style={st.lowConfNotice}>
                  <AlertTriangle size={11} color={ScannerColors.amber} />
                  <Text style={st.lowConfText}>
                    Low confidence estimate — scanning a single item, label, or brand tag will improve accuracy.
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={st.noEstimateCard}>
              <Text style={st.noEstimateText}>
                Not enough data to estimate resale value. Try scanning the item closer with visible labels.
              </Text>
            </View>
          )}

          <SectionHeader icon={CheckSquare} title="What Affects Value" color="#F59E0B" />
          <View style={st.factorsCard}>
            {valueFactors.map((factor, i) => (
              <BulletItem key={`vf-${i}`} text={factor} char="☐" />
            ))}
          </View>

          {companionItems.length > 0 && (
            <>
              <SectionHeader icon={Package} title="Often Sold With" color="#6366F1" />
              <View style={st.companionCard}>
                {companionItems.map((item, i) => (
                  <BulletItem key={`ci-${i}`} text={item} char="+" />
                ))}
              </View>
            </>
          )}

          <SectionHeader icon={Lightbulb} title="Listing Tips" color="#0EA5E9" />
          <View style={st.tipsCard}>
            {listingTips.map((tip, i) => (
              <BulletItem key={`lt-${i}`} text={tip} char="→" />
            ))}
          </View>
        </>
      )}

      {nextScanSuggestions.length > 0 && (
        <>
          <SectionHeader icon={Target} title="Best Next Scan" color="#EC4899" />
          <View style={st.nextScanCard}>
            <Text style={st.nextScanIntro}>For better resale accuracy, try scanning:</Text>
            {nextScanSuggestions.map((s, i) => (
              <BulletItem key={`ns-${i}`} text={s} char="◎" />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    backgroundColor: ScannerColors.surface,
    borderRadius: ScannerRadius.xxl,
    padding: ScannerSpacing.lg,
    marginTop: ScannerSpacing.lg,
    borderWidth: 1,
    borderColor: '#10B98125',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: ScannerSpacing.lg,
    paddingBottom: ScannerSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ScannerColors.divider,
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: ScannerRadius.md,
    backgroundColor: '#10B98118',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: ScannerColors.text,
    letterSpacing: -0.3,
  },
  documentNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: ScannerColors.amberBg,
    borderRadius: ScannerRadius.lg,
    padding: 12,
    marginBottom: ScannerSpacing.md,
    borderWidth: 1,
    borderColor: ScannerColors.amberBorder,
  },
  documentNoticeText: {
    flex: 1,
    fontSize: 12,
    color: ScannerColors.amber,
    fontWeight: '500' as const,
    lineHeight: 17,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: ScannerSpacing.md,
    marginBottom: 8,
  },
  sectionHeaderIcon: {
    width: 24,
    height: 24,
    borderRadius: ScannerRadius.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: ScannerColors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  categoryCard: {
    backgroundColor: ScannerColors.card,
    borderRadius: ScannerRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: ScannerColors.cardBorder,
    gap: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: ScannerColors.textSecondary,
  },
  categoryValue: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: ScannerColors.text,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: ScannerRadius.sm,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  estimateCard: {
    backgroundColor: ScannerColors.card,
    borderRadius: ScannerRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: ScannerColors.cardBorder,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  estimateCol: {
    alignItems: 'center',
    flex: 1,
  },
  estimateColCenter: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: ScannerColors.divider,
    borderRightColor: ScannerColors.divider,
  },
  estimateLabelSm: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: ScannerColors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  estimateValueLow: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: ScannerColors.textSecondary,
  },
  estimateValueTypical: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: '#10B981',
    letterSpacing: -0.5,
  },
  estimateValueHigh: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: ScannerColors.textSecondary,
  },
  estimateBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: ScannerColors.cardBorder,
    marginBottom: 10,
    overflow: 'hidden',
  },
  estimateBarTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: ScannerColors.cardBorder,
  },
  estimateBarFill: {
    position: 'absolute',
    left: '20%',
    right: '20%',
    top: 0,
    bottom: 0,
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  estimateDisclaimer: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: ScannerColors.textMuted,
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
  },
  lowConfNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: ScannerColors.divider,
  },
  lowConfText: {
    flex: 1,
    fontSize: 10,
    color: ScannerColors.amber,
    fontWeight: '500' as const,
    lineHeight: 14,
  },
  noEstimateCard: {
    backgroundColor: ScannerColors.card,
    borderRadius: ScannerRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: ScannerColors.cardBorder,
  },
  noEstimateText: {
    fontSize: 12,
    color: ScannerColors.textMuted,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
    lineHeight: 17,
  },
  factorsCard: {
    backgroundColor: ScannerColors.card,
    borderRadius: ScannerRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: ScannerColors.cardBorder,
    gap: 2,
  },
  companionCard: {
    backgroundColor: ScannerColors.card,
    borderRadius: ScannerRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: ScannerColors.cardBorder,
    gap: 2,
  },
  tipsCard: {
    backgroundColor: ScannerColors.card,
    borderRadius: ScannerRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: ScannerColors.cardBorder,
    gap: 2,
  },
  nextScanCard: {
    backgroundColor: ScannerColors.card,
    borderRadius: ScannerRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: ScannerColors.cardBorder,
    gap: 2,
  },
  nextScanIntro: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: ScannerColors.textSecondary,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 3,
  },
  bulletChar: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: ScannerColors.textSecondary,
    width: 14,
  },
  bulletText: {
    fontSize: 12,
    color: ScannerColors.text,
    flex: 1,
    lineHeight: 17,
    fontWeight: '500' as const,
  },
});
