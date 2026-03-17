export type SourceQuality = 'exact' | 'category' | 'generic' | 'none';

interface SourceQualityResult {
  quality: SourceQuality;
  label: string;
  sublabel: string;
  showExternalLink: boolean;
}

const GENERIC_PATH_PATTERNS = [
  /^\/?$/, // homepage
  /^\/home\/?$/i,
  /^\/index\/?$/i,
];

const CATEGORY_PATH_PATTERNS = [
  /weekly[-_]?(specials?|ad|finds|flyer)/i,
  /warehouse[-_]?savings/i,
  /online[-_]?offers/i,
  /shop\/deals/i,
  /savings\//i,
  /sales[-_]?flyer/i,
  /grocery[-_]?deals/i,
  /super[-_]?savings/i,
  /products\/new/i,
  /\/c\/[^/]+\/-\//i, // target category pattern
];

function getPathDepth(pathname: string): number {
  const cleaned = pathname.replace(/^\/+|\/+$/g, '');
  if (!cleaned) return 0;
  return cleaned.split('/').length;
}

export function classifySourceUrl(sourceUrl: string | null | undefined, storeName: string | null | undefined): SourceQualityResult {
  if (!sourceUrl || sourceUrl.trim().length < 10) {
    return {
      quality: 'none',
      label: 'In-app details only',
      sublabel: 'No external source available',
      showExternalLink: false,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(sourceUrl.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return {
        quality: 'none',
        label: 'In-app details only',
        sublabel: 'Invalid source link',
        showExternalLink: false,
      };
    }
  } catch {
    return {
      quality: 'none',
      label: 'In-app details only',
      sublabel: 'Invalid source link',
      showExternalLink: false,
    };
  }

  const pathname = parsed.pathname;
  const hostname = parsed.hostname.replace('www.', '');

  for (const pattern of GENERIC_PATH_PATTERNS) {
    if (pattern.test(pathname)) {
      return {
        quality: 'generic',
        label: `Visit ${storeName || hostname}`,
        sublabel: 'Store homepage — not a direct product link',
        showExternalLink: false,
      };
    }
  }

  for (const pattern of CATEGORY_PATH_PATTERNS) {
    if (pattern.test(pathname)) {
      const store = storeName || hostname;
      return {
        quality: 'category',
        label: `Browse ${store} Deals`,
        sublabel: `Opens the ${store} deals page — find this item there`,
        showExternalLink: true,
      };
    }
  }

  const depth = getPathDepth(pathname);
  if (depth <= 1) {
    return {
      quality: 'generic',
      label: `Visit ${storeName || hostname}`,
      sublabel: 'Store page — not a direct product link',
      showExternalLink: false,
    };
  }

  if (depth >= 3 || /\/ip\/|\/p\/|\/product|\/item/i.test(pathname)) {
    return {
      quality: 'exact',
      label: 'View Product Page',
      sublabel: hostname,
      showExternalLink: true,
    };
  }

  return {
    quality: 'category',
    label: `Browse ${storeName || hostname} Deals`,
    sublabel: `Opens the ${storeName || hostname} deals section`,
    showExternalLink: true,
  };
}

export function isExactProductUrl(sourceUrl: string | null | undefined): boolean {
  const result = classifySourceUrl(sourceUrl, null);
  return result.quality === 'exact';
}
