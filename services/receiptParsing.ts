import { ExpenseCategoryType } from '@/types';

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ParsedAmountCandidate {
  line: string;
  value: number;
  keywordStrength: number;
}

export interface ReceiptParsingResult {
  merchantName: string | null;
  transactionDate: string | null;
  finalTotal: number | null;
  subtotal: number | null;
  tax: number | null;
  tip: number | null;
  possibleTotals: ParsedAmountCandidate[];
  items: ReceiptItem[];
  categorySuggestion: ExpenseCategoryType;
  confidence: number;
  reasons: string[];
  rawLines: string[];
  paymentMethod: string | null;
  needsReview: boolean;
}

const merchantCategoryMap: { keywords: string[]; category: ExpenseCategoryType }[] = [
  { keywords: ['SHELL', 'EXXON', 'CHEVRON', 'BP', 'ARCO', '76', 'MOBIL', 'FUEL', 'GAS', 'PETRO', 'SUNOCO', 'VALERO', 'MARATHON', 'CIRCLE K', 'QUIKTRIP', 'WAWA'], category: 'transport' },
  { keywords: ['WALMART', 'TARGET', 'BEST BUY', 'AMAZON', 'MARSHALLS', 'TJ MAXX', 'ROSS', 'NORDSTROM', 'MACYS', 'DOLLAR TREE', 'DOLLAR GENERAL', 'FIVE BELOW'], category: 'shopping' },
  { keywords: ['KROGER', 'SAFEWAY', 'TRADER JOE', 'WHOLE FOODS', 'ALDI', 'SPROUTS', 'PUBLIX', 'WEGMANS', 'HEB', 'FOOD LION', 'PIGGLY', 'STOP AND SHOP', 'GIANT', 'ALBERTSONS', 'WINCO', 'MARKET BASKET', 'GROCERY'], category: 'grocery' },
  { keywords: ['IKEA', 'HOME DEPOT', 'LOWES', 'POTTERY BARN', 'CRATE AND BARREL', 'WAYFAIR', 'PIER 1', 'RESTORATION HARDWARE', 'CB2'], category: 'home' },
  { keywords: ['CVS', 'WALGREENS', 'PHARM', 'RITE AID', 'DUANE READE'], category: 'shopping' },
  { keywords: ['UBER', 'LYFT', 'AIRLINES', 'DELTA', 'UNITED', 'SOUTHWEST', 'AMTRAK', 'GREYHOUND', 'PARKING', 'TOLL', 'TRANSIT', 'CAR WASH', 'OIL CHANGE'], category: 'transport' },
  { keywords: ['NETFLIX', 'SPOTIFY', 'APPLE.COM/BILL', 'GOOGLE *', 'SUBSCRIPTION', 'HULU', 'DISNEY', 'HBO', 'YOUTUBE', 'AUDIBLE', 'PRIME'], category: 'subscriptions' },
  { keywords: ['ELECTRIC', 'WATER', 'UTILITY', 'INTERNET', 'COMCAST', 'VERIZON', 'AT&T', 'T-MOBILE', 'TMOBILE', 'SPECTRUM', 'XFINITY', 'PHONE BILL', 'GAS SERVICE'], category: 'utility_bills' },
  { keywords: ['MCDONALD', 'STARBUCKS', 'CHIPOTLE', 'SUBWAY', 'TACO BELL', 'CHICK-FIL-A', 'WENDY', 'BURGER KING', 'PANERA', 'PIZZA HUT', 'DOMINO', 'RESTAURANT', 'CAFE', 'DINER', 'GRILL', 'KITCHEN', 'BAKERY', 'BAR & GRILL', 'DOORDASH', 'GRUBHUB', 'UBEREATS'], category: 'food' },
];

