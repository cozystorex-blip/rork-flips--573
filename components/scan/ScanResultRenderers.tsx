import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Flame,
  Zap,
  Leaf,
  Droplets,
  Info,
  Tag,
  Package,
  Sofa,
  HelpCircle,
  Star,
  Wrench,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  Weight,
  Hammer,
  AlertTriangle,
  Clock,
  Users,
  Home,
  ShoppingCart,
  CircleDollarSign,
  BadgeCheck,
  ArrowDownRight,
  Shirt,
  Sparkles,
  Cpu,
  TrendingDown,
  BarChart3,
  MapPin,
  Truck,
  ThumbsUp,
  Lightbulb,
  Gem,
  BookOpen,
  Shield,
  Grid3X3,
  Layers,
  Banknote,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { SmartScanResult } from '@/services/smartScanService';

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

function getResaleValue(result: SmartScanResult): { value: string | null; label: string } {
  if (result.fashion_details?.estimated_resale_value) return { value: result.fashion_details.estimated_resale_value, label: 'Est. Resale' };
  if (result.electronics_details?.estimated_resale_value) return { value: result.electronics_details.estimated_resale_value, label: 'Est. Resale' };
  if (result.household_details?.estimated_resale_value) return { value: result.household_details.estimated_resale_value, label: 'Est. Resale' };
  if (result.furniture_details?.estimated_resale_value) return { value: result.furniture_details.estimated_resale_value, label: 'Est. Resale' };
  if (result.general_details?.estimated_resale_value) return { value: result.general_details.estimated_resale_value, label: 'Est. Resale' };
  if (result.item_type === 'food' || result.item_type === 'grocery') return { value: null, label: 'Consumable' };
  return { value: null, label: 'Resale' };
}

