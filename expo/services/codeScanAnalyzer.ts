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

const EAN_COUNTRY_PREFIXES: Record<string, string> = {
  '000': 'United States', '001': 'United States', '002': 'United States', '003': 'United States',
  '004': 'United States', '005': 'United States', '006': 'United States', '007': 'United States',
  '008': 'United States', '009': 'United States', '01': 'United States', '02': 'United States',
  '03': 'United States', '04': 'United States', '05': 'United States', '06': 'United States',
  '07': 'United States', '08': 'United States', '09': 'United States',
  '10': 'United States', '11': 'United States', '12': 'United States', '13': 'United States',
  '30': 'France', '31': 'France', '32': 'France', '33': 'France', '34': 'France',
  '35': 'France', '36': 'France', '37': 'France',
  '380': 'Bulgaria', '383': 'Slovenia', '385': 'Croatia', '387': 'Bosnia',
  '389': 'Montenegro', '390': 'Kosovo',
  '400': 'Germany', '401': 'Germany', '402': 'Germany', '403': 'Germany',
  '404': 'Germany', '405': 'Germany', '406': 'Germany', '407': 'Germany',
  '408': 'Germany', '409': 'Germany', '410': 'Germany', '411': 'Germany',
  '412': 'Germany', '413': 'Germany', '414': 'Germany', '415': 'Germany',
  '416': 'Germany', '417': 'Germany', '418': 'Germany', '419': 'Germany',
  '44': 'Germany',
  '45': 'Japan', '46': 'Russia', '470': 'Kyrgyzstan', '471': 'Taiwan',
  '474': 'Estonia', '475': 'Latvia', '476': 'Azerbaijan', '477': 'Lithuania',
  '478': 'Uzbekistan', '479': 'Sri Lanka', '480': 'Philippines', '481': 'Belarus',
  '482': 'Ukraine', '484': 'Moldova', '485': 'Armenia', '486': 'Georgia',
  '487': 'Kazakhstan', '488': 'Tajikistan', '489': 'Hong Kong',
  '49': 'Japan',
  '50': 'United Kingdom',
  '520': 'Greece', '521': 'Greece', '528': 'Lebanon', '529': 'Cyprus',
  '530': 'Albania', '531': 'North Macedonia',
  '535': 'Malta', '539': 'Ireland',
  '54': 'Belgium & Luxembourg', '560': 'Portugal',
  '569': 'Iceland', '57': 'Denmark', '590': 'Poland',
  '594': 'Romania', '599': 'Hungary',
  '600': 'South Africa', '601': 'South Africa',
  '609': 'Mauritius', '611': 'Morocco', '613': 'Algeria',
  '615': 'Nigeria', '616': 'Kenya', '618': 'Ivory Coast',
  '619': 'Tunisia', '620': 'Tanzania', '621': 'Syria',
  '622': 'Egypt', '624': 'Libya', '625': 'Jordan',
  '626': 'Iran', '627': 'Kuwait', '628': 'Saudi Arabia',
  '629': 'UAE',
  '64': 'Finland',
  '690': 'China', '691': 'China', '692': 'China', '693': 'China',
  '694': 'China', '695': 'China', '696': 'China', '697': 'China',
  '698': 'China', '699': 'China',
  '70': 'Norway',
  '729': 'Israel', '730': 'Sweden', '731': 'Sweden',
  '740': 'Guatemala', '741': 'El Salvador', '742': 'Honduras',
  '743': 'Nicaragua', '744': 'Costa Rica', '745': 'Panama',
  '746': 'Dominican Republic', '750': 'Mexico',
  '754': 'Canada', '755': 'Canada',
  '759': 'Venezuela',
  '76': 'Switzerland',
  '770': 'Colombia', '773': 'Uruguay', '775': 'Peru',
  '777': 'Bolivia', '778': 'Argentina', '779': 'Argentina',
  '780': 'Chile', '784': 'Paraguay', '786': 'Ecuador',
  '789': 'Brazil', '790': 'Brazil',
  '80': 'Italy', '81': 'Italy', '82': 'Italy', '83': 'Italy',
  '84': 'Spain',
  '850': 'Cuba', '858': 'Slovakia', '859': 'Czech Republic',
  '860': 'Serbia',
  '865': 'Mongolia', '867': 'North Korea', '868': 'Turkey', '869': 'Turkey',
  '870': 'Netherlands', '871': 'Netherlands', '872': 'Netherlands',
  '873': 'Netherlands', '874': 'Netherlands', '875': 'Netherlands',
  '876': 'Netherlands', '877': 'Netherlands', '878': 'Netherlands', '879': 'Netherlands',
  '880': 'South Korea',
  '884': 'Cambodia', '885': 'Thailand',
  '888': 'Singapore',
  '890': 'India',
  '893': 'Vietnam', '896': 'Pakistan',
  '899': 'Indonesia',
  '90': 'Austria', '91': 'Austria',
  '93': 'Australia',
  '94': 'New Zealand',
  '955': 'Malaysia',
  '958': 'Macau',
};

