export { supabase } from './supabase';

export { initializeAds, showInterstitialIfReady, associateAdProfile } from './adService';

export {
  syncStoreBrandDeals,
  shouldSync,
  computeDealTrust,
  type DealTrustInfo,
} from './dealIngestionService';

export { STORE_BRANDS, BRAND_CATEGORY_MAP, getStoreBrandBySlug, getStoreBrandByName } from './dealSources';

export { getLocalDeals, saveLocalDeal, removeLocalDeal } from './localDealsService';

export { persistScanImage } from './imagePersistence';
export { deleteScanImage } from './imagePersistence';

export { generateStoreInsights, getStoreTypeLabel, calculateDistance } from './storeInsightsService';

export { classifySourceUrl, isExactProductUrl } from '../../utils/sourceUrlQuality';

export {
  checkPhotoPermission,
  requestPhotoPermission,
} from './uploadService';