const itemCategoryMap: { keywords: string[]; category: ExpenseCategoryType }[] = [
  { keywords: ['FUEL', 'GAS', 'DIESEL', 'UNLEADED', 'PREMIUM', 'REGULAR', 'PARKING', 'TOLL'], category: 'transport' },
  { keywords: ['PIZZA', 'BURGER', 'COFFEE', 'TEA', 'LATTE', 'SANDWICH', 'TAKEOUT', 'DELIVERY', 'MEAL'], category: 'food' },
  { keywords: ['MILK', 'BREAD', 'CHICKEN', 'GROCERY', 'FRUIT', 'VEGETABLE', 'MEAT', 'CHEESE', 'YOGURT', 'EGGS', 'RICE', 'PASTA', 'CEREAL', 'SNACK', 'PRODUCE', 'PANTRY', 'JUICE', 'SODA', 'WATER'], category: 'grocery' },
  { keywords: ['BILL', 'ELECTRIC', 'WATER BILL', 'RENT', 'UTILITY', 'INTERNET', 'PHONE BILL'], category: 'utility_bills' },
  { keywords: ['SHIRT', 'SHOES', 'CLOTHES', 'ELECTRONICS', 'CHARGER', 'CABLE', 'HEADPHONE', 'CASE', 'TOY', 'GAME', 'BEAUTY', 'COSMETIC'], category: 'shopping' },
  { keywords: ['FURNITURE', 'SHELF', 'DESK', 'CHAIR', 'LAMP', 'DECOR', 'RUG', 'CURTAIN', 'STORAGE', 'REPAIR'], category: 'home' },
  { keywords: ['MEMBERSHIP', 'MONTHLY', 'PLAN', 'SUBSCRIPTION', 'STREAMING'], category: 'subscriptions' },
];

const FINAL_TOTAL_KEYWORDS = [
  'grand total', 'total due', 'amount due', 'balance due', 'total charged',
  'total paid', 'amount paid', 'payment total', 'net total', 'total amount',
  'you paid', 'charged', 'debit', 'credit sale', 'amount tendered',
];

const NON_FINAL_KEYWORDS = [
  'subtotal', 'sub total', 'sub-total', 'before tax', 'pretax',
  'tax', 'sales tax', 'hst', 'gst', 'vat', 'pst',
  'tip', 'gratuity', 'service charge',
  'discount', 'savings', 'coupon', 'promo',
  'cashback', 'cash back', 'reward',
  'change', 'change due',
];

export function suggestCategory(merchantName: string | null, items: ReceiptItem[]): ExpenseCategoryType {
  const merchantUpper = merchantName?.toUpperCase() ?? '';
  for (const rule of merchantCategoryMap) {
    if (rule.keywords.some((kw) => merchantUpper.includes(kw))) return rule.category;
  }

  const itemsUpper = items.map((i) => i.name).join(' ').toUpperCase();
  for (const rule of itemCategoryMap) {
    if (rule.keywords.some((kw) => itemsUpper.includes(kw))) return rule.category;
  }

  return 'other';
}

export function getItemsPreview(items: ReceiptItem[]): string {
  if (items.length === 0) return '';
  const preview = items.slice(0, 4).map((item) => {
    const qty = item.quantity > 1 ? `${item.quantity}x ` : '';
    return `${qty}${item.name} $${item.totalPrice.toFixed(2)}`;
  });
  if (items.length > 4) {
    preview.push(`+${items.length - 4} more`);
  }
  return preview.join(', ');
}