const SHORTENED_DOMAINS = [
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly',
  'adf.ly', 'bit.do', 'mcaf.ee', 'su.pr', 'db.tt', 'qr.ae', 'lnkd.in',
  'rb.gy', 'cutt.ly', 'shorturl.at', 'tiny.cc', 'v.gd', 'bl.ink',
];

function getCountryFromEAN(barcode: string): string | null {
  if (barcode.length < 3) return null;
  const p3 = barcode.substring(0, 3);
  if (EAN_COUNTRY_PREFIXES[p3]) return EAN_COUNTRY_PREFIXES[p3];
  const p2 = barcode.substring(0, 2);
  if (EAN_COUNTRY_PREFIXES[p2]) return EAN_COUNTRY_PREFIXES[p2];
  return null;
}

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

function quickParseVCard(value: string): ContactInfo | null {
  if (!/^BEGIN:VCARD/i.test(value)) return null;
  const getField = (pattern: RegExp): string | null => {
    const match = value.match(pattern);
    return match ? match[1]?.trim() ?? null : null;
  };
  const fnMatch = getField(/^FN[;:](.+)$/mi);
  const nMatch = getField(/^N[;:]([^;]+(?:;[^;]+)*)$/mi);
  let name = fnMatch;
  if (!name && nMatch) {
    const parts = nMatch.split(';');
    name = [parts[1], parts[0]].filter(Boolean).join(' ').trim() || null;
  }
  const telMatch = value.match(/^TEL[^:]*:(.+)$/mi);
  const emailMatch = value.match(/^EMAIL[^:]*:(.+)$/mi);
  const orgMatch = getField(/^ORG[;:](.+)$/mi);
  const adrMatch = value.match(/^ADR[^:]*:(.+)$/mi);
  const urlMatch = getField(/^URL[;:](.+)$/mi);
  let address: string | null = null;
  if (adrMatch) {
    address = adrMatch[1].split(';').filter(Boolean).join(', ').trim() || null;
  }
  return {
    name,
    phone: telMatch ? telMatch[1].trim() : null,
    email: emailMatch ? emailMatch[1].trim() : null,
    organization: orgMatch?.replace(/;/g, ', ') ?? null,
    address,
    website: urlMatch ?? null,
  };
}

function quickParseCalendar(value: string): Record<string, string> | null {
  if (!/^BEGIN:VEVENT/mi.test(value)) return null;
  const getField = (key: string): string | null => {
    const match = value.match(new RegExp(`^${key}[;:](.+)$`, 'mi'));
    return match ? match[1].trim() : null;
  };
  const fields: Record<string, string> = {};
  const summary = getField('SUMMARY');
  if (summary) fields['summary'] = summary;
  const location = getField('LOCATION');
  if (location) fields['location'] = location;
  const dtstart = getField('DTSTART');
  if (dtstart) fields['start'] = dtstart;
  const dtend = getField('DTEND');
  if (dtend) fields['end'] = dtend;
  const description = getField('DESCRIPTION');
  if (description) fields['description'] = description.replace(/\\n/g, '\n').replace(/\\,/g, ',');
  const organizer = getField('ORGANIZER');
  if (organizer) fields['organizer'] = organizer;
  return Object.keys(fields).length > 0 ? fields : null;
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
  if (/^bitcoin:|^ethereum:|^litecoin:|^dogecoin:/i.test(trimmed)) return 'cryptocurrency';
  if (['ean-13', 'ean-8', 'upc-a', 'upc-e'].includes(codeType)) return 'product';
  if (/^\{.*\}$/s.test(trimmed)) return 'json';
  if (['code-128', 'code-39', 'code-93', 'itf'].includes(codeType) && /^[A-Z0-9./-]{4,40}$/i.test(trimmed)) return 'serial_number';
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(trimmed)) return 'app_link';
  return 'text';
}

