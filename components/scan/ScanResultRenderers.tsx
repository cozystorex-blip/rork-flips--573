import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { SmartScanResult } from '@/services/smartScanService';

const C = {
  bg: '#141414',
  card: '#1A1A1A',
  cardBorder: '#2A2A2A',
  text: '#F5F5F7',
  textSecondary: '#AEAEB2',
  textMuted: '#636366',
  accent: '#3B82F6',
  green: '#16A34A',
  greenBg: '#16A34A18',
  red: '#EF4444',
  redBg: '#EF444418',
  amber: '#D97706',
  amberBg: '#D9770618',
  blue: '#3B82F6',
  blueBg: '#3B82F618',
  divider: '#2A2A2A',
};

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

function Divider() {
  return <View style={s.divider} />;
}

function SectionLabel({ text }: { text: string }) {
  return (
    <View style={s.sectionLabel}>
      <Text style={s.sectionLabelText}>{text}</Text>
    </View>
  );
}

function LineItem({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={s.lineItem}>
      <Text style={[s.lineItemLabel, bold && s.lineItemBold]}>{label}</Text>
      <Text style={[s.lineItemValue, bold && s.lineItemBold]}>{value}</Text>
    </View>
  );
}

function PriceLineItem({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <View style={s.priceLineItem}>
      <Text style={[s.priceLineLabel, large && s.priceLargeLbl]}>{label}</Text>
      <Text style={[s.priceLineValue, large && s.priceLargeVal]}>{value}</Text>
    </View>
  );
}

function InfoBlock({ text, type }: { text: string; type?: 'tip' | 'warning' | 'success' }) {
  const bg = type === 'success' ? C.greenBg : type === 'warning' ? C.amberBg : C.blueBg;
  const color = type === 'success' ? C.green : type === 'warning' ? C.amber : C.blue;
  const borderColor = type === 'success' ? C.green : type === 'warning' ? C.amber : C.blue;
  return (
    <View style={[s.infoBlock, { backgroundColor: bg, borderLeftColor: borderColor }]}>
      <Text style={[s.infoBlockText, { color }]}>{text}</Text>
    </View>
  );
}