export function validateTotal(
  finalTotal: number,
  subtotal: number | null,
  tax: number | null,
  tip: number | null,
  itemsSum: number
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (finalTotal <= 0) {
    issues.push('Total is zero or negative');
    return { isValid: false, issues };
  }

  if (finalTotal > 50000) {
    issues.push('Total seems unusually high — please verify');
  }

  if (subtotal !== null && subtotal > 0) {
    const expectedTotal = subtotal + (tax ?? 0) + (tip ?? 0);
    const diff = Math.abs(finalTotal - expectedTotal);
    const tolerance = Math.max(0.10, expectedTotal * 0.05);
    if (diff > tolerance) {
      issues.push(`Total ($${finalTotal.toFixed(2)}) doesn't match subtotal + tax + tip ($${expectedTotal.toFixed(2)})`);
    }
  }

  if (itemsSum > 0 && subtotal !== null && subtotal > 0) {
    const itemSubDiff = Math.abs(itemsSum - subtotal);
    if (itemSubDiff > subtotal * 0.15) {
      issues.push(`Items sum ($${itemsSum.toFixed(2)}) differs significantly from subtotal ($${subtotal.toFixed(2)})`);
    }
  }

  if (tax !== null && tax > 0 && subtotal !== null && subtotal > 0) {
    const taxRate = tax / subtotal;
    if (taxRate > 0.20) {
      issues.push(`Tax rate (${(taxRate * 100).toFixed(1)}%) seems unusually high`);
    }
  }

  if (finalTotal < (subtotal ?? 0)) {
    issues.push('Total is less than subtotal — possible discount or wrong total selected');
  }

  return { isValid: issues.length === 0, issues };
}

export function selectBestTotal(
  candidates: {
    finalTotal: number;
    subtotal: number | null;
    tax: number | null;
    tip: number | null;
    allTotals?: number[];
  }
): { bestTotal: number; reason: string } {
  const { finalTotal, subtotal, tax, tip, allTotals } = candidates;

  if (finalTotal > 0 && subtotal !== null && subtotal > 0) {
    const expectedFromSub = subtotal + (tax ?? 0) + (tip ?? 0);
    const diffFromSub = Math.abs(finalTotal - expectedFromSub);

    if (diffFromSub <= 0.10) {
      return { bestTotal: finalTotal, reason: 'Final total matches subtotal + tax + tip' };
    }

    if (diffFromSub > expectedFromSub * 0.15 && expectedFromSub > 0) {
      console.log('[ReceiptParsing] Final total diverges from subtotal math. finalTotal:', finalTotal, 'expected:', expectedFromSub);
      if (allTotals && allTotals.length > 0) {
        const closest = allTotals.reduce((best, t) => {
          const d = Math.abs(t - expectedFromSub);
          return d < Math.abs(best - expectedFromSub) ? t : best;
        }, allTotals[0]);
        if (Math.abs(closest - expectedFromSub) < Math.abs(finalTotal - expectedFromSub)) {
          return { bestTotal: closest, reason: 'Selected alternative total closer to subtotal + tax' };
        }
      }
      return { bestTotal: expectedFromSub, reason: 'Calculated from subtotal + tax + tip' };
    }
  }

  if (finalTotal > 0) {
    return { bestTotal: finalTotal, reason: 'Using extracted final total' };
  }

  if (subtotal !== null && subtotal > 0) {
    const calculated = subtotal + (tax ?? 0) + (tip ?? 0);
    return { bestTotal: calculated, reason: 'Calculated from subtotal + tax + tip (no final total found)' };
  }

  return { bestTotal: finalTotal, reason: 'Using raw extracted value (low confidence)' };
}

export function isLikelyNonTotal(label: string): boolean {
  const lower = label.toLowerCase().trim();
  return NON_FINAL_KEYWORDS.some((kw) => lower.includes(kw));
}

export function isLikelyFinalTotal(label: string): boolean {
  const lower = label.toLowerCase().trim();
  if (lower === 'total' || lower === 'total:') return true;
  return FINAL_TOTAL_KEYWORDS.some((kw) => lower.includes(kw));
}

export function validateDate(dateStr: string | null): { isValid: boolean; normalized: string | null; issue: string | null } {
  if (!dateStr || dateStr.trim() === '') {
    return { isValid: false, normalized: null, issue: 'No date detected' };
  }

  const cleaned = dateStr.trim();

  const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    if (isNaN(date.getTime())) {
      return { isValid: false, normalized: null, issue: 'Invalid date values' };
    }
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    if (date < twoYearsAgo || date > tomorrow) {
      return { isValid: false, normalized: cleaned, issue: 'Date seems outside reasonable range' };
    }
    return { isValid: true, normalized: cleaned, issue: null };
  }

  return { isValid: false, normalized: cleaned, issue: 'Unexpected date format' };
}