function buildPreParsedContext(value: string, codeType: CodeType, quickType: ParsedDataType): string {
  const lines: string[] = [];

  if (quickType === 'product') {
    const country = getCountryFromEAN(value);
    if (country) {
      lines.push(`EAN/UPC COUNTRY PREFIX: The barcode prefix indicates this product is from ${country}.`);
    }
    lines.push(`BARCODE DIGITS: ${value}`);
    lines.push(`BARCODE LENGTH: ${value.length} digits`);
    if (value.length === 13) {
      lines.push(`GS1 Company Prefix (digits 1-7): ${value.substring(0, 7)}`);
      lines.push(`Item Reference (digits 8-12): ${value.substring(7, 12)}`);
      lines.push(`Check Digit: ${value.substring(12)}`);
    } else if (value.length === 12) {
      lines.push(`UPC Company Prefix (digits 1-6): ${value.substring(0, 6)}`);
      lines.push(`Item Number (digits 7-11): ${value.substring(6, 11)}`);
      lines.push(`Check Digit: ${value.substring(11)}`);
    }
  }

  if (quickType === 'url') {
    try {
      const url = new URL(value);
      lines.push(`DOMAIN: ${url.hostname}`);
      lines.push(`PROTOCOL: ${url.protocol}`);
      lines.push(`PATH: ${url.pathname}`);
      if (url.search) lines.push(`QUERY: ${url.search}`);
      if (url.hash) lines.push(`HASH: ${url.hash}`);
      if (url.port) lines.push(`PORT: ${url.port}`);
      const isShortenedUrl = SHORTENED_DOMAINS.some(d => url.hostname.includes(d));
      if (isShortenedUrl) lines.push(`WARNING: This is a SHORTENED URL. The destination is unknown and could be malicious.`);
      if (url.protocol === 'http:') lines.push(`WARNING: This URL uses HTTP (not HTTPS). The connection is not encrypted.`);
    } catch { /* ignore */ }
  }

  if (quickType === 'vcard') {
    const contact = quickParseVCard(value);
    if (contact) {
      lines.push(`PRE-PARSED CONTACT DATA:`);
      if (contact.name) lines.push(`  Name: ${contact.name}`);
      if (contact.phone) lines.push(`  Phone: ${contact.phone}`);
      if (contact.email) lines.push(`  Email: ${contact.email}`);
      if (contact.organization) lines.push(`  Organization: ${contact.organization}`);
      if (contact.address) lines.push(`  Address: ${contact.address}`);
      if (contact.website) lines.push(`  Website: ${contact.website}`);
    }
  }

  if (quickType === 'wifi') {
    const wifi = quickParseWifi(value);
    if (wifi) {
      lines.push(`PRE-PARSED WIFI DATA:`);
      lines.push(`  SSID: ${wifi.ssid}`);
      lines.push(`  Security: ${wifi.security}`);
      if (wifi.password) lines.push(`  Password: ${wifi.password}`);
      lines.push(`  Hidden: ${wifi.hidden}`);
    }
  }

  if (quickType === 'calendar') {
    const cal = quickParseCalendar(value);
    if (cal) {
      lines.push(`PRE-PARSED CALENDAR DATA:`);
      Object.entries(cal).forEach(([k, v]) => {
        lines.push(`  ${k}: ${v}`);
      });
    }
  }

  if (quickType === 'geo') {
    const geoMatch = value.match(/^geo:([-\d.]+),([-\d.]+)(?:\?.*)?$/i);
    if (geoMatch) {
      lines.push(`COORDINATES: Latitude ${geoMatch[1]}, Longitude ${geoMatch[2]}`);
      const params = value.split('?')[1];
      if (params) lines.push(`PARAMETERS: ${params}`);
    }
  }

  if (quickType === 'cryptocurrency') {
    const cryptoMatch = value.match(/^(\w+):([a-zA-Z0-9]+)(?:\?(.*))?$/i);
    if (cryptoMatch) {
      lines.push(`CRYPTOCURRENCY: ${cryptoMatch[1]}`);
      lines.push(`ADDRESS: ${cryptoMatch[2]}`);
      if (cryptoMatch[3]) {
        const params = new URLSearchParams(cryptoMatch[3]);
        params.forEach((v, k) => lines.push(`  ${k}: ${v}`));
      }
    }
  }

  if (quickType === 'email') {
    const emailParts = value.replace(/^mailto:/i, '').split('?');
    lines.push(`EMAIL TO: ${emailParts[0]}`);
    if (emailParts[1]) {
      const params = new URLSearchParams(emailParts[1]);
      params.forEach((v, k) => lines.push(`  ${k}: ${v}`));
    }
  }

  if (quickType === 'sms') {
    const smsParts = value.replace(/^(smsto:|sms:)/i, '').split('?');
    const smsNumBody = smsParts[0].split(':');
    lines.push(`SMS TO: ${smsNumBody[0]}`);
    if (smsNumBody[1]) lines.push(`BODY: ${smsNumBody[1]}`);
    if (smsParts[1]) {
      const params = new URLSearchParams(smsParts[1]);
      params.forEach((v, k) => lines.push(`  ${k}: ${v}`));
    }
  }

  if (quickType === 'phone') {
    lines.push(`PHONE NUMBER: ${value.replace(/^tel:/i, '')}`);
  }

  if (quickType === 'json') {
    try {
      const parsed = JSON.parse(value);
      lines.push(`JSON KEYS: ${Object.keys(parsed).join(', ')}`);
      lines.push(`JSON STRUCTURE: ${JSON.stringify(parsed, null, 2).substring(0, 500)}`);
    } catch { /* ignore */ }
  }

  return lines.join('\n');
}

