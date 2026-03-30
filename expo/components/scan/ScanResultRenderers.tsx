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
import { ScannerColors } from '@/constants/scannerTheme';

const C = {
  bg: ScannerColors.surface,
  card: ScannerColors.card,
  cardBorder: ScannerColors.cardBorder,
  text: ScannerColors.text,
  textSecondary: ScannerColors.textSecondary,
  textMuted: ScannerColors.textMuted,
  accent: ScannerColors.accent,
  green: ScannerColors.success,
  greenBg: ScannerColors.successBg,
  red: ScannerColors.error,
  redBg: ScannerColors.errorBg,
  amber: ScannerColors.amber,
  amberBg: ScannerColors.amberBg,
  blue: ScannerColors.accent,
  blueBg: ScannerColors.accentSoft,
  divider: ScannerColors.divider,
};

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

function safeDollar(val: string | null | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (trimmed.length === 0) return null;
  return trimmed.startsWith('$') ? trimmed : `$${trimmed}`;
}

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

function PurposeSection({ purpose }: { purpose: string | null | undefined }) {
  if (!purpose) return null;
  return (
    <>
      <Divider />
      <SectionLabel text="What It's For" />
      <Text style={s.purposeText}>{purpose}</Text>
    </>
  );
}

function ValueInsightSection({ insight }: { insight: string | null | undefined }) {
  if (!insight) return null;
  return (
    <>
      <Divider />
      <SectionLabel text="Value Insight" />
      <InfoBlock text={insight} type="tip" />
    </>
  );
}