export function validateMerchant(name: string | null): { isValid: boolean; issue: string | null } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, issue: 'No merchant name detected' };
  }
  if (name.trim().length < 2) {
    return { isValid: false, issue: 'Merchant name too short — please verify' };
  }
  const numeric = name.replace(/[^0-9]/g, '').length;
  if (numeric / name.length > 0.7) {
    return { isValid: false, issue: 'Merchant name looks like a number — please verify' };
  }
  return { isValid: true, issue: null };
}

export function computeConfidence(result: Partial<ReceiptParsingResult>): { confidence: number; reasons: string[]; needsReview: boolean } {
  let confidence = 0;
  const reasons: string[] = [];
  let forceReview = false;

  if (result.finalTotal !== null && result.finalTotal !== undefined && result.finalTotal > 0) {
    confidence += 0.30;

    if (result.subtotal !== null && result.subtotal !== undefined && result.subtotal > 0) {
      const expected = result.subtotal + (result.tax ?? 0) + (result.tip ?? 0);
      const diff = Math.abs(result.finalTotal - expected);
      if (diff <= 0.10) {
        confidence += 0.10;
      } else if (diff > expected * 0.10) {
        reasons.push(`Total may not match breakdown — review total`);
        forceReview = true;
      }
    }
  } else {
    reasons.push('Missing final total — enter manually');
    forceReview = true;
  }

  const merchantValid = validateMerchant(result.merchantName ?? null);
  if (merchantValid.isValid) {
    confidence += 0.15;
  } else {
    reasons.push(merchantValid.issue ?? 'Merchant unclear — edit merchant');
    forceReview = true;
  }

  const dateValid = validateDate(result.transactionDate ?? null);
  if (dateValid.isValid) {
    confidence += 0.15;
  } else {
    reasons.push(dateValid.issue ?? 'Date not detected — enter manually');
  }

  if (result.items && result.items.length > 0) {
    confidence += 0.15;
    const itemsTotal = result.items.reduce((sum, i) => sum + i.totalPrice, 0);
    const total = result.finalTotal ?? 0;
    const tax = result.tax ?? 0;
    const tip = result.tip ?? 0;
    const adjustments = tax + tip;
    const expectedItemsTotal = total - adjustments;

    if (total > 0 && expectedItemsTotal > 0) {
      const diff = Math.abs(itemsTotal - expectedItemsTotal);
      const tolerance = Math.max(0.50, expectedItemsTotal * 0.12);
      if (diff > tolerance) {
        const subtotalMatch = result.subtotal !== null && result.subtotal !== undefined
          ? Math.abs(itemsTotal - result.subtotal) <= 0.05
          : false;
        if (!subtotalMatch) {
          reasons.push(`Items total (${itemsTotal.toFixed(2)}) differs from expected (${expectedItemsTotal.toFixed(2)}) — review items`);
          confidence -= 0.05;
        }
      }
    }

    const itemQuality = assessReceiptItemQuality(result.items);
    if (itemQuality.qualityScore < 0.5) {
      confidence -= 0.10;
      reasons.push('Some item names may be inaccurate — review item details');
      forceReview = true;
    } else if (itemQuality.qualityScore < 0.75) {
      confidence -= 0.05;
      reasons.push('Some item text is unclear — verify item names');
    }
  } else {
    reasons.push('No item lines found — total still usable');
  }

  if (result.subtotal !== null && result.subtotal !== undefined) {
    confidence += 0.05;
  }
  if (result.tax !== null && result.tax !== undefined) {
    confidence += 0.05;
  }

  const finalConfidence = Math.min(1, Math.max(0, confidence));
  const needsReview = forceReview || finalConfidence < 0.65;

  return {
    confidence: finalConfidence,
    reasons,
    needsReview,
  };
}

