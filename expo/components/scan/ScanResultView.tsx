import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import {
  Camera,
  Lightbulb,
  ChevronDown,
  Package,
  Trash2,
  Sofa,
  AlertTriangle,
  DollarSign,
  Search,
  Tag,
  ScanLine,
  Info,
  CheckCircle2,
  CircleDot,
  TrendingUp,
  Zap,
  Award,
  Sparkles,
  Eye,
  Store,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import type { SmartScanResult } from '@/services/smartScanService';
import {
  FoodResultSection,
  GroceryResultSection,
  FurnitureResultSection,
  FashionResultSection,
  ElectronicsResultSection,
  HouseholdResultSection,
  GeneralResultSection,
  DocumentResultSection,
  UnknownResultSection,
} from '@/components/scan/ScanResultRenderers';
import { ResaleInsightsSection } from '@/components/scan/ResaleInsightsSection';
import ReferenceSection from '@/components/scan/ReferenceSection';


type ConfidenceTier = 'high' | 'medium' | 'low';

function getConfidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.4) return 'medium';
  return 'low';
}

function getConfidenceLabel(tier: ConfidenceTier): string {
  switch (tier) {
    case 'high': return 'High Confidence';
    case 'medium': return 'Partial Match';
    case 'low': return 'Low Confidence';
  }
}

function getConfidenceConfig(tier: ConfidenceTier) {
  switch (tier) {
    case 'high': return { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: CheckCircle2 };
    case 'medium': return { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: CircleDot };
    case 'low': return { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: AlertTriangle };
  }
}

const JUNK_VALUES = ['unknown', 'n/a', 'none', 'mixed', 'various', 'unbranded', 'generic', 'other', 'item', 'personal', 'general use', 'standard', 'typical', 'regular', 'basic', 'normal', 'not available', 'not applicable', 'unspecified', 'undetermined', 'general', 'commodity', 'average', 'fair', 'common', 'null', 'undefined', 'mixed materials', 'various materials', 'multiple', 'assorted', 'miscellaneous', 'misc'];

function isRealValue(val: string | null | undefined): val is string {
  if (!val || val.trim().length === 0) return false;
  return !JUNK_VALUES.includes(val.trim().toLowerCase());
}

const TYPE_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  food: { color: '#059669', bg: '#ECFDF5', label: 'Food' },
  grocery: { color: '#2563EB', bg: '#EFF6FF', label: 'Grocery' },
  household: { color: '#7C3AED', bg: '#F5F3FF', label: 'Home' },
  furniture: { color: '#0058A3', bg: '#EFF6FF', label: 'Furniture' },
  fashion: { color: '#E11D48', bg: '#FFF1F2', label: 'Fashion' },
  electronics: { color: '#0284C7', bg: '#F0F9FF', label: 'Electronics' },
  general: { color: '#0D9488', bg: '#F0FDFA', label: 'Item' },
  receipt: { color: '#DC2626', bg: '#FEF2F2', label: 'Receipt' },
  document: { color: '#8B5CF6', bg: '#F5F3FF', label: 'Document' },
  unknown: { color: '#6B7280', bg: '#F9FAFB', label: 'Unknown' },
};

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
    if (sub && sub.toLowerCase() !== 'other' && sub.toLowerCase() !== 'general') {
      return sub.charAt(0).toUpperCase() + sub.slice(1).replace(/_/g, ' ');
    }
    return 'General';
  }
  if (result.category && result.category.toLowerCase() !== 'other' && result.category.toLowerCase() !== 'unknown') {
    return result.category;
  }
  return 'Item';
}

function getDescription(result: SmartScanResult): string {
  if (result.short_summary) return result.short_summary;
  if (result.furniture_details?.assembly_summary) return result.furniture_details.assembly_summary;
  if (result.household_details?.item_description) return result.household_details.item_description;
  if (result.general_details?.item_description) return result.general_details.item_description;
  if (result.fashion_details?.item_description) return result.fashion_details.item_description;
  return '';
}

