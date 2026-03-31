import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import type { CodeType } from '@/types/codeScanner';

export type ParsedDataType =
  | 'url'
  | 'wifi'
  | 'vcard'
  | 'email'
  | 'phone'
  | 'sms'
  | 'geo'
  | 'calendar'
  | 'product'
  | 'text'
  | 'json'
  | 'cryptocurrency'
  | 'app_link'
  | 'serial_number'
  | 'unknown';

export interface CodeAnalysisResult {
  parsed_type: ParsedDataType;
  title: string;
  summary: string;
  raw_value: string;
  code_type: CodeType;
  parsed_fields: ParsedField[];
  actions: SuggestedAction[];
  product_info: ProductInfo | null;
  url_info: UrlInfo | null;
  wifi_info: WifiInfo | null;
  contact_info: ContactInfo | null;
  security_warning: string | null;
  additional_context: string | null;
}

export interface ParsedField {
  label: string;
  value: string;
  icon: string;
}

export interface SuggestedAction {
  label: string;
  type: 'open_url' | 'copy' | 'call' | 'email' | 'sms' | 'map' | 'wifi_connect' | 'add_contact' | 'share' | 'search';
  value: string;
}

export interface ProductInfo {
  product_name: string;
  brand: string | null;
  category: string | null;
  description: string | null;
  estimated_price: string | null;
  barcode_standard: string;
  country_of_origin: string | null;
  manufacturer: string | null;
}

export interface UrlInfo {
  domain: string;
  is_secure: boolean;
  likely_purpose: string;
  is_shortened: boolean;
}

export interface WifiInfo {
  ssid: string;
  security: string;
  password: string | null;
  hidden: boolean;
}

export interface ContactInfo {
  name: string | null;
  phone: string | null;
  email: string | null;
  organization: string | null;
  address: string | null;
  website: string | null;
}

const analysisSchema = z.object({
  parsed_type: z.enum([
    'url', 'wifi', 'vcard', 'email', 'phone', 'sms', 'geo',
    'calendar', 'product', 'text', 'json', 'cryptocurrency',
    'app_link', 'serial_number', 'unknown',
  ]),
  title: z.string(),
  summary: z.string(),
  parsed_fields: z.array(z.object({
    label: z.string(),
    value: z.string(),
    icon: z.string(),
  })),
  actions: z.array(z.object({
    label: z.string(),
    type: z.enum(['open_url', 'copy', 'call', 'email', 'sms', 'map', 'wifi_connect', 'add_contact', 'share', 'search']),
    value: z.string(),
  })),
  product_info: z.object({
    product_name: z.string(),
    brand: z.string().nullable(),
    category: z.string().nullable(),
    description: z.string().nullable(),
    estimated_price: z.string().nullable(),
    barcode_standard: z.string(),
    country_of_origin: z.string().nullable(),
    manufacturer: z.string().nullable(),
  }).nullable(),
  url_info: z.object({
    domain: z.string(),
    is_secure: z.boolean(),
    likely_purpose: z.string(),
    is_shortened: z.boolean(),
  }).nullable(),
  wifi_info: z.object({
    ssid: z.string(),
    security: z.string(),
    password: z.string().nullable(),
    hidden: z.boolean(),
  }).nullable(),
  contact_info: z.object({
    name: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    organization: z.string().nullable(),
    address: z.string().nullable(),
    website: z.string().nullable(),
  }).nullable(),
  security_warning: z.string().nullable(),
  additional_context: z.string().nullable(),
});

function quickParseWifi(value: string): WifiInfo | null {
  const wifiMatch = value.match(/^WIFI:(?:T:(.*?);)?(?:S:(.*?);)?(?:P:(.*?);)?(?:H:(.*?);)?/i);
  if (!wifiMatch) return null;
  return {
    security: wifiMatch[1] ?? 'WPA',
    ssid: wifiMatch[2] ?? 'Unknown',
    password: wifiMatch[3] ?? null,
    hidden: wifiMatch[4] === 'true',
  };
}

