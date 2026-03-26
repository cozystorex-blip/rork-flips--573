export interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  category?: 'budget' | 'healthy' | 'bulk' | 'deals';
  recommendationTag?: string;
  description?: string;
  phone?: string;
  website?: string;
  imageUrl?: string;
  claimedByUserId?: string;
  isVerified?: boolean;
  businessName?: string;
}

export interface StoreData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: 'budget' | 'healthy' | 'bulk' | 'deals';
  avgSpend: number;
  totalLogs: number;
  lastLogTime: string;
}

export interface StoreInsight {
  text: string;
  confidence: 'high' | 'medium' | 'low';
}

export type StoreType = 'grocery' | 'convenience' | 'warehouse' | 'specialty' | 'discount';