export async function analyzeScannedCode(
  value: string,
  codeType: CodeType,
): Promise<CodeAnalysisResult> {
  const quickType = quickParseType(value, codeType);
  const preParsedContext = buildPreParsedContext(value, codeType, quickType);

  console.log('[CodeAnalyzer] Analyzing code:', codeType, 'quickType:', quickType, 'value length:', value.length);

  const codeTypeLabel: Record<string, string> = {
    'qr': 'QR Code',
    'ean-13': 'EAN-13 barcode (13-digit product barcode, international standard)',
    'ean-8': 'EAN-8 barcode (8-digit compact product barcode)',
    'upc-a': 'UPC-A barcode (12-digit product barcode, used primarily in US/Canada)',
    'upc-e': 'UPC-E barcode (6-digit compressed product barcode)',
    'code-128': 'Code 128 barcode (high-density alphanumeric, used in logistics/shipping)',
    'code-39': 'Code 39 barcode (alphanumeric, used in automotive/defense/healthcare)',
    'code-93': 'Code 93 barcode (compact alphanumeric)',
    'codabar': 'Codabar barcode (used in libraries, blood banks, FedEx)',
    'itf': 'ITF/Interleaved 2 of 5 barcode (used on shipping cartons)',
    'pdf-417': 'PDF-417 barcode (2D, used on IDs, boarding passes, shipping labels)',
    'aztec': 'Aztec code (2D, used on boarding passes, tickets)',
    'data-matrix': 'Data Matrix code (2D, used in electronics, pharmaceuticals, small items)',
  };

  const label = codeTypeLabel[codeType] ?? codeType;

  try {
    const result = await generateObject({
      messages: [
        {
          role: 'user',
          content: `You are a world-class barcode and QR code analysis engine. Your job is to extract EVERY piece of useful, accurate information from this scanned code and present it in a clear, organized way. Be extremely thorough and detailed.

=== SCANNED CODE ===
CODE FORMAT: ${label}
RAW DATA: ${value}
DETECTED CONTENT TYPE: ${quickType}

=== PRE-PARSED DATA ===
${preParsedContext || 'No additional pre-parsed data available.'}

=== YOUR TASK ===

You MUST provide:

1. **parsed_type**: The most accurate content type classification.

2. **title**: A specific, descriptive title. Examples:
   - Product: "Coca-Cola Classic 330ml Can" or "Samsung Galaxy S24 Ultra"
   - URL: "YouTube Video" or "Amazon Product Page" or "Google Maps Location"
   - WiFi: "Home Network: MyWiFi_5G"
   - Contact: "John Smith - Acme Corp"
   - NOT generic like "Scanned QR Code" or "Product Barcode"

3. **summary**: A detailed 2-3 sentence description of what was scanned, what information was extracted, and what the user can do with it. Be specific and helpful.

4. **parsed_fields**: Extract EVERY piece of data as individual fields. Each field needs a label, value, and icon name. Be exhaustive:
   - For PRODUCTS (EAN/UPC barcodes): You MUST include: Barcode Number, Barcode Standard (EAN-13/UPC-A/etc), Country of Origin (from barcode prefix), GS1 Company Prefix, Product Name (if identifiable), Brand, Category, Description, Estimated Price Range. If you recognize the barcode, provide all product details. If not, still provide the country, prefix analysis, and suggest searching.
   - For URLs: Domain, Full URL, Protocol (HTTP/HTTPS), Path, Query Parameters (each one separately), Port (if non-standard), URL Type (social media/shopping/video/news/etc)
   - For WiFi: Network Name (SSID), Security Type, Password, Hidden Network status
   - For Contacts (vCard): Full Name, First Name, Last Name, Phone (all numbers), Email (all), Organization, Title/Role, Address, Website, Notes, Birthday
   - For Calendar events: Event Title, Start Date/Time, End Date/Time, Location, Description, Organizer, URL
   - For Email: To Address, CC, BCC, Subject, Body
   - For SMS: Phone Number, Message Body
   - For Geo: Latitude, Longitude, Altitude, Label/Name
   - For Crypto: Currency Type, Wallet Address, Amount, Label, Message
   - For JSON: Each top-level key-value pair as a separate field
   - For Serial Numbers: Serial Number, Code Format, Possible Use (shipping/inventory/etc)
   - For Text: The full text content, character count, detected language

5. **actions**: Suggest ALL relevant actions (at least 2-3). The FIRST action should be the most useful one. Include:
   - Products: "Search Product Online", "Copy Barcode", "Compare Prices"
   - URLs: "Open Link", "Copy URL", "Share Link"
   - WiFi: "Copy Password", "Copy Network Name"
   - Contacts: "Copy Phone", "Copy Email", "Open Website"
   - Calendar: "Copy Event Details"
   - Always include "Copy Raw Value" as the last action

6. **product_info**: For ANY product barcode (EAN-13, EAN-8, UPC-A, UPC-E), you MUST fill this out. Try to identify the actual product from the barcode number. Common barcode prefixes: 00-13 = USA/Canada, 30-37 = France, 400-440 = Germany, 45/49 = Japan, 46 = Russia, 471 = Taiwan, 489 = Hong Kong, 50 = UK, 54 = Belgium, 57 = Denmark, 64 = Finland, 690-699 = China, 70 = Norway, 729 = Israel, 73 = Sweden, 750 = Mexico, 76 = Switzerland, 80-83 = Italy, 84 = Spain, 880 = South Korea, 885 = Thailand, 890 = India, 899 = Indonesia, 93 = Australia, 94 = New Zealand. Provide the barcode_standard (e.g. "EAN-13", "UPC-A").

7. **url_info**: For URLs. Check if it's a known shortened URL service (bit.ly, tinyurl, t.co, goo.gl, etc.). Identify the likely purpose based on the domain.

8. **wifi_info**: For WiFi QR codes. Parse SSID, security type, password, hidden status.

9. **contact_info**: For vCard/meCard QR codes. Extract all contact fields.

10. **security_warning**: Set this if: URL uses HTTP (not HTTPS), URL is shortened (destination unknown), URL domain looks like phishing (misspelled brand names), cryptocurrency payment request from unknown source, suspicious redirect patterns. Be specific about the risk.

11. **additional_context**: Provide expert-level context. Examples:
    - "This EAN-13 barcode has prefix 890, indicating the product was registered in India. The GS1 company prefix 8901234 is assigned to [company name]."
    - "This QR code uses vCard 3.0 format with UTF-8 encoding."
    - "This is a bit.ly shortened URL. The actual destination cannot be verified without following the redirect."
    - "This Code 128 barcode follows GS1-128 format commonly used in supply chain management."

ICON NAMES (use exactly these strings):
"globe", "lock", "wifi", "user", "phone", "mail", "map-pin", "calendar", "package", "tag", "dollar-sign", "flag", "building", "hash", "link", "shield", "info", "credit-card", "key"

CRITICAL RULES:
- Never return empty or generic results. Every field must have meaningful data.
- For products, ALWAYS try to identify the product. If you recognize the barcode number, name the product. If not, still provide country, prefix info, and category guess.
- The title must be SPECIFIC to the scanned content, never generic.
- Include at least 4-6 parsed_fields for any scan type.
- Provide at least 2 actions.
- Be accurate. Don't make up product names if you're not confident — say "Unknown Product" with the barcode details instead.`,
        },
      ],
      schema: analysisSchema,
    });

    console.log('[CodeAnalyzer] AI analysis complete:', result.title, 'fields:', result.parsed_fields.length);

    return {
      ...result,
      raw_value: value,
      code_type: codeType,
    };
  } catch (error) {
    console.log('[CodeAnalyzer] AI analysis failed, using enhanced fallback:', error);
    return buildFallbackResult(value, codeType, quickType);
  }
}