function quickParseType(value: string, codeType: CodeType): ParsedDataType {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return 'url';
  if (/^WIFI:/i.test(trimmed)) return 'wifi';
  if (/^BEGIN:VCARD/i.test(trimmed)) return 'vcard';
  if (/^mailto:/i.test(trimmed)) return 'email';
  if (/^tel:/i.test(trimmed)) return 'phone';
  if (/^smsto:|^sms:/i.test(trimmed)) return 'sms';
  if (/^geo:/i.test(trimmed)) return 'geo';
  if (/^BEGIN:VEVENT/i.test(trimmed)) return 'calendar';
  if (/^bitcoin:|^ethereum:/i.test(trimmed)) return 'cryptocurrency';
  if (['ean-13', 'ean-8', 'upc-a', 'upc-e'].includes(codeType)) return 'product';
  if (/^\{.*\}$/s.test(trimmed)) return 'json';
  if (['code-128', 'code-39', 'code-93', 'itf'].includes(codeType) && /^[A-Z0-9-]{6,30}$/i.test(trimmed)) return 'serial_number';
  return 'text';
}

export async function analyzeScannedCode(
  value: string,
  codeType: CodeType,
): Promise<CodeAnalysisResult> {
  const quickType = quickParseType(value, codeType);
  const quickWifi = quickType === 'wifi' ? quickParseWifi(value) : null;

  console.log('[CodeAnalyzer] Analyzing code:', codeType, 'quickType:', quickType, 'value length:', value.length);

  const codeTypeLabel = {
    'qr': 'QR Code',
    'ean-13': 'EAN-13 barcode (product)',
    'ean-8': 'EAN-8 barcode (product)',
    'upc-a': 'UPC-A barcode (product)',
    'upc-e': 'UPC-E barcode (product)',
    'code-128': 'Code 128 barcode',
    'code-39': 'Code 39 barcode',
    'code-93': 'Code 93 barcode',
    'codabar': 'Codabar barcode',
    'itf': 'ITF barcode',
    'pdf-417': 'PDF-417 barcode',
    'aztec': 'Aztec code',
    'data-matrix': 'Data Matrix code',
  }[codeType] ?? codeType;

  try {
    const result = await generateObject({
      messages: [
        {
          role: 'user',
          content: `You are an expert barcode and QR code analyzer. Analyze this scanned code and extract ALL useful information.

CODE TYPE: ${codeTypeLabel}
RAW VALUE: ${value}
QUICK-DETECTED FORMAT: ${quickType}
${quickWifi ? `PARSED WIFI: SSID="${quickWifi.ssid}" Security="${quickWifi.security}" Password="${quickWifi.password ?? 'none'}" Hidden=${quickWifi.hidden}` : ''}

INSTRUCTIONS:
1. Determine the parsed_type accurately based on the content
2. Create a clear, human-readable title (e.g. "YouTube Video Link", "Wi-Fi Network: MyHome", "Product: Coca-Cola 330ml")
3. Write a helpful 1-2 sentence summary explaining what this code contains and what the user can do with it
4. Extract ALL parsed fields with descriptive labels. For products, include: Product Name, Brand, Category, Country of Origin, EAN/UPC, Estimated Price. For URLs: Domain, Protocol, Path, Parameters. For WiFi: Network Name, Security Type, Password. For contacts: Name, Phone, Email, Company, Address.
5. Suggest relevant actions the user can take (open URL, copy, call, email, search for product, connect to WiFi, etc.)
6. For product barcodes (EAN-13, EAN-8, UPC-A, UPC-E): Try to identify the product from the barcode number. Many common products have well-known barcode prefixes. The first 2-3 digits indicate the country. Identify the brand and product if you recognize the barcode. If you don't recognize it exactly, provide the country of origin from the prefix and suggest the product category.
7. For URLs: check if it looks suspicious, is a shortened URL, or could be a phishing attempt
8. Provide security_warning if the content looks suspicious (phishing URLs, unknown shortened links, suspicious payment requests)
9. Provide additional_context with any extra useful info (e.g. "This EAN-13 barcode prefix 890 indicates a product from India", "This QR code uses vCard 3.0 format")

PARSED FIELDS ICONS - use these exact icon names:
- "globe" for URLs/domains
- "lock" for passwords/security
- "wifi" for network names
- "user" for names/contacts
- "phone" for phone numbers
- "mail" for emails
- "map-pin" for locations
- "calendar" for dates
- "package" for products
- "tag" for categories/labels
- "dollar-sign" for prices
- "flag" for countries
- "building" for organizations
- "hash" for serial numbers/codes
- "link" for links
- "shield" for security info
- "info" for general info
- "credit-card" for payment info
- "key" for passwords/keys

Be thorough. Extract EVERY piece of useful information. The user wants a complete breakdown.`,
        },
      ],
      schema: analysisSchema,
    });

    console.log('[CodeAnalyzer] AI analysis complete:', result.title);

    return {
      ...result,
      raw_value: value,
      code_type: codeType,
    };
  } catch (error) {
    console.log('[CodeAnalyzer] AI analysis failed, using fallback:', error);
    return buildFallbackResult(value, codeType, quickType, quickWifi);
  }
}