function NextScanSection({ suggestion }: { suggestion: string | null | undefined }) {
  if (!suggestion) return null;
  return (
    <>
      <Divider />
      <View style={s.nextScanCard}>
        <Text style={s.nextScanLabel}>Scan Next</Text>
        <Text style={s.nextScanText}>{suggestion}</Text>
      </View>
    </>
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
          <Text style={s.bulletChar}>{'\u2022'}</Text>
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
          <Text style={s.bulletChar}>{'\u2022'}</Text>
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
          <Text key={`src-${i}`} style={s.sourceItem}>{'\u2022'} {src}</Text>
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
  const displayVal = safeDollar(resale) ?? resale;
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
      <SectionLabel text={isLowConf ? 'Scan Result \u2014 Limited Data' : 'Scan Result'} />
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

function RecipeCard({ recipe }: { recipe: { name: string; description: string; difficulty: string; prep_time: string; key_ingredients: string[] } }) {
  const diffColor = recipe.difficulty === 'easy' ? C.green : recipe.difficulty === 'medium' ? C.amber : C.red;
  const diffBg = recipe.difficulty === 'easy' ? C.greenBg : recipe.difficulty === 'medium' ? C.amberBg : C.redBg;
  return (
    <View style={s.recipeCard}>
      <View style={s.recipeHeader}>
        <Text style={s.recipeName}>{recipe.name}</Text>
        <View style={[s.recipeDiffBadge, { backgroundColor: diffBg }]}>
          <Text style={[s.recipeDiffText, { color: diffColor }]}>{capitalize(recipe.difficulty)}</Text>
        </View>
      </View>
      <Text style={s.recipeDesc}>{recipe.description}</Text>
      <View style={s.recipeMetaRow}>
        <Text style={s.recipeMetaText}>{recipe.prep_time}</Text>
      </View>
      {recipe.key_ingredients.length > 0 && (
        <View style={s.recipeIngredientsRow}>
          {recipe.key_ingredients.map((ing, i) => (
            <View key={`${ing}-${i}`} style={s.recipeIngChip}>
              <Text style={s.recipeIngText}>{ing}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
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

      {fd.ingredients && fd.ingredients.length > 0 && (
        <>
          <Divider />
          <SectionLabel text="Ingredients" />
          {fd.ingredients.map((ing, i) => (
            <View key={`ing-${i}`} style={s.bulletRow}>
              <Text style={s.bulletChar}>{'\u2022'}</Text>
              <Text style={s.bulletText}>{ing}</Text>
            </View>
          ))}
        </>
      )}

      <ChipRow items={fd.allergens} label="ALLERGENS" />
      <ChipRow items={fd.dietary_info} label="DIETARY INFO" />

      {fd.cuisine_type && <LineItem label="Cuisine" value={fd.cuisine_type} />}
      {fd.origin_region && <LineItem label="Origin" value={fd.origin_region} />}
      {fd.season_availability && <LineItem label="Season" value={fd.season_availability} />}

      {fd.recipe_ideas && fd.recipe_ideas.length > 0 && (
        <>
          <Divider />
          <SectionLabel text="Recipe Ideas" />
          {fd.recipe_ideas.map((recipe, i) => (
            <RecipeCard key={`recipe-${i}`} recipe={recipe} />
          ))}
        </>
      )}

      {fd.preparation_tips && fd.preparation_tips.length > 0 && (
        <>
          <Divider />
          <SectionLabel text="Preparation Tips" />
          {fd.preparation_tips.map((tip, i) => (
            <View key={`prep-${i}`} style={s.bulletRow}>
              <Text style={s.bulletChar}>{'\u2192'}</Text>
              <Text style={s.bulletText}>{tip}</Text>
            </View>
          ))}
        </>
      )}

      {fd.storage_tip && (
        <>
          <Divider />
          <SectionLabel text="Storage" />
          <InfoBlock text={fd.storage_tip} type="tip" />
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

      {fd.value_rating && <LineItem label="Value Rating" value={capitalize(fd.value_rating)} />}

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
          <SectionLabel text="Health Benefits" />
          {fd.health_benefits.map((b, i) => (
            <View key={`${b}-${i}`} style={s.bulletRow}>
              <Text style={s.bulletChar}>{'\u2713'}</Text>
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

      <ChipRow items={fd.pairs_with_drinks} label="DRINK PAIRINGS" />
      <ChipRow items={fd.substitutes} label="SUBSTITUTES" />

      {result.trustResult ? (
        <SourceQualitySection sources={result.trustResult.sections.sourceQuality} label={result.trustResult.sourceQualityLabel} />
      ) : null}

      <ChipRow items={fd.complementary_items} label="PAIRS WELL WITH" />
      <PurposeSection purpose={fd.purpose} />
      <ValueInsightSection insight={fd.value_insight} />
      <NextScanSection suggestion={fd.next_scan_suggestion} />
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
      {gd.brand && <LineItem label="Brand" value={gd.brand} bold />}
      {gd.package_size && <LineItem label="Size" value={gd.package_size} />}
      {gd.nutrition_highlights && <InfoBlock text={gd.nutrition_highlights} type="success" />}

      {gd.ingredients_list && gd.ingredients_list.length > 0 && (
        <>
          <Divider />
          <SectionLabel text="Ingredients" />
          {gd.ingredients_list.map((ing, i) => (
            <View key={`ging-${i}`} style={s.bulletRow}>
              <Text style={s.bulletChar}>{'\u2022'}</Text>
              <Text style={s.bulletText}>{ing}</Text>
            </View>
          ))}
        </>
      )}

      <ChipRow items={gd.allergens} label="ALLERGENS" />
      <ChipRow items={gd.dietary_info} label="DIETARY INFO" />

      <Divider />
      <SectionLabel text="Price Check" />
      {gd.estimated_price ? (
        <>
          <PriceLineItem label="Est. Price" value={gd.estimated_price} large />
          {gd.price_range && <LineItem label="Range" value={gd.price_range} />}
          {gd.unit_price && <LineItem label="Unit Price" value={gd.unit_price} />}
        </>
      ) : <NoPriceRow />}

      {gd.value_rating && <LineItem label="Value Rating" value={capitalize(gd.value_rating)} />}

      {gd.budget_insight && (
        <>
          <Divider />
          <InfoBlock text={gd.budget_insight} type="tip" />
        </>
      )}
      {gd.cheaper_alternative && <InfoBlock text={`Try instead: ${gd.cheaper_alternative}`} type="warning" />}

      {gd.recipe_ideas && gd.recipe_ideas.length > 0 && (
        <>
          <Divider />
          <SectionLabel text="Recipe Ideas" />
          {gd.recipe_ideas.map((recipe, i) => (
            <RecipeCard key={`grecipe-${i}`} recipe={recipe} />
          ))}
        </>
      )}

      {gd.preparation_tips && gd.preparation_tips.length > 0 && (
        <>
          <Divider />
          <SectionLabel text="Preparation Tips" />
          {gd.preparation_tips.map((tip, i) => (
            <View key={`gprep-${i}`} style={s.bulletRow}>
              <Text style={s.bulletChar}>{'\u2192'}</Text>
              <Text style={s.bulletText}>{tip}</Text>
            </View>
          ))}
        </>
      )}

      {gd.storage_tip && (
        <>
          <Divider />
          <SectionLabel text="Storage" />
          <InfoBlock text={gd.storage_tip} type="tip" />
        </>
      )}

      <ChipRow items={gd.substitutes} label="SUBSTITUTES" />

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

      <ChipRow items={gd.complementary_items} label="GOES WELL WITH" />
      <PurposeSection purpose={gd.purpose} />
      <ValueInsightSection insight={gd.value_insight} />
      <NextScanSection suggestion={gd.next_scan_suggestion} />
      <TagsRow tags={gd.tags} />
    </>
  );
}

function IkeaMatchBadge({ confidence }: { confidence: string }) {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    exact: { label: 'Exact IKEA Match', color: '#0058A3', bg: '#0058A312' },
    strong: { label: 'Strong IKEA Match', color: '#2D8C3C', bg: '#2D8C3C12' },
    possible: { label: 'Possible IKEA Match', color: '#C27800', bg: '#C2780012' },
    weak: { label: 'Might Be IKEA', color: '#888888', bg: '#88888812' },
  };
  const cfg = configs[confidence] ?? configs.possible;
  return (
    <View style={[s.ikeaMatchBadge, { backgroundColor: cfg.bg }]}>
      <View style={[s.ikeaMatchDot, { backgroundColor: cfg.color }]} />
      <Text style={[s.ikeaMatchText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function IkeaCluesSection({ clues }: { clues: string[] }) {
  if (!clues || clues.length === 0) return null;
  return (
    <>
      <Divider />
      <SectionLabel text="IKEA Clues Detected" />
      <View style={s.ikeaCluesCard}>
        {clues.map((clue, i) => (
          <View key={`clue-${i}`} style={s.bulletRow}>
            <Text style={s.bulletChar}>{"\u2713"}</Text>
            <Text style={s.bulletText}>{clue}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function BestNextScanSection({ suggestions }: { suggestions: string[] }) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <>
      <Divider />
      <SectionLabel text="Best Next Scan" />
      <View style={s.bestNextScanCard}>
        <Text style={s.bestNextScanIntro}>For better accuracy, try scanning:</Text>
        {suggestions.map((sug, i) => (
          <View key={`bns-${i}`} style={s.bulletRow}>
            <Text style={s.bulletChar}>{"\u25CE"}</Text>
            <Text style={s.bulletText}>{sug}</Text>
          </View>
        ))}
      </View>
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
  const safeResale = safeDollar(fd.estimated_resale_value);
  const isIkea = fd.is_likely_ikea === true;
  const hasIkeaId = !!(fd.ikea_article_number || fd.ikea_product_name);

  return (
    <>
      {isIkea && fd.ikea_match_confidence && (
        <IkeaMatchBadge confidence={fd.ikea_match_confidence} />
      )}

      {fd.item_type_specific && <InfoBlock text={fd.item_type_specific} />}

      {hasIkeaId && (
        <>
          <SectionLabel text="Identified Product" />
          {fd.ikea_product_name && <LineItem label="Product" value={fd.ikea_product_name} bold />}
          {fd.ikea_article_number && <LineItem label="Article No." value={fd.ikea_article_number} bold />}
          {fd.ikea_product_family && <LineItem label="Family" value={fd.ikea_product_family} />}
          {fd.ikea_variant && <LineItem label="Variant" value={fd.ikea_variant} />}
          {fd.ikea_category && <LineItem label="Category" value={fd.ikea_category} />}
          {fd.packaging_type && fd.packaging_type !== 'unknown' && <LineItem label="Packaging" value={capitalize(fd.packaging_type.replace(/-/g, ' '))} />}
          {fd.packaging_count && <LineItem label="Packages" value={fd.packaging_count} />}
          {fd.manual_detected && <InfoBlock text="Assembly manual detected in scan" type="success" />}
          {fd.label_detected && <InfoBlock text="Product label detected in scan" type="success" />}
          <Divider />
        </>
      )}

      <SectionLabel text="Key Details" />
      {fd.material && <LineItem label="Material" value={fd.material} />}
      {fd.finish_color && <LineItem label="Color/Finish" value={fd.finish_color} />}
      {fd.style && <LineItem label="Style" value={fd.style} />}
      {fd.estimated_dimensions && <LineItem label="Dimensions" value={fd.estimated_dimensions} />}
      {fd.value_level && <LineItem label="Tier" value={capitalize(fd.value_level)} />}
      {fd.mounting_type && fd.mounting_type !== 'unknown' && <LineItem label="Mount" value={capitalize(fd.mounting_type.replace(/-/g, ' '))} />}
      {fd.condition_estimate && <LineItem label="Condition" value={capitalize(fd.condition_estimate.replace(/-/g, ' '))} />}
      {fd.use_case && <LineItem label="Use" value={fd.use_case} />}
      {fd.room_fit && <LineItem label="Room" value={fd.room_fit} />}

      <Divider />
      <SectionLabel text="Price & Value" />
      {fd.estimated_retail_price ? (
        <>
          <PriceLineItem label={isIkea ? 'IKEA Price' : 'Est. Price'} value={fd.estimated_retail_price} large />
          {safeResale && <PriceLineItem label="Resale Value" value={safeResale} />}
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
      {fd.value_rating && <LineItem label="Value Rating" value={capitalize(fd.value_rating)} />}
      {fd.value_verdict && <LineItem label="Value Verdict" value={capitalize(fd.value_verdict)} />}
      {fd.value_reasoning && <InfoBlock text={fd.value_reasoning} type="tip" />}
      {fd.worth_it_verdict && <InfoBlock text={`Verdict: ${fd.worth_it_verdict}`} type="success" />}

      {fd.resale_title_suggestion && (
        <>
          <Divider />
          <SectionLabel text="Resale View" />
          <View style={s.resaleTitleCard}>
            <Text style={s.resaleTitleLabel}>Suggested Listing Title</Text>
            <Text style={s.resaleTitleValue}>{fd.resale_title_suggestion}</Text>
          </View>
        </>
      )}

      {(fd.resale_demand || fd.best_selling_platform || fd.resale_suggestion) && (
        <>
          {!fd.resale_title_suggestion && <Divider />}
          <SectionLabel text="Resale Intel" />
          {fd.resale_demand && <LineItem label="Demand" value={capitalize(fd.resale_demand)} />}
          {fd.best_selling_platform && <LineItem label="Best Platform" value={fd.best_selling_platform} bold />}
          {fd.comparable_model && <LineItem label="Comparable" value={fd.comparable_model} />}
          {fd.resale_suggestion && <InfoBlock text={fd.resale_suggestion} type="success" />}
          {fd.long_term_value && <InfoBlock text={`Long-term: ${fd.long_term_value}`} type="tip" />}
        </>
      )}

      {(fd.assembly_required || fd.assembly_summary) && (
        <>
          <Divider />
          <SectionLabel text="Assembly" />
          {fd.assembly_difficulty && <LineItem label="Difficulty" value={capitalize(fd.assembly_difficulty)} />}
          {fd.estimated_build_time && <LineItem label="Build Time" value={fd.estimated_build_time} />}
          {fd.people_needed && <LineItem label="People" value={fd.people_needed} />}
          {fd.assembly_summary && <InfoBlock text={fd.assembly_summary} type="tip" />}
          {fd.wall_anchor_note && <InfoBlock text={fd.wall_anchor_note} type="warning" />}
          {fd.setup_notes && <InfoBlock text={fd.setup_notes} type="tip" />}
          <ChipRow items={fd.likely_tools_needed} label="TOOLS NEEDED" />
        </>
      )}

      {(fd.care_tip || fd.budget_insight || fd.cheaper_alternative) && (
        <>
          <Divider />
          <SectionLabel text="Tips & Care" />
          {fd.care_tip && <InfoBlock text={fd.care_tip} type="tip" />}
          {fd.budget_insight && <InfoBlock text={fd.budget_insight} type="tip" />}
          {fd.cheaper_alternative && <InfoBlock text={`Alternative: ${fd.cheaper_alternative}`} type="warning" />}
        </>
      )}

      {fd.extra_purchase_items && fd.extra_purchase_items.length > 0 && (
        <>
          <Divider />
          <SectionLabel text="You May Also Need" />
          {fd.extra_purchase_items.map((item, i) => (
            <View key={`ep-${i}`} style={s.bulletRow}>
              <Text style={s.bulletChar}>+</Text>
              <Text style={s.bulletText}>{item.item}{item.estimated_cost ? ` (~${item.estimated_cost})` : ''}{item.reason ? ` \u2014 ${item.reason}` : ''}</Text>
            </View>
          ))}
          {fd.total_estimated_cost && <LineItem label="Total Est. Cost" value={fd.total_estimated_cost} bold />}
        </>
      )}

      <IkeaCluesSection clues={fd.ikea_clues} />

      <ChipRow items={fd.room_fit_labels} label="FITS IN" />
      <ChipRow items={fd.matching_products} label="MATCHES WITH" />
      <ChipRow items={fd.complementary_items} label="PAIRS WELL WITH" />
      <PurposeSection purpose={fd.purpose} />
      <ValueInsightSection insight={fd.value_insight} />
      <BestNextScanSection suggestions={fd.best_next_scan} />
      <NextScanSection suggestion={fd.next_scan_suggestion} />
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
  const safeResale = safeDollar(fd.estimated_resale_value);

  return (
    <>
      {fd.item_description && <InfoBlock text={fd.item_description} />}

      <SectionLabel text="Identification" />
      <LineItem label="Type" value={subcategoryLabels[fd.subcategory] ?? fd.subcategory} />
      {fd.brand && <LineItem label="Brand" value={fd.brand} bold />}
      {fd.model && <LineItem label="Model" value={fd.model} />}
      {fd.gender_target && <LineItem label="For" value={capitalize(fd.gender_target)} />}

      <Divider />
      <SectionLabel text="Details" />
      {fd.color && <LineItem label="Color" value={`${fd.color}${fd.secondary_color ? ` / ${fd.secondary_color}` : ''}`} />}
      {fd.material && <LineItem label="Material" value={fd.material} />}
      {fd.pattern && <LineItem label="Pattern" value={fd.pattern} />}
      {fd.style && <LineItem label="Style" value={fd.style} />}
      {fd.fit && <LineItem label="Fit" value={fd.fit} />}
      {fd.sleeve_length && <LineItem label="Sleeve" value={fd.sleeve_length} />}
      {fd.neckline && <LineItem label="Neckline" value={fd.neckline} />}
      {fd.closure_type && <LineItem label="Closure" value={fd.closure_type} />}
      {fd.condition && <LineItem label="Condition" value={capitalize(fd.condition)} />}
      {fd.condition_notes && <InfoBlock text={fd.condition_notes} type="warning" />}

      <Divider />
      <SectionLabel text="Price & Value" />
      {fd.estimated_retail_price ? (
        <>
          <PriceLineItem label="Retail Price" value={fd.estimated_retail_price} large />
          {safeResale && <PriceLineItem label="Resale Value" value={safeResale} />}
          {fd.price_range && <LineItem label="Range" value={fd.price_range} />}
        </>
      ) : <NoPriceRow />}
      {fd.value_verdict && <LineItem label="Value Verdict" value={capitalize(fd.value_verdict)} />}
      {fd.value_rating && <LineItem label="Value Rating" value={capitalize(fd.value_rating)} />}
      {fd.value_reasoning && <InfoBlock text={fd.value_reasoning} type="tip" />}

      {(fd.resale_demand || fd.best_selling_platform || fd.resale_suggestion) && (
        <>
          <Divider />
          <SectionLabel text="Resale Intel" />
          {fd.resale_demand && <LineItem label="Demand" value={capitalize(fd.resale_demand)} />}
          {fd.best_selling_platform && <LineItem label="Best Platform" value={fd.best_selling_platform} bold />}
          {fd.comparable_model && <LineItem label="Comparable" value={fd.comparable_model} />}
          {fd.resale_suggestion && <InfoBlock text={fd.resale_suggestion} type="success" />}
        </>
      )}

      {(fd.cleaning_recommendation || fd.care_tip) && (
        <>
          <Divider />
          <SectionLabel text="Care & Maintenance" />
          {fd.cleaning_recommendation && fd.cleaning_recommendation !== 'none' && (
            <LineItem label="Cleaning" value={`${capitalize(fd.cleaning_recommendation)}${fd.cleaning_reason ? ` - ${fd.cleaning_reason}` : ''}`} />
          )}
          {fd.care_tip && <InfoBlock text={fd.care_tip} type="tip" />}
        </>
      )}

      {fd.budget_insight && (
        <>
          <Divider />
          <SectionLabel text="Budget Tip" />
          <InfoBlock text={fd.budget_insight} type="tip" />
        </>
      )}
      {fd.cheaper_alternative && <InfoBlock text={`Try instead: ${fd.cheaper_alternative}`} type="warning" />}

      <ChipRow items={fd.complementary_items} label="PAIRS WELL WITH" />
      <PurposeSection purpose={fd.purpose} />
      <ValueInsightSection insight={fd.value_insight} />
      <NextScanSection suggestion={fd.next_scan_suggestion} />
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
  const safeResale = safeDollar(ed.estimated_resale_value);

  return (
    <>
      {ed.product_type && (
        <InfoBlock text={`${ed.brand ? `${ed.brand} ` : ''}${ed.model ?? ed.product_type}${ed.storage_or_spec ? ` \u00b7 ${ed.storage_or_spec}` : ''}`} />
      )}

      <SectionLabel text="Specs" />
      <LineItem label="Type" value={ed.product_type} />
      {ed.brand && <LineItem label="Brand" value={ed.brand} bold />}
      {ed.model && <LineItem label="Model" value={ed.model} />}
      {ed.storage_or_spec && <LineItem label="Spec" value={ed.storage_or_spec} />}
      {ed.condition && <LineItem label="Condition" value={capitalize(ed.condition)} />}

      <Divider />
      <SectionLabel text="Price & Value" />
      {ed.estimated_retail_price ? (
        <>
          <PriceLineItem label="Retail Price" value={ed.estimated_retail_price} large />
          {safeResale && <PriceLineItem label="Resale Value" value={safeResale} />}
          {ed.price_range && <LineItem label="Range" value={ed.price_range} />}
        </>
      ) : <NoPriceRow />}
      {ed.value_verdict && <LineItem label="Value Verdict" value={capitalize(ed.value_verdict)} />}
      {ed.value_rating && <LineItem label="Value Rating" value={capitalize(ed.value_rating)} />}
      {ed.value_reasoning && <InfoBlock text={ed.value_reasoning} type="tip" />}
      {ed.depreciation_note && <InfoBlock text={`Depreciation: ${ed.depreciation_note}`} type="warning" />}

      {(ed.resale_demand || ed.best_selling_platform || ed.resale_suggestion) && (
        <>
          <Divider />
          <SectionLabel text="Resale Intel" />
          {ed.resale_demand && <LineItem label="Demand" value={capitalize(ed.resale_demand)} />}
          {ed.best_selling_platform && <LineItem label="Best Platform" value={ed.best_selling_platform} bold />}
          {ed.comparable_model && <LineItem label="Comparable" value={ed.comparable_model} />}
          {ed.resale_suggestion && <InfoBlock text={ed.resale_suggestion} type="success" />}
        </>
      )}

      {(ed.care_tip || ed.budget_insight || ed.cheaper_alternative) && (
        <>
          <Divider />
          <SectionLabel text="Tips & Savings" />
          {ed.care_tip && <InfoBlock text={ed.care_tip} type="tip" />}
          {ed.budget_insight && <InfoBlock text={ed.budget_insight} type="tip" />}
          {ed.cheaper_alternative && <InfoBlock text={`Alternative: ${ed.cheaper_alternative}`} type="warning" />}
        </>
      )}

      <ChipRow items={ed.complementary_items} label="GOES WELL WITH" />
      <PurposeSection purpose={ed.purpose} />
      <ValueInsightSection insight={ed.value_insight} />
      <NextScanSection suggestion={ed.next_scan_suggestion} />
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
  const safeResale = safeDollar(hd.estimated_resale_value);

  return (
    <>
      {hd.item_description && <InfoBlock text={hd.item_description} />}

      <SectionLabel text="Details" />
      <LineItem label="Type" value={subcategoryLabels[hd.subcategory] ?? hd.subcategory} />
      {hd.brand && <LineItem label="Brand" value={hd.brand} bold />}
      {hd.model && <LineItem label="Model" value={hd.model} />}
      {hd.material && <LineItem label="Material" value={hd.material} />}
      {hd.condition && <LineItem label="Condition" value={capitalize(hd.condition)} />}

      <Divider />
      <SectionLabel text="Price & Value" />
      {hd.estimated_price ? (
        <>
          <PriceLineItem label="Est. Price" value={hd.estimated_price} large />
          {safeResale && <PriceLineItem label="Resale Value" value={safeResale} />}
          {hd.price_range && <LineItem label="Range" value={hd.price_range} />}
        </>
      ) : <NoPriceRow />}
      {hd.value_rating && <LineItem label="Value Rating" value={capitalize(hd.value_rating)} />}
      {hd.value_verdict && <LineItem label="Value Verdict" value={capitalize(hd.value_verdict)} />}
      {hd.value_reasoning && <InfoBlock text={hd.value_reasoning} type="tip" />}

      {(hd.resale_potential || hd.best_selling_platform || hd.resale_suggestion) && (
        <>
          <Divider />
          <SectionLabel text="Resale Intel" />
          {hd.resale_potential && <LineItem label="Resale Potential" value={capitalize(hd.resale_potential)} />}
          {hd.best_selling_platform && <LineItem label="Best Platform" value={hd.best_selling_platform} bold />}
          {hd.comparable_model && <LineItem label="Comparable" value={hd.comparable_model} />}
          {hd.resale_suggestion && <InfoBlock text={hd.resale_suggestion} type="success" />}
          {hd.buy_new_vs_used && <InfoBlock text={hd.buy_new_vs_used} type="tip" />}
        </>
      )}

      {(hd.care_tip || hd.budget_insight || hd.cheaper_alternative) && (
        <>
          <Divider />
          <SectionLabel text="Tips & Care" />
          {hd.care_tip && <InfoBlock text={hd.care_tip} type="tip" />}
          {hd.practical_recommendation && <InfoBlock text={hd.practical_recommendation} type="success" />}
          {hd.budget_insight && <InfoBlock text={hd.budget_insight} type="tip" />}
          {hd.cheaper_alternative && <InfoBlock text={`Alternative: ${hd.cheaper_alternative}`} type="warning" />}
        </>
      )}

      {hd.shipping_note && <InfoBlock text={hd.shipping_note} type="warning" />}
      {hd.set_or_pair_note && <InfoBlock text={hd.set_or_pair_note} type="tip" />}

      <ChipRow items={hd.complementary_items} label="GOES WELL WITH" />
      <PurposeSection purpose={hd.purpose} />
      <ValueInsightSection insight={hd.value_insight} />
      <NextScanSection suggestion={hd.next_scan_suggestion} />
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
  const safeResale = safeDollar(gd.estimated_resale_value);

  return (
    <>
      {gd.item_description && <InfoBlock text={gd.item_description} />}

      <SectionLabel text="Identification" />
      {gd.subcategory && <LineItem label="Category" value={capitalize(gd.subcategory.replace(/_/g, ' '))} />}
      {gd.brand && <LineItem label="Brand" value={gd.brand} bold />}
      {gd.model && <LineItem label="Model" value={gd.model} />}
      {gd.material && <LineItem label="Material" value={gd.material} />}
      {gd.color && <LineItem label="Color" value={gd.color} />}
      {gd.condition && <LineItem label="Condition" value={capitalize(gd.condition)} />}
      {gd.age_or_era && <LineItem label="Era" value={gd.age_or_era} />}
      {gd.rarity && <LineItem label="Rarity" value={capitalize(gd.rarity)} />}

      <Divider />
      <SectionLabel text="Price & Value" />
      {gd.estimated_retail_price ? (
        <>
          <PriceLineItem label="Retail Price" value={gd.estimated_retail_price} large />
          {safeResale && <PriceLineItem label="Resale Value" value={safeResale} />}
          {gd.price_range && <LineItem label="Range" value={gd.price_range} />}
        </>
      ) : <NoPriceRow />}
      {gd.value_verdict && <LineItem label="Value Verdict" value={capitalize(gd.value_verdict)} />}
      {gd.value_rating && <LineItem label="Value Rating" value={capitalize(gd.value_rating)} />}
      {gd.value_reasoning && <InfoBlock text={gd.value_reasoning} type="tip" />}

      {(gd.resale_demand || gd.best_selling_platform || gd.resale_suggestion) && (
        <>
          <Divider />
          <SectionLabel text="Resale Intel" />
          {gd.resale_demand && <LineItem label="Demand" value={capitalize(gd.resale_demand)} />}
          {gd.best_selling_platform && <LineItem label="Best Platform" value={gd.best_selling_platform} bold />}
          {gd.comparable_item && <LineItem label="Comparable" value={gd.comparable_item} />}
          {gd.resale_suggestion && <InfoBlock text={gd.resale_suggestion} type="success" />}
        </>
      )}

      {(gd.practical_tip || gd.care_tip || gd.fun_fact) && (
        <>
          <Divider />
          <SectionLabel text="Tips & Info" />
          {gd.practical_tip && <InfoBlock text={gd.practical_tip} type="tip" />}
          {gd.care_tip && <InfoBlock text={gd.care_tip} type="tip" />}
          {gd.fun_fact && <InfoBlock text={`Fun fact: ${gd.fun_fact}`} type="success" />}
        </>
      )}

      {gd.budget_insight && <InfoBlock text={gd.budget_insight} type="tip" />}
      {gd.cheaper_alternative && <InfoBlock text={`Alternative: ${gd.cheaper_alternative}`} type="warning" />}

      <ChipRow items={gd.complementary_items} label="GOES WELL WITH" />
      <PurposeSection purpose={gd.purpose} />
      <ValueInsightSection insight={gd.value_insight} />
      <NextScanSection suggestion={gd.next_scan_suggestion} />
      <TagsRow tags={gd.tags} />
    </>
  );
}

export function DocumentResultSection({ result }: ResultProps) {
  const dd = result.document_details;
  if (!dd) {
    return (
      <>
        <SectionLabel text="Content Detected" />
        <View style={s.fallbackBlock}>
          <Text style={s.fallbackTitle}>{result.item_name || 'Document / Printed Content'}</Text>
          {result.short_summary ? (
            <Text style={s.fallbackSub}>{result.short_summary}</Text>
          ) : null}
        </View>
        <Divider />
        <InfoBlock text="This scan appears to show printed or digital reference content rather than one physical item. Try cropping a specific item for single-item identification." type="tip" />
      </>
    );
  }

  const docTypeLabels: Record<string, string> = {
    infographic: 'Infographic',
    catalog: 'Catalog / Multi-Item Page',
    educational: 'Educational Material',
    poster: 'Poster',
    screenshot: 'Screenshot / Digital Content',
    chart: 'Chart / Diagram',
    reference: 'Reference Material',
    other: 'Document',
  };

  return (
    <>
      <SectionLabel text="Content Analysis" />
      <LineItem label="Type" value={docTypeLabels[dd.document_type] ?? 'Document'} />
      {dd.main_topic ? <LineItem label="Topic" value={dd.main_topic} /> : null}

      {dd.content_description ? (
        <>
          <Divider />
          <InfoBlock text={dd.content_description} type="tip" />
        </>
      ) : null}

      {dd.detected_items.length > 0 && (
        <>
          <Divider />
          <SectionLabel text="Items / Subjects Detected" />
          {dd.detected_items.map((item, i) => (
            <View key={`di-${i}`} style={s.bulletRow}>
              <Text style={s.bulletChar}>{'\u2022'}</Text>
              <Text style={s.bulletText}>{item}</Text>
            </View>
          ))}
        </>
      )}

      {dd.key_information.length > 0 && (
        <>
          <Divider />
          <SectionLabel text="Key Information" />
          {dd.key_information.map((info, i) => (
            <View key={`ki-${i}`} style={s.bulletRow}>
              <Text style={s.bulletChar}>{'\u2713'}</Text>
              <Text style={s.bulletText}>{info}</Text>
            </View>
          ))}
        </>
      )}

      {dd.visible_text_summary ? (
        <>
          <Divider />
          <SectionLabel text="Content Summary" />
          <View style={s.fallbackBlock}>
            <Text style={s.fallbackSub}>{dd.visible_text_summary}</Text>
          </View>
        </>
      ) : null}

      {dd.suggested_actions.length > 0 && (
        <>
          <Divider />
          <SectionLabel text="Suggested Next Steps" />
          {dd.suggested_actions.map((action, i) => (
            <View key={`sa-${i}`} style={s.bulletRow}>
              <Text style={s.bulletChar}>{'\u2192'}</Text>
              <Text style={s.bulletText}>{action}</Text>
            </View>
          ))}
        </>
      )}

      <TagsRow tags={dd.tags} />
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
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
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'space-between' as const,
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
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'center' as const,
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
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    paddingVertical: 10,
    marginBottom: 6,
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  macroCell: {
    alignItems: 'center' as const,
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
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
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
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
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
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  trustLineRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    maxWidth: '60%' as unknown as number,
  },
  trustBadgeRow: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
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
  purposeText: {
    fontSize: 13,
    color: C.text,
    lineHeight: 19,
    fontWeight: '500' as const,
  },
  nextScanCard: {
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 12,
  },
  nextScanLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: C.accent,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  nextScanText: {
    fontSize: 12,
    color: C.textSecondary,
    lineHeight: 17,
    fontWeight: '500' as const,
  },
  recipeCard: {
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 12,
    marginBottom: 8,
  },
  recipeHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 4,
  },
  recipeName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: C.text,
    flex: 1,
    marginRight: 8,
  },
  recipeDiffBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
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
    color: C.textSecondary,
    lineHeight: 17,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  recipeMetaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 6,
  },
  recipeMetaText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: C.textMuted,
  },
  recipeIngredientsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 4,
    marginTop: 2,
  },
  recipeIngChip: {
    backgroundColor: C.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  recipeIngText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: C.textSecondary,
  },
  ikeaMatchBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
    alignSelf: 'flex-start' as const,
  },
  ikeaMatchDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  ikeaMatchText: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  ikeaCluesCard: {
    backgroundColor: '#0058A308',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0058A318',
    padding: 12,
    gap: 2,
  },
  bestNextScanCard: {
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 12,
    gap: 2,
  },
  bestNextScanIntro: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: C.textSecondary,
    marginBottom: 4,
  },
  resaleTitleCard: {
    backgroundColor: '#2D8C3C08',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D8C3C18',
    padding: 12,
  },
  resaleTitleLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: C.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  resaleTitleValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: C.text,
    lineHeight: 20,
  },
});
