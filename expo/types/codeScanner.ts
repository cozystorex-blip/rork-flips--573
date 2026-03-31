export type CodeType =
  | 'qr'
  | 'ean-13'
  | 'ean-8'
  | 'code-128'
  | 'code-39'
  | 'code-93'
  | 'codabar'
  | 'itf'
  | 'upc-e'
  | 'upc-a'
  | 'pdf-417'
  | 'aztec'
  | 'data-matrix';

export interface Point {
  x: number;
  y: number;
}

export interface CodeScannerFrame {
  width: number;
  height: number;
}

export interface Code {
  type: CodeType;
  value: string;
  frame?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  corners?: Point[];
}

export interface CodeScannerConfig {
  codeTypes: CodeType[];
  onCodeScanned: (codes: Code[], frame: CodeScannerFrame) => void;
  regionOfInterest?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ScannedCodeResult {
  code: Code;
  timestamp: number;
  id: string;
}

export function mapExpoBarcodeType(expoType: string): CodeType | null {
  const mapping: Record<string, CodeType> = {
    'qr': 'qr',
    'ean13': 'ean-13',
    'ean8': 'ean-8',
    'code128': 'code-128',
    'code39': 'code-39',
    'code93': 'code-93',
    'codabar': 'codabar',
    'itf14': 'itf',
    'upc_e': 'upc-e',
    'upc_a': 'upc-a',
    'pdf417': 'pdf-417',
    'aztec': 'aztec',
    'datamatrix': 'data-matrix',
  };
  return mapping[expoType] ?? null;
}

export function mapCodeTypeToExpo(codeType: CodeType): string {
  const mapping: Record<CodeType, string> = {
    'qr': 'qr',
    'ean-13': 'ean13',
    'ean-8': 'ean8',
    'code-128': 'code128',
    'code-39': 'code39',
    'code-93': 'code93',
    'codabar': 'codabar',
    'itf': 'itf14',
    'upc-e': 'upc_e',
    'upc-a': 'upc_a',
    'pdf-417': 'pdf417',
    'aztec': 'aztec',
    'data-matrix': 'datamatrix',
  };
  return mapping[codeType];
}

export function getCodeTypeLabel(type: CodeType): string {
  const labels: Record<CodeType, string> = {
    'qr': 'QR Code',
    'ean-13': 'EAN-13',
    'ean-8': 'EAN-8',
    'code-128': 'Code 128',
    'code-39': 'Code 39',
    'code-93': 'Code 93',
    'codabar': 'Codabar',
    'itf': 'ITF',
    'upc-e': 'UPC-E',
    'upc-a': 'UPC-A',
    'pdf-417': 'PDF-417',
    'aztec': 'Aztec',
    'data-matrix': 'Data Matrix',
  };
  return labels[type] ?? type;
}

export function isUrlValue(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

export const ALL_CODE_TYPES: CodeType[] = [
  'qr', 'ean-13', 'ean-8', 'code-128', 'code-39', 'code-93',
  'codabar', 'itf', 'upc-e', 'upc-a', 'pdf-417', 'aztec', 'data-matrix',
];

export const COMMON_CODE_TYPES: CodeType[] = [
  'qr', 'ean-13', 'ean-8', 'code-128', 'upc-a', 'upc-e',
];