function getRetailPrice(result: SmartScanResult): string | null {
  const raw = result.furniture_details?.estimated_retail_price
    ?? result.furniture_details?.estimated_price_range
    ?? result.household_details?.estimated_price
    ?? result.household_details?.price_range
    ?? result.fashion_details?.estimated_retail_price
    ?? result.fashion_details?.price_range
    ?? result.electronics_details?.estimated_retail_price
    ?? result.electronics_details?.price_range
    ?? result.general_details?.estimated_retail_price
    ?? result.general_details?.price_range
    ?? result.food_details?.estimated_price
    ?? result.food_details?.price_range
    ?? result.grocery_details?.estimated_price
    ?? result.grocery_details?.price_range
    ?? null;
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  return trimmed.startsWith('$') ? trimmed : `$${trimmed}`;
}

function getResaleValue(result: SmartScanResult): string | null {
  const raw = result.furniture_details?.estimated_resale_value
    ?? result.household_details?.estimated_resale_value
    ?? result.fashion_details?.estimated_resale_value
    ?? result.electronics_details?.estimated_resale_value
    ?? result.general_details?.estimated_resale_value
    ?? null;
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  return trimmed.startsWith('$') ? trimmed : `$${trimmed}`;
}

function getDemandLevel(result: SmartScanResult): string | null {
  const raw = result.furniture_details?.resale_demand
    ?? result.household_details?.resale_potential
    ?? result.fashion_details?.resale_demand
    ?? result.electronics_details?.resale_demand
    ?? result.general_details?.resale_demand
    ?? null;
  if (!raw || !isRealValue(raw)) return null;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function getBestPlatform(result: SmartScanResult): string | null {
  return result.furniture_details?.best_selling_platform
    ?? result.household_details?.best_selling_platform
    ?? result.fashion_details?.best_selling_platform
    ?? result.electronics_details?.best_selling_platform
    ?? result.general_details?.best_selling_platform
    ?? null;
}

function getValueRating(result: SmartScanResult): string | null {
  const raw = result.furniture_details?.value_rating
    ?? result.household_details?.value_rating
    ?? result.fashion_details?.value_rating
    ?? result.electronics_details?.value_rating
    ?? result.general_details?.value_rating
    ?? result.food_details?.value_rating
    ?? result.grocery_details?.value_rating
    ?? null;
  if (!raw || !isRealValue(raw)) return null;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function getCareTip(result: SmartScanResult): string | null {
  const tip = result.furniture_details?.care_tip
    ?? result.household_details?.care_tip
    ?? result.electronics_details?.care_tip
    ?? result.fashion_details?.care_tip
    ?? result.general_details?.care_tip
    ?? null;
  return tip && isRealValue(tip) ? tip : null;
}

function getResaleTip(result: SmartScanResult): string | null {
  const tip = result.furniture_details?.resale_suggestion
    ?? result.household_details?.resale_suggestion
    ?? result.fashion_details?.resale_suggestion
    ?? result.electronics_details?.resale_suggestion
    ?? result.general_details?.resale_suggestion
    ?? null;
  return tip && isRealValue(tip) ? tip : null;
}

function getValueInsightText(result: SmartScanResult): string | null {
  const vi = result.furniture_details?.value_insight
    ?? result.household_details?.value_insight
    ?? result.electronics_details?.value_insight
    ?? result.fashion_details?.value_insight
    ?? result.general_details?.value_insight
    ?? result.food_details?.value_insight
    ?? result.grocery_details?.value_insight
    ?? null;
  return vi && isRealValue(vi) ? vi : null;
}

function getTags(result: SmartScanResult): string[] {
  const tags = result.furniture_details?.tags
    ?? result.household_details?.tags
    ?? result.fashion_details?.tags
    ?? result.electronics_details?.tags
    ?? result.general_details?.tags
    ?? result.food_details?.tags
    ?? result.grocery_details?.tags
    ?? result.document_details?.tags
    ?? [];
  return tags.filter(t => t && t.trim().length > 0).slice(0, 12);
}

function getRelatedItems(result: SmartScanResult): string[] {
  const items = result.furniture_details?.complementary_items
    ?? result.furniture_details?.matching_products
    ?? result.household_details?.complementary_items
    ?? result.fashion_details?.complementary_items
    ?? result.electronics_details?.complementary_items
    ?? result.general_details?.complementary_items
    ?? result.food_details?.complementary_items
    ?? result.grocery_details?.complementary_items
    ?? [];
  return items.filter(i => isRealValue(i)).slice(0, 6);
}

function isWeakItemName(name: string): boolean {
  const weak = ['unidentified item', 'could not identify', 'unknown item', 'detected item', 'scanned item', 'item', 'other', 'general item'];
  return weak.includes(name.trim().toLowerCase());
}

interface ScanResultViewProps {
  result: SmartScanResult;
  scannedImageUri: string | null;
  referenceImageUrl: string | null;
  generatingImage?: boolean;
  resultFade: Animated.Value;
  onScanAgain: () => void;
  onScanGallery?: () => void;
  isLowConfidence?: boolean;
  viewingEntryId: string | null;
  onDelete?: () => void;
}

function ConfidencePill({ tier, confidence }: { tier: ConfidenceTier; confidence: number }) {
  const config = getConfidenceConfig(tier);
  const IconComp = config.icon;
  const pct = Math.round(confidence * 100);

  return (
    <View style={[st.confPill, { backgroundColor: config.bg, borderColor: config.border }]}>
      <IconComp size={12} color={config.color} />
      <Text style={[st.confPillText, { color: config.color }]}>{getConfidenceLabel(tier)}</Text>
      <View style={[st.confPctChip, { backgroundColor: `${config.color}15` }]}>
        <Text style={[st.confPctText, { color: config.color }]}>{pct}%</Text>
      </View>
    </View>
  );
}

function CategoryPill({ itemType, label }: { itemType: string; label: string }) {
  const tc = TYPE_COLORS[itemType] ?? TYPE_COLORS.general;
  return (
    <View style={[st.catPill, { backgroundColor: tc.bg }]}>
      <View style={[st.catDot, { backgroundColor: tc.color }]} />
      <Text style={[st.catPillText, { color: tc.color }]}>{label}</Text>
    </View>
  );
}

function DemandBadge({ level }: { level: string }) {
  const lower = level.toLowerCase();
  const color = lower === 'high' ? '#059669' : lower === 'moderate' ? '#D97706' : lower === 'low' ? '#DC2626' : '#6B7280';
  const bg = lower === 'high' ? '#ECFDF5' : lower === 'moderate' ? '#FFFBEB' : lower === 'low' ? '#FEF2F2' : '#F9FAFB';
  return (
    <View style={[st.demandBadge, { backgroundColor: bg }]}>
      <Zap size={10} color={color} />
      <Text style={[st.demandText, { color }]}>{level} Demand</Text>
    </View>
  );
}

function SectionCard({ children, title, icon: Icon, iconColor, iconBg, collapsed, onToggle, testID }: {
  children: React.ReactNode;
  title: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  iconColor: string;
  iconBg: string;
  collapsed?: boolean;
  onToggle?: () => void;
  testID?: string;
}) {
  const isCollapsible = onToggle !== undefined;
  const isOpen = collapsed !== true;

  const header = (
    <View style={st.sectionCardHeader}>
      <View style={[st.sectionCardIconWrap, { backgroundColor: iconBg }]}>
        <Icon size={15} color={iconColor} />
      </View>
      <Text style={st.sectionCardTitle}>{title}</Text>
      {isCollapsible && (
        <ChevronDown
          size={16}
          color="#AEAEB2"
          style={{ transform: [{ rotate: isOpen ? '0deg' : '-90deg' }] }}
        />
      )}
    </View>
  );

  return (
    <View style={st.sectionCard} testID={testID}>
      {isCollapsible ? (
        <Pressable onPress={onToggle}>{header}</Pressable>
      ) : header}
      {isOpen && (
        <View style={st.sectionCardBody}>{children}</View>
      )}
    </View>
  );
}

function DetailRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={st.detailRow}>
      <Text style={st.detailLabel}>{label}</Text>
      <Text style={[st.detailValue, bold && st.detailValueBold]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function PriceRow({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <View style={st.priceRow}>
      <Text style={[st.priceLabel, large && st.priceLabelLg]}>{label}</Text>
      <Text style={[st.priceValue, large && st.priceValueLg]}>{value}</Text>
    </View>
  );
}

function LowConfidenceFallback({ result, onScanAgain }: { result: SmartScanResult; onScanAgain: () => void }) {
  const hasAnyName = !isWeakItemName(result.item_name);

  return (
    <View style={st.lowConfContainer}>
      <View style={st.lowConfHeader}>
        <View style={st.lowConfIconCircle}>
          <AlertTriangle size={28} color="#D97706" />
        </View>
        <Text style={st.lowConfTitle}>Limited Identification</Text>
        <Text style={st.lowConfDesc}>
          {hasAnyName
            ? `We detected something that might be "${result.item_name}", but the scan wasn't clear enough for a full analysis.`
            : 'The image wasn\'t clear enough for reliable identification. Try one of these for better results:'}
        </Text>
      </View>

      <View style={st.scanTipsCard}>
        <Text style={st.scanTipsTitle}>Tips for Better Results</Text>
        {[
          { icon: Eye, text: 'Use good lighting and a clear angle', color: '#059669' },
          { icon: Tag, text: 'Scan visible labels or price tags', color: '#D97706' },
          { icon: ScanLine, text: 'Capture the shelf label directly', color: '#0058A3' },
          { icon: Search, text: 'Find and scan any article numbers', color: '#7C3AED' },
        ].map((tip, i) => {
          const TipIcon = tip.icon;
          return (
            <View key={`tip-${i}`} style={st.scanTipRow}>
              <View style={[st.scanTipIconWrap, { backgroundColor: `${tip.color}12` }]}>
                <TipIcon size={15} color={tip.color} />
              </View>
              <Text style={st.scanTipText}>{tip.text}</Text>
            </View>
          );
        })}
      </View>

      <Pressable
        style={({ pressed }) => [st.primaryBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        onPress={onScanAgain}
        testID="retry-scan-btn"
      >
        <Camera size={18} color="#FFFFFF" />
        <Text style={st.primaryBtnText}>Rescan for Better Detail</Text>
      </Pressable>
    </View>
  );
}

export default function ScanResultView({
  result,
  scannedImageUri,
  referenceImageUrl,
  generatingImage,
  resultFade,
  onScanAgain,
  viewingEntryId,
  onDelete,
}: ScanResultViewProps) {
  const tier = useMemo(() => getConfidenceTier(result.confidence), [result.confidence]);
  const categoryLabel = useMemo(() => getCategoryLabel(result), [result]);
  const description = useMemo(() => getDescription(result), [result]);
  const retailPrice = useMemo(() => getRetailPrice(result), [result]);
  const resaleValue = useMemo(() => getResaleValue(result), [result]);
  const demandLevel = useMemo(() => getDemandLevel(result), [result]);
  const bestPlatform = useMemo(() => getBestPlatform(result), [result]);
  const valueRating = useMemo(() => getValueRating(result), [result]);
  const careTip = useMemo(() => getCareTip(result), [result]);
  const resaleTip = useMemo(() => getResaleTip(result), [result]);
  const valueInsight = useMemo(() => getValueInsightText(result), [result]);
  const tags = useMemo(() => getTags(result), [result]);
  const relatedItems = useMemo(() => getRelatedItems(result), [result]);

  const isFood = result.item_type === 'food' || result.item_type === 'grocery';
  const isDocument = result.item_type === 'document';
  const isReceipt = result.item_type === 'receipt';
  const isIkea = result.furniture_details?.is_likely_ikea ?? false;
  const showFallback = tier === 'low';
  const isResaleEligible = !isFood && !isDocument && !isReceipt && result.item_type !== 'unknown';

  const heroImageUri = referenceImageUrl ?? scannedImageUri;
  const hasBothImages = !!scannedImageUri && !!referenceImageUrl;
  const isGenerating = generatingImage === true && !referenceImageUrl;

  const typeConfig = TYPE_COLORS[result.item_type] ?? TYPE_COLORS.general;

  const [detailsOpen, setDetailsOpen] = useState(true);
  const [referenceOpen] = useState(true);

  const toggleSection = useCallback((setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    void Haptics.selectionAsync();
    setter(prev => !prev);
  }, []);

  const hasPriceSection = !!retailPrice || !!resaleValue || !!valueRating || !!demandLevel;
  const hasResaleSection = isResaleEligible && (!!resaleValue || !!bestPlatform || !!resaleTip || !!demandLevel);

  return (
    <Animated.View style={[st.root, { opacity: resultFade }]}>
      {!showFallback && hasBothImages ? (
        <View style={st.dualImageRow}>
          <View style={st.dualImageWrap}>
            <ExpoImage
              source={{ uri: referenceImageUrl }}
              style={st.dualImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <View style={st.imageBadge}>
              <Sparkles size={9} color="#FFFFFF" />
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
      ) : !showFallback && heroImageUri ? (
        <View style={st.heroImageWrap}>
          <ExpoImage
            source={{ uri: heroImageUri }}
            style={st.heroImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          {isGenerating && (
            <View style={st.generatingOverlay}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={st.generatingText}>Creating reference...</Text>
            </View>
          )}
        </View>
      ) : !showFallback && isGenerating ? (
        <View style={st.genPlaceholder}>
          <ActivityIndicator size="small" color="#0058A3" />
          <Text style={st.genPlaceholderText}>Creating AI reference image...</Text>
        </View>
      ) : showFallback && scannedImageUri ? (
        <View style={st.fallbackImageWrap}>
          <ExpoImage
            source={{ uri: scannedImageUri }}
            style={st.fallbackImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <View style={st.fallbackImageOverlay}>
            <View style={st.fallbackImageBadge}>
              <AlertTriangle size={11} color="#D97706" />
              <Text style={st.fallbackImageBadgeText}>Unclear Scan</Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={st.content}>
        {showFallback ? (
          <LowConfidenceFallback result={result} onScanAgain={onScanAgain} />
        ) : (
          <>
            <View style={st.badgeRow}>
              <ConfidencePill tier={tier} confidence={result.confidence} />
              <CategoryPill itemType={result.item_type} label={typeConfig.label} />
            </View>

            {isIkea && (
              <View style={st.ikeaRow}>
                <View style={st.ikeaBadge}>
                  <Sofa size={11} color="#0058A3" />
                  <Text style={st.ikeaBadgeText}>IKEA</Text>
                </View>
                {result.furniture_details?.ikea_match_confidence && (
                  <View style={st.ikeaConfChip}>
                    <Text style={st.ikeaConfChipText}>
                      {result.furniture_details.ikea_match_confidence === 'exact' ? 'Exact Match' :
                       result.furniture_details.ikea_match_confidence === 'strong' ? 'Strong Match' :
                       result.furniture_details.ikea_match_confidence === 'possible' ? 'Possible Match' : 'Possible'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <Text style={st.itemName}>{result.item_name}</Text>

            <View style={st.subHeaderRow}>
              <Text style={st.categoryLabel}>{categoryLabel}</Text>
              {retailPrice && (
                <View style={st.inlinePriceBadge}>
                  <DollarSign size={12} color={typeConfig.color} />
                  <Text style={[st.inlinePriceText, { color: typeConfig.color }]}>{retailPrice}</Text>
                </View>
              )}
            </View>

            {description.length > 0 && (
              <View style={st.summaryCard}>
                <Text style={st.summaryText}>{description}</Text>
              </View>
            )}

            {tier === 'medium' && (
              <View style={st.partialNotice}>
                <CircleDot size={14} color="#D97706" />
                <View style={st.partialNoticeContent}>
                  <Text style={st.partialNoticeTitle}>Partial Identification</Text>
                  <Text style={st.partialNoticeDesc}>Some details are estimated. Scan a label or tag for a full match.</Text>
                </View>
              </View>
            )}

            <SectionCard
              title="Product Details"
              icon={Info}
              iconColor={typeConfig.color}
              iconBg={typeConfig.bg}
              collapsed={!detailsOpen}
              onToggle={() => toggleSection(setDetailsOpen)}
              testID="product-details-section"
            >
              <View style={st.rendererWrap}>
                {result.item_type === 'food' && <FoodResultSection result={result} />}
                {result.item_type === 'grocery' && <GroceryResultSection result={result} />}
                {result.item_type === 'furniture' && <FurnitureResultSection result={result} />}
                {result.item_type === 'fashion' && <FashionResultSection result={result} />}
                {result.item_type === 'electronics' && <ElectronicsResultSection result={result} />}
                {result.item_type === 'household' && <HouseholdResultSection result={result} />}
                {result.item_type === 'general' && <GeneralResultSection result={result} />}
                {result.item_type === 'document' && <DocumentResultSection result={result} />}
                {result.item_type === 'unknown' && <UnknownResultSection result={result} />}
                {result.item_type === 'receipt' && <DocumentResultSection result={result} />}
              </View>
            </SectionCard>

            {hasPriceSection && !isDocument && !isReceipt && (
              <SectionCard
                title="Price & Value"
                icon={DollarSign}
                iconColor="#059669"
                iconBg="#ECFDF5"
                testID="price-value-section"
              >
                {retailPrice && <PriceRow label="Retail Price" value={retailPrice} large />}
                {resaleValue && <PriceRow label="Resale Value" value={resaleValue} />}
                {valueRating && <DetailRow label="Value Rating" value={valueRating} />}
                {demandLevel && (
                  <View style={st.demandRow}>
                    <Text style={st.detailLabel}>Demand</Text>
                    <DemandBadge level={demandLevel} />
                  </View>
                )}
                {valueInsight && (
                  <View style={st.insightCard}>
                    <Lightbulb size={13} color="#D97706" />
                    <Text style={st.insightText}>{valueInsight}</Text>
                  </View>
                )}
              </SectionCard>
            )}

            {hasResaleSection && (
              <SectionCard
                title="Resale Intel"
                icon={TrendingUp}
                iconColor="#10B981"
                iconBg="#ECFDF5"
                testID="resale-intel-section"
              >
                {bestPlatform && (
                  <View style={st.platformRow}>
                    <Store size={14} color="#0058A3" />
                    <View style={st.platformInfo}>
                      <Text style={st.platformLabel}>Best Platform</Text>
                      <Text style={st.platformValue}>{bestPlatform}</Text>
                    </View>
                  </View>
                )}
                {resaleTip && (
                  <View style={st.insightCard}>
                    <Award size={13} color="#059669" />
                    <Text style={st.insightText}>{resaleTip}</Text>
                  </View>
                )}
              </SectionCard>
            )}

            {relatedItems.length > 0 && (
              <SectionCard
                title="Items That Go With This"
                icon={Package}
                iconColor="#6366F1"
                iconBg="#EEF2FF"
                testID="related-items-section"
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.relatedScroll}>
                  {relatedItems.map((item, i) => (
                    <View key={`related-${i}`} style={st.relatedChip}>
                      <Package size={14} color="#6366F1" />
                      <Text style={st.relatedChipText} numberOfLines={2}>{item}</Text>
                    </View>
                  ))}
                </ScrollView>
              </SectionCard>
            )}

            {careTip && !isFood && !isDocument && !isReceipt && (
              <View style={st.tipCard}>
                <View style={st.tipIconWrap}>
                  <Lightbulb size={14} color="#F59E0B" />
                </View>
                <View style={st.tipContent}>
                  <Text style={st.tipTitle}>Care Tip</Text>
                  <Text style={st.tipText}>{careTip}</Text>
                </View>
              </View>
            )}

            <ReferenceSection
              result={result}
              referenceImageUrl={referenceImageUrl}
              visible={referenceOpen}
            />

            <ResaleInsightsSection result={result} />

            {tags.length > 0 && (
              <View style={st.tagsSection}>
                <View style={st.tagsWrap}>
                  {tags.map((tag, i) => (
                    <View key={`tag-${i}`} style={st.tagChip}>
                      <Text style={st.tagText}>#{tag.toLowerCase().replace(/\s+/g, '')}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [st.primaryBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
              onPress={onScanAgain}
              testID="scan-another-btn"
            >
              <Camera size={18} color="#FFFFFF" />
              <Text style={st.primaryBtnText}>Scan Another Item</Text>
            </Pressable>
          </>
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
  root: { flex: 1 },

  heroImageWrap: {
    width: '100%',
    height: 280,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  heroImage: { width: '100%', height: '100%' },

  dualImageRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  dualImageWrap: {
    flex: 1,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    position: 'relative',
  },
  dualImage: { width: '100%', height: '100%' },
  imageBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  imageBadgeText: { fontSize: 10, fontWeight: '600' as const, color: '#FFFFFF' },

  fallbackImageWrap: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  fallbackImage: { width: '100%', height: '100%', opacity: 0.6 },
  fallbackImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  fallbackImageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(217,119,6,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  fallbackImageBadgeText: { fontSize: 12, fontWeight: '700' as const, color: '#FDE68A' },

  genPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#F0F7FF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#B8D4F0',
  },
  genPlaceholderText: { fontSize: 13, fontWeight: '600' as const, color: '#0058A3' },

  generatingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 10,
  },
  generatingText: { fontSize: 12, fontWeight: '600' as const, color: '#FFFFFF' },

  content: { paddingBottom: 20 },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },

  confPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  confPillText: { fontSize: 11, fontWeight: '700' as const },
  confPctChip: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginLeft: 2 },
  confPctText: { fontSize: 9, fontWeight: '800' as const },

  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catPillText: { fontSize: 11, fontWeight: '700' as const },

  ikeaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  ikeaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFDA1A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  ikeaBadgeText: { fontSize: 11, fontWeight: '800' as const, color: '#0058A3' },
  ikeaConfChip: { backgroundColor: '#0058A312', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ikeaConfChipText: { fontSize: 10, fontWeight: '600' as const, color: '#0058A3' },

  itemName: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#111111',
    letterSpacing: -0.6,
    marginBottom: 4,
    lineHeight: 32,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  categoryLabel: { fontSize: 14, fontWeight: '500' as const, color: '#8E8E93' },
  inlinePriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F0F7FF',
  },
  inlinePriceText: { fontSize: 16, fontWeight: '800' as const, letterSpacing: -0.3 },

  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryText: { fontSize: 14, color: '#475569', lineHeight: 21, fontWeight: '500' as const },

  partialNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  partialNoticeContent: { flex: 1 },
  partialNoticeTitle: { fontSize: 13, fontWeight: '700' as const, color: '#92400E', marginBottom: 2 },
  partialNoticeDesc: { fontSize: 12, fontWeight: '500' as const, color: '#A16207', lineHeight: 17 },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionCardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#111111',
    letterSpacing: -0.2,
  },
  sectionCardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    paddingTop: 14,
  },

  rendererWrap: {},

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  detailLabel: { fontSize: 13, fontWeight: '500' as const, color: '#6B7280' },
  detailValue: { fontSize: 13, fontWeight: '600' as const, color: '#111111', maxWidth: '55%' as unknown as number, textAlign: 'right' as const },
  detailValueBold: { fontWeight: '800' as const },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  priceLabel: { fontSize: 13, fontWeight: '600' as const, color: '#6B7280' },
  priceLabelLg: { fontSize: 14, fontWeight: '700' as const, color: '#111111' },
  priceValue: { fontSize: 16, fontWeight: '700' as const, color: '#111111' },
  priceValueLg: { fontSize: 24, fontWeight: '900' as const, color: '#111111', letterSpacing: -0.5 },

  demandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  demandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  demandText: { fontSize: 11, fontWeight: '700' as const },

  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  insightText: { flex: 1, fontSize: 12, fontWeight: '500' as const, color: '#78716C', lineHeight: 17 },

  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  platformInfo: { flex: 1 },
  platformLabel: { fontSize: 11, fontWeight: '500' as const, color: '#6B7280' },
  platformValue: { fontSize: 15, fontWeight: '800' as const, color: '#111111' },

  relatedScroll: { gap: 8, paddingRight: 4 },
  relatedChip: {
    width: 110,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  relatedChipText: { fontSize: 12, fontWeight: '600' as const, color: '#111111', textAlign: 'center', lineHeight: 16 },

  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 12, fontWeight: '700' as const, color: '#92400E', marginBottom: 3 },
  tipText: { fontSize: 13, fontWeight: '500' as const, color: '#78716C', lineHeight: 19 },

  tagsSection: {
    marginTop: 4,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  tagChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tagText: { fontSize: 11, fontWeight: '500' as const, color: '#6B7280' },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#0058A3',
    marginTop: 8,
    marginBottom: 8,
    shadowColor: '#003E75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 2,
  },
  deleteText: { fontSize: 13, fontWeight: '600' as const, color: '#EF4444' },

  lowConfContainer: { paddingTop: 4 },
  lowConfHeader: { alignItems: 'center', marginBottom: 20 },
  lowConfIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  lowConfTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#111111',
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  lowConfDesc: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  scanTipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  scanTipsTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#111111',
    letterSpacing: -0.2,
    marginBottom: 14,
  },
  scanTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  scanTipIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    flex: 1,
  },
});
