import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { SmartScanResult } from '@/services/smartScanService';
import {
  ScanTrustResult,
  TrustSectionItem,
  VerificationStatus,
  getVerificationLabel,
  getVerificationColor,
} from '@/types/scanTrust';

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

function VerificationBadge({ status }: { status: VerificationStatus }) {
  const label = getVerificationLabel(status);
  const color = getVerificationColor(status);
  return (
    <View style={[s.verificationBadge, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
      <View style={[s.verificationDot, { backgroundColor: color }]} />
      <Text style={[s.verificationBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

function TrustLineItem({ item }: { item: TrustSectionItem }) {
  return (
    <View style={s.trustLineItem}>
      <View style={s.trustLineTop}>
        <Text style={s.lineItemLabel}>{item.label}</Text>
        <View style={s.trustLineRight}>
          <Text style={s.lineItemValue}>{item.value}</Text>
        </View>
      </View>
      {item.verificationStatus !== 'confirmed' && (
        <View style={s.trustBadgeRow}>
          <VerificationBadge status={item.verificationStatus} />
        </View>
      )}
    </View>
  );
}

function ConfirmedFactsSection({ items }: { items: TrustSectionItem[] }) {
  if (items.length === 0) return null;
  return (
    <>
      <SectionLabel text="Confirmed Facts" />
      <View style={s.confirmedCard}>
        {items.map((item, i) => (
          <View key={`cf-${item.label}-${i}`}>
            <View style={s.confirmedRow}>
              <Text style={s.confirmedLabel}>{item.label}</Text>
              <Text style={s.confirmedValue}>{item.value}</Text>
            </View>
            {i < items.length - 1 && <View style={s.confirmedDivider} />}
          </View>
        ))}
      </View>
    </>
  );
}

function LikelyDetailsSection({ items }: { items: TrustSectionItem[] }) {
  if (items.length === 0) return null;
  return (
    <>
      <Divider />
      <SectionLabel text="Likely / Estimated Details" />
      {items.map((item, i) => (
        <TrustLineItem key={`ld-${item.label}-${i}`} item={item} />
      ))}
    </>
  );
}

function CommonUseSection({ uses }: { uses: string[] }) {
  if (uses.length === 0) return null;
  return (
    <>
      <Divider />
      <SectionLabel text="Common Use" />
      {uses.map((use, i) => (
        <View key={`use-${i}`} style={s.bulletRow}>
          <Text style={s.bulletChar}>•</Text>
          <Text style={s.bulletText}>{use}</Text>
        </View>
      ))}
    </>
  );
}

function CareTipsSection({ tips }: { tips: string[] }) {
  if (tips.length === 0) return null;
  return (
    <>
      <Divider />
      <View style={s.genericSectionHeader}>
        <SectionLabel text="General Care Tips" />
        <VerificationBadge status="generic" />
      </View>
      {tips.map((tip, i) => (
        <View key={`care-${i}`} style={s.bulletRow}>
          <Text style={s.bulletChar}>•</Text>
          <Text style={s.bulletText}>{tip}</Text>
        </View>
      ))}
    </>
  );
}

function AssemblySection({ items }: { items: TrustSectionItem[] }) {
  if (items.length === 0) return null;
  return (
    <>
      <Divider />
      <View style={s.genericSectionHeader}>
        <SectionLabel text="Typical Assembly" />
        <VerificationBadge status="generic" />
      </View>
      {items.map((item, i) => (
        <TrustLineItem key={`asm-${item.label}-${i}`} item={item} />
      ))}
    </>
  );
}

function CompanionItemsSection({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <>
      <Divider />
      <View style={s.genericSectionHeader}>
        <SectionLabel text="Often Used With" />
        <VerificationBadge status="generic" />
      </View>
      {items.map((item, i) => (
        <View key={`comp-${item}-${i}`} style={s.bulletRow}>
          <Text style={s.bulletChar}>+</Text>
          <Text style={s.bulletText}>{item}</Text>
        </View>
      ))}
    </>
  );
}

function SourceQualitySection({ sources, label }: { sources: string[]; label: string }) {
  if (sources.length === 0) return null;
  return (
    <>
      <Divider />
      <SectionLabel text="Source Quality" />
      <View style={s.sourceCard}>
        <Text style={s.sourceLabel}>{label}</Text>
        {sources.map((src, i) => (
          <Text key={`src-${i}`} style={s.sourceItem}>• {src}</Text>
        ))}
      </View>
    </>
  );
}

function NoPriceRow() {
  return (
    <View style={s.noPriceRow}>
      <Text style={s.noPriceText}>Price not confirmed</Text>
      <Text style={s.noPriceSub}>Not enough data to estimate pricing</Text>
    </View>
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
      <View style={s.genericSectionHeader}>
        <SectionLabel text="Resale Estimate" />
        <VerificationBadge status="likely" />
      </View>
      <PriceLineItem label="Est. Resale" value={displayVal} large />
      <Text style={s.resaleDisclaimer}>Estimated from similar products on secondhand platforms</Text>
      {platform && (
        <Text style={s.resalePlatform}>Best on: {platform}</Text>
      )}
    </>
  );
}

interface ResultProps {
  result: SmartScanResult;
}

function EmptyFallbackSection({ result }: ResultProps) {
  const typeLabel = result.item_type ? capitalize(result.item_type.replace(/_/g, ' ')) : 'Item';
  const isLowConf = result.confidence < 0.4;
  return (
    <>
      <SectionLabel text={isLowConf ? 'Scan Result — Limited Data' : 'Scan Result'} />
      <View style={s.fallbackBlock}>
        <Text style={s.fallbackTitle}>{result.item_name || `${typeLabel} Detected`}</Text>
        {result.category ? (
          <Text style={s.fallbackSub}>Category: {result.category}</Text>
        ) : null}
      </View>
      {isLowConf ? (
        <>
          <Divider />
          <InfoBlock text="Limited information could be extracted. Try a clearer photo with better lighting for more detailed results." type="warning" />
        </>
      ) : result.short_summary ? (
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

function TrustResultSection({ result, trustResult }: { result: SmartScanResult; trustResult: ScanTrustResult }) {
  const tags = result.furniture_details?.tags
    ?? result.household_details?.tags
    ?? result.fashion_details?.tags
    ?? result.electronics_details?.tags
    ?? result.general_details?.tags
    ?? [];

  return (
    <>
      <ConfirmedFactsSection items={trustResult.sections.confirmedFacts} />
      <LikelyDetailsSection items={trustResult.sections.likelyDetails} />
      <CommonUseSection uses={trustResult.sections.commonUse} />
      <CareTipsSection tips={trustResult.sections.generalCareTips} />
      <AssemblySection items={trustResult.sections.typicalAssembly} />
      <CompanionItemsSection items={trustResult.sections.companionItems} />
      <ResaleBlock result={result} />
      <SourceQualitySection sources={trustResult.sections.sourceQuality} label={trustResult.sourceQualityLabel} />
      <TagsRow tags={tags} />
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

      {result.trustResult ? (
        <SourceQualitySection sources={result.trustResult.sections.sourceQuality} label={result.trustResult.sourceQualityLabel} />
      ) : null}

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

      {result.trustResult ? (
        <SourceQualitySection sources={result.trustResult.sections.sourceQuality} label={result.trustResult.sourceQualityLabel} />
      ) : null}

      <TagsRow tags={gd.tags} />
    </>
  );
}

export function FurnitureResultSection({ result }: ResultProps) {
  if (!result.furniture_details) {
    if (result.general_details) return <GeneralResultSection result={result} />;
    return <EmptyFallbackSection result={result} />;
  }

  if (result.trustResult) {
    return <TrustResultSection result={result} trustResult={result.trustResult} />;
  }

  const fd = result.furniture_details;
  return (
    <>
      <SectionLabel text="Product Details" />
      {fd.material && <LineItem label="Material" value={fd.material} />}
      {fd.finish_color && <LineItem label="Color/Finish" value={fd.finish_color} />}
      {fd.style && <LineItem label="Style" value={fd.style} />}
      {fd.estimated_dimensions && <LineItem label="Dimensions" value={fd.estimated_dimensions} />}
      {fd.use_case && <LineItem label="Use" value={fd.use_case} />}
      {fd.room_fit && <LineItem label="Room" value={fd.room_fit} />}

      <Divider />
      <SectionLabel text="Price Check" />
      {fd.estimated_retail_price ? (
        <>
          <PriceLineItem label="Est. Price" value={fd.estimated_retail_price} large />
          {fd.estimated_price_range && <LineItem label="Range" value={fd.estimated_price_range} />}
        </>
      ) : fd.estimated_price_range ? (
        <>
          <View style={s.genericSectionHeader}>
            <SectionLabel text="" />
            <VerificationBadge status="likely" />
          </View>
          <PriceLineItem label="Estimated Range" value={fd.estimated_price_range} large />
          <Text style={s.resaleDisclaimer}>Estimated from similar products</Text>
        </>
      ) : <NoPriceRow />}

      {fd.care_tip && <InfoBlock text={fd.care_tip} type="tip" />}
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

  if (result.trustResult) {
    return <TrustResultSection result={result} trustResult={result.trustResult} />;
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

      <Divider />
      <SectionLabel text="Price Check" />
      {fd.estimated_retail_price ? (
        <>
          <PriceLineItem label="Retail Price" value={fd.estimated_retail_price} large />
          {fd.estimated_resale_value && <PriceLineItem label="Resale Value" value={fd.estimated_resale_value} />}
          {fd.price_range && <LineItem label="Range" value={fd.price_range} />}
        </>
      ) : <NoPriceRow />}

      {fd.care_tip && <InfoBlock text={fd.care_tip} type="tip" />}
      <TagsRow tags={fd.tags} />
    </>
  );
}

export function ElectronicsResultSection({ result }: ResultProps) {
  if (!result.electronics_details) {
    if (result.general_details) return <GeneralResultSection result={result} />;
    return <EmptyFallbackSection result={result} />;
  }

  if (result.trustResult) {
    return <TrustResultSection result={result} trustResult={result.trustResult} />;
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

      {ed.care_tip && <InfoBlock text={ed.care_tip} type="tip" />}
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

  if (result.trustResult) {
    return <TrustResultSection result={result} trustResult={result.trustResult} />;
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
          {hd.price_range && <LineItem label="Range" value={hd.price_range} />}
        </>
      ) : <NoPriceRow />}

      {hd.care_tip && <InfoBlock text={hd.care_tip} type="tip" />}
      <ResaleBlock result={result} />
      <TagsRow tags={hd.tags} />
    </>
  );
}

export function GeneralResultSection({ result }: ResultProps) {
  if (!result.general_details) return <EmptyFallbackSection result={result} />;

  if (result.trustResult) {
    return <TrustResultSection result={result} trustResult={result.trustResult} />;
  }

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
          {gd.price_range && <LineItem label="Range" value={gd.price_range} />}
        </>
      ) : <NoPriceRow />}

      {gd.practical_tip && <InfoBlock text={gd.practical_tip} type="tip" />}
      {gd.care_tip && <InfoBlock text={gd.care_tip} type="tip" />}

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

  const isVeryLow = result.confidence < 0.3;
  return (
    <>
      <View style={s.fallbackBlock}>
        <Text style={s.fallbackTitle}>
          {isVeryLow ? 'Item Not Recognized' : (result.item_name && result.item_name !== 'Unknown Item' ? result.item_name : 'Item Not Recognized')}
        </Text>
        {result.category && result.category !== 'unknown' ? (
          <Text style={s.fallbackSub}>Possible category: {result.category}</Text>
        ) : null}
      </View>
      <Divider />
      {isVeryLow ? (
        <InfoBlock text="The image could not be identified. Try scanning with better lighting, a closer angle, or a different photo." type="warning" />
      ) : (
        <>
          <NoPriceRow />
          {result.short_summary ? (
            <>
              <Divider />
              <InfoBlock text={result.short_summary} type="tip" />
            </>
          ) : null}
        </>
      )}
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
  resaleDisclaimer: {
    fontSize: 10,
    color: C.textMuted,
    fontWeight: '400' as const,
    marginTop: 2,
    fontStyle: 'italic' as const,
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
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  verificationDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  verificationBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  trustLineItem: {
    paddingVertical: 5,
  },
  trustLineTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trustLineRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '60%' as unknown as number,
  },
  trustBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 3,
  },
  confirmedCard: {
    backgroundColor: '#16A34A0D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#16A34A25',
    padding: 12,
  },
  confirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  confirmedLabel: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600' as const,
  },
  confirmedValue: {
    fontSize: 13,
    color: C.text,
    fontWeight: '700' as const,
    maxWidth: '55%' as unknown as number,
    textAlign: 'right' as const,
  },
  confirmedDivider: {
    height: 1,
    backgroundColor: '#16A34A15',
    marginVertical: 4,
  },
  genericSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sourceCard: {
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 12,
  },
  sourceLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: C.textSecondary,
    marginBottom: 6,
  },
  sourceItem: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '500' as const,
    lineHeight: 16,
    marginLeft: 4,
  },
});
