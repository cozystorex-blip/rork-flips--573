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
  TrendingUp,
  Hammer,
  AlertTriangle,
  Clock,
  Users,
  Home,
  CircleDollarSign,
  BadgeCheck,
  ArrowDownRight,
  Sparkles,
  Cpu,
  TrendingDown,
  BarChart3,
  ThumbsUp,
  Lightbulb,
  Shield,
  Grid3X3,
  Layers,
  Banknote,
  Check,
} from 'lucide-react-native';
import { SmartScanResult } from '@/services/smartScanService';

const P = {
  bg: '#EDE8DF',
  card: '#F5F0E8',
  cardAlt: '#E8E2D8',
  border: '#C4B8A8',
  borderLight: '#D4C9BA',
  text: '#2C2420',
  textSecondary: '#6B5E54',
  textMuted: '#8C7E72',
  green: '#3D6B4F',
  greenBg: '#E2EDE5',
  greenBorder: '#B8D4BF',
  amber: '#8B6914',
  amberBg: '#F0E8D0',
  amberBorder: '#D4C49A',
  red: '#8B3A2A',
  redBg: '#F0E0DA',
  redBorder: '#D4B0A4',
  blue: '#2A5A8B',
  blueBg: '#DAE4F0',
  blueBorder: '#A4B8D4',
  accent: '#5A4A3A',
};

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

function DashedDivider() {
  return <View style={s.dashedDivider} />;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHeaderRow}>
      <View style={s.sectionHeaderDash} />
      <Text style={s.sectionHeaderText}>{title}</Text>
      <View style={s.sectionHeaderDash} />
    </View>
  );
}

function PriceRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={s.priceRow}>
      {icon}
      <Text style={s.priceLabel}>{label}</Text>
      <Text style={s.priceValue}>{value}</Text>
    </View>
  );
}

function ValueTipCard({ tip, alternative }: { tip: string | null; alternative?: string | null }) {
  if (!tip && !alternative) return null;
  return (
    <View style={s.valueTipSection}>
      <View style={s.valueTipHeader}>
        <Star size={14} color={P.amber} />
        <Text style={s.valueTipTitle}>Value Tip</Text>
        <Star size={14} color={P.amber} />
      </View>
      {tip && (
        <View style={s.valueTipCard}>
          <CircleDollarSign size={16} color={P.green} />
          <Text style={s.valueTipText}>{tip}</Text>
        </View>
      )}
      {alternative && (
        <View style={s.alternativeCard}>
          <ArrowDownRight size={14} color={P.textSecondary} />
          <Text style={s.alternativeText}>{alternative}</Text>
        </View>
      )}
    </View>
  );
}

