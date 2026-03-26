import type { CategoryType } from './grocery';
import type { GroceryLog } from './grocery';

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  weeklyAvgSpend: number;
  dominantStyle: CategoryType;
  totalLogs: number;
  publicLogs: GroceryLog[];
  weeklyHistory: { week: string; spend: number }[];
  thumbnails?: string[];
}

export interface PromoCard {
  id: string;
  title: string;
  badge: string;
  subtitle: string;
  imageNameOrURL: string;
  detailText: string;
  ctaTitle: string;
  destination: string;
  isNew: boolean;
  createdAt: string;
}

export type BlockTagLeft = 'TIP' | 'HOT' | 'NEW' | 'TRENDING' | 'UPDATE' | 'DEAL' | 'STORE' | 'LIST' | 'RECIPE' | 'BULK';

export type BlockActionType = 'none' | 'openMap' | 'openPlaceProfile' | 'openUrl';

export type BlockType = 'deal' | 'tip' | 'store' | 'list' | 'recipe' | 'bulk';

export const BlockTypeToTag: Record<BlockType, BlockTagLeft> = {
  deal: 'DEAL',
  tip: 'TIP',
  store: 'STORE',
  list: 'LIST',
  recipe: 'RECIPE',
  bulk: 'BULK',
};

export interface UserProfileBlock {
  id: string;
  userId: string;
  title: string;
  description: string;
  headerImageUrl?: string;
  tagLeft: BlockTagLeft;
  badgeRight: 'NEW' | null;
  actionLabel: string;
  actionType: BlockActionType;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  url?: string;
  createdAt: string;
}