function buildFallbackResult(
  value: string,
  codeType: CodeType,
  quickType: ParsedDataType,
): CodeAnalysisResult {
  const fields: ParsedField[] = [];
  const actions: SuggestedAction[] = [];
  let title = '';
  let summary = '';
  let productInfo: ProductInfo | null = null;
  let urlInfo: UrlInfo | null = null;
  let wifiInfo: WifiInfo | null = null;
  let contactInfo: ContactInfo | null = null;
  let securityWarning: string | null = null;
  let additionalContext: string | null = null;

  switch (quickType) {
    case 'url': {
      try {
        const url = new URL(value);
        const isShortenedUrl = SHORTENED_DOMAINS.some(d => url.hostname.includes(d));
        const isSecure = url.protocol === 'https:';
        title = `Link: ${url.hostname}${url.pathname !== '/' ? url.pathname.substring(0, 30) : ''}`;
        summary = `Website link to ${url.hostname}. ${isSecure ? 'Secure HTTPS connection.' : 'WARNING: Insecure HTTP connection.'} ${isShortenedUrl ? 'This is a shortened URL — destination unknown.' : ''}`;

        fields.push(
          { label: 'Domain', value: url.hostname, icon: 'globe' },
          { label: 'Full URL', value, icon: 'link' },
          { label: 'Protocol', value: url.protocol.replace(':', '').toUpperCase(), icon: 'shield' },
          { label: 'Path', value: url.pathname || '/', icon: 'info' },
        );
        if (url.search) fields.push({ label: 'Query Parameters', value: url.search, icon: 'hash' });
        if (url.port) fields.push({ label: 'Port', value: url.port, icon: 'info' });

        urlInfo = {
          domain: url.hostname,
          is_secure: isSecure,
          likely_purpose: 'Website',
          is_shortened: isShortenedUrl,
        };

        if (!isSecure) securityWarning = 'This URL uses HTTP (not HTTPS). Your connection is not encrypted and could be intercepted.';
        if (isShortenedUrl) securityWarning = `This is a shortened URL from ${url.hostname}. The actual destination cannot be verified. Exercise caution before visiting.`;

        actions.push(
          { label: 'Open Link', type: 'open_url', value },
          { label: 'Copy URL', type: 'copy', value },
          { label: 'Search Domain', type: 'search', value: url.hostname },
        );
      } catch {
        title = 'URL Link';
        summary = `A URL was scanned: ${value.substring(0, 80)}`;
        fields.push({ label: 'URL', value, icon: 'link' });
        actions.push(
          { label: 'Open Link', type: 'open_url', value },
          { label: 'Copy URL', type: 'copy', value },
        );
      }
      break;
    }

    case 'wifi': {
      const wifi = quickParseWifi(value);
      if (wifi) {
        wifiInfo = wifi;
        title = `Wi-Fi: ${wifi.ssid}`;
        summary = `Wi-Fi network "${wifi.ssid}" using ${wifi.security} security.${wifi.password ? ' Password is included — tap to copy.' : ' Open network (no password required).'}${wifi.hidden ? ' This is a hidden network.' : ''}`;

        fields.push(
          { label: 'Network Name (SSID)', value: wifi.ssid, icon: 'wifi' },
          { label: 'Security Type', value: wifi.security, icon: 'lock' },
        );
        if (wifi.password) {
          fields.push({ label: 'Password', value: wifi.password, icon: 'key' });
          actions.push({ label: 'Copy Password', type: 'copy', value: wifi.password });
        }
        fields.push({ label: 'Hidden Network', value: wifi.hidden ? 'Yes' : 'No', icon: 'info' });

        actions.push(
          { label: 'Copy Network Name', type: 'copy', value: wifi.ssid },
          { label: 'Copy Raw Data', type: 'copy', value },
        );

        additionalContext = `This QR code uses the standard WIFI: format. Security type "${wifi.security}" ${wifi.security === 'WPA' || wifi.security === 'WPA2' ? 'provides good encryption' : wifi.security === 'WEP' ? 'uses outdated encryption — consider upgrading' : wifi.security === 'nopass' ? 'means no password is required' : 'is the configured security'}.`;
      }
      break;
    }

    case 'vcard': {
      const contact = quickParseVCard(value);
      if (contact) {
        contactInfo = contact;
        title = contact.name ? `Contact: ${contact.name}` : 'Contact Information';
        const parts: string[] = [];
        if (contact.name) parts.push(contact.name);
        if (contact.organization) parts.push(`at ${contact.organization}`);
        summary = parts.length > 0
          ? `Contact card for ${parts.join(' ')}. ${contact.phone ? 'Phone number' : ''}${contact.phone && contact.email ? ' and ' : ''}${contact.email ? 'email' : ''} included.`
          : 'A vCard contact with extracted details.';

        if (contact.name) fields.push({ label: 'Full Name', value: contact.name, icon: 'user' });
        if (contact.phone) {
          fields.push({ label: 'Phone', value: contact.phone, icon: 'phone' });
          actions.push({ label: 'Call', type: 'call', value: contact.phone });
        }
        if (contact.email) {
          fields.push({ label: 'Email', value: contact.email, icon: 'mail' });
          actions.push({ label: 'Send Email', type: 'email', value: contact.email });
        }
        if (contact.organization) fields.push({ label: 'Organization', value: contact.organization, icon: 'building' });
        if (contact.address) fields.push({ label: 'Address', value: contact.address, icon: 'map-pin' });
        if (contact.website) {
          fields.push({ label: 'Website', value: contact.website, icon: 'globe' });
          actions.push({ label: 'Open Website', type: 'open_url', value: contact.website });
        }
        actions.push({ label: 'Copy All Details', type: 'copy', value });

        const versionMatch = value.match(/VERSION:(\S+)/i);
        if (versionMatch) additionalContext = `This contact uses vCard version ${versionMatch[1]} format.`;
      }
      break;
    }

    case 'product': {
      const country = getCountryFromEAN(value);
      const standardMap: Record<string, string> = {
        'ean-13': 'EAN-13',
        'ean-8': 'EAN-8',
        'upc-a': 'UPC-A',
        'upc-e': 'UPC-E',
      };
      const standard = standardMap[codeType] ?? codeType.toUpperCase();

      title = `Product Barcode: ${value}`;
      summary = `${standard} product barcode${country ? ` registered in ${country}` : ''}. Search online to find detailed product information, pricing, and reviews.`;

      fields.push(
        { label: 'Barcode Number', value, icon: 'hash' },
        { label: 'Barcode Standard', value: standard, icon: 'tag' },
      );
      if (country) fields.push({ label: 'Country of Origin', value: country, icon: 'flag' });

      if (value.length === 13) {
        fields.push(
          { label: 'GS1 Company Prefix', value: value.substring(0, 7), icon: 'building' },
          { label: 'Item Reference', value: value.substring(7, 12), icon: 'package' },
          { label: 'Check Digit', value: value.substring(12), icon: 'info' },
        );
      } else if (value.length === 12) {
        fields.push(
          { label: 'Company Prefix', value: value.substring(0, 6), icon: 'building' },
          { label: 'Item Number', value: value.substring(6, 11), icon: 'package' },
          { label: 'Check Digit', value: value.substring(11), icon: 'info' },
        );
      }

      productInfo = {
        product_name: 'Unknown Product',
        brand: null,
        category: null,
        description: null,
        estimated_price: null,
        barcode_standard: standard,
        country_of_origin: country,
        manufacturer: null,
      };

      actions.push(
        { label: 'Search Product', type: 'search', value: `barcode ${value} product` },
        { label: 'Compare Prices', type: 'search', value: `${value} price compare` },
        { label: 'Copy Barcode', type: 'copy', value },
      );

      if (country) {
        additionalContext = `This ${standard} barcode has a prefix indicating it was registered in ${country}. The GS1 company prefix can be used to identify the manufacturer through the GS1 database.`;
      }
      break;
    }

    case 'phone': {
      const phone = value.replace(/^tel:/i, '');
      title = `Phone: ${phone}`;
      summary = `Phone number ${phone}. You can call this number or send a text message.`;
      fields.push(
        { label: 'Phone Number', value: phone, icon: 'phone' },
        { label: 'Format', value: 'tel: URI', icon: 'info' },
      );
      actions.push(
        { label: 'Call', type: 'call', value: phone },
        { label: 'Send SMS', type: 'sms', value: phone },
        { label: 'Copy Number', type: 'copy', value: phone },
      );
      break;
    }

    case 'email': {
      const emailParts = value.replace(/^mailto:/i, '').split('?');
      const emailAddr = emailParts[0];
      title = `Email: ${emailAddr}`;
      summary = `Email address ${emailAddr}. Tap to compose an email.`;
      fields.push({ label: 'Email Address', value: emailAddr, icon: 'mail' });
      if (emailParts[1]) {
        const params = new URLSearchParams(emailParts[1]);
        if (params.get('subject')) fields.push({ label: 'Subject', value: params.get('subject')!, icon: 'info' });
        if (params.get('body')) fields.push({ label: 'Body', value: params.get('body')!, icon: 'info' });
        if (params.get('cc')) fields.push({ label: 'CC', value: params.get('cc')!, icon: 'mail' });
        if (params.get('bcc')) fields.push({ label: 'BCC', value: params.get('bcc')!, icon: 'mail' });
      }
      actions.push(
        { label: 'Send Email', type: 'email', value: emailAddr },
        { label: 'Copy Email', type: 'copy', value: emailAddr },
      );
      break;
    }

    case 'sms': {
      const smsParts = value.replace(/^(smsto:|sms:)/i, '').split('?');
      const smsNumBody = smsParts[0].split(':');
      const smsNumber = smsNumBody[0];
      const smsBody = smsNumBody[1] || (smsParts[1] ? new URLSearchParams(smsParts[1]).get('body') : null);
      title = `SMS: ${smsNumber}`;
      summary = `Text message to ${smsNumber}.${smsBody ? ` Message: "${smsBody.substring(0, 50)}${smsBody.length > 50 ? '...' : ''}"` : ''}`;
      fields.push({ label: 'Phone Number', value: smsNumber, icon: 'phone' });
      if (smsBody) fields.push({ label: 'Message', value: smsBody, icon: 'info' });
      actions.push(
        { label: 'Send SMS', type: 'sms', value: smsNumber },
        { label: 'Call Instead', type: 'call', value: smsNumber },
        { label: 'Copy Number', type: 'copy', value: smsNumber },
      );
      break;
    }

    case 'geo': {
      const geoMatch = value.match(/^geo:([-\d.]+),([-\d.]+)/i);
      if (geoMatch) {
        const lat = geoMatch[1];
        const lon = geoMatch[2];
        title = `Location: ${lat}, ${lon}`;
        summary = `Geographic coordinates: latitude ${lat}, longitude ${lon}. Open in maps to view this location.`;
        fields.push(
          { label: 'Latitude', value: lat, icon: 'map-pin' },
          { label: 'Longitude', value: lon, icon: 'map-pin' },
        );
        const queryMatch = value.match(/\?q=([^&]+)/);
        if (queryMatch) fields.push({ label: 'Label', value: decodeURIComponent(queryMatch[1]), icon: 'tag' });
        actions.push(
          { label: 'Open in Maps', type: 'map', value: `https://maps.google.com/maps?q=${lat},${lon}` },
          { label: 'Copy Coordinates', type: 'copy', value: `${lat}, ${lon}` },
        );
      }
      break;
    }

    case 'calendar': {
      const cal = quickParseCalendar(value);
      title = cal?.summary ? `Event: ${cal.summary}` : 'Calendar Event';
      summary = cal?.summary
        ? `Calendar event "${cal.summary}"${cal.location ? ` at ${cal.location}` : ''}${cal.start ? ` starting ${cal.start}` : ''}.`
        : 'A calendar event was scanned.';
      if (cal) {
        if (cal.summary) fields.push({ label: 'Event', value: cal.summary, icon: 'calendar' });
        if (cal.start) fields.push({ label: 'Start', value: cal.start, icon: 'calendar' });
        if (cal.end) fields.push({ label: 'End', value: cal.end, icon: 'calendar' });
        if (cal.location) fields.push({ label: 'Location', value: cal.location, icon: 'map-pin' });
        if (cal.description) fields.push({ label: 'Description', value: cal.description, icon: 'info' });
        if (cal.organizer) fields.push({ label: 'Organizer', value: cal.organizer, icon: 'user' });
      }
      actions.push(
        { label: 'Copy Event Details', type: 'copy', value },
        { label: 'Copy Raw Data', type: 'copy', value },
      );
      break;
    }

    case 'cryptocurrency': {
      const cryptoMatch = value.match(/^(\w+):([a-zA-Z0-9]+)(?:\?(.*))?$/i);
      if (cryptoMatch) {
        const currency = cryptoMatch[1].charAt(0).toUpperCase() + cryptoMatch[1].slice(1);
        const address = cryptoMatch[2];
        title = `${currency} Payment`;
        summary = `${currency} cryptocurrency payment request to address ${address.substring(0, 12)}...`;
        fields.push(
          { label: 'Currency', value: currency, icon: 'credit-card' },
          { label: 'Address', value: address, icon: 'hash' },
        );
        if (cryptoMatch[3]) {
          const params = new URLSearchParams(cryptoMatch[3]);
          if (params.get('amount')) fields.push({ label: 'Amount', value: params.get('amount')!, icon: 'dollar-sign' });
          if (params.get('label')) fields.push({ label: 'Label', value: params.get('label')!, icon: 'tag' });
          if (params.get('message')) fields.push({ label: 'Message', value: params.get('message')!, icon: 'info' });
        }
        securityWarning = 'Cryptocurrency transactions are irreversible. Verify the recipient address carefully before sending any funds.';
        actions.push(
          { label: 'Copy Address', type: 'copy', value: address },
          { label: 'Copy Full URI', type: 'copy', value },
        );
      }
      break;
    }

    case 'json': {
      try {
        const parsed = JSON.parse(value);
        const keys = Object.keys(parsed);
        title = `JSON Data (${keys.length} fields)`;
        summary = `Structured JSON data with ${keys.length} fields: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`;
        keys.slice(0, 15).forEach(key => {
          const val = parsed[key];
          const display = typeof val === 'object' ? JSON.stringify(val) : String(val);
          fields.push({ label: key, value: display.substring(0, 200), icon: 'info' });
        });
      } catch {
        title = 'JSON Data';
        summary = 'JSON formatted data was detected.';
        fields.push({ label: 'Raw Data', value: value.substring(0, 300), icon: 'hash' });
      }
      actions.push(
        { label: 'Copy JSON', type: 'copy', value },
        { label: 'Copy Raw Data', type: 'copy', value },
      );
      break;
    }

    case 'serial_number': {
      title = `Serial: ${value}`;
      summary = `A serial number or identifier code "${value}" scanned from a ${codeType.toUpperCase()} barcode. This is likely used for inventory tracking, shipping, or product identification.`;
      fields.push(
        { label: 'Serial Number', value, icon: 'hash' },
        { label: 'Code Format', value: codeType.toUpperCase(), icon: 'tag' },
        { label: 'Length', value: `${value.length} characters`, icon: 'info' },
      );
      actions.push(
        { label: 'Copy Serial', type: 'copy', value },
        { label: 'Search Online', type: 'search', value },
      );
      additionalContext = `This ${codeType.toUpperCase()} barcode contains an alphanumeric code commonly used for tracking, logistics, or inventory management.`;
      break;
    }

    default: {
      title = value.length > 40 ? `${value.substring(0, 37)}...` : value;
      summary = `Text data scanned from a ${codeType.toUpperCase()} code. ${value.length} characters total.`;
      fields.push(
        { label: 'Content', value, icon: 'info' },
        { label: 'Code Format', value: codeType.toUpperCase(), icon: 'tag' },
        { label: 'Character Count', value: `${value.length}`, icon: 'hash' },
      );
      actions.push(
        { label: 'Copy Text', type: 'copy', value },
        { label: 'Search Online', type: 'search', value },
      );
      break;
    }
  }

  if (fields.length === 0) {
    fields.push(
      { label: 'Raw Value', value, icon: 'hash' },
      { label: 'Code Type', value: codeType.toUpperCase(), icon: 'tag' },
    );
  }

  if (actions.length === 0) {
    actions.push({ label: 'Copy Value', type: 'copy', value });
  }

  if (!title) title = `Scanned ${codeType.toUpperCase()}`;
  if (!summary) summary = `Code data: ${value.substring(0, 100)}`;

  return {
    parsed_type: quickType,
    title,
    summary,
    raw_value: value,
    code_type: codeType,
    parsed_fields: fields,
    actions,
    product_info: productInfo,
    url_info: urlInfo,
    wifi_info: wifiInfo,
    contact_info: contactInfo,
    security_warning: securityWarning,
    additional_context: additionalContext,
  };
}