function YouMayNeedSection({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <>
      <SectionHeader title="YOU MAY ALSO NEED" />
      <View style={s.needList}>
        {items.map((item, i) => (
          <View key={`need-${item}-${i}`} style={s.needItem}>
            <Check size={14} color={P.green} />
            <Text style={s.needItemText}>{item}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function TagsRow({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <View style={s.tagsRow}>
      {tags.map((t, i) => (
        <View key={`${t}-${i}`} style={s.tagPill}>
          <Text style={s.tagPillText}>{t.toUpperCase()}</Text>
        </View>
      ))}
    </View>
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
      <SectionHeader title="PAIRS WELL WITH" />
      <View style={s.goesWithGrid}>
        {complementary.map((item, i) => (
          <View key={`comp-${item}-${i}`} style={s.goesWithChip}>
            <Layers size={11} color={P.textSecondary} />
            <Text style={s.goesWithText}>{item}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function ResellSection({ result }: { result: SmartScanResult }) {
  const isConsumable = result.item_type === 'food' || result.item_type === 'grocery';
  if (isConsumable) return null;

  const resale = result.fashion_details?.estimated_resale_value
    ?? result.electronics_details?.estimated_resale_value
    ?? result.household_details?.estimated_resale_value
    ?? result.furniture_details?.estimated_resale_value
    ?? result.general_details?.estimated_resale_value
    ?? null;

  const platform = result.fashion_details?.best_selling_platform
    ?? result.electronics_details?.best_selling_platform
    ?? result.general_details?.best_selling_platform
    ?? result.household_details?.best_selling_platform
    ?? null;

  if (!resale) return null;

  const displayVal = resale.startsWith('$') ? resale : '$' + resale;

  return (
    <>
      <SectionHeader title="RESALE VALUE" />
      <View style={s.resaleCard}>
        <View style={s.resaleRow}>
          <Banknote size={16} color={P.green} />
          <Text style={s.resaleLabel}>Estimated Resale</Text>
          <Text style={s.resaleAmount}>{displayVal}</Text>
        </View>
        {platform && (
          <View style={s.resaleMeta}>
            <TrendingUp size={12} color={P.textMuted} />
            <Text style={s.resaleMetaText}>Best on {platform}</Text>
          </View>
        )}
      </View>
    </>
  );
}

function DetailGrid({ items }: { items: { label: string; value: string }[] }) {
  const filtered = items.filter(i => i.value);
  if (filtered.length === 0) return null;
  return (
    <View style={s.detailGrid}>
      {filtered.map((item, i) => (
        <View key={`grid-${item.label}-${i}`} style={s.detailGridCell}>
          <Text style={s.detailGridLabel}>{item.label}</Text>
          <Text style={s.detailGridValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

function VerdictCard({ verdict, reasoning }: { verdict: string; reasoning?: string }) {
  const isGood = verdict === 'strong' || verdict === 'good';
  const color = isGood ? P.green : P.amber;
  const bg = isGood ? P.greenBg : P.amberBg;
  const border = isGood ? P.greenBorder : P.amberBorder;

  return (
    <View style={[s.verdictCard, { backgroundColor: bg, borderColor: border }]}>
      <View style={[s.verdictBadge, { backgroundColor: color }]}>
        <Text style={s.verdictBadgeText}>{capitalize(verdict)} Value</Text>
      </View>
      {reasoning && <Text style={[s.verdictReasoning, { color }]}>{reasoning}</Text>}
    </View>
  );
}

interface ResultProps {
  result: SmartScanResult;
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
        <Flame size={18} color={P.amber} />
        <Text style={s.calValue}>{fd.calories}</Text>
        <Text style={s.calLabel}>cal</Text>
      </View>
      <View style={s.macroRow}>
        {[
          { val: fd.protein_g, label: 'Protein', color: '#4A7A9B' },
          { val: fd.carbs_g, label: 'Carbs', color: '#9B7A4A' },
          { val: fd.fat_g, label: 'Fat', color: '#9B4A4A' },
          { val: fd.fiber_g, label: 'Fiber', color: '#4A9B6B' },
        ].map((m) => (
          <View key={m.label} style={s.macroItem}>
            <View style={[s.macroDot, { backgroundColor: m.color }]} />
            <Text style={s.macroVal}>{m.val}g</Text>
            <Text style={s.macroLabel}>{m.label}</Text>
          </View>
        ))}
      </View>
      {fd.sugar_g > 0 && (
        <View style={s.extraInfoRow}>
          <Droplets size={13} color={P.textMuted} />
          <Text style={s.extraInfoText}>Sugar: {fd.sugar_g}g per serving</Text>
        </View>
      )}
      {fd.health_summary && (
        <View style={s.healthCard}>
          <ShieldCheck size={14} color={P.green} />
          <Text style={s.healthText}>{fd.health_summary}</Text>
        </View>
      )}

      <DashedDivider />
      <SectionHeader title="PRICING" />
      <View style={s.pricingCard}>
        <PriceRow icon={<DollarSign size={14} color={P.green} />} label="Est. Price" value={fd.estimated_price || fd.price_range || 'Unavailable'} />
        {fd.price_range && fd.estimated_price && (
          <PriceRow icon={<TrendingUp size={14} color={P.textMuted} />} label="Range" value={fd.price_range} />
        )}
        {fd.unit_price && (
          <PriceRow icon={<Package size={14} color={P.textMuted} />} label="Unit Price" value={fd.unit_price} />
        )}
      </View>

      <ValueTipCard tip={fd.budget_insight} alternative={fd.cheaper_alternative} />

      {fd.key_nutrients.length > 0 && (
        <>
          <SectionHeader title="KEY NUTRIENTS" />
          <View style={s.chipGrid}>
            {fd.key_nutrients.map((n, i) => (
              <View key={`${n}-${i}`} style={s.nutrientChip}>
                <Zap size={10} color={P.green} />
                <Text style={s.nutrientChipText}>{n}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {fd.health_benefits.length > 0 && (
        <>
          <SectionHeader title="HEALTH BENEFITS" />
          {fd.health_benefits.map((b, i) => (
            <View key={`${b}-${i}`} style={s.benefitRow}>
              <Leaf size={12} color={P.green} />
              <Text style={s.benefitText}>{b}</Text>
            </View>
          ))}
        </>
      )}

      {fd.quick_tip && (
        <View style={s.tipCard}>
          <Info size={13} color={P.blue} />
          <Text style={s.tipText}>{fd.quick_tip}</Text>
        </View>
      )}

      <YouMayNeedSection items={fd.complementary_items} />
      <TagsRow tags={fd.tags} />
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
      <DetailGrid items={[
        { label: 'Brand', value: gd.brand ?? '' },
        { label: 'Size', value: gd.package_size ?? '' },
      ]} />

      <SectionHeader title="PRICING" />
      <View style={s.pricingCard}>
        {gd.estimated_price && (
          <PriceRow icon={<DollarSign size={14} color={P.green} />} label="Est. Price" value={gd.estimated_price} />
        )}
        {gd.price_range && (
          <PriceRow icon={<TrendingUp size={14} color={P.textMuted} />} label="Range" value={gd.price_range} />
        )}
        {gd.unit_price && (
          <PriceRow icon={<Package size={14} color={P.textMuted} />} label="Unit Price" value={gd.unit_price} />
        )}
      </View>

      <ValueTipCard tip={gd.budget_insight} alternative={gd.cheaper_alternative} />

      <YouMayNeedSection items={gd.what_else_needed} />

      {gd.total_cost_note && (
        <View style={s.warningCard}>
          <AlertTriangle size={13} color={P.amber} />
          <Text style={s.warningText}>{gd.total_cost_note}</Text>
        </View>
      )}

      <GoesWithSection result={result} />
      <TagsRow tags={gd.tags} />
    </>
  );
}

export function FurnitureResultSection({ result }: ResultProps) {
  if (!result.furniture_details) {
    if (result.general_details) return <GeneralResultSection result={result} />;
    return null;
  }
  const fd = result.furniture_details;
  const _roomFitLabels = (fd as Record<string, unknown>).room_fit_labels as string[] | undefined;
  const matchingProducts = (fd as Record<string, unknown>).matching_products as string[] | undefined;
  const wallAnchorNote = (fd as Record<string, unknown>).wall_anchor_note as string | null | undefined;
  const setupNotes = (fd as Record<string, unknown>).setup_notes as string | null | undefined;
  const longTermValue = (fd as Record<string, unknown>).long_term_value as string | null | undefined;

  return (
    <>
      <SectionHeader title="PRODUCT DETAILS" />
      <DetailGrid items={[
        { label: 'Material', value: fd.material ?? '' },
        { label: 'Color / Finish', value: fd.finish_color ?? '' },
        { label: 'Style', value: fd.style ?? '' },
        { label: 'Dimensions', value: fd.estimated_dimensions ?? '' },
        { label: 'Price Tier', value: fd.value_level ? capitalize(fd.value_level) : '' },
        { label: 'Type', value: fd.mounting_type && fd.mounting_type !== 'unknown' ? capitalize(fd.mounting_type).replace('-', ' ') : '' },
      ]} />

      {fd.use_case && (
        <View style={s.infoRow}>
          <Sofa size={13} color={P.textMuted} />
          <Text style={s.infoLabel}>Use</Text>
          <Text style={s.infoValue}>{fd.use_case}</Text>
        </View>
      )}
      {fd.room_fit && (
        <View style={s.infoRow}>
          <Home size={13} color={P.textMuted} />
          <Text style={s.infoLabel}>Room</Text>
          <Text style={s.infoValue}>{fd.room_fit}</Text>
        </View>
      )}

      <SectionHeader title="PRICING" />
      <View style={s.pricingCard}>
        {fd.estimated_retail_price && (
          <PriceRow icon={<DollarSign size={14} color={P.green} />} label="Est. Price" value={fd.estimated_retail_price} />
        )}
        {fd.estimated_price_range && (
          <PriceRow icon={<TrendingUp size={14} color={P.textMuted} />} label="Range" value={fd.estimated_price_range} />
        )}
      </View>

      {fd.value_verdict && <VerdictCard verdict={fd.value_verdict} reasoning={fd.value_reasoning ?? undefined} />}

      <ValueTipCard tip={fd.budget_insight} alternative={fd.cheaper_alternative} />

      {longTermValue && (
        <View style={s.insightCard}>
          <Shield size={14} color={P.blue} />
          <Text style={s.insightText}>{longTermValue}</Text>
        </View>
      )}

      <SectionHeader title="TOOLS YOU'LL NEED" />
      {fd.assembly_required === false ? (
        <View style={s.successCard}>
          <ShieldCheck size={14} color={P.green} />
          <Text style={s.successText}>No assembly required — ready to use</Text>
        </View>
      ) : (
        <View style={s.toolsGrid}>
          {(fd.likely_tools_needed.length > 0 ? fd.likely_tools_needed : ['Allen key (included)', 'Phillips screwdriver']).map((t, i) => (
            <View key={`tool-${t}-${i}`} style={s.toolItem}>
              <Wrench size={13} color={P.textSecondary} />
              <Text style={s.toolName}>{t}</Text>
            </View>
          ))}
        </View>
      )}

      {fd.assembly_required !== false && (
        <>
          <SectionHeader title="ASSEMBLY INFO" />
          <View style={s.assemblyCard}>
            {fd.assembly_difficulty && (
              <View style={s.assemblyRow}>
                <Hammer size={13} color={P.textMuted} />
                <Text style={s.assemblyLabel}>Difficulty</Text>
                <View style={[s.diffBadge, {
                  backgroundColor: fd.assembly_difficulty === 'easy' ? P.greenBg : fd.assembly_difficulty === 'moderate' ? P.amberBg : P.redBg,
                }]}>
                  <Text style={[s.diffText, {
                    color: fd.assembly_difficulty === 'easy' ? P.green : fd.assembly_difficulty === 'moderate' ? P.amber : P.red,
                  }]}>{capitalize(fd.assembly_difficulty)}</Text>
                </View>
              </View>
            )}
            {fd.estimated_build_time && (
              <View style={s.assemblyRow}>
                <Clock size={13} color={P.textMuted} />
                <Text style={s.assemblyLabel}>Build Time</Text>
                <Text style={s.assemblyValue}>{fd.estimated_build_time}</Text>
              </View>
            )}
            {fd.people_needed && (
              <View style={s.assemblyRow}>
                <Users size={13} color={P.textMuted} />
                <Text style={s.assemblyLabel}>People</Text>
                <Text style={s.assemblyValue}>{fd.people_needed === '1' ? '1 person' : fd.people_needed === '2' ? '2 people' : '2+ people'}</Text>
              </View>
            )}
          </View>
          {fd.assembly_summary && (
            <View style={s.warningCard}>
              <Info size={13} color={P.amber} />
              <Text style={s.warningText}>{fd.assembly_summary}</Text>
            </View>
          )}
        </>
      )}

      {setupNotes && (
        <View style={s.tipCard}>
          <Lightbulb size={13} color={P.blue} />
          <Text style={s.tipText}>{setupNotes}</Text>
        </View>
      )}
      {wallAnchorNote && (
        <View style={s.dangerCard}>
          <ShieldAlert size={13} color={P.red} />
          <Text style={s.dangerText}>{wallAnchorNote}</Text>
        </View>
      )}

      {fd.extra_purchase_items && fd.extra_purchase_items.length > 0 && (
        <>
          <SectionHeader title="WHAT ELSE YOU MAY NEED" />
          {fd.extra_purchase_items.map((ep, i) => (
            <View key={`extra-${ep.item}-${i}`} style={s.needItem}>
              <Check size={14} color={P.green} />
              <View style={{ flex: 1 }}>
                <View style={s.needItemNameRow}>
                  <Text style={s.needItemText}>{ep.item}</Text>
                  {ep.estimated_cost && <Text style={s.needItemCost}>{ep.estimated_cost}</Text>}
                </View>
                <Text style={s.needItemReason}>{ep.reason}</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {fd.total_estimated_cost && (
        <View style={s.totalCostBanner}>
          <DollarSign size={15} color="#FFFFFF" />
          <View style={{ flex: 1 }}>
            <Text style={s.totalCostLabel}>Total Estimated Cost</Text>
            <Text style={s.totalCostValue}>{fd.total_estimated_cost}</Text>
          </View>
        </View>
      )}

      {fd.worth_it_verdict && (
        <View style={s.successCard}>
          <BadgeCheck size={14} color={P.green} />
          <Text style={s.successText}>{fd.worth_it_verdict}</Text>
        </View>
      )}

      {fd.care_tip && (
        <View style={s.tipCard}>
          <Info size={13} color={P.blue} />
          <Text style={s.tipText}>{fd.care_tip}</Text>
        </View>
      )}

      {matchingProducts && matchingProducts.length > 0 && (
        <>
          <SectionHeader title="MATCHING PRODUCTS" />
          <View style={s.goesWithGrid}>
            {matchingProducts.map((mp, i) => (
              <View key={`match-${mp}-${i}`} style={s.goesWithChip}>
                <Grid3X3 size={11} color={P.textSecondary} />
                <Text style={s.goesWithText}>{mp}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <GoesWithSection result={result} />
      <ResellSection result={result} />
      <TagsRow tags={fd.tags} />
    </>
  );
}

export function FashionResultSection({ result }: ResultProps) {
  if (!result.fashion_details) {
    if (result.general_details) return <GeneralResultSection result={result} />;
    return null;
  }
  const fd = result.fashion_details;
  const subcategoryLabels: Record<string, string> = {
    shoes: 'Shoes', clothing: 'Clothing', outerwear: 'Outerwear',
    accessories: 'Accessories', bags: 'Bags', jewelry: 'Jewelry',
    activewear: 'Activewear', other: 'Fashion',
  };

  return (
    <>
      {fd.item_description && (
        <View style={s.descCard}>
          <Sparkles size={14} color={P.textSecondary} />
          <Text style={s.descText}>{fd.item_description}</Text>
        </View>
      )}

      <SectionHeader title="IDENTIFICATION" />
      <DetailGrid items={[
        { label: 'Type', value: subcategoryLabels[fd.subcategory] ?? fd.subcategory },
        { label: 'Brand', value: fd.brand ?? '' },
        { label: 'Model', value: fd.model ?? '' },
        { label: 'For', value: fd.gender_target ? capitalize(fd.gender_target) : '' },
      ]} />

      <SectionHeader title="DETAILS" />
      <DetailGrid items={[
        { label: 'Color', value: fd.color ? `${fd.color}${fd.secondary_color ? ` / ${fd.secondary_color}` : ''}` : '' },
        { label: 'Material', value: fd.material ?? '' },
        { label: 'Style', value: fd.style ?? '' },
        { label: 'Condition', value: fd.condition ? capitalize(fd.condition) : '' },
        { label: 'Pattern', value: fd.pattern && fd.pattern !== 'solid' ? capitalize(fd.pattern) : '' },
        { label: 'Fit', value: fd.fit ? capitalize(fd.fit) : '' },
      ]} />

      <SectionHeader title="PRICING" />
      <View style={s.pricingCard}>
        {fd.estimated_retail_price && (
          <PriceRow icon={<DollarSign size={14} color={P.green} />} label="Retail Price" value={fd.estimated_retail_price} />
        )}
        {fd.estimated_resale_value && (
          <PriceRow icon={<TrendingUp size={14} color={P.green} />} label="Resale Value" value={fd.estimated_resale_value} />
        )}
        {fd.price_range && (
          <PriceRow icon={<Tag size={14} color={P.textMuted} />} label="Range" value={fd.price_range} />
        )}
      </View>

      {fd.value_verdict && <VerdictCard verdict={fd.value_verdict} reasoning={fd.value_reasoning ?? undefined} />}

      {fd.resale_demand && (
        <View style={s.infoRow}>
          <BarChart3 size={13} color={P.textMuted} />
          <Text style={s.infoLabel}>Demand</Text>
          <View style={[s.demandBadge, {
            backgroundColor: fd.resale_demand === 'high' ? P.greenBg : fd.resale_demand === 'moderate' ? P.amberBg : P.cardAlt,
          }]}>
            <Text style={[s.demandText, {
              color: fd.resale_demand === 'high' ? P.green : fd.resale_demand === 'moderate' ? P.amber : P.textMuted,
            }]}>{capitalize(fd.resale_demand)} Demand</Text>
          </View>
        </View>
      )}

      <ValueTipCard tip={fd.budget_insight} alternative={fd.cheaper_alternative} />

      {fd.resale_suggestion && (
        <View style={s.insightCard}>
          <TrendingUp size={13} color={P.green} />
          <Text style={s.insightText}>{fd.resale_suggestion}</Text>
        </View>
      )}

      {fd.care_tip && (
        <View style={s.tipCard}>
          <Info size={13} color={P.blue} />
          <Text style={s.tipText}>{fd.care_tip}</Text>
        </View>
      )}

      <GoesWithSection result={result} />
      <TagsRow tags={fd.tags} />
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
        <View style={s.descCard}>
          <Cpu size={14} color={P.textSecondary} />
          <Text style={s.descText}>
            {ed.brand ? `${ed.brand} ` : ''}{ed.model ?? ed.product_type}
            {ed.storage_or_spec ? ` · ${ed.storage_or_spec}` : ''}
          </Text>
        </View>
      )}

      <SectionHeader title="SPECIFICATIONS" />
      <DetailGrid items={[
        { label: 'Type', value: ed.product_type },
        { label: 'Brand', value: ed.brand ?? '' },
        { label: 'Model', value: ed.model ?? '' },
        { label: 'Spec', value: ed.storage_or_spec ?? '' },
        { label: 'Condition', value: ed.condition ? capitalize(ed.condition) : '' },
      ]} />

      <SectionHeader title="PRICING" />
      <View style={s.pricingCard}>
        {ed.estimated_retail_price && (
          <PriceRow icon={<DollarSign size={14} color={P.green} />} label="Retail Price" value={ed.estimated_retail_price} />
        )}
        {ed.estimated_resale_value && (
          <PriceRow icon={<TrendingUp size={14} color={P.green} />} label="Resale Value" value={ed.estimated_resale_value} />
        )}
        {ed.price_range && (
          <PriceRow icon={<Tag size={14} color={P.textMuted} />} label="Range" value={ed.price_range} />
        )}
      </View>

      {ed.depreciation_note && (
        <View style={s.warningCard}>
          <TrendingDown size={13} color={P.red} />
          <Text style={s.warningText}>{ed.depreciation_note}</Text>
        </View>
      )}

      {ed.value_verdict && <VerdictCard verdict={ed.value_verdict} reasoning={ed.value_reasoning ?? undefined} />}

      <ValueTipCard tip={ed.budget_insight} alternative={ed.cheaper_alternative} />

      {ed.resale_demand && (
        <View style={s.infoRow}>
          <BarChart3 size={13} color={P.textMuted} />
          <Text style={s.infoLabel}>Demand</Text>
          <View style={[s.demandBadge, {
            backgroundColor: ed.resale_demand === 'high' ? P.greenBg : ed.resale_demand === 'moderate' ? P.amberBg : P.cardAlt,
          }]}>
            <Text style={[s.demandText, {
              color: ed.resale_demand === 'high' ? P.green : ed.resale_demand === 'moderate' ? P.amber : P.textMuted,
            }]}>{capitalize(ed.resale_demand)} Demand</Text>
          </View>
        </View>
      )}

      {ed.care_tip && (
        <View style={s.tipCard}>
          <Info size={13} color={P.blue} />
          <Text style={s.tipText}>{ed.care_tip}</Text>
        </View>
      )}

      <GoesWithSection result={result} />
      <ResellSection result={result} />
      <TagsRow tags={ed.tags} />
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
        <View style={s.descCard}>
          <Sparkles size={14} color={P.textSecondary} />
          <Text style={s.descText}>{hd.item_description}</Text>
        </View>
      )}

      <SectionHeader title="DETAILS" />
      <DetailGrid items={[
        { label: 'Type', value: subcategoryLabels[hd.subcategory] ?? hd.subcategory },
        { label: 'Brand', value: hd.brand ?? '' },
        { label: 'Model', value: hd.model ?? '' },
        { label: 'Material', value: hd.material ?? '' },
        { label: 'Condition', value: hd.condition ? capitalize(hd.condition) : '' },
      ]} />

      <SectionHeader title="PRICING" />
      <View style={s.pricingCard}>
        {hd.estimated_price && (
          <PriceRow icon={<DollarSign size={14} color={P.green} />} label="Est. Price" value={hd.estimated_price} />
        )}
        {hd.estimated_resale_value && (
          <PriceRow icon={<TrendingUp size={14} color={P.green} />} label="Resale Value" value={hd.estimated_resale_value} />
        )}
        {hd.price_range && (
          <PriceRow icon={<Tag size={14} color={P.textMuted} />} label="Range" value={hd.price_range} />
        )}
      </View>

      {hd.value_verdict && <VerdictCard verdict={hd.value_verdict} reasoning={hd.value_reasoning ?? undefined} />}

      <ValueTipCard tip={hd.budget_insight} alternative={hd.cheaper_alternative} />

      {hd.practical_recommendation && (
        <View style={s.insightCard}>
          <ThumbsUp size={13} color={P.green} />
          <Text style={s.insightText}>{hd.practical_recommendation}</Text>
        </View>
      )}

      {hd.care_tip && (
        <View style={s.tipCard}>
          <Info size={13} color={P.blue} />
          <Text style={s.tipText}>{hd.care_tip}</Text>
        </View>
      )}

      <GoesWithSection result={result} />
      <ResellSection result={result} />
      <TagsRow tags={hd.tags} />
    </>
  );
}

export function GeneralResultSection({ result }: ResultProps) {
  if (!result.general_details) return null;
  const gd = result.general_details;

  return (
    <>
      {gd.item_description && (
        <View style={s.descCard}>
          <Sparkles size={14} color={P.textSecondary} />
          <Text style={s.descText}>{gd.item_description}</Text>
        </View>
      )}

      <SectionHeader title="IDENTIFICATION" />
      <DetailGrid items={[
        { label: 'Category', value: gd.subcategory ? capitalize(gd.subcategory.replace(/_/g, ' ')) : '' },
        { label: 'Brand', value: gd.brand ?? '' },
        { label: 'Model', value: gd.model ?? '' },
        { label: 'Material', value: gd.material ?? '' },
        { label: 'Color', value: gd.color ?? '' },
        { label: 'Condition', value: gd.condition ? capitalize(gd.condition) : '' },
      ]} />

      <SectionHeader title="PRICING" />
      <View style={s.pricingCard}>
        {gd.estimated_retail_price && (
          <PriceRow icon={<DollarSign size={14} color={P.green} />} label="Retail Price" value={gd.estimated_retail_price} />
        )}
        {gd.estimated_resale_value && (
          <PriceRow icon={<TrendingUp size={14} color={P.green} />} label="Resale Value" value={gd.estimated_resale_value} />
        )}
        {gd.price_range && (
          <PriceRow icon={<Tag size={14} color={P.textMuted} />} label="Range" value={gd.price_range} />
        )}
      </View>

      {gd.value_verdict && <VerdictCard verdict={gd.value_verdict} reasoning={gd.value_reasoning ?? undefined} />}

      <ValueTipCard tip={gd.budget_insight} alternative={gd.cheaper_alternative} />

      {gd.fun_fact && (
        <>
          <SectionHeader title="DID YOU KNOW" />
          <View style={s.funFactCard}>
            <Lightbulb size={14} color={P.amber} />
            <Text style={s.funFactText}>{gd.fun_fact}</Text>
          </View>
        </>
      )}

      {gd.practical_tip && (
        <View style={s.tipCard}>
          <Info size={13} color={P.blue} />
          <Text style={s.tipText}>{gd.practical_tip}</Text>
        </View>
      )}

      {gd.care_tip && (
        <View style={s.tipCard}>
          <Info size={13} color={P.blue} />
          <Text style={s.tipText}>{gd.care_tip}</Text>
        </View>
      )}

      <GoesWithSection result={result} />
      <ResellSection result={result} />
      <TagsRow tags={gd.tags} />
    </>
  );
}

export function UnknownResultSection({ result }: ResultProps) {
  if (result.general_details != null) return <GeneralResultSection result={result} />;
  if (result.household_details != null) return <HouseholdResultSection result={result} />;
  if (result.furniture_details != null) return <FurnitureResultSection result={result} />;
  return (
    <View style={s.unknownCard}>
      <HelpCircle size={24} color={P.textMuted} />
      <Text style={s.unknownTitle}>{result.item_name && result.item_name !== 'Unknown Item' ? result.item_name : 'Could not identify this item'}</Text>
      <Text style={s.unknownSub}>
        {result.category && result.category !== 'unknown'
          ? `Detected category: ${result.category}. Try scanning from a different angle.`
          : 'Try scanning the product tag, barcode, or a different angle.'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  dashedDivider: {
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed' as const,
    borderColor: P.border,
    marginVertical: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
    gap: 10,
  },
  sectionHeaderDash: {
    flex: 1,
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed' as const,
    borderColor: P.border,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: P.textMuted,
    letterSpacing: 1.4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  priceLabel: {
    fontSize: 14,
    color: P.textSecondary,
    fontWeight: '500' as const,
    flex: 1,
  },
  priceValue: {
    fontSize: 17,
    color: P.text,
    fontWeight: '700' as const,
  },
  pricingCard: {
    backgroundColor: P.card,
    borderRadius: 12,
    padding: 14,
    gap: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: P.borderLight,
  },
  servingText: {
    fontSize: 12,
    color: P.textMuted,
    fontWeight: '500' as const,
    marginBottom: 10,
    textAlign: 'center' as const,
  },
  calRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 14,
  },
  calValue: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: P.text,
    letterSpacing: -1,
  },
  calLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: P.textSecondary,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
    backgroundColor: P.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: P.borderLight,
  },
  macroItem: { alignItems: 'center', gap: 4 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroVal: { fontSize: 16, fontWeight: '800' as const, color: P.text },
  macroLabel: { fontSize: 11, fontWeight: '500' as const, color: P.textMuted },
  extraInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  extraInfoText: {
    fontSize: 13,
    color: P.textSecondary,
    fontWeight: '500' as const,
  },
  healthCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: P.greenBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: P.greenBorder,
  },
  healthText: {
    fontSize: 13,
    color: P.green,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  valueTipSection: { marginBottom: 8 },
  valueTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  valueTipTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: P.text,
  },
  valueTipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: P.greenBg,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: P.greenBorder,
  },
  valueTipText: {
    fontSize: 13,
    color: P.text,
    flex: 1,
    lineHeight: 19,
    fontWeight: '500' as const,
  },
  alternativeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: P.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: P.borderLight,
    borderStyle: 'dashed' as const,
  },
  alternativeText: {
    fontSize: 13,
    color: P.textSecondary,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  needList: { gap: 8, marginBottom: 12 },
  needItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: P.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: P.borderLight,
  },
  needItemText: {
    fontSize: 14,
    color: P.text,
    fontWeight: '600' as const,
    flex: 1,
  },
  needItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  needItemCost: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: P.amber,
  },
  needItemReason: {
    fontSize: 12,
    color: P.textMuted,
    lineHeight: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderStyle: 'dashed' as const,
    borderColor: P.border,
  },
  tagPill: {
    backgroundColor: P.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: P.border,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: P.textSecondary,
    letterSpacing: 0.5,
  },
  goesWithGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  goesWithChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: P.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: P.borderLight,
  },
  goesWithText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: P.textSecondary,
  },
  resaleCard: {
    backgroundColor: P.greenBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: P.greenBorder,
    gap: 8,
    marginBottom: 8,
  },
  resaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resaleLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: P.green,
    flex: 1,
  },
  resaleAmount: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: P.green,
  },
  resaleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 26,
  },
  resaleMetaText: {
    fontSize: 12,
    color: P.textMuted,
    fontWeight: '500' as const,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  detailGridCell: {
    flexBasis: '47%' as unknown as number,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: P.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: P.borderLight,
  },
  detailGridLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: P.textMuted,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  detailGridValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: P.text,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: P.textMuted,
    fontWeight: '500' as const,
    width: 55,
  },
  infoValue: {
    fontSize: 14,
    color: P.text,
    fontWeight: '600' as const,
    flex: 1,
  },
  verdictCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  verdictBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start' as const,
    marginBottom: 6,
  },
  verdictBadgeText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  verdictReasoning: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500' as const,
  },
  demandBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  demandText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  descCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: P.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: P.borderLight,
  },
  descText: {
    fontSize: 14,
    color: P.textSecondary,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: P.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: P.borderLight,
  },
  insightText: {
    fontSize: 13,
    color: P.textSecondary,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: P.blueBg,
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: P.blueBorder,
  },
  tipText: {
    fontSize: 13,
    color: P.blue,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: P.amberBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: P.amberBorder,
  },
  warningText: {
    fontSize: 13,
    color: P.amber,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  dangerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: P.redBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: P.redBorder,
  },
  dangerText: {
    fontSize: 13,
    color: P.red,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: P.greenBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: P.greenBorder,
  },
  successText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: P.green,
    flex: 1,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: P.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: P.borderLight,
  },
  toolName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: P.textSecondary,
  },
  assemblyCard: {
    backgroundColor: P.card,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: P.borderLight,
  },
  assemblyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assemblyLabel: {
    fontSize: 13,
    color: P.textSecondary,
    fontWeight: '500' as const,
    flex: 1,
  },
  assemblyValue: {
    fontSize: 14,
    color: P.text,
    fontWeight: '600' as const,
  },
  diffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  diffText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  totalCostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: P.green,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  totalCostLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#E2EDE5',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: 2,
  },
  totalCostValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  nutrientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: P.greenBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: P.greenBorder,
  },
  nutrientChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: P.green,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  benefitText: {
    fontSize: 13,
    color: P.text,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  funFactCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: P.amberBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: P.amberBorder,
    marginBottom: 8,
  },
  funFactText: {
    fontSize: 13,
    color: P.amber,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  unknownCard: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  unknownTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: P.text,
    textAlign: 'center' as const,
  },
  unknownSub: {
    fontSize: 13,
    color: P.textMuted,
    textAlign: 'center' as const,
    lineHeight: 18,
  },
});