function ChipRow({ items, label }: { items: string[]; label?: string }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={s.chipSection}>
      {label && <Text style={s.chipSectionLabel}>{label}</Text>}
      <View style={s.chipRow}>
        {items.map((item, i) => (
          <View key={`${item}-${i}`} style={s.chip}>
            <Text style={s.chipText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TagsRow({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <View style={s.tagsRow}>
      <Divider />
      <View style={s.tagsInner}>
        {tags.map((t, i) => (
          <Text key={`${t}-${i}`} style={s.tag}>#{t.toLowerCase().replace(/\s+/g, '')}</Text>
        ))}
      </View>
    </View>
  );
}

function ComplementarySection({ result }: { result: SmartScanResult }) {
  const items = result.food_details?.complementary_items
    ?? result.grocery_details?.complementary_items
    ?? result.household_details?.complementary_items
    ?? result.furniture_details?.complementary_items
    ?? result.fashion_details?.complementary_items
    ?? result.electronics_details?.complementary_items
    ?? result.general_details?.complementary_items
    ?? [];
  if (items.length === 0) return null;
  return (
    <>
      <Divider />
      <SectionLabel text="Goes Well With" />
      {items.map((item, i) => (
        <View key={`comp-${item}-${i}`} style={s.bulletRow}>
          <Text style={s.bulletChar}>+</Text>
          <Text style={s.bulletText}>{item}</Text>
        </View>
      ))}
    </>
  );
}

function ResaleBlock({ result }: { result: SmartScanResult }) {
  if (result.item_type === 'food' || result.item_type === 'grocery') return null;
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
      <Divider />
      <SectionLabel text="Resale Estimate" />
      <PriceLineItem label="Est. Resale" value={displayVal} large />
      {platform && (
        <Text style={s.resalePlatform}>Best on: {platform}</Text>
      )}
    </>
  );
}

function NoPriceRow() {
  return (
    <View style={s.noPriceRow}>
      <Text style={s.noPriceText}>No price found</Text>
      <Text style={s.noPriceSub}>Not enough data to estimate pricing</Text>
    </View>
  );
}

interface ResultProps {
  result: SmartScanResult;
}

function EmptyFallbackSection({ result }: ResultProps) {
  const typeLabel = result.item_type ? capitalize(result.item_type.replace(/_/g, ' ')) : 'Item';
  return (
    <>
      <SectionLabel text="Scan Result" />
      <View style={s.fallbackBlock}>
        <Text style={s.fallbackTitle}>{result.item_name || `${typeLabel} Detected`}</Text>
        {result.category ? (
          <Text style={s.fallbackSub}>Category: {result.category}</Text>
        ) : null}
      </View>
      {result.short_summary ? (
        <>
          <Divider />
          <InfoBlock text={result.short_summary} type="tip" />
        </>
      ) : (
        <>
          <Divider />
          <InfoBlock text="Could not extract detailed information. Try a clearer photo for better results." type="warning" />
        </>
      )}
    </>
  );
}

export function ReceiptResultSection({ result }: ResultProps) {
  return (
    <>
      <SectionLabel text="Receipt Detected" />
      <InfoBlock text="This image was identified as a receipt or price tag." type="tip" />
      <Divider />
      <View style={s.fallbackBlock}>
        <Text style={s.fallbackTitle}>{result.item_name || 'Receipt'}</Text>
        <Text style={s.fallbackSub}>
          Use the Receipt Scanner for full receipt parsing with itemized totals, store detection, and expense logging.
        </Text>
      </View>
      {result.short_summary ? (
        <>
          <Divider />
          <InfoBlock text={result.short_summary} type="success" />
        </>
      ) : null}
    </>
  );
}

export function FoodResultSection({ result }: ResultProps) {
  if (!result.food_details) {
    if (result.general_details) return <GeneralResultSection result={result} />;
    return <EmptyFallbackSection result={result} />;
  }
  const fd = result.food_details;
  return (
    <>
      <SectionLabel text="Nutrition Facts" />
      <Text style={s.servingNote}>Serving: {fd.serving_size}</Text>

      <View style={s.calorieBlock}>
        <Text style={s.calorieNumber}>{fd.calories}</Text>
        <Text style={s.calorieUnit}>CAL</Text>
      </View>

      <View style={s.macroGrid}>
        {[
          { val: fd.protein_g, label: 'Protein' },
          { val: fd.carbs_g, label: 'Carbs' },
          { val: fd.fat_g, label: 'Fat' },
          { val: fd.fiber_g, label: 'Fiber' },
        ].map((m) => (
          <View key={m.label} style={s.macroCell}>
            <Text style={s.macroCellVal}>{m.val}g</Text>
            <Text style={s.macroCellLabel}>{m.label}</Text>
          </View>
        ))}
      </View>

      {fd.sugar_g > 0 && (
        <LineItem label="Sugar" value={`${fd.sugar_g}g`} />
      )}

      {fd.health_summary && (
        <>
          <Divider />
          <InfoBlock text={fd.health_summary} type="success" />
        </>
      )}

      <Divider />
      <SectionLabel text="Price Check" />
      {fd.estimated_price ? (
        <>
          <PriceLineItem label="Est. Price" value={fd.estimated_price} large />
          {fd.price_range && <LineItem label="Range" value={fd.price_range} />}
          {fd.unit_price && <LineItem label="Unit Price" value={fd.unit_price} />}
        </>
      ) : <NoPriceRow />}

      {fd.budget_insight && (
        <>
          <Divider />
          <InfoBlock text={fd.budget_insight} type="tip" />
        </>
      )}
      {fd.cheaper_alternative && <InfoBlock text={`Try instead: ${fd.cheaper_alternative}`} type="warning" />}

      <ChipRow items={fd.key_nutrients} label="KEY NUTRIENTS" />

      {fd.health_benefits.length > 0 && (
        <>
          <Divider />
          <SectionLabel text="Benefits" />
          {fd.health_benefits.map((b, i) => (
            <View key={`${b}-${i}`} style={s.bulletRow}>
              <Text style={s.bulletChar}>✓</Text>
              <Text style={s.bulletText}>{b}</Text>
            </View>
          ))}
        </>
      )}

      {fd.quick_tip && (
        <>
          <Divider />
          <InfoBlock text={fd.quick_tip} type="tip" />
        </>
      )}

      <ComplementarySection result={result} />
      <TagsRow tags={fd.tags} />
    </>
  );
}

export function GroceryResultSection({ result }: ResultProps) {
  if (!result.grocery_details) {
    if (result.general_details) return <GeneralResultSection result={result} />;
    return <EmptyFallbackSection result={result} />;
  }
  const gd = result.grocery_details;
  return (
    <>
      <SectionLabel text="Product Info" />
      {gd.brand && <LineItem label="Brand" value={gd.brand} />}
      {gd.package_size && <LineItem label="Size" value={gd.package_size} />}

      <Divider />
      <SectionLabel text="Price Check" />
      {gd.estimated_price ? (
        <>
          <PriceLineItem label="Est. Price" value={gd.estimated_price} large />
          {gd.price_range && <LineItem label="Range" value={gd.price_range} />}
          {gd.unit_price && <LineItem label="Unit Price" value={gd.unit_price} />}
        </>
      ) : <NoPriceRow />}

      {gd.budget_insight && (
        <>
          <Divider />
          <InfoBlock text={gd.budget_insight} type="tip" />
        </>
      )}
      {gd.cheaper_alternative && <InfoBlock text={`Try instead: ${gd.cheaper_alternative}`} type="warning" />}

      {gd.what_else_needed && gd.what_else_needed.length > 0 && (
        <>
          <Divider />
          <SectionLabel text="You May Also Need" />
          {gd.what_else_needed.map((item, i) => (
            <View key={`need-${item}-${i}`} style={s.bulletRow}>
              <Text style={s.bulletChar}>+</Text>
              <Text style={s.bulletText}>{item}</Text>
            </View>
          ))}
        </>
      )}

      {gd.total_cost_note && (
        <>
          <Divider />
          <InfoBlock text={gd.total_cost_note} type="warning" />
        </>
      )}

      <ComplementarySection result={result} />
      <TagsRow tags={gd.tags} />
    </>
  );
}

export function FurnitureResultSection({ result }: ResultProps) {
  if (!result.furniture_details) {
    if (result.general_details) return <GeneralResultSection result={result} />;
    return <EmptyFallbackSection result={result} />;
  }
  const fd = result.furniture_details;
  const matchingProducts = (fd as Record<string, unknown>).matching_products as string[] | undefined;
  const wallAnchorNote = (fd as Record<string, unknown>).wall_anchor_note as string | null | undefined;
  const setupNotes = (fd as Record<string, unknown>).setup_notes as string | null | undefined;
  const longTermValue = (fd as Record<string, unknown>).long_term_value as string | null | undefined;

  return (
    <>
      <SectionLabel text="Product Details" />
      {fd.material && <LineItem label="Material" value={fd.material} />}
      {fd.finish_color && <LineItem label="Color/Finish" value={fd.finish_color} />}
      {fd.style && <LineItem label="Style" value={fd.style} />}
      {fd.estimated_dimensions && <LineItem label="Dimensions" value={fd.estimated_dimensions} />}
      {fd.value_level && <LineItem label="Price Tier" value={capitalize(fd.value_level)} />}
      {fd.mounting_type && fd.mounting_type !== 'unknown' && (
        <LineItem label="Type" value={capitalize(fd.mounting_type).replace('-', ' ')} />
      )}
      {fd.use_case && <LineItem label="Use" value={fd.use_case} />}
      {fd.room_fit && <LineItem label="Room" value={fd.room_fit} />}

      <Divider />
      <SectionLabel text="Price Check" />
      {fd.estimated_retail_price ? (
        <>
          <PriceLineItem label="Est. Price" value={fd.estimated_retail_price} large />
          {fd.estimated_price_range && <LineItem label="Range" value={fd.estimated_price_range} />}
        </>
      ) : <NoPriceRow />}

      {fd.value_verdict && (
        <View style={[s.verdictStrip, {
          backgroundColor: fd.value_verdict === 'strong' || fd.value_verdict === 'good' ? C.greenBg : C.amberBg,
        }]}>
          <Text style={[s.verdictText, {
            color: fd.value_verdict === 'strong' || fd.value_verdict === 'good' ? C.green : C.amber,
          }]}>{capitalize(fd.value_verdict)} Value{fd.value_reasoning ? ` — ${fd.value_reasoning}` : ''}</Text>
        </View>
      )}

      {fd.budget_insight && <InfoBlock text={fd.budget_insight} type="tip" />}
      {fd.cheaper_alternative && <InfoBlock text={`Alt: ${fd.cheaper_alternative}`} type="warning" />}
      {longTermValue && <InfoBlock text={longTermValue} type="success" />}

      <Divider />
      {fd.assembly_required === false ? (
        <>
          <SectionLabel text="Assembly" />
          <InfoBlock text="No assembly required — ready to use" type="success" />
        </>
      ) : (
        <>
          <SectionLabel text="Assembly" />
          {fd.assembly_difficulty && <LineItem label="Difficulty" value={capitalize(fd.assembly_difficulty)} />}
          {fd.estimated_build_time && <LineItem label="Build Time" value={fd.estimated_build_time} />}
          {fd.people_needed && <LineItem label="People" value={fd.people_needed === '1' ? '1 person' : fd.people_needed === '2' ? '2 people' : '2+ people'} />}

          {fd.likely_tools_needed.length > 0 && (
            <>
              <Divider />
              <SectionLabel text="Tools Needed" />
              {fd.likely_tools_needed.map((t, i) => (
                <View key={`tool-${t}-${i}`} style={s.bulletRow}>
                  <Text style={s.bulletChar}>•</Text>
                  <Text style={s.bulletText}>{t}</Text>
                </View>
              ))}
            </>
          )}

          {fd.assembly_summary && <InfoBlock text={fd.assembly_summary} type="warning" />}
        </>
      )}

      {setupNotes && <InfoBlock text={setupNotes} type="tip" />}
      {wallAnchorNote && <InfoBlock text={`⚠ ${wallAnchorNote}`} type="warning" />}

      {fd.extra_purchase_items && fd.extra_purchase_items.length > 0 && (
        <>
          <Divider />
          <SectionLabel text="Additional Items" />
          {fd.extra_purchase_items.map((ep, i) => (
            <View key={`extra-${ep.item}-${i}`} style={s.extraItemRow}>
              <View style={s.extraItemHeader}>
                <Text style={s.extraItemName}>{ep.item}</Text>
                {ep.estimated_cost && <Text style={s.extraItemCost}>{ep.estimated_cost}</Text>}
              </View>
              <Text style={s.extraItemReason}>{ep.reason}</Text>
            </View>
          ))}
        </>
      )}

      {fd.total_estimated_cost && (
        <View style={s.totalCostBanner}>
          <Text style={s.totalCostLabel}>TOTAL EST. COST</Text>
          <Text style={s.totalCostValue}>{fd.total_estimated_cost}</Text>
        </View>
      )}

      {fd.worth_it_verdict && <InfoBlock text={fd.worth_it_verdict} type="success" />}
      {fd.care_tip && <InfoBlock text={fd.care_tip} type="tip" />}

      {matchingProducts && matchingProducts.length > 0 && (
        <ChipRow items={matchingProducts} label="MATCHING PRODUCTS" />
      )}

      <ComplementarySection result={result} />
      <ResaleBlock result={result} />
      <TagsRow tags={fd.tags} />
    </>
  );
}

export function FashionResultSection({ result }: ResultProps) {
  if (!result.fashion_details) {
    if (result.general_details) return <GeneralResultSection result={result} />;
    return <EmptyFallbackSection result={result} />;
  }
  const fd = result.fashion_details;
  const subcategoryLabels: Record<string, string> = {
    shoes: 'Shoes', clothing: 'Clothing', outerwear: 'Outerwear',
    accessories: 'Accessories', bags: 'Bags', jewelry: 'Jewelry',
    activewear: 'Activewear', other: 'Fashion',
  };

  return (
    <>
      {fd.item_description && <InfoBlock text={fd.item_description} />}

      <SectionLabel text="Identification" />
      <LineItem label="Type" value={subcategoryLabels[fd.subcategory] ?? fd.subcategory} />
      {fd.brand && <LineItem label="Brand" value={fd.brand} />}
      {fd.model && <LineItem label="Model" value={fd.model} />}
      {fd.gender_target && <LineItem label="For" value={capitalize(fd.gender_target)} />}

      <Divider />
      <SectionLabel text="Details" />
      {fd.color && <LineItem label="Color" value={`${fd.color}${fd.secondary_color ? ` / ${fd.secondary_color}` : ''}`} />}
      {fd.material && <LineItem label="Material" value={fd.material} />}
      {fd.style && <LineItem label="Style" value={fd.style} />}
      {fd.condition && <LineItem label="Condition" value={capitalize(fd.condition)} />}
      {fd.pattern && fd.pattern !== 'solid' && <LineItem label="Pattern" value={capitalize(fd.pattern)} />}
      {fd.fit && <LineItem label="Fit" value={capitalize(fd.fit)} />}

      <Divider />
      <SectionLabel text="Price Check" />
      {fd.estimated_retail_price ? (
        <>
          <PriceLineItem label="Retail Price" value={fd.estimated_retail_price} large />
          {fd.estimated_resale_value && <PriceLineItem label="Resale Value" value={fd.estimated_resale_value} />}
          {fd.price_range && <LineItem label="Range" value={fd.price_range} />}
        </>
      ) : <NoPriceRow />}

      {fd.value_verdict && (
        <View style={[s.verdictStrip, {
          backgroundColor: fd.value_verdict === 'strong' || fd.value_verdict === 'good' ? C.greenBg : C.amberBg,
        }]}>
          <Text style={[s.verdictText, {
            color: fd.value_verdict === 'strong' || fd.value_verdict === 'good' ? C.green : C.amber,
          }]}>{capitalize(fd.value_verdict)} Value{fd.value_reasoning ? ` — ${fd.value_reasoning}` : ''}</Text>
        </View>
      )}

      {fd.resale_demand && (
        <LineItem label="Resale Demand" value={capitalize(fd.resale_demand)} />
      )}

      {fd.budget_insight && <InfoBlock text={fd.budget_insight} type="tip" />}
      {fd.cheaper_alternative && <InfoBlock text={`Try instead: ${fd.cheaper_alternative}`} type="warning" />}
      {fd.resale_suggestion && <InfoBlock text={fd.resale_suggestion} type="success" />}
      {fd.care_tip && <InfoBlock text={fd.care_tip} type="tip" />}

      <ComplementarySection result={result} />
      <TagsRow tags={fd.tags} />
    </>
  );
}

export function ElectronicsResultSection({ result }: ResultProps) {
  if (!result.electronics_details) {
    if (result.general_details) return <GeneralResultSection result={result} />;
    return <EmptyFallbackSection result={result} />;
  }
  const ed = result.electronics_details;
  return (
    <>
      {ed.product_type && (
        <InfoBlock text={`${ed.brand ? `${ed.brand} ` : ''}${ed.model ?? ed.product_type}${ed.storage_or_spec ? ` · ${ed.storage_or_spec}` : ''}`} />
      )}

      <SectionLabel text="Specs" />
      <LineItem label="Type" value={ed.product_type} />
      {ed.brand && <LineItem label="Brand" value={ed.brand} />}
      {ed.model && <LineItem label="Model" value={ed.model} />}
      {ed.storage_or_spec && <LineItem label="Spec" value={ed.storage_or_spec} />}
      {ed.condition && <LineItem label="Condition" value={capitalize(ed.condition)} />}

      <Divider />
      <SectionLabel text="Price Check" />
      {ed.estimated_retail_price ? (
        <>
          <PriceLineItem label="Retail Price" value={ed.estimated_retail_price} large />
          {ed.estimated_resale_value && <PriceLineItem label="Resale Value" value={ed.estimated_resale_value} />}
          {ed.price_range && <LineItem label="Range" value={ed.price_range} />}
        </>
      ) : <NoPriceRow />}

      {ed.depreciation_note && <InfoBlock text={ed.depreciation_note} type="warning" />}

      {ed.value_verdict && (
        <View style={[s.verdictStrip, {
          backgroundColor: ed.value_verdict === 'strong' || ed.value_verdict === 'good' ? C.greenBg : C.amberBg,
        }]}>
          <Text style={[s.verdictText, {
            color: ed.value_verdict === 'strong' || ed.value_verdict === 'good' ? C.green : C.amber,
          }]}>{capitalize(ed.value_verdict)} Value{ed.value_reasoning ? ` — ${ed.value_reasoning}` : ''}</Text>
        </View>
      )}

      {ed.resale_demand && <LineItem label="Resale Demand" value={capitalize(ed.resale_demand)} />}
      {ed.budget_insight && <InfoBlock text={ed.budget_insight} type="tip" />}
      {ed.cheaper_alternative && <InfoBlock text={`Try instead: ${ed.cheaper_alternative}`} type="warning" />}
      {ed.care_tip && <InfoBlock text={ed.care_tip} type="tip" />}

      <ComplementarySection result={result} />
      <ResaleBlock result={result} />
      <TagsRow tags={ed.tags} />
    </>
  );
}

export function HouseholdResultSection({ result }: ResultProps) {
  if (!result.household_details) {
    if (result.general_details) return <GeneralResultSection result={result} />;
    return <EmptyFallbackSection result={result} />;
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
      {hd.item_description && <InfoBlock text={hd.item_description} />}

      <SectionLabel text="Details" />
      <LineItem label="Type" value={subcategoryLabels[hd.subcategory] ?? hd.subcategory} />
      {hd.brand && <LineItem label="Brand" value={hd.brand} />}
      {hd.model && <LineItem label="Model" value={hd.model} />}
      {hd.material && <LineItem label="Material" value={hd.material} />}
      {hd.condition && <LineItem label="Condition" value={capitalize(hd.condition)} />}

      <Divider />
      <SectionLabel text="Price Check" />
      {hd.estimated_price ? (
        <>
          <PriceLineItem label="Est. Price" value={hd.estimated_price} large />
          {hd.estimated_resale_value && <PriceLineItem label="Resale Value" value={hd.estimated_resale_value} />}
          {hd.price_range && <LineItem label="Range" value={hd.price_range} />}
        </>
      ) : <NoPriceRow />}

      {hd.value_verdict && (
        <View style={[s.verdictStrip, {
          backgroundColor: hd.value_verdict === 'strong' || hd.value_verdict === 'good' ? C.greenBg : C.amberBg,
        }]}>
          <Text style={[s.verdictText, {
            color: hd.value_verdict === 'strong' || hd.value_verdict === 'good' ? C.green : C.amber,
          }]}>{capitalize(hd.value_verdict)} Value{hd.value_reasoning ? ` — ${hd.value_reasoning}` : ''}</Text>
        </View>
      )}

      {hd.budget_insight && <InfoBlock text={hd.budget_insight} type="tip" />}
      {hd.cheaper_alternative && <InfoBlock text={`Try instead: ${hd.cheaper_alternative}`} type="warning" />}
      {hd.practical_recommendation && <InfoBlock text={hd.practical_recommendation} type="success" />}
      {hd.care_tip && <InfoBlock text={hd.care_tip} type="tip" />}

      <ComplementarySection result={result} />
      <ResaleBlock result={result} />
      <TagsRow tags={hd.tags} />
    </>
  );
}

export function GeneralResultSection({ result }: ResultProps) {
  if (!result.general_details) return <EmptyFallbackSection result={result} />;
  const gd = result.general_details;
  return (
    <>
      {gd.item_description && <InfoBlock text={gd.item_description} />}

      <SectionLabel text="Identification" />
      {gd.subcategory && <LineItem label="Category" value={capitalize(gd.subcategory.replace(/_/g, ' '))} />}
      {gd.brand && <LineItem label="Brand" value={gd.brand} />}
      {gd.model && <LineItem label="Model" value={gd.model} />}
      {gd.material && <LineItem label="Material" value={gd.material} />}
      {gd.color && <LineItem label="Color" value={gd.color} />}
      {gd.condition && <LineItem label="Condition" value={capitalize(gd.condition)} />}

      <Divider />
      <SectionLabel text="Price Check" />
      {gd.estimated_retail_price ? (
        <>
          <PriceLineItem label="Retail Price" value={gd.estimated_retail_price} large />
          {gd.estimated_resale_value && <PriceLineItem label="Resale Value" value={gd.estimated_resale_value} />}
          {gd.price_range && <LineItem label="Range" value={gd.price_range} />}
        </>
      ) : <NoPriceRow />}

      {gd.value_verdict && (
        <View style={[s.verdictStrip, {
          backgroundColor: gd.value_verdict === 'strong' || gd.value_verdict === 'good' ? C.greenBg : C.amberBg,
        }]}>
          <Text style={[s.verdictText, {
            color: gd.value_verdict === 'strong' || gd.value_verdict === 'good' ? C.green : C.amber,
          }]}>{capitalize(gd.value_verdict)} Value{gd.value_reasoning ? ` — ${gd.value_reasoning}` : ''}</Text>
        </View>
      )}

      {gd.budget_insight && <InfoBlock text={gd.budget_insight} type="tip" />}
      {gd.cheaper_alternative && <InfoBlock text={`Try instead: ${gd.cheaper_alternative}`} type="warning" />}

      {gd.fun_fact && (
        <>
          <Divider />
          <SectionLabel text="Did You Know?" />
          <InfoBlock text={gd.fun_fact} type="warning" />
        </>
      )}

      {gd.practical_tip && <InfoBlock text={gd.practical_tip} type="tip" />}
      {gd.care_tip && <InfoBlock text={gd.care_tip} type="tip" />}

      <ComplementarySection result={result} />
      <ResaleBlock result={result} />
      <TagsRow tags={gd.tags} />
    </>
  );
}

export function UnknownResultSection({ result }: ResultProps) {
  if (result.general_details != null) return <GeneralResultSection result={result} />;
  if (result.household_details != null) return <HouseholdResultSection result={result} />;
  if (result.furniture_details != null) return <FurnitureResultSection result={result} />;
  if (result.food_details != null) return <FoodResultSection result={result} />;
  if (result.grocery_details != null) return <GroceryResultSection result={result} />;
  if (result.fashion_details != null) return <FashionResultSection result={result} />;
  if (result.electronics_details != null) return <ElectronicsResultSection result={result} />;
  return (
    <>
      <View style={s.fallbackBlock}>
        <Text style={s.fallbackTitle}>
          {result.item_name && result.item_name !== 'Unknown Item' ? result.item_name : 'Item Not Recognized'}
        </Text>
        {result.category && result.category !== 'unknown' ? (
          <Text style={s.fallbackSub}>Possible category: {result.category}</Text>
        ) : null}
      </View>
      <Divider />
      <NoPriceRow />
      {result.short_summary ? (
        <>
          <Divider />
          <InfoBlock text={result.short_summary} type="tip" />
        </>
      ) : null}
    </>
  );
}

const s = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: C.divider,
    marginVertical: 12,
  },
  sectionLabel: {
    marginBottom: 8,
    marginTop: 4,
  },
  sectionLabelText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: C.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  lineItemLabel: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: '500' as const,
  },
  lineItemValue: {
    fontSize: 13,
    color: C.text,
    fontWeight: '600' as const,
    maxWidth: '55%' as unknown as number,
    textAlign: 'right' as const,
  },
  lineItemBold: {
    fontWeight: '800' as const,
    color: C.text,
  },
  priceLineItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  priceLineLabel: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: '600' as const,
  },
  priceLineValue: {
    fontSize: 16,
    color: C.text,
    fontWeight: '700' as const,
  },
  priceLargeLbl: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: C.text,
  },
  priceLargeVal: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: C.text,
    letterSpacing: -0.5,
  },
  servingNote: {
    fontSize: 12,
    color: C.textMuted,
    marginBottom: 6,
    fontWeight: '500' as const,
  },
  calorieBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  calorieNumber: {
    fontSize: 40,
    fontWeight: '900' as const,
    color: C.text,
    letterSpacing: -1,
  },
  calorieUnit: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: C.textSecondary,
    letterSpacing: 2,
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    marginBottom: 6,
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  macroCell: {
    alignItems: 'center',
    gap: 2,
  },
  macroCellVal: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: C.text,
  },
  macroCellLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: C.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  infoBlock: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 4,
    borderLeftWidth: 3,
    borderLeftColor: C.blue,
  },
  infoBlockText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  chipSection: {
    marginTop: 10,
  },
  chipSectionLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: C.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: C.textSecondary,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 3,
  },
  bulletChar: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: C.textSecondary,
    width: 14,
  },
  bulletText: {
    fontSize: 13,
    color: C.text,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  tagsRow: {
    marginTop: 6,
  },
  tagsInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center' as const,
  },
  tag: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '500' as const,
  },
  resalePlatform: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '500' as const,
    marginTop: 2,
    textAlign: 'right' as const,
  },
  verdictStrip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 6,
  },
  verdictText: {
    fontSize: 13,
    fontWeight: '700' as const,
    lineHeight: 18,
  },
  extraItemRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  extraItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  extraItemName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: C.text,
    flex: 1,
  },
  extraItemCost: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: C.text,
  },
  extraItemReason: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  totalCostBanner: {
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 14,
    marginVertical: 8,
    alignItems: 'center' as const,
  },
  totalCostLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: C.textMuted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  totalCostValue: {
    fontSize: 26,
    fontWeight: '900' as const,
    color: C.text,
    letterSpacing: -0.5,
  },
  fallbackBlock: {
    alignItems: 'center' as const,
    paddingVertical: 16,
  },
  fallbackTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: C.text,
    textAlign: 'center' as const,
  },
  fallbackSub: {
    fontSize: 12,
    color: C.textMuted,
    textAlign: 'center' as const,
    lineHeight: 17,
    marginTop: 4,
  },
  noPriceRow: {
    alignItems: 'center' as const,
    paddingVertical: 10,
  },
  noPriceText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: C.textMuted,
    letterSpacing: 0.5,
  },
  noPriceSub: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '500' as const,
    marginTop: 2,
  },
});
