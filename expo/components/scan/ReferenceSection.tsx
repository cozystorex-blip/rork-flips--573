import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Link2, Wrench, BookOpen, RefreshCw } from 'lucide-react-native';
import { ScannerColors, ScannerRadius, ScannerSpacing } from '@/constants/scannerTheme';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import type { SmartScanResult } from '@/services/smartScanService';

const referenceSchema = z.object({
  goes_with: z.array(z.string()).max(2),
  you_may_need: z.array(z.string()).max(5),
  ai_reference_description: z.string(),
});

type ReferenceData = z.infer<typeof referenceSchema>;

interface ReferenceSectionProps {
  result: SmartScanResult;
  referenceImageUrl: string | null;
  visible: boolean;
}

function getComplementaryItems(result: SmartScanResult): string[] {
  if (result.furniture_details?.complementary_items?.length) return result.furniture_details.complementary_items;
  if (result.fashion_details?.complementary_items?.length) return result.fashion_details.complementary_items;
  if (result.electronics_details?.complementary_items?.length) return result.electronics_details.complementary_items;
  if (result.household_details?.complementary_items?.length) return result.household_details.complementary_items;
  if (result.grocery_details?.complementary_items?.length) return result.grocery_details.complementary_items;
  if (result.food_details?.complementary_items?.length) return result.food_details.complementary_items;
  if (result.general_details?.complementary_items?.length) return result.general_details.complementary_items;
  return [];
}

function getToolsNeeded(result: SmartScanResult): string[] {
  if (result.furniture_details?.likely_tools_needed?.length) return result.furniture_details.likely_tools_needed;
  if (result.furniture_details?.extra_purchase_items?.length) {
    return result.furniture_details.extra_purchase_items.map(i => i.item);
  }
  if (result.grocery_details?.what_else_needed?.length) return result.grocery_details.what_else_needed;
  return [];
}

function buildFallbackFromResult(result: SmartScanResult): ReferenceData | null {
  const complementary = getComplementaryItems(result);
  const tools = getToolsNeeded(result);

  if (complementary.length === 0 && tools.length === 0) {
    return null;
  }

  return {
    goes_with: complementary.slice(0, 2),
    you_may_need: tools.length > 0 ? tools.slice(0, 5) : complementary.slice(2, 7),
    ai_reference_description: result.short_summary ?? `${result.item_name} reference`,
  };
}