function buildFallbackResult(
  value: string,
  codeType: CodeType,
  quickType: ParsedDataType,
  quickWifi: WifiInfo | null,
): CodeAnalysisResult {
  const fields: ParsedField[] = [
    { label: 'Raw Value', value, icon: 'hash' },
    { label: 'Code Type', value: codeType.toUpperCase(), icon: 'tag' },
  ];

  const actions: SuggestedAction[] = [
    { label: 'Copy Value', type: 'copy', value },
  ];

  let title = `Scanned ${codeType.toUpperCase()}`;
  let summary = `A ${codeType} code containing: "${value.substring(0, 100)}${value.length > 100 ? '...' : ''}"`;

  if (quickType === 'url') {
    try {
      const url = new URL(value);
      title = `Link: ${url.hostname}`;
      summary = `Website link to ${url.hostname}. Tap to open in your browser.`;
      fields.unshift(
        { label: 'Domain', value: url.hostname, icon: 'globe' },
        { label: 'Protocol', value: url.protocol.replace(':', ''), icon: 'shield' },
        { label: 'Full URL', value, icon: 'link' },
      );
      actions.unshift({ label: 'Open URL', type: 'open_url', value });
    } catch {
      title = 'URL Link';
    }
  } else if (quickType === 'wifi' && quickWifi) {
    title = `Wi-Fi: ${quickWifi.ssid}`;
    summary = `Wi-Fi network "${quickWifi.ssid}" with ${quickWifi.security} security.${quickWifi.password ? ' Password included.' : ''}`;
    fields.length = 0;
    fields.push(
      { label: 'Network Name', value: quickWifi.ssid, icon: 'wifi' },
      { label: 'Security', value: quickWifi.security, icon: 'lock' },
    );
    if (quickWifi.password) {
      fields.push({ label: 'Password', value: quickWifi.password, icon: 'key' });
      actions.unshift({ label: 'Copy Password', type: 'copy', value: quickWifi.password });
    }
  } else if (quickType === 'product') {
    title = `Product Barcode: ${value}`;
    summary = `Product barcode (${codeType.toUpperCase()}). Search online to find product details.`;
    actions.push({ label: 'Search Product', type: 'search', value: `barcode ${value}` });
  } else if (quickType === 'phone') {
    const phone = value.replace('tel:', '');
    title = `Phone: ${phone}`;
    summary = `Phone number ${phone}. Tap to call.`;
    fields.length = 0;
    fields.push({ label: 'Phone Number', value: phone, icon: 'phone' });
    actions.unshift({ label: 'Call', type: 'call', value: phone });
  } else if (quickType === 'email') {
    const email = value.replace('mailto:', '').split('?')[0];
    title = `Email: ${email}`;
    summary = `Email address ${email}. Tap to send an email.`;
    fields.length = 0;
    fields.push({ label: 'Email', value: email, icon: 'mail' });
    actions.unshift({ label: 'Send Email', type: 'email', value: email });
  }

  return {
    parsed_type: quickType,
    title,
    summary,
    raw_value: value,
    code_type: codeType,
    parsed_fields: fields,
    actions,
    product_info: null,
    url_info: quickType === 'url' ? {
      domain: (() => { try { return new URL(value).hostname; } catch { return value; } })(),
      is_secure: value.startsWith('https'),
      likely_purpose: 'Website',
      is_shortened: false,
    } : null,
    wifi_info: quickWifi,
    contact_info: null,
    security_warning: null,
    additional_context: null,
  };
}