export function sanitizeReceiptItemName(rawName: string): string {
  let name = rawName.trim();

  name = name.replace(/\s{2,}/g, ' ');

  name = name.replace(/^[\s*#-]+/, '').replace(/[\s*#-]+$/, '');

  if (name.length > 80) {
    name = name.substring(0, 80).trim();
  }

  return name;
}

export function assessReceiptItemQuality(items: ReceiptItem[]): { messyCount: number; totalCount: number; qualityScore: number } {
  if (items.length === 0) return { messyCount: 0, totalCount: 0, qualityScore: 1 };

  let messyCount = 0;
  for (const item of items) {
    const name = item.name;
    const alphaChars = name.replace(/[^a-zA-Z]/g, '').length;
    const totalChars = name.replace(/\s/g, '').length;

    if (totalChars === 0) {
      messyCount++;
      continue;
    }

    const alphaRatio = alphaChars / totalChars;
    const hasExcessiveNonAlpha = alphaRatio < 0.4;
    const isTooShort = name.length < 3;
    const hasWeirdPattern = /[^a-zA-Z0-9\s\-./*#&',()]{3,}/.test(name);

    if (hasExcessiveNonAlpha || isTooShort || hasWeirdPattern) {
      messyCount++;
    }
  }

  const qualityScore = items.length > 0 ? 1 - (messyCount / items.length) : 1;
  console.log('[ReceiptParsing] Item text quality: messy=' + messyCount + '/' + items.length + ' score=' + qualityScore.toFixed(2));
  return { messyCount, totalCount: items.length, qualityScore };
}

export function sanitizeItems(rawItems: Array<{
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}>): ReceiptItem[] {
  const seenKeys = new Set<string>();

  return rawItems
    .map((i) => {
      const qty = Math.max(1, Math.round(i.quantity));
      const unitPrice = Math.max(0, i.unit_price);
      let totalPrice = Math.max(0, i.total_price);

      const cleanName = sanitizeReceiptItemName(i.name);

      if (totalPrice === 0 && unitPrice > 0) {
        totalPrice = +(unitPrice * qty).toFixed(2);
      }
      if (unitPrice === 0 && totalPrice > 0 && qty >= 1) {
        return { name: cleanName, quantity: qty, unitPrice: +(totalPrice / qty).toFixed(2), totalPrice };
      }

      const expectedTotal = +(unitPrice * qty).toFixed(2);
      if (Math.abs(totalPrice - expectedTotal) > 0.02 && unitPrice > 0) {
        totalPrice = expectedTotal;
      }

      return { name: cleanName, quantity: qty, unitPrice, totalPrice };
    })
    .filter((item) => {
      if (item.totalPrice <= 0 && item.unitPrice <= 0) {
        console.log('[ReceiptParsing] Filtered $0.00 junk item:', item.name);
        return false;
      }

      const nameLower = item.name.toLowerCase().trim();
      if (nameLower.length === 0) return false;

      const skipKeywords = [
        'subtotal', 'sub total', 'sub-total', 'tax', 'sales tax',
        'total', 'grand total', 'amount due', 'balance due', 'balance',
        'change', 'change due', 'cash', 'credit', 'debit', 'visa',
        'mastercard', 'amex', 'discover', 'payment', 'tendered',
        'tip', 'gratuity', 'service charge', 'discount', 'savings',
        'coupon', 'reward', 'cashback', 'cash back', 'amount paid',
        'you saved', 'member savings', 'loyalty',
      ];
      if (skipKeywords.some((kw) => nameLower === kw || nameLower.startsWith(kw + ' ') || nameLower.endsWith(' ' + kw))) {
        console.log('[ReceiptParsing] Filtered non-item row:', item.name);
        return false;
      }

      const key = `${nameLower}_${item.totalPrice.toFixed(2)}`;
      if (seenKeys.has(key)) {
        console.log('[ReceiptParsing] Filtered duplicate item:', item.name);
        return false;
      }
      seenKeys.add(key);

      return true;
    });
}