function useReferenceData(result: SmartScanResult, visible: boolean) {
  const [data, setData] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [hasAttempted, setHasAttempted] = useState<boolean>(false);
  const fetchedRef = useRef<string | null>(null);
  const retryCountRef = useRef<number>(0);

  const fetchData = useCallback((force?: boolean) => {
    const key = result.item_name + result.item_type;

    if (!force && fetchedRef.current === key && data !== null) {
      console.log('[Reference] Already have data for:', key);
      return;
    }

    fetchedRef.current = key;
    retryCountRef.current = force ? retryCountRef.current + 1 : 0;

    const fallback = buildFallbackFromResult(result);
    if (fallback) {
      console.log('[Reference] Using existing scan data for reference');
      setData(fallback);
      setLoading(false);
      setError(false);
      setHasAttempted(true);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    void (async () => {
      try {
        console.log('[Reference] Generating reference data via AI for:', result.item_name);
        const generated = await generateObject({
          messages: [
            {
              role: 'user',
              content: `Given this item: "${result.item_name}" (category: ${result.category}, type: ${result.item_type}).

Return practical reference info:
1. "goes_with": 1-2 items that are commonly used alongside this item (e.g. puzzle rack → puzzle accessories). Keep short.
2. "you_may_need": 3-5 practical items/tools someone may need when using or setting up this item (e.g. screwdriver, wall anchors). One line each.
3. "ai_reference_description": A single sentence describing a typical usage or setup of this item.

Be practical and specific. No marketing language.`,
            },
          ],
          schema: referenceSchema,
        });
        if (!cancelled) {
          console.log('[Reference] AI reference data received');
          setData(generated);
          setError(false);
        }
      } catch (err) {
        console.log('[Reference] Failed to generate reference data:', err);
        if (!cancelled) {
          setError(true);
          const basicFallback: ReferenceData = {
            goes_with: [],
            you_may_need: [],
            ai_reference_description: result.short_summary ?? `${result.item_name} — ${result.category ?? 'item'}`,
          };
          setData(basicFallback);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHasAttempted(true);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [result, data]);

  useEffect(() => {
    if (!visible) return;

    const key = result.item_name + result.item_type;
    if (fetchedRef.current === key && data !== null) return;

    fetchData();
  }, [visible, result, fetchData, data]);

  return { data, loading, error, hasAttempted, retry: () => fetchData(true) };
}

const ReferenceSection = React.memo(function ReferenceSection({ result, referenceImageUrl, visible }: ReferenceSectionProps) {
  const expandAnim = useRef(new Animated.Value(0)).current;
  const { data, loading, error, hasAttempted, retry } = useReferenceData(result, visible);

  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [visible, expandAnim]);

  if (!visible && !hasAttempted) return null;

  const maxHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 900],
  });
  const opacity = expandAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });

  const hasGosWith = data && data.goes_with.length > 0;
  const hasYouMayNeed = data && data.you_may_need.length > 0;
  const hasRefImage = !!referenceImageUrl;
  const hasDescription = data && data.ai_reference_description && data.ai_reference_description.length > 0;
  const hasAnyContent = hasGosWith || hasYouMayNeed || hasRefImage || hasDescription || loading;

  return (
    <Animated.View style={[st.wrapper, { maxHeight, opacity }]}>
      <View style={st.container}>
        <View style={st.headerRow}>
          <View style={st.headerIconWrap}>
            <BookOpen size={14} color="#3B82F6" />
          </View>
          <Text style={st.headerTitle}>Reference</Text>
          {error && !loading && (
            <Pressable onPress={retry} hitSlop={10} style={st.retryBtn}>
              <RefreshCw size={12} color={ScannerColors.accent} />
              <Text style={st.retryText}>Retry</Text>
            </Pressable>
          )}
        </View>

        {loading && (
          <View style={st.loadingWrap}>
            <ActivityIndicator size="small" color={ScannerColors.accent} />
            <Text style={st.loadingText}>Loading reference...</Text>
          </View>
        )}

        {!loading && data && (
          <View style={st.content}>
            {hasDescription && !hasGosWith && !hasYouMayNeed && !hasRefImage && (
              <View style={st.section}>
                <Text style={st.descriptionText}>{data.ai_reference_description}</Text>
              </View>
            )}

            {hasGosWith && (
              <View style={st.section}>
                <View style={st.sectionHeader}>
                  <Link2 size={12} color="#0D9488" />
                  <Text style={st.sectionTitle}>Goes with this</Text>
                </View>
                {data.goes_with.map((item, i) => (
                  <View key={`gw-${i}`} style={st.itemRow}>
                    <View style={[st.itemDot, { backgroundColor: '#0D9488' }]} />
                    <Text style={st.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {hasYouMayNeed && (
              <View style={st.section}>
                <View style={st.sectionHeader}>
                  <Wrench size={12} color="#F59E0B" />
                  <Text style={st.sectionTitle}>You may need</Text>
                </View>
                {data.you_may_need.map((item, i) => (
                  <View key={`ymn-${i}`} style={st.itemRow}>
                    <View style={[st.itemDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={st.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {hasRefImage && (
              <View style={st.section}>
                <View style={st.sectionHeader}>
                  <BookOpen size={12} color="#3B82F6" />
                  <Text style={st.sectionTitle}>AI reference</Text>
                </View>
                <View style={st.refImageWrap}>
                  <ExpoImage
                    source={{ uri: referenceImageUrl }}
                    style={st.refImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                </View>
                {hasDescription && (hasGosWith || hasYouMayNeed) ? (
                  <Text style={st.refCaption}>{data.ai_reference_description}</Text>
                ) : null}
              </View>
            )}

            {hasDescription && (hasGosWith || hasYouMayNeed) && !hasRefImage && (
              <View style={st.descriptionCard}>
                <Text style={st.descriptionText}>{data.ai_reference_description}</Text>
              </View>
            )}
          </View>
        )}

        {!loading && !hasAnyContent && visible && (
          <View style={st.loadingWrap}>
            <Text style={st.loadingText}>No reference data available</Text>
          </View>
        )}

        <View style={st.disclaimer}>
          <Text style={st.disclaimerText}>Suggestions only — may not be exact</Text>
        </View>
      </View>
    </Animated.View>
  );
});

export default ReferenceSection;

const st = StyleSheet.create({
  wrapper: {
    overflow: 'hidden' as const,
    marginBottom: ScannerSpacing.md,
  },
  container: {
    backgroundColor: ScannerColors.card,
    borderRadius: ScannerRadius.xxl,
    borderWidth: 1,
    borderColor: ScannerColors.cardBorder,
    padding: ScannerSpacing.lg,
    marginTop: ScannerSpacing.sm,
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: ScannerSpacing.md,
  },
  headerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: ScannerRadius.sm,
    backgroundColor: '#3B82F618',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: ScannerColors.text,
    letterSpacing: -0.3,
    flex: 1,
  },
  retryBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: ScannerRadius.sm,
    backgroundColor: ScannerColors.accentSoft,
  },
  retryText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: ScannerColors.accent,
  },
  loadingWrap: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: ScannerSpacing.lg,
    justifyContent: 'center' as const,
  },
  loadingText: {
    fontSize: 13,
    color: ScannerColors.textMuted,
    fontWeight: '500' as const,
  },
  content: {
    gap: ScannerSpacing.lg,
  },
  section: {
    gap: 6,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: ScannerColors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  itemRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 3,
    paddingLeft: 4,
  },
  itemDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  itemText: {
    fontSize: 14,
    color: ScannerColors.textSecondary,
    fontWeight: '500' as const,
    flex: 1,
  },
  refImageWrap: {
    borderRadius: ScannerRadius.lg,
    overflow: 'hidden' as const,
    backgroundColor: ScannerColors.surface,
    borderWidth: 1,
    borderColor: ScannerColors.divider,
  },
  refImage: {
    width: '100%' as const,
    height: 160,
    borderRadius: ScannerRadius.lg,
  },
  refCaption: {
    fontSize: 12,
    color: ScannerColors.textMuted,
    fontWeight: '500' as const,
    marginTop: 6,
    lineHeight: 17,
  },
  descriptionCard: {
    backgroundColor: ScannerColors.surface,
    borderRadius: ScannerRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: ScannerColors.divider,
  },
  descriptionText: {
    fontSize: 13,
    color: ScannerColors.textSecondary,
    fontWeight: '500' as const,
    lineHeight: 19,
  },
  disclaimer: {
    marginTop: ScannerSpacing.md,
    paddingTop: ScannerSpacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ScannerColors.divider,
  },
  disclaimerText: {
    fontSize: 11,
    color: ScannerColors.textDim,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
});