function ResellValueSection({ result }: { result: SmartScanResult }) {
  const resaleInfo = getResaleValue(result);
  const isConsumable = result.item_type === 'food' || result.item_type === 'grocery';
  const hasValue = resaleInfo.value !== null;
  const displayVal = hasValue ? (resaleInfo.value!.startsWith('$') ? resaleInfo.value! : '$' + resaleInfo.value!) : null;

  const resaleDemand = result.fashion_details?.resale_demand
    ?? result.electronics_details?.resale_demand
    ?? result.general_details?.resale_demand
    ?? result.furniture_details?.resale_demand
    ?? result.household_details?.resale_potential
    ?? null;

  const bestPlatform = result.fashion_details?.best_selling_platform
    ?? result.electronics_details?.best_selling_platform
    ?? result.general_details?.best_selling_platform
    ?? result.household_details?.best_selling_platform
    ?? null;

  const resaleSuggestion = result.fashion_details?.resale_suggestion
    ?? result.electronics_details?.resale_suggestion
    ?? result.general_details?.resale_suggestion
    ?? result.household_details?.resale_suggestion
    ?? result.furniture_details?.resale_suggestion
    ?? null;

  if (isConsumable) {
    return (
      <>
        <View style={s.divider} />
        <Text style={s.sectionLabel}>RESELL VALUE</Text>
        <View style={s.resellNaCard}>
          <Banknote size={16} color="#9CA3AF" />
          <View style={s.resellNaContent}>
            <Text style={s.resellNaTitle}>Not Resellable</Text>
            <Text style={s.resellNaDesc}>Consumable items don't have resale value</Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <View style={s.divider} />
      <Text style={s.sectionLabel}>RESELL VALUE</Text>
      {hasValue ? (
        <View style={s.resellCard}>
          <View style={s.resellValueRow}>
            <Banknote size={18} color="#059669" />
            <View style={s.resellValueContent}>
              <Text style={s.resellValueLabel}>Estimated Resale</Text>
              <Text style={s.resellValueAmount}>{displayVal}</Text>
            </View>
          </View>
          {resaleDemand && (
            <View style={s.resellMetaRow}>
              <BarChart3 size={12} color="#6B7280" />
              <Text style={s.resellMetaText}>Demand: <Text style={s.resellMetaBold}>{capitalize(resaleDemand)}</Text></Text>
            </View>
          )}
          {bestPlatform && (
            <View style={s.resellMetaRow}>
              <TrendingUp size={12} color="#6B7280" />
              <Text style={s.resellMetaText}>Best on <Text style={s.resellMetaBold}>{bestPlatform}</Text></Text>
            </View>
          )}
          {resaleSuggestion && (
            <View style={s.resellTipRow}>
              <Lightbulb size={12} color="#D97706" />
              <Text style={s.resellTipText}>{resaleSuggestion}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={s.resellNaCard}>
          <Banknote size={16} color="#9CA3AF" />
          <View style={s.resellNaContent}>
            <Text style={s.resellNaTitle}>Resale Value Unavailable</Text>
            <Text style={s.resellNaDesc}>Not enough data to estimate resale value for this item</Text>
          </View>
        </View>
      )}
    </>
  );
}

function GoesWithSection({ result }: { result: SmartScanResult }) {
  const complementary = result.food_details?.complementary_items
    ?? result.grocery_details?.complementary_items
    ?? result.household_details?.complementary_items
    ?? result.furniture_details?.complementary_items
    ?? result.fashion_details?.complementary_items
    ?? result.electronics_details?.complementary_items
    ?? result.general_details?.complementary_items
    ?? [];

  if (complementary.length === 0) return null;

  return (
    <>
      <View style={s.divider} />
      <Text style={s.sectionLabel}>ITEMS THAT GO WITH THIS</Text>
      <View style={s.goesWithGrid}>
        {complementary.map((item, i) => (
          <View key={`comp-${item}-${i}`} style={s.goesWithChip}>
            <Layers size={11} color="#6D28D9" />
            <Text style={s.goesWithText}>{item}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

interface ResultProps {
  result: SmartScanResult;
}

function GridCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.fashionCell}>
      <Text style={s.fashionCellLabel}>{label}</Text>
      <Text style={s.fashionCellValue}>{value}</Text>
    </View>
  );
}

function PriceCard({ retailPrice, resaleValue, priceRange, retailColor }: {
  retailPrice?: string | null;
  resaleValue?: string | null;
  priceRange?: string | null;
  retailColor: string;
}) {
  return (
    <View style={s.priceCard}>
      {retailPrice && (
        <View style={s.priceRow}>
          <DollarSign size={14} color={retailColor} />
          <Text style={s.priceLabel}>Retail Price</Text>
          <Text style={s.priceValue}>{retailPrice}</Text>
        </View>
      )}
      {resaleValue && (
        <View style={s.priceRow}>
          <TrendingUp size={14} color="#059669" />
          <Text style={s.priceLabel}>Resale Value</Text>
          <Text style={s.priceValue}>{resaleValue}</Text>
        </View>
      )}
      {priceRange && (
        <View style={s.priceRow}>
          <Tag size={14} color={Colors.textSecondary} />
          <Text style={s.priceLabel}>Range</Text>
          <Text style={s.priceValue}>{priceRange}</Text>
        </View>
      )}
    </View>
  );
}

function DemandRow({ demand }: { demand: string }) {
  return (
    <View style={s.detailRow}>
      <BarChart3 size={13} color={Colors.textSecondary} />
      <Text style={s.detailLabel}>Demand</Text>
      <View style={[s.demandBadge, {
        backgroundColor: demand === 'high' ? '#ECFDF5' : demand === 'moderate' ? '#FFFBEB' : '#F3F4F6',
      }]}>
        <Text style={[s.demandBadgeText, {
          color: demand === 'high' ? '#059669' : demand === 'moderate' ? '#D97706' : '#6B7280',
        }]}>{capitalize(demand)} Demand</Text>
      </View>
    </View>
  );
}

function VerdictCard({ verdict, reasoning, label }: { verdict: string; reasoning?: string; label?: string }) {
  const bgColor = verdict === 'strong' ? '#ECFDF5' : verdict === 'good' ? '#EFF6FF' : verdict === 'fair' ? '#FFFBEB' : '#FEF2F2';
  const borderColor = verdict === 'strong' ? '#A7F3D0' : verdict === 'good' ? '#BFDBFE' : verdict === 'fair' ? '#FDE68A' : '#FECACA';
  const badgeBg = verdict === 'strong' ? '#059669' : verdict === 'good' ? '#2563EB' : verdict === 'fair' ? '#D97706' : '#DC2626';
  const textColor = verdict === 'strong' ? '#065F46' : verdict === 'good' ? '#1E40AF' : verdict === 'fair' ? '#92400E' : '#991B1B';

  return (
    <View style={[s.verdictCard, { backgroundColor: bgColor, borderColor }]}>
      <View style={s.verdictHeader}>
        <View style={[s.verdictBadge, { backgroundColor: badgeBg }]}>
          <Text style={s.verdictBadgeText}>{capitalize(verdict)} {label ?? 'Value'}</Text>
        </View>
      </View>
      {reasoning && <Text style={[s.verdictReasoning, { color: textColor }]}>{reasoning}</Text>}
    </View>
  );
}

export function FoodResultSection({ result }: ResultProps) {
  if (!result.food_details) {
    if (result.general_details) return <GeneralResultSection result={result} />;
    return null;
  }
  const fd = result.food_details;
  return (
    <>
      <Text style={s.servingText}>Per {fd.serving_size}</Text>
      <View style={s.calRow}>
        <Flame size={18} color="#F97316" />
        <Text style={s.calValue}>{fd.calories}</Text>
        <Text style={s.calLabel}>cal</Text>
      </View>
      <View style={s.macroRow}>
        {[
          { val: fd.protein_g, label: 'Protein', color: '#3B82F6' },
          { val: fd.carbs_g, label: 'Carbs', color: '#F59E0B' },
          { val: fd.fat_g, label: 'Fat', color: '#EF4444' },
          { val: fd.fiber_g, label: 'Fiber', color: '#10B981' },
        ].map((m) => (
          <View key={m.label} style={s.macroItem}>
            <View style={[s.macroDot, { backgroundColor: m.color }]} />
            <Text style={s.macroVal}>{m.val}g</Text>
            <Text style={s.macroLabel}>{m.label}</Text>
          </View>
        ))}
      </View>
      {fd.sugar_g > 0 && (
        <View style={s.extraRow}>
          <Droplets size={13} color={Colors.textSecondary} />
          <Text style={s.extraText}>Sugar: {fd.sugar_g}g per serving</Text>
        </View>
      )}
      {fd.health_summary ? (
        <View style={s.summaryCard}>
          <ShieldCheck size={14} color="#16A34A" />
          <Text style={s.summaryText}>{fd.health_summary}</Text>
        </View>
      ) : null}
      <View style={s.divider} />
      <Text style={s.sectionLabel}>PRICE & VALUE</Text>
      <View style={s.priceCard}>
        <View style={s.priceRow}>
          <DollarSign size={14} color="#16A34A" />
          <Text style={s.priceLabel}>Est. Price</Text>
          <Text style={s.priceValue}>{fd.estimated_price || fd.price_range || 'Est. unavailable'}</Text>
        </View>
        {fd.price_range && fd.estimated_price && (
          <View style={s.priceRow}>
            <TrendingUp size={14} color={Colors.textSecondary} />
            <Text style={s.priceLabel}>Range</Text>
            <Text style={s.priceValue}>{fd.price_range}</Text>
          </View>
        )}
        {fd.unit_price && (
          <View style={s.priceRow}>
            <Package size={14} color={Colors.textSecondary} />
            <Text style={s.priceLabel}>Unit Price</Text>
            <Text style={s.priceValue}>{fd.unit_price}</Text>
          </View>
        )}
      </View>
      <View style={s.ratingRow}>
        <Star size={14} color="#F59E0B" />
        <Text style={s.ratingText}>Value: <Text style={s.ratingBold}>{capitalize(fd.value_rating ?? 'average')}</Text></Text>
      </View>
      {fd.budget_insight && (
        <View style={s.insightCard}>
          <CircleDollarSign size={13} color="#2563EB" />
          <Text style={s.insightText}>{fd.budget_insight}</Text>
        </View>
      )}
      {fd.cheaper_alternative && (
        <View style={s.alternativeCard}>
          <ArrowDownRight size={13} color="#059669" />
          <Text style={s.alternativeText}>{fd.cheaper_alternative}</Text>
        </View>
      )}
      <View style={s.divider} />
      <Text style={s.sectionLabel}>KEY NUTRIENTS</Text>
      <View style={s.chipRow}>
        {fd.key_nutrients.map((n, i) => (
          <View key={`${n}-${i}`} style={s.nutrientChip}>
            <Zap size={10} color={Colors.accent} />
            <Text style={s.nutrientChipText}>{n}</Text>
          </View>
        ))}
      </View>
      <Text style={s.sectionLabel}>HEALTH BENEFITS</Text>
      {fd.health_benefits.length > 0 ? (
        fd.health_benefits.map((b, i) => (
          <View key={`${b}-${i}`} style={s.benefitRow}>
            <Leaf size={12} color="#16A34A" />
            <Text style={s.benefitText}>{b}</Text>
          </View>
        ))
      ) : (
        <View style={s.benefitRow}>
          <Leaf size={12} color="#16A34A" />
          <Text style={s.benefitText}>Provides energy and essential nutrients</Text>
        </View>
      )}
      {fd.quick_tip ? (
        <View style={s.tipCard}>
          <Info size={13} color="#2563EB" />
          <Text style={s.tipText}>{fd.quick_tip}</Text>
        </View>
      ) : null}
      <GoesWithSection result={result} />
      {fd.tags.length > 0 && (
        <View style={s.tagsRow}>
          {fd.tags.map((t, i) => (
            <View key={`${t}-${i}`} style={s.tagPill}>
              <Text style={s.tagPillText}>{t}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

export function GroceryResultSection({ result }: ResultProps) {
  if (!result.grocery_details) {
    if (result.general_details) return <GeneralResultSection result={result} />;
    return null;
  }
  const gd = result.grocery_details;
  return (
    <>
      {gd.brand && (
        <View style={s.detailRow}>
          <Tag size={13} color={Colors.textSecondary} />
          <Text style={s.detailLabel}>Brand</Text>
          <Text style={s.detailValue}>{gd.brand}</Text>
        </View>
      )}
      {gd.package_size && (
        <View style={s.detailRow}>
          <Weight size={13} color={Colors.textSecondary} />
          <Text style={s.detailLabel}>Size</Text>
          <Text style={s.detailValue}>{gd.package_size}</Text>
        </View>
      )}
      <View style={s.divider} />
      <Text style={s.sectionLabel}>PRICING</Text>
      <View style={s.priceCard}>
        {gd.estimated_price && (
          <View style={s.priceRow}>
            <DollarSign size={14} color="#16A34A" />
            <Text style={s.priceLabel}>Est. Price</Text>
            <Text style={s.priceValue}>{gd.estimated_price}</Text>
          </View>
        )}
        {gd.price_range && (
          <View style={s.priceRow}>
            <TrendingUp size={14} color={Colors.textSecondary} />
            <Text style={s.priceLabel}>Range</Text>
            <Text style={s.priceValue}>{gd.price_range}</Text>
          </View>
        )}
        {gd.unit_price && (
          <View style={s.priceRow}>
            <Package size={14} color={Colors.textSecondary} />
            <Text style={s.priceLabel}>Unit Price</Text>
            <Text style={s.priceValue}>{gd.unit_price}</Text>
          </View>
        )}
      </View>
      {gd.value_rating && (
        <View style={s.ratingRow}>
          <Star size={14} color="#F59E0B" />
          <Text style={s.ratingText}>Value: <Text style={s.ratingBold}>{capitalize(gd.value_rating)}</Text></Text>
        </View>
      )}
      {gd.budget_insight && (
        <View style={s.insightCard}>
          <CircleDollarSign size={13} color="#2563EB" />
          <Text style={s.insightText}>{gd.budget_insight}</Text>
        </View>
      )}
      {gd.cheaper_alternative && (
        <View style={s.alternativeCard}>
          <ArrowDownRight size={13} color="#059669" />
          <Text style={s.alternativeText}>{gd.cheaper_alternative}</Text>
        </View>
      )}
      {gd.what_else_needed && gd.what_else_needed.length > 0 && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>YOU MAY ALSO NEED</Text>
          <View style={s.whatElseWrap}>
            {gd.what_else_needed.map((item, i) => (
              <View key={`need-${item}-${i}`} style={s.whatElseChip}>
                <ShoppingCart size={10} color="#7C3AED" />
                <Text style={s.whatElseChipText}>{item}</Text>
              </View>
            ))}
          </View>
        </>
      )}
      {gd.total_cost_note && (
        <View style={s.totalCostCard}>
          <AlertTriangle size={13} color="#D97706" />
          <Text style={s.totalCostText}>{gd.total_cost_note}</Text>
        </View>
      )}
      <GoesWithSection result={result} />
      {gd.tags.length > 0 && (
        <View style={s.tagsRow}>
          {gd.tags.map((t, i) => (
            <View key={`${t}-${i}`} style={s.tagPill}>
              <Text style={s.tagPillText}>{t}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

export function FurnitureResultSection({ result }: ResultProps) {
  if (!result.furniture_details) {
    if (result.general_details) return <GeneralResultSection result={result} />;
    return null;
  }
  const fd = result.furniture_details;
  const roomFitLabels = (fd as Record<string, unknown>).room_fit_labels as string[] | undefined;
  const matchingProducts = (fd as Record<string, unknown>).matching_products as string[] | undefined;
  const wallAnchorNote = (fd as Record<string, unknown>).wall_anchor_note as string | null | undefined;
  const setupNotes = (fd as Record<string, unknown>).setup_notes as string | null | undefined;
  const longTermValue = (fd as Record<string, unknown>).long_term_value as string | null | undefined;

  return (
    <>
      <Text style={s.sectionLabel}>PRODUCT DETAILS</Text>
      <View style={s.furnitureGrid}>
        {fd.material && (
          <View style={s.furnitureCell}>
            <Text style={s.furnitureCellLabel}>Material</Text>
            <Text style={s.furnitureCellValue}>{fd.material}</Text>
          </View>
        )}
        {fd.finish_color && (
          <View style={s.furnitureCell}>
            <Text style={s.furnitureCellLabel}>Color / Finish</Text>
            <Text style={s.furnitureCellValue}>{fd.finish_color}</Text>
          </View>
        )}
        {fd.style && (
          <View style={s.furnitureCell}>
            <Text style={s.furnitureCellLabel}>Style</Text>
            <Text style={s.furnitureCellValue}>{fd.style}</Text>
          </View>
        )}
        {fd.value_level && (
          <View style={s.furnitureCell}>
            <Text style={s.furnitureCellLabel}>Price Tier</Text>
            <Text style={s.furnitureCellValue}>{capitalize(fd.value_level)}</Text>
          </View>
        )}
        {fd.estimated_dimensions && (
          <View style={s.furnitureCell}>
            <Text style={s.furnitureCellLabel}>Dimensions</Text>
            <Text style={s.furnitureCellValue}>{fd.estimated_dimensions}</Text>
          </View>
        )}
        {fd.mounting_type && fd.mounting_type !== 'unknown' && (
          <View style={s.furnitureCell}>
            <Text style={s.furnitureCellLabel}>Type</Text>
            <Text style={s.furnitureCellValue}>{capitalize(fd.mounting_type).replace('-', ' ')}</Text>
          </View>
        )}
      </View>
      {fd.use_case && (
        <View style={s.detailRow}>
          <Sofa size={13} color={Colors.textSecondary} />
          <Text style={s.detailLabel}>Use</Text>
          <Text style={s.detailValue}>{fd.use_case}</Text>
        </View>
      )}
      {fd.room_fit && (
        <View style={s.detailRow}>
          <Home size={13} color={Colors.textSecondary} />
          <Text style={s.detailLabel}>Room</Text>
          <Text style={s.detailValue}>{fd.room_fit}</Text>
        </View>
      )}

      <View style={s.divider} />
      <Text style={s.sectionLabel}>PRICE & VALUE</Text>
      <View style={s.priceCard}>
        {fd.estimated_retail_price && (
          <View style={s.priceRow}>
            <DollarSign size={14} color="#0058A3" />
            <Text style={s.priceLabel}>IKEA Price</Text>
            <Text style={s.priceValue}>{fd.estimated_retail_price}</Text>
          </View>
        )}
        {fd.estimated_price_range && (
          <View style={s.priceRow}>
            <Tag size={14} color={Colors.textSecondary} />
            <Text style={s.priceLabel}>Price Range</Text>
            <Text style={s.priceValue}>{fd.estimated_price_range}</Text>
          </View>
        )}
      </View>
      {fd.value_rating && (
        <View style={s.ratingRow}>
          <Star size={14} color="#F59E0B" />
          <Text style={s.ratingText}>Value: <Text style={s.ratingBold}>{capitalize(fd.value_rating)}</Text></Text>
        </View>
      )}
      {fd.value_verdict && <VerdictCard verdict={fd.value_verdict} reasoning={fd.value_reasoning ?? undefined} label="Purchase" />}
      {fd.budget_insight && (
        <View style={s.insightCard}>
          <CircleDollarSign size={13} color="#2563EB" />
          <Text style={s.insightText}>{fd.budget_insight}</Text>
        </View>
      )}
      {fd.cheaper_alternative && (
        <View style={s.alternativeCard}>
          <ArrowDownRight size={13} color="#059669" />
          <Text style={s.alternativeText}>{fd.cheaper_alternative}</Text>
        </View>
      )}

      {longTermValue && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>VALUE INSIGHT</Text>
          <View style={s.ikeaValueCard}>
            <Shield size={14} color="#0058A3" />
            <Text style={s.ikeaValueText}>{longTermValue}</Text>
          </View>
        </>
      )}
      {fd.estimated_resale_value && !longTermValue && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>LONG-TERM VALUE</Text>
          <View style={s.ikeaValueCard}>
            <Shield size={14} color="#0058A3" />
            <Text style={s.ikeaValueText}>Estimated secondhand value: {fd.estimated_resale_value}</Text>
          </View>
        </>
      )}

      <View style={s.divider} />
      <Text style={s.sectionLabel}>TOOLS YOU'LL NEED</Text>
      {fd.assembly_required === false ? (
        <View style={s.noAssemblyCard}>
          <ShieldCheck size={16} color="#16A34A" />
          <Text style={s.noAssemblyText}>No assembly required — ready to use</Text>
        </View>
      ) : (
        <>
          {fd.likely_tools_needed.length > 0 ? (
            <View style={s.ikeaToolsGrid}>
              {fd.likely_tools_needed.map((t, i) => (
                <View key={`tool-${t}-${i}`} style={s.ikeaToolItem}>
                  <View style={s.ikeaToolIconWrap}>
                    <Wrench size={14} color="#0058A3" />
                  </View>
                  <Text style={s.ikeaToolName}>{t}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={s.ikeaToolsGrid}>
              {['Allen key (included)', 'Phillips screwdriver'].map((t, i) => (
                <View key={`tool-default-${i}`} style={s.ikeaToolItem}>
                  <View style={s.ikeaToolIconWrap}>
                    <Wrench size={14} color="#0058A3" />
                  </View>
                  <Text style={s.ikeaToolName}>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <View style={s.divider} />
      <Text style={s.sectionLabel}>ASSEMBLY INFO</Text>
      <View style={s.assemblyDisclaimer}>
        <AlertTriangle size={11} color="#D97706" />
        <Text style={s.assemblyDisclaimerText}>Estimated from image — check IKEA instructions</Text>
      </View>
      {fd.assembly_required === false ? (
        <View style={s.noAssemblyCard}>
          <ShieldCheck size={16} color="#16A34A" />
          <Text style={s.noAssemblyText}>No assembly likely required</Text>
        </View>
      ) : (
        <View style={s.assemblyCard}>
          {fd.assembly_difficulty && (
            <View style={s.assemblyRow}>
              <Hammer size={13} color={Colors.textSecondary} />
              <Text style={s.assemblyLabel}>Difficulty</Text>
              <View style={[s.difficultyBadge, {
                backgroundColor: fd.assembly_difficulty === 'easy' ? '#F0FDF4' : fd.assembly_difficulty === 'moderate' ? '#FFFBEB' : '#FEF2F2',
              }]}>
                <Text style={[s.difficultyText, {
                  color: fd.assembly_difficulty === 'easy' ? '#16A34A' : fd.assembly_difficulty === 'moderate' ? '#D97706' : '#DC2626',
                }]}>{capitalize(fd.assembly_difficulty)}</Text>
              </View>
            </View>
          )}
          {fd.estimated_build_time && (
            <View style={s.assemblyRow}>
              <Clock size={13} color={Colors.textSecondary} />
              <Text style={s.assemblyLabel}>Build Time</Text>
              <Text style={s.assemblyValue}>{fd.estimated_build_time}</Text>
            </View>
          )}
          {fd.people_needed && (
            <View style={s.assemblyRow}>
              <Users size={13} color={Colors.textSecondary} />
              <Text style={s.assemblyLabel}>People Needed</Text>
              <Text style={s.assemblyValue}>{fd.people_needed === '1' ? '1 person' : fd.people_needed === '2' ? '2 people recommended' : '2+ people recommended'}</Text>
            </View>
          )}
          {fd.likely_parts && fd.likely_parts.length > 0 && (
            <>
              <View style={s.toolsSectionHeader}>
                <Package size={13} color={Colors.textSecondary} />
                <Text style={s.assemblyLabel}>Included Hardware</Text>
              </View>
              <View style={s.toolsChipsWrap}>
                {fd.likely_parts.map((p, i) => (
                  <View key={`part-${p}-${i}`} style={s.partChip}>
                    <Text style={s.partChipText}>{p}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      )}
      {fd.assembly_summary && (
        <View style={s.assemblySummaryCard}>
          <Info size={13} color="#92400E" />
          <Text style={s.assemblySummaryText}>{fd.assembly_summary}</Text>
        </View>
      )}
      {setupNotes && (
        <View style={s.ikeaSetupCard}>
          <Lightbulb size={13} color="#0058A3" />
          <Text style={s.ikeaSetupText}>{setupNotes}</Text>
        </View>
      )}
      {wallAnchorNote && (
        <View style={s.ikeaAnchorCard}>
          <ShieldAlert size={13} color="#DC2626" />
          <Text style={s.ikeaAnchorText}>{wallAnchorNote}</Text>
        </View>
      )}

      {matchingProducts && matchingProducts.length > 0 && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>WHAT GOES WITH THIS?</Text>
          <View style={s.ikeaMatchGrid}>
            {matchingProducts.map((mp, i) => (
              <View key={`match-${mp}-${i}`} style={s.ikeaMatchItem}>
                <Grid3X3 size={12} color="#0058A3" />
                <Text style={s.ikeaMatchText}>{mp}</Text>
              </View>
            ))}
          </View>
        </>
      )}
      {fd.similar_products && (
        <View style={s.similarCard}>
          <Tag size={13} color={Colors.textSecondary} />
          <Text style={s.similarText}>{fd.similar_products}</Text>
        </View>
      )}
      {fd.comparable_model && (
        <View style={[s.comparableCard, { backgroundColor: '#E8F4FD', borderColor: '#B3D9F2' }]}>
          <Sofa size={14} color="#0058A3" />
          <View style={s.comparableContent}>
            <Text style={[s.comparableTitle, { color: '#004F93' }]}>Similar IKEA product</Text>
            <Text style={[s.comparableModel, { color: '#0058A3' }]}>{fd.comparable_model}</Text>
          </View>
          <ChevronRight size={14} color="#C7C7CC" />
        </View>
      )}

      {roomFitLabels && roomFitLabels.length > 0 && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>GOOD FOR</Text>
          <View style={s.ikeaRoomLabels}>
            {roomFitLabels.map((label, i) => (
              <View key={`room-${label}-${i}`} style={s.ikeaRoomPill}>
                <Home size={10} color="#0058A3" />
                <Text style={s.ikeaRoomPillText}>{label}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={s.divider} />
      <Text style={s.sectionLabel}>WHAT ELSE YOU MAY NEED</Text>
      {fd.extra_purchase_items && fd.extra_purchase_items.length > 0 ? (
        <View style={s.extraPurchaseList}>
          {fd.extra_purchase_items.map((ep, i) => (
            <View key={`extra-${ep.item}-${i}`} style={s.extraPurchaseRow}>
              <View style={s.extraPurchaseDot} />
              <View style={s.extraPurchaseInfo}>
                <View style={s.extraPurchaseNameRow}>
                  <Text style={s.extraPurchaseName}>{ep.item}</Text>
                  {ep.estimated_cost && <Text style={s.extraPurchaseCost}>{ep.estimated_cost}</Text>}
                </View>
                <Text style={s.extraPurchaseReason}>{ep.reason}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={s.noExtraCard}>
          <BadgeCheck size={14} color="#16A34A" />
          <Text style={s.noExtraText}>Everything you need should be in the box</Text>
        </View>
      )}
      {fd.total_estimated_cost && (
        <View style={[s.totalCostBanner, { backgroundColor: '#0058A3' }]}>
          <DollarSign size={15} color="#FFFFFF" />
          <View style={s.totalCostBannerContent}>
            <Text style={s.totalCostBannerLabel}>Total Estimated Cost</Text>
            <Text style={s.totalCostBannerValue}>{fd.total_estimated_cost}</Text>
          </View>
        </View>
      )}
      {fd.worth_it_verdict && (
        <View style={s.verdictTextCard}>
          <BadgeCheck size={14} color="#059669" />
          <Text style={s.verdictTextValue}>{fd.worth_it_verdict}</Text>
        </View>
      )}
      {fd.resale_suggestion && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>DURABILITY NOTE</Text>
          <View style={s.ikeaValueCard}>
            <Shield size={14} color="#0058A3" />
            <Text style={s.ikeaValueText}>{fd.resale_suggestion}</Text>
          </View>
        </>
      )}
      {fd.care_tip && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>CARE TIP</Text>
          <View style={s.tipCard}>
            <Info size={13} color="#2563EB" />
            <Text style={s.tipText}>{fd.care_tip}</Text>
          </View>
        </>
      )}
      <GoesWithSection result={result} />
      <ResellValueSection result={result} />
      {fd.tags && fd.tags.length > 0 && (
        <View style={s.tagsRow}>
          {fd.tags.map((t, i) => (
            <View key={`${t}-${i}`} style={s.ikeaTagPill}>
              <Text style={s.ikeaTagPillText}>{t}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

export function ShoeResultSection({ result }: ResultProps) {
  if (!result.fashion_details) {
    if (result.general_details) return <GeneralResultSection result={result} />;
    return null;
  }
  const fd = result.fashion_details;
  const shoeModelName = fd.model
    ? (fd.brand ? `${fd.brand} ${fd.model}` : fd.model)
    : (fd.brand ? `${fd.brand} Sneaker` : null);
  const confidenceLevel = result.confidence >= 0.7 ? 'high' : result.confidence >= 0.4 ? 'medium' : 'low' as const;
  const confLabel = confidenceLevel === 'high' ? 'High confidence' : confidenceLevel === 'medium' ? 'Likely match' : 'Estimated';
  const confColor = confidenceLevel === 'high' ? '#059669' : confidenceLevel === 'medium' ? '#D97706' : '#DC2626';
  const confBg = confidenceLevel === 'high' ? '#ECFDF5' : confidenceLevel === 'medium' ? '#FFFBEB' : '#FEF2F2';

  return (
    <>
      <View style={s.shoeIdHero}>
        <Text style={s.shoeIdModelName}>{shoeModelName ?? result.item_name}</Text>
        <View style={s.shoeIdConfRow}>
          <View style={[s.shoeIdConfBadge, { backgroundColor: confBg }]}>
            <Text style={[s.shoeIdConfText, { color: confColor }]}>{confLabel}</Text>
          </View>
        </View>
      </View>
      <View style={s.fashionGrid}>
        {fd.brand && <GridCell label="Brand" value={fd.brand} />}
        {fd.model && <GridCell label="Model" value={fd.model} />}
        <GridCell label="Type" value="Shoes" />
        {fd.condition && <GridCell label="Condition" value={capitalize(fd.condition)} />}
        {fd.color && <GridCell label="Color" value={`${fd.color}${fd.secondary_color ? ` / ${fd.secondary_color}` : ''}`} />}
        {fd.material && <GridCell label="Material" value={fd.material} />}
        {fd.style && <GridCell label="Style" value={fd.style} />}
        {fd.closure_type && <GridCell label="Closure" value={capitalize(fd.closure_type)} />}
        {fd.gender_target && <GridCell label="For" value={capitalize(fd.gender_target)} />}
      </View>
      <View style={s.divider} />
      <Text style={s.sectionLabel}>PRICE & VALUE</Text>
      <PriceCard retailPrice={fd.estimated_retail_price} resaleValue={fd.estimated_resale_value} priceRange={fd.price_range} retailColor="#E11D48" />
      {fd.value_verdict && <VerdictCard verdict={fd.value_verdict} reasoning={fd.value_reasoning ?? undefined} />}
      {fd.resale_demand && <DemandRow demand={fd.resale_demand} />}
      {fd.best_selling_platform && (
        <View style={s.detailRow}>
          <TrendingUp size={13} color={Colors.textSecondary} />
          <Text style={s.detailLabel}>Sell on</Text>
          <Text style={s.detailValue}>{fd.best_selling_platform}</Text>
        </View>
      )}
      {fd.comparable_model && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>COMPARABLE MODEL</Text>
          <View style={s.comparableCard}>
            <Shirt size={14} color="#E11D48" />
            <View style={s.comparableContent}>
              <Text style={s.comparableTitle}>Also consider</Text>
              <Text style={s.comparableModel}>{fd.comparable_model}</Text>
            </View>
            <ChevronRight size={14} color="#C7C7CC" />
          </View>
        </>
      )}
      {fd.resale_suggestion && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>RESALE TIP</Text>
          <View style={s.resaleCard}>
            <TrendingUp size={14} color="#059669" />
            <Text style={s.resaleText}>{fd.resale_suggestion}</Text>
          </View>
        </>
      )}
      {fd.budget_insight && (
        <View style={s.insightCard}>
          <CircleDollarSign size={13} color="#2563EB" />
          <Text style={s.insightText}>{fd.budget_insight}</Text>
        </View>
      )}
      {fd.care_tip && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>CARE TIP</Text>
          <View style={s.tipCard}>
            <Info size={13} color="#2563EB" />
            <Text style={s.tipText}>{fd.care_tip}</Text>
          </View>
        </>
      )}
      {fd.item_description && (
        <View style={[s.fashionDescCard, { marginTop: 12 }]}>
          <Sparkles size={14} color="#E11D48" />
          <Text style={s.fashionDescText}>{fd.item_description}</Text>
        </View>
      )}
      <GoesWithSection result={result} />
      <ResellValueSection result={result} />
      {fd.tags.length > 0 && (
        <View style={s.tagsRow}>
          {fd.tags.map((t, i) => (
            <View key={`${t}-${i}`} style={s.fashionTagPill}>
              <Text style={s.fashionTagPillText}>{t}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

export function FashionResultSection({ result }: ResultProps) {
  if (!result.fashion_details) {
    if (result.general_details) return <GeneralResultSection result={result} />;
    return null;
  }
  const fd = result.fashion_details;
  const isShoe = fd.subcategory === 'shoes';
  const isClothing = ['clothing', 'outerwear', 'activewear'].includes(fd.subcategory);
  const subcategoryLabels: Record<string, string> = {
    shoes: 'Shoes', clothing: 'Clothing', outerwear: 'Outerwear',
    accessories: 'Accessories', bags: 'Bags', jewelry: 'Jewelry',
    activewear: 'Activewear', other: 'Fashion',
  };

  if (isShoe) return <ShoeResultSection result={result} />;

  return (
    <>
      {fd.item_description && (
        <View style={s.fashionDescCard}>
          <Sparkles size={14} color="#E11D48" />
          <Text style={s.fashionDescText}>{fd.item_description}</Text>
        </View>
      )}
      <Text style={s.sectionLabel}>IDENTIFICATION</Text>
      <View style={s.fashionGrid}>
        <GridCell label="Type" value={subcategoryLabels[fd.subcategory] ?? fd.subcategory} />
        {fd.brand && <GridCell label="Brand" value={fd.brand} />}
        {fd.model && <GridCell label="Model" value={fd.model} />}
        {fd.gender_target && <GridCell label="For" value={capitalize(fd.gender_target)} />}
      </View>
      <View style={s.divider} />
      <Text style={s.sectionLabel}>DETAILS</Text>
      <View style={s.fashionGrid}>
        {fd.color && <GridCell label="Color" value={`${fd.color}${fd.secondary_color ? ` / ${fd.secondary_color}` : ''}`} />}
        {fd.material && <GridCell label="Material" value={fd.material} />}
        {fd.style && <GridCell label="Style" value={fd.style} />}
        {isClothing && fd.pattern && fd.pattern !== 'solid' && <GridCell label="Pattern" value={capitalize(fd.pattern)} />}
        {isClothing && fd.fit && <GridCell label="Fit" value={capitalize(fd.fit)} />}
        {isClothing && fd.neckline && <GridCell label="Neckline" value={capitalize(fd.neckline)} />}
        {isClothing && fd.sleeve_length && <GridCell label="Sleeves" value={capitalize(fd.sleeve_length)} />}
        {fd.closure_type && <GridCell label="Closure" value={capitalize(fd.closure_type)} />}
      </View>
      <View style={s.divider} />
      <Text style={s.sectionLabel}>CONDITION</Text>
      <View style={s.fashionGrid}>
        {fd.condition && <GridCell label="Condition" value={capitalize(fd.condition)} />}
        {fd.cleaning_recommendation && fd.cleaning_recommendation !== 'none' && (
          <View style={s.fashionCell}>
            <Text style={s.fashionCellLabel}>Cleaning</Text>
            <Text style={[s.fashionCellValue, {
              color: fd.cleaning_recommendation === 'light' ? '#D97706' : fd.cleaning_recommendation === 'moderate' ? '#EA580C' : '#DC2626',
            }]}>{capitalize(fd.cleaning_recommendation)}</Text>
          </View>
        )}
      </View>
      {fd.condition_notes && (
        <View style={s.clothingConditionCard}>
          <ShieldAlert size={13} color="#92400E" />
          <Text style={s.clothingConditionText}>{fd.condition_notes}</Text>
        </View>
      )}
      {fd.cleaning_reason && (
        <View style={s.clothingCleaningCard}>
          <Droplets size={13} color="#0369A1" />
          <Text style={s.clothingCleaningText}>{fd.cleaning_reason}</Text>
        </View>
      )}
      <View style={s.divider} />
      <Text style={s.sectionLabel}>PRICE & VALUE</Text>
      <PriceCard retailPrice={fd.estimated_retail_price} resaleValue={fd.estimated_resale_value} priceRange={fd.price_range} retailColor="#E11D48" />
      {fd.value_rating && (
        <View style={s.ratingRow}>
          <Star size={14} color="#F59E0B" />
          <Text style={s.ratingText}>Value: <Text style={s.ratingBold}>{capitalize(fd.value_rating)}</Text></Text>
        </View>
      )}
      {fd.resale_demand && <DemandRow demand={fd.resale_demand} />}
      {fd.best_selling_platform && (
        <View style={s.detailRow}>
          <TrendingUp size={13} color={Colors.textSecondary} />
          <Text style={s.detailLabel}>Sell on</Text>
          <Text style={s.detailValue}>{fd.best_selling_platform}</Text>
        </View>
      )}
      {fd.value_verdict && <VerdictCard verdict={fd.value_verdict} reasoning={fd.value_reasoning ?? undefined} />}
      {fd.budget_insight && (
        <View style={s.insightCard}>
          <CircleDollarSign size={13} color="#2563EB" />
          <Text style={s.insightText}>{fd.budget_insight}</Text>
        </View>
      )}
      {fd.cheaper_alternative && (
        <View style={s.alternativeCard}>
          <ArrowDownRight size={13} color="#059669" />
          <Text style={s.alternativeText}>{fd.cheaper_alternative}</Text>
        </View>
      )}
      {fd.comparable_model && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>COMPARABLE ITEM</Text>
          <View style={s.comparableCard}>
            <Shirt size={14} color="#E11D48" />
            <View style={s.comparableContent}>
              <Text style={s.comparableTitle}>Also consider</Text>
              <Text style={s.comparableModel}>{fd.comparable_model}</Text>
            </View>
            <ChevronRight size={14} color="#C7C7CC" />
          </View>
        </>
      )}
      {fd.resale_suggestion && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>RESALE TIP</Text>
          <View style={s.resaleCard}>
            <TrendingUp size={14} color="#059669" />
            <Text style={s.resaleText}>{fd.resale_suggestion}</Text>
          </View>
        </>
      )}
      {fd.care_tip && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>CARE TIP</Text>
          <View style={s.tipCard}>
            <Info size={13} color="#2563EB" />
            <Text style={s.tipText}>{fd.care_tip}</Text>
          </View>
        </>
      )}
      <GoesWithSection result={result} />
      <ResellValueSection result={result} />
      {fd.tags.length > 0 && (
        <View style={s.tagsRow}>
          {fd.tags.map((t, i) => (
            <View key={`${t}-${i}`} style={s.fashionTagPill}>
              <Text style={s.fashionTagPillText}>{t}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

export function ElectronicsResultSection({ result }: ResultProps) {
  if (!result.electronics_details) {
    if (result.general_details) return <GeneralResultSection result={result} />;
    return null;
  }
  const ed = result.electronics_details;
  return (
    <>
      {ed.product_type && (
        <View style={s.electronicsDescCard}>
          <Cpu size={14} color="#0284C7" />
          <Text style={s.electronicsDescText}>
            {ed.brand ? `${ed.brand} ` : ''}{ed.model ?? ed.product_type}
            {ed.storage_or_spec ? ` · ${ed.storage_or_spec}` : ''}
          </Text>
        </View>
      )}
      <View style={s.fashionGrid}>
        <GridCell label="Type" value={ed.product_type} />
        {ed.brand && <GridCell label="Brand" value={ed.brand} />}
        {ed.model && <GridCell label="Model" value={ed.model} />}
        {ed.storage_or_spec && <GridCell label="Spec" value={ed.storage_or_spec} />}
        {ed.condition && <GridCell label="Condition" value={capitalize(ed.condition)} />}
      </View>
      <View style={s.divider} />
      <Text style={s.sectionLabel}>PRICE & VALUE</Text>
      <PriceCard retailPrice={ed.estimated_retail_price} resaleValue={ed.estimated_resale_value} priceRange={ed.price_range} retailColor="#0284C7" />
      {ed.value_rating && (
        <View style={s.ratingRow}>
          <Star size={14} color="#F59E0B" />
          <Text style={s.ratingText}>Value: <Text style={s.ratingBold}>{capitalize(ed.value_rating)}</Text></Text>
        </View>
      )}
      {ed.depreciation_note && (
        <View style={s.depreciationCard}>
          <TrendingDown size={13} color="#DC2626" />
          <Text style={s.depreciationText}>{ed.depreciation_note}</Text>
        </View>
      )}
      {ed.resale_demand && <DemandRow demand={ed.resale_demand} />}
      {ed.best_selling_platform && (
        <View style={s.detailRow}>
          <TrendingUp size={13} color={Colors.textSecondary} />
          <Text style={s.detailLabel}>Sell on</Text>
          <Text style={s.detailValue}>{ed.best_selling_platform}</Text>
        </View>
      )}
      {ed.value_verdict && <VerdictCard verdict={ed.value_verdict} reasoning={ed.value_reasoning ?? undefined} />}
      {ed.budget_insight && (
        <View style={s.insightCard}>
          <CircleDollarSign size={13} color="#2563EB" />
          <Text style={s.insightText}>{ed.budget_insight}</Text>
        </View>
      )}
      {ed.cheaper_alternative && (
        <View style={s.alternativeCard}>
          <ArrowDownRight size={13} color="#059669" />
          <Text style={s.alternativeText}>{ed.cheaper_alternative}</Text>
        </View>
      )}
      {ed.comparable_model && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>COMPARABLE PRODUCT</Text>
          <View style={[s.comparableCard, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
            <Cpu size={14} color="#0284C7" />
            <View style={s.comparableContent}>
              <Text style={[s.comparableTitle, { color: '#0C4A6E' }]}>Also consider</Text>
              <Text style={[s.comparableModel, { color: '#0369A1' }]}>{ed.comparable_model}</Text>
            </View>
            <ChevronRight size={14} color="#C7C7CC" />
          </View>
        </>
      )}
      {ed.resale_suggestion && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>RESALE TIP</Text>
          <View style={s.resaleCard}>
            <TrendingUp size={14} color="#059669" />
            <Text style={s.resaleText}>{ed.resale_suggestion}</Text>
          </View>
        </>
      )}
      {ed.care_tip && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>CARE TIP</Text>
          <View style={s.tipCard}>
            <Info size={13} color="#2563EB" />
            <Text style={s.tipText}>{ed.care_tip}</Text>
          </View>
        </>
      )}
      <GoesWithSection result={result} />
      <ResellValueSection result={result} />
      {ed.tags.length > 0 && (
        <View style={s.tagsRow}>
          {ed.tags.map((t, i) => (
            <View key={`${t}-${i}`} style={s.electronicsTagPill}>
              <Text style={s.electronicsTagPillText}>{t}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

export function HouseholdResultSection({ result }: ResultProps) {
  if (!result.household_details) {
    if (result.general_details) return <GeneralResultSection result={result} />;
    return null;
  }
  const hd = result.household_details;
  const subcategoryLabels: Record<string, string> = {
    tools: 'Tools', fitness: 'Fitness Equipment', kitchenware: 'Kitchenware',
    cleaning: 'Cleaning', bathroom: 'Bathroom', decor: 'Decor',
    garden: 'Garden', storage: 'Storage', lighting: 'Lighting',
    small_appliance: 'Small Appliance', other: 'Household',
  };
  return (
    <>
      {hd.item_description && (
        <View style={s.householdDescCard}>
          <Sparkles size={14} color="#7C3AED" />
          <Text style={s.householdDescText}>{hd.item_description}</Text>
        </View>
      )}
      <View style={s.fashionGrid}>
        <GridCell label="Type" value={subcategoryLabels[hd.subcategory] ?? hd.subcategory} />
        {hd.brand && <GridCell label="Brand" value={hd.brand} />}
        {hd.model && <GridCell label="Model" value={hd.model} />}
        {hd.material && <GridCell label="Material" value={hd.material} />}
        {hd.condition && <GridCell label="Condition" value={capitalize(hd.condition)} />}
        {hd.commodity_vs_collectible && <GridCell label="Category" value={capitalize(hd.commodity_vs_collectible)} />}
      </View>
      <View style={s.divider} />
      <Text style={s.sectionLabel}>PRICE & VALUE</Text>
      <View style={s.priceCard}>
        {hd.estimated_price && (
          <View style={s.priceRow}>
            <DollarSign size={14} color="#7C3AED" />
            <Text style={s.priceLabel}>Est. Price</Text>
            <Text style={s.priceValue}>{hd.estimated_price}</Text>
          </View>
        )}
        {hd.estimated_resale_value && (
          <View style={s.priceRow}>
            <TrendingUp size={14} color="#059669" />
            <Text style={s.priceLabel}>Resale Value</Text>
            <Text style={s.priceValue}>{hd.estimated_resale_value}</Text>
          </View>
        )}
        {hd.price_range && (
          <View style={s.priceRow}>
            <Tag size={14} color={Colors.textSecondary} />
            <Text style={s.priceLabel}>Range</Text>
            <Text style={s.priceValue}>{hd.price_range}</Text>
          </View>
        )}
      </View>
      {hd.value_rating && (
        <View style={s.ratingRow}>
          <Star size={14} color="#F59E0B" />
          <Text style={s.ratingText}>Value: <Text style={s.ratingBold}>{capitalize(hd.value_rating)}</Text></Text>
        </View>
      )}
      {hd.resale_potential && (
        <View style={s.detailRow}>
          <BarChart3 size={13} color={Colors.textSecondary} />
          <Text style={s.detailLabel}>Resale</Text>
          <View style={[s.demandBadge, {
            backgroundColor: hd.resale_potential === 'high' ? '#ECFDF5' : hd.resale_potential === 'moderate' ? '#FFFBEB' : '#F3F4F6',
          }]}>
            <Text style={[s.demandBadgeText, {
              color: hd.resale_potential === 'high' ? '#059669' : hd.resale_potential === 'moderate' ? '#D97706' : '#6B7280',
            }]}>{capitalize(hd.resale_potential)} Potential</Text>
          </View>
        </View>
      )}
      {hd.best_selling_platform && (
        <View style={s.detailRow}>
          <TrendingUp size={13} color={Colors.textSecondary} />
          <Text style={s.detailLabel}>Sell on</Text>
          <Text style={s.detailValue}>{hd.best_selling_platform}</Text>
        </View>
      )}
      {hd.value_verdict && <VerdictCard verdict={hd.value_verdict} reasoning={hd.value_reasoning ?? undefined} />}
      {hd.comparable_model && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>COMPARABLE PRODUCT</Text>
          <View style={[s.comparableCard, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
            <Tag size={14} color="#7C3AED" />
            <View style={s.comparableContent}>
              <Text style={[s.comparableTitle, { color: '#5B21B6' }]}>Also consider</Text>
              <Text style={[s.comparableModel, { color: '#6D28D9' }]}>{hd.comparable_model}</Text>
            </View>
            <ChevronRight size={14} color="#C7C7CC" />
          </View>
        </>
      )}
      {hd.resale_suggestion && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>RESALE TIP</Text>
          <View style={s.resaleCard}>
            <TrendingUp size={14} color="#059669" />
            <Text style={s.resaleText}>{hd.resale_suggestion}</Text>
          </View>
        </>
      )}
      <View style={s.divider} />
      <Text style={s.sectionLabel}>INSIGHTS</Text>
      {hd.practical_recommendation && (
        <View style={s.householdRecommendCard}>
          <ThumbsUp size={13} color="#7C3AED" />
          <Text style={s.householdRecommendText}>{hd.practical_recommendation}</Text>
        </View>
      )}
      {hd.set_or_pair_note && (
        <View style={s.householdNoteCard}>
          <AlertTriangle size={13} color="#D97706" />
          <Text style={s.householdNoteText}>{hd.set_or_pair_note}</Text>
        </View>
      )}
      {hd.shipping_note && (
        <View style={s.householdNoteCard}>
          <Truck size={13} color="#D97706" />
          <Text style={s.householdNoteText}>{hd.shipping_note}</Text>
        </View>
      )}
      {hd.local_pickup_recommendation && (
        <View style={s.householdPickupCard}>
          <MapPin size={13} color="#059669" />
          <Text style={s.householdPickupText}>Local pickup recommended — saves on shipping costs</Text>
        </View>
      )}
      {hd.buy_new_vs_used && (
        <View style={s.insightCard}>
          <CircleDollarSign size={13} color="#2563EB" />
          <Text style={s.insightText}>{hd.buy_new_vs_used}</Text>
        </View>
      )}
      {hd.budget_insight && (
        <View style={s.insightCard}>
          <CircleDollarSign size={13} color="#2563EB" />
          <Text style={s.insightText}>{hd.budget_insight}</Text>
        </View>
      )}
      {hd.cheaper_alternative && (
        <View style={s.alternativeCard}>
          <ArrowDownRight size={13} color="#059669" />
          <Text style={s.alternativeText}>{hd.cheaper_alternative}</Text>
        </View>
      )}
      {hd.care_tip && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>CARE TIP</Text>
          <View style={s.tipCard}>
            <Info size={13} color="#2563EB" />
            <Text style={s.tipText}>{hd.care_tip}</Text>
          </View>
        </>
      )}
      <GoesWithSection result={result} />
      <ResellValueSection result={result} />
      {hd.tags.length > 0 && (
        <View style={s.tagsRow}>
          {hd.tags.map((t, i) => (
            <View key={`${t}-${i}`} style={s.householdTagPill}>
              <Text style={s.householdTagPillText}>{t}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

export function GeneralResultSection({ result }: ResultProps) {
  if (!result.general_details) return null;
  const gd = result.general_details;
  const rarityColor = gd.rarity === 'very-rare' || gd.rarity === 'unique' ? '#DC2626' : gd.rarity === 'rare' ? '#D97706' : gd.rarity === 'uncommon' ? '#2563EB' : '#6B7280';
  const rarityBg = gd.rarity === 'very-rare' || gd.rarity === 'unique' ? '#FEF2F2' : gd.rarity === 'rare' ? '#FFFBEB' : gd.rarity === 'uncommon' ? '#EFF6FF' : '#F3F4F6';

  return (
    <>
      {gd.item_description && (
        <View style={s.generalDescCard}>
          <Sparkles size={14} color="#0D9488" />
          <Text style={s.generalDescText}>{gd.item_description}</Text>
        </View>
      )}
      <Text style={s.sectionLabel}>IDENTIFICATION</Text>
      <View style={s.fashionGrid}>
        {gd.subcategory && <GridCell label="Category" value={capitalize(gd.subcategory.replace(/_/g, ' '))} />}
        {gd.brand && <GridCell label="Brand" value={gd.brand} />}
        {gd.model && <GridCell label="Model" value={gd.model} />}
        {gd.material && <GridCell label="Material" value={gd.material} />}
        {gd.color && <GridCell label="Color" value={gd.color} />}
        {gd.condition && <GridCell label="Condition" value={capitalize(gd.condition)} />}
        {gd.age_or_era && <GridCell label="Age / Era" value={gd.age_or_era} />}
        {gd.rarity && gd.rarity !== 'common' && (
          <View style={s.fashionCell}>
            <Text style={s.fashionCellLabel}>Rarity</Text>
            <View style={[s.generalRarityBadge, { backgroundColor: rarityBg }]}>
              <Gem size={10} color={rarityColor} />
              <Text style={[s.generalRarityText, { color: rarityColor }]}>{capitalize(gd.rarity.replace('-', ' '))}</Text>
            </View>
          </View>
        )}
      </View>
      <View style={s.divider} />
      <Text style={s.sectionLabel}>PRICE & VALUE</Text>
      <View style={s.priceCard}>
        {gd.estimated_retail_price && (
          <View style={s.priceRow}>
            <DollarSign size={14} color="#0D9488" />
            <Text style={s.priceLabel}>Retail Price</Text>
            <Text style={s.priceValue}>{gd.estimated_retail_price}</Text>
          </View>
        )}
        {gd.estimated_resale_value && (
          <View style={s.priceRow}>
            <TrendingUp size={14} color="#059669" />
            <Text style={s.priceLabel}>Resale Value</Text>
            <Text style={s.priceValue}>{gd.estimated_resale_value}</Text>
          </View>
        )}
        {gd.price_range && (
          <View style={s.priceRow}>
            <Tag size={14} color={Colors.textSecondary} />
            <Text style={s.priceLabel}>Range</Text>
            <Text style={s.priceValue}>{gd.price_range}</Text>
          </View>
        )}
      </View>
      {gd.value_rating && (
        <View style={s.ratingRow}>
          <Star size={14} color="#F59E0B" />
          <Text style={s.ratingText}>Value: <Text style={s.ratingBold}>{capitalize(gd.value_rating)}</Text></Text>
        </View>
      )}
      {gd.resale_demand && <DemandRow demand={gd.resale_demand} />}
      {gd.best_selling_platform && (
        <View style={s.detailRow}>
          <TrendingUp size={13} color={Colors.textSecondary} />
          <Text style={s.detailLabel}>Sell on</Text>
          <Text style={s.detailValue}>{gd.best_selling_platform}</Text>
        </View>
      )}
      {gd.value_verdict && <VerdictCard verdict={gd.value_verdict} reasoning={gd.value_reasoning ?? undefined} />}
      {gd.budget_insight && (
        <View style={s.insightCard}>
          <CircleDollarSign size={13} color="#2563EB" />
          <Text style={s.insightText}>{gd.budget_insight}</Text>
        </View>
      )}
      {gd.cheaper_alternative && (
        <View style={s.alternativeCard}>
          <ArrowDownRight size={13} color="#059669" />
          <Text style={s.alternativeText}>{gd.cheaper_alternative}</Text>
        </View>
      )}
      {gd.comparable_item && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>COMPARABLE ITEM</Text>
          <View style={[s.comparableCard, { backgroundColor: '#F0FDFA', borderColor: '#99F6E4' }]}>
            <BookOpen size={14} color="#0D9488" />
            <View style={s.comparableContent}>
              <Text style={[s.comparableTitle, { color: '#134E4A' }]}>Also consider</Text>
              <Text style={[s.comparableModel, { color: '#0F766E' }]}>{gd.comparable_item}</Text>
            </View>
            <ChevronRight size={14} color="#C7C7CC" />
          </View>
        </>
      )}
      {gd.resale_suggestion && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>RESALE TIP</Text>
          <View style={s.resaleCard}>
            <TrendingUp size={14} color="#059669" />
            <Text style={s.resaleText}>{gd.resale_suggestion}</Text>
          </View>
        </>
      )}
      {gd.fun_fact && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>DID YOU KNOW</Text>
          <View style={s.generalFunFactCard}>
            <Lightbulb size={14} color="#D97706" />
            <Text style={s.generalFunFactText}>{gd.fun_fact}</Text>
          </View>
        </>
      )}
      {gd.practical_tip && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>PRO TIP</Text>
          <View style={s.tipCard}>
            <Info size={13} color="#2563EB" />
            <Text style={s.tipText}>{gd.practical_tip}</Text>
          </View>
        </>
      )}
      {gd.care_tip && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>CARE TIP</Text>
          <View style={s.tipCard}>
            <Info size={13} color="#2563EB" />
            <Text style={s.tipText}>{gd.care_tip}</Text>
          </View>
        </>
      )}
      <GoesWithSection result={result} />
      <ResellValueSection result={result} />
      {gd.tags.length > 0 && (
        <View style={s.tagsRow}>
          {gd.tags.map((t, i) => (
            <View key={`${t}-${i}`} style={s.generalTagPill}>
              <Text style={s.generalTagPillText}>{t}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

export function UnknownResultSection({ result }: ResultProps) {
  if (result.general_details != null) {
    return <GeneralResultSection result={result} />;
  }
  if (result.household_details != null) {
    return <HouseholdResultSection result={result} />;
  }
  if (result.furniture_details != null) {
    return <FurnitureResultSection result={result} />;
  }
  return (
    <View style={s.unknownCard}>
      <HelpCircle size={24} color="#6B7280" />
      <Text style={s.unknownTitle}>{result.item_name && result.item_name !== 'Unknown Item' ? result.item_name : 'Could not identify this item'}</Text>
      <Text style={s.unknownSub}>
        {result.category && result.category !== 'unknown'
          ? `Detected category: ${result.category}. Try scanning the product tag or barcode for better results.`
          : 'Try scanning the IKEA product tag, barcode, or a different angle.'}
      </Text>
    </View>
  );
}

const CARD_BORDER = '#2C2C2E';
const TEXT_PRIMARY = '#F5F5F7';
const TEXT_SECONDARY = '#AEAEB2';
const TEXT_TERTIARY = '#636366';
const SURFACE_MUTED = '#252528';

const s = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#2C2C2E', marginVertical: 18 },
  sectionLabel: { fontSize: 11, fontWeight: '700' as const, color: TEXT_TERTIARY, letterSpacing: 1.2, marginBottom: 10, marginTop: 4 },
  servingText: { fontSize: 12, color: TEXT_TERTIARY, fontWeight: '500' as const, marginBottom: 12 },
  calRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, justifyContent: 'center', marginBottom: 16 },
  calValue: { fontSize: 38, fontWeight: '800' as const, color: TEXT_PRIMARY, letterSpacing: -1 },
  calLabel: { fontSize: 16, fontWeight: '600' as const, color: TEXT_SECONDARY },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14, backgroundColor: SURFACE_MUTED, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 8 },
  macroItem: { alignItems: 'center', gap: 4 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroVal: { fontSize: 16, fontWeight: '800' as const, color: TEXT_PRIMARY },
  macroLabel: { fontSize: 11, fontWeight: '500' as const, color: TEXT_SECONDARY },
  extraRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, paddingHorizontal: 4 },
  extraText: { fontSize: 13, color: TEXT_SECONDARY, fontWeight: '500' as const },
  summaryCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#0D3B2612', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#16A34A30' },
  summaryText: { fontSize: 13, color: '#4ADE80', flex: 1, lineHeight: 18, fontWeight: '500' as const },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  nutrientChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#16A34A14', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  nutrientChipText: { fontSize: 12, fontWeight: '600' as const, color: '#4ADE80' },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8, paddingLeft: 2 },
  benefitText: { fontSize: 13, color: TEXT_PRIMARY, flex: 1, lineHeight: 18, fontWeight: '500' as const },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#1E3A5F20', borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#3B82F630' },
  tipText: { fontSize: 13, color: '#93C5FD', flex: 1, lineHeight: 18, fontWeight: '500' as const },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  tagPill: { backgroundColor: '#16A34A14', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagPillText: { fontSize: 11, fontWeight: '600' as const, color: '#4ADE80', textTransform: 'capitalize' as const },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  detailLabel: { fontSize: 13, color: TEXT_TERTIARY, fontWeight: '500' as const, width: 60 },
  detailValue: { fontSize: 14, color: TEXT_PRIMARY, fontWeight: '600' as const, flex: 1 },
  priceCard: { backgroundColor: SURFACE_MUTED, borderRadius: 12, padding: 14, gap: 10, marginBottom: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceLabel: { fontSize: 13, color: TEXT_SECONDARY, fontWeight: '500' as const, flex: 1 },
  priceValue: { fontSize: 16, color: TEXT_PRIMARY, fontWeight: '700' as const },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  ratingText: { fontSize: 14, color: TEXT_PRIMARY, fontWeight: '500' as const },
  ratingBold: { fontWeight: '700' as const },
  insightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#1E3A5F20', borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: '#3B82F625' },
  insightText: { fontSize: 13, color: '#93C5FD', flex: 1, lineHeight: 18, fontWeight: '500' as const },
  alternativeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#05966914', borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: '#05966925' },
  alternativeText: { fontSize: 13, color: '#6EE7B7', flex: 1, lineHeight: 18, fontWeight: '500' as const },
  furnitureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  furnitureCell: { flexBasis: '47%' as unknown as number, flexGrow: 0, flexShrink: 0, backgroundColor: SURFACE_MUTED, borderRadius: 10, padding: 12 },
  furnitureCellLabel: { fontSize: 11, fontWeight: '600' as const, color: TEXT_TERTIARY, letterSpacing: 0.5, marginBottom: 4 },
  furnitureCellValue: { fontSize: 14, fontWeight: '600' as const, color: TEXT_PRIMARY },
  fashionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  fashionCell: { flexBasis: '47%' as unknown as number, flexGrow: 0, flexShrink: 0, backgroundColor: SURFACE_MUTED, borderRadius: 10, padding: 12 },
  fashionCellLabel: { fontSize: 11, fontWeight: '600' as const, color: TEXT_TERTIARY, letterSpacing: 0.5, marginBottom: 4 },
  fashionCellValue: { fontSize: 14, fontWeight: '600' as const, color: TEXT_PRIMARY },
  fashionDescCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#E11D4814', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#E11D4825' },
  fashionDescText: { fontSize: 14, color: '#FDA4AF', flex: 1, lineHeight: 20, fontWeight: '600' as const },
  fashionTagPill: { backgroundColor: '#E11D4818', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  fashionTagPillText: { fontSize: 11, fontWeight: '600' as const, color: '#FB7185', textTransform: 'capitalize' as const },
  shoeIdHero: { alignItems: 'center', marginBottom: 16, paddingTop: 4 },
  shoeIdModelName: { fontSize: 22, fontWeight: '800' as const, color: TEXT_PRIMARY, letterSpacing: -0.5, textAlign: 'center' as const, lineHeight: 28 },
  shoeIdConfRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  shoeIdConfBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  shoeIdConfText: { fontSize: 12, fontWeight: '700' as const },
  demandBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  demandBadgeText: { fontSize: 12, fontWeight: '700' as const },
  verdictCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 4 },
  verdictHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  verdictBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  verdictBadgeText: { fontSize: 13, fontWeight: '700' as const, color: '#FFFFFF' },
  verdictReasoning: { fontSize: 13, lineHeight: 19, fontWeight: '500' as const },
  comparableCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E11D4812', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E11D4825' },
  comparableContent: { flex: 1 },
  comparableTitle: { fontSize: 11, fontWeight: '600' as const, color: '#FB7185', letterSpacing: 0.3, marginBottom: 2 },
  comparableModel: { fontSize: 15, fontWeight: '700' as const, color: '#FDA4AF' },
  resaleCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#05966914', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#05966925' },
  resaleText: { fontSize: 13, color: '#6EE7B7', flex: 1, lineHeight: 18, fontWeight: '500' as const },
  electronicsDescCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#0284C714', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#0284C725' },
  electronicsDescText: { fontSize: 14, color: '#7DD3FC', flex: 1, lineHeight: 20, fontWeight: '600' as const },
  electronicsTagPill: { backgroundColor: '#0284C718', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  electronicsTagPillText: { fontSize: 11, fontWeight: '600' as const, color: '#7DD3FC', textTransform: 'capitalize' as const },
  depreciationCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#DC262614', borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: '#DC262625' },
  depreciationText: { fontSize: 13, color: '#FCA5A5', flex: 1, lineHeight: 18, fontWeight: '500' as const },
  householdDescCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#7C3AED14', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#7C3AED25' },
  householdDescText: { fontSize: 14, color: '#C4B5FD', flex: 1, lineHeight: 20, fontWeight: '600' as const },
  householdRecommendCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#7C3AED14', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#7C3AED25' },
  householdRecommendText: { fontSize: 13, color: '#C4B5FD', flex: 1, lineHeight: 18, fontWeight: '500' as const },
  householdNoteCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#D9770614', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#D9770625' },
  householdNoteText: { fontSize: 13, color: '#FCD34D', flex: 1, lineHeight: 18, fontWeight: '500' as const },
  householdPickupCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#05966914', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#05966925' },
  householdPickupText: { fontSize: 13, color: '#6EE7B7', flex: 1, lineHeight: 18, fontWeight: '500' as const },
  householdTagPill: { backgroundColor: '#7C3AED18', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  householdTagPillText: { fontSize: 11, fontWeight: '600' as const, color: '#C4B5FD', textTransform: 'capitalize' as const },
  clothingConditionCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#D9770614', borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: '#D9770625' },
  clothingConditionText: { fontSize: 13, color: '#FCD34D', flex: 1, lineHeight: 18, fontWeight: '500' as const },
  clothingCleaningCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#0284C714', borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: '#0284C725' },
  clothingCleaningText: { fontSize: 13, color: '#7DD3FC', flex: 1, lineHeight: 18, fontWeight: '500' as const },
  whatElseWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  whatElseChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#7C3AED14', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#7C3AED25' },
  whatElseChipText: { fontSize: 12, fontWeight: '600' as const, color: '#C4B5FD' },
  totalCostCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#D9770614', borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: '#D9770625' },
  totalCostText: { fontSize: 13, color: '#FCD34D', flex: 1, lineHeight: 18, fontWeight: '500' as const },
  unknownCard: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  unknownTitle: { fontSize: 16, fontWeight: '600' as const, color: TEXT_PRIMARY },
  unknownSub: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center' as const, lineHeight: 18 },
  ikeaToolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  ikeaToolItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0058A314', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#0058A325' },
  ikeaToolIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: SURFACE_MUTED, justifyContent: 'center', alignItems: 'center' },
  ikeaToolName: { fontSize: 13, fontWeight: '600' as const, color: '#93C5FD' },
  ikeaValueCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#0058A314', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#0058A325' },
  ikeaValueText: { fontSize: 13, color: '#93C5FD', flex: 1, lineHeight: 18, fontWeight: '500' as const },
  ikeaSetupCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#0058A314', borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 4, borderWidth: 1, borderColor: '#0058A325' },
  ikeaSetupText: { fontSize: 13, color: '#93C5FD', flex: 1, lineHeight: 18, fontWeight: '500' as const },
  ikeaAnchorCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#DC262614', borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 4, borderWidth: 1, borderColor: '#DC262625' },
  ikeaAnchorText: { fontSize: 13, color: '#FCA5A5', flex: 1, lineHeight: 18, fontWeight: '500' as const },
  ikeaMatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  ikeaMatchItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0058A314', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#0058A325' },
  ikeaMatchText: { fontSize: 12, fontWeight: '600' as const, color: '#93C5FD' },
  ikeaRoomLabels: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  ikeaRoomPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#D9770618', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#D9770630' },
  ikeaRoomPillText: { fontSize: 12, fontWeight: '600' as const, color: '#FCD34D', textTransform: 'capitalize' as const },
  ikeaTagPill: { backgroundColor: '#0058A318', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  ikeaTagPillText: { fontSize: 11, fontWeight: '600' as const, color: '#93C5FD', textTransform: 'capitalize' as const },
  assemblyDisclaimer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  assemblyDisclaimerText: { fontSize: 11, color: '#FBBF24', fontWeight: '500' as const },
  assemblyCard: { backgroundColor: SURFACE_MUTED, borderRadius: 12, padding: 14, gap: 10, marginBottom: 12 },
  assemblyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  assemblyLabel: { fontSize: 13, color: TEXT_SECONDARY, fontWeight: '500' as const, flex: 1 },
  assemblyValue: { fontSize: 14, color: TEXT_PRIMARY, fontWeight: '600' as const },
  difficultyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  difficultyText: { fontSize: 12, fontWeight: '700' as const },
  toolsSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  toolsChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6, marginBottom: 4, paddingLeft: 21 },
  partChip: { backgroundColor: SURFACE_MUTED, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, borderWidth: 1, borderColor: CARD_BORDER },
  partChipText: { fontSize: 11, fontWeight: '500' as const, color: TEXT_SECONDARY },
  noAssemblyCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#16A34A14', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#16A34A25' },
  noAssemblyText: { fontSize: 14, fontWeight: '600' as const, color: '#4ADE80' },
  assemblySummaryCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#D9770614', borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#D9770625' },
  assemblySummaryText: { fontSize: 13, color: '#FCD34D', flex: 1, lineHeight: 18, fontWeight: '500' as const },
  similarCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: SURFACE_MUTED, borderRadius: 10, padding: 12, marginTop: 8 },
  similarText: { fontSize: 13, color: TEXT_SECONDARY, flex: 1, lineHeight: 18, fontWeight: '500' as const },
  extraPurchaseList: { gap: 10, marginBottom: 12 },
  extraPurchaseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  extraPurchaseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FBBF24', marginTop: 6 },
  extraPurchaseInfo: { flex: 1 },
  extraPurchaseNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  extraPurchaseName: { fontSize: 14, fontWeight: '600' as const, color: TEXT_PRIMARY },
  extraPurchaseCost: { fontSize: 13, fontWeight: '700' as const, color: '#FBBF24' },
  extraPurchaseReason: { fontSize: 12, color: TEXT_TERTIARY, lineHeight: 16 },
  noExtraCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#16A34A14', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#16A34A25' },
  noExtraText: { fontSize: 13, fontWeight: '600' as const, color: '#4ADE80' },
  totalCostBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1B5E3B', borderRadius: 12, padding: 16, marginTop: 8, marginBottom: 8 },
  totalCostBannerContent: { flex: 1 },
  totalCostBannerLabel: { fontSize: 11, fontWeight: '600' as const, color: '#A7F3D0', letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 2 },
  totalCostBannerValue: { fontSize: 18, fontWeight: '800' as const, color: '#FFFFFF' },
  verdictTextCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#05966914', borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: '#05966925' },
  verdictTextValue: { fontSize: 13, color: '#6EE7B7', flex: 1, lineHeight: 18, fontWeight: '600' as const },
  generalDescCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#0D948814', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#0D948825' },
  generalDescText: { fontSize: 14, color: '#5EEAD4', flex: 1, lineHeight: 20, fontWeight: '600' as const },
  generalRarityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' as const },
  generalRarityText: { fontSize: 12, fontWeight: '700' as const },
  generalFunFactCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#D9770614', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#D9770625' },
  generalFunFactText: { fontSize: 13, color: '#FCD34D', flex: 1, lineHeight: 18, fontWeight: '500' as const },
  generalTagPill: { backgroundColor: '#0D948818', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  generalTagPillText: { fontSize: 11, fontWeight: '600' as const, color: '#5EEAD4', textTransform: 'capitalize' as const },
  resellCard: { backgroundColor: '#05966914', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#05966925', gap: 12 },
  resellValueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resellValueContent: { flex: 1 },
  resellValueLabel: { fontSize: 12, fontWeight: '600' as const, color: '#34D399', letterSpacing: 0.3 },
  resellValueAmount: { fontSize: 22, fontWeight: '800' as const, color: '#6EE7B7', letterSpacing: -0.5 },
  resellMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 30 },
  resellMetaText: { fontSize: 13, color: TEXT_TERTIARY, fontWeight: '500' as const },
  resellMetaBold: { fontWeight: '700' as const, color: TEXT_SECONDARY },
  resellTipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingLeft: 30, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#2C2C2E' },
  resellTipText: { fontSize: 12, color: '#FCD34D', flex: 1, lineHeight: 17, fontWeight: '500' as const },
  resellNaCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: SURFACE_MUTED, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: CARD_BORDER },
  resellNaContent: { flex: 1 },
  resellNaTitle: { fontSize: 14, fontWeight: '600' as const, color: TEXT_TERTIARY },
  resellNaDesc: { fontSize: 12, color: TEXT_TERTIARY, marginTop: 2, fontWeight: '500' as const },
  goesWithGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  goesWithChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#7C3AED14', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#7C3AED25' },
  goesWithText: { fontSize: 13, fontWeight: '600' as const, color: '#C4B5FD' },
});
