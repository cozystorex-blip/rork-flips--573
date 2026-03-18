export type VerificationStatus = 'confirmed' | 'likely' | 'generic' | 'unknown';

export type SourceType =
  | 'visual_match'
  | 'ocr_text'
  | 'barcode'
  | 'exact_listing_match'
  | 'similar_listing_match'
  | 'heuristic_inference'
  | 'generic_knowledge';

export type PriceMode = 'exactPrice' | 'estimatedRange' | 'unavailable';
export type DimensionMode = 'verifiedDimensions' | 'visualSizeEstimate' | 'unavailable';

export interface TrustField<T = string | null> {
  value: T;
  confidence: number;
  sourceType: SourceType;
  verificationStatus: VerificationStatus;
}

export interface TrustPriceField extends TrustField<string | null> {
  mode: PriceMode;
  rangeValue?: string | null;
}

export interface TrustDimensionField extends TrustField<string | null> {
  mode: DimensionMode;
  sizeEstimate?: string | null;
}

export interface TrustSection {
  label: string;
  items: TrustSectionItem[];
}

export interface TrustSectionItem {
  label: string;
  value: string;
  verificationStatus: VerificationStatus;
  sourceType?: SourceType;
}

export interface ScanTrustResult {
  title: TrustField<string>;
  overallConfidence: number;
  category: string;
  verificationSummary: string;
  sourceQualityLabel: string;

  fields: {
    brand: TrustField;
    price: TrustPriceField;
    dimensions: TrustDimensionField;
    material: TrustField;
    itemType: TrustField;
    model: TrustField;
    condition: TrustField;
    color: TrustField;
  };

  sections: {
    confirmedFacts: TrustSectionItem[];
    likelyDetails: TrustSectionItem[];
    commonUse: string[];
    generalCareTips: string[];
    typicalAssembly: TrustSectionItem[];
    companionItems: string[];
    sourceQuality: string[];
  };
}

export function getVerificationStatus(confidence: number): VerificationStatus {
  if (confidence >= 0.85) return 'confirmed';
  if (confidence >= 0.65) return 'likely';
  if (confidence >= 0.35) return 'generic';
  return 'unknown';
}

export function getVerificationLabel(status: VerificationStatus): string {
  switch (status) {
    case 'confirmed': return 'Confirmed';
    case 'likely': return 'Estimated';
    case 'generic': return 'Generic';
    case 'unknown': return 'Unavailable';
  }
}

export function getVerificationColor(status: VerificationStatus): string {
  switch (status) {
    case 'confirmed': return '#16A34A';
    case 'likely': return '#3B82F6';
    case 'generic': return '#D97706';
    case 'unknown': return '#6B7280';
  }
}

export function shouldShowField(field: TrustField): boolean {
  if (!field.value) return false;
  if (field.verificationStatus === 'unknown') return false;
  return true;
}
