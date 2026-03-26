import type { CategoryType } from './grocery';

export type DealSourceType = 'user' | 'store_brand' | 'sample';

export interface StoreBrandSource {
  slug: string;
  name: string;
  category: CategoryType;
  feedUrls: string[];
  logoUrl?: string;
  websiteUrl: string;
}

export interface NormalizedDeal {
  store_name: string;
  brand_slug: string;
  title: string;
  description: string | null;
  category: 'Deals' | 'Budget' | 'Healthy' | 'Bulk';
  price: number | null;
  original_price: number | null;
  savings_amount: number | null;
  savings_percent: number | null;
  photo_url: string | null;
  source_url: string;
  source_type: DealSourceType;
  is_active: boolean;
  is_verified: boolean;
  last_verified: string;
  deal_expires_at: string | null;
}

export interface VerifiedDealRow {
  id: string;
  store_name: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  price: number | null;
  savings_amount: number | null;
  city: string | null;
  created_at: string | null;
  source_type: string | null;
  user_id: string | null;
  is_active?: boolean | null;
  photo_url?: string | null;
  source_url?: string | null;
  original_price?: number | null;
  last_verified?: string | null;
  is_verified?: boolean | null;
  brand_slug?: string | null;
  deal_expires_at?: string | null;
  savings_percent?: number | null;
  find_tag?: string | null;
  moderation_status?: 'pending' | 'approved' | 'rejected' | null;
}

export interface StoreDeal {
  id: string;
  storeId: string;
  userId: string;
  dealText: string;
  createdAt: string;
  reportCount?: number;
}
