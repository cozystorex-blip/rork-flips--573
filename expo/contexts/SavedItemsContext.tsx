import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePremium } from '@/contexts/PremiumContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchSavedDeals as fetchSavedDealsRemote,
  upsertSavedDeal,
  deleteSavedDeal as deleteSavedDealRemote,
} from '@/services/supabaseData';

export const FREE_SAVED_LIMIT = 7;

const STORAGE_KEY = 'saved_deals_data';

export interface SavedDeal {
  id: string;
  dealId: string;
  title: string;
  storeName: string;
  price: number | null;
  originalPrice: number | null;
  savingsAmount: number | null;
  photoUrl: string | null;
  category: string | null;
  sourceType: string | null;
  savedAt: string;
}

function normalizeDeal(raw: Record<string, unknown>): SavedDeal {
  return {
    id: (raw.id as string) ?? '',
    dealId: ((raw.dealId ?? raw.deal_id) as string) ?? '',
    title: (raw.title as string) ?? '',
    storeName: ((raw.storeName ?? raw.store_name) as string) ?? '',
    price: (raw.price as number) ?? null,
    originalPrice: ((raw.originalPrice ?? raw.original_price) as number) ?? null,
    savingsAmount: ((raw.savingsAmount ?? raw.savings_amount) as number) ?? null,
    photoUrl: ((raw.photoUrl ?? raw.photo_url) as string) ?? null,
    category: (raw.category as string) ?? null,
    sourceType: ((raw.sourceType ?? raw.source_type) as string) ?? null,
    savedAt: ((raw.savedAt ?? raw.saved_at) as string) ?? new Date().toISOString(),
  };
}

export const [SavedItemsProvider, useSavedItems] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { isPremium } = usePremium();
  const { userId } = useAuth();
  const [savedDeals, setSavedDeals] = useState<SavedDeal[]>([]);
  const initialSyncDone = useRef(false);

  const savedQuery = useQuery({
    queryKey: ['saved_deals', userId],
    queryFn: async () => {
      if (userId) {
        try {
          const remote = await fetchSavedDealsRemote(userId);
          if (Array.isArray(remote) && remote.length > 0) {
            console.log('[SavedItems] Loaded', remote.length, 'deals from remote');
            return remote.map((r) => normalizeDeal(r as Record<string, unknown>));
          }
        } catch (e) {
          console.log('[SavedItems] Remote fetch failed:', e);
        }
      }

      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        console.log('[SavedItems] Loaded saved deals from local storage');
        return JSON.parse(stored) as SavedDeal[];
      }
      return [];
    },
    staleTime: 30000,
  });

  useEffect(() => {
    if (savedQuery.data) {
      setSavedDeals(savedQuery.data);

      if (userId && !initialSyncDone.current && savedQuery.data.length > 0) {
        initialSyncDone.current = true;
      }
    }
  }, [savedQuery.data, userId]);

  const saveMutation = useMutation({
    mutationFn: async (updated: SavedDeal[]) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['saved_deals', userId] });
    },
  });

  const totalSavedCount = savedDeals.length;
  const isAtFreeLimit = !isPremium && totalSavedCount >= FREE_SAVED_LIMIT;
  const canSave = isPremium || totalSavedCount < FREE_SAVED_LIMIT;
  const remainingFreeSlots = isPremium ? Infinity : Math.max(0, FREE_SAVED_LIMIT - totalSavedCount);

  const saveDeal = useCallback(
    (deal: Omit<SavedDeal, 'id' | 'savedAt'>): 'saved' | 'duplicate' | 'limit_reached' => {
      const exists = savedDeals.some((d) => d.dealId === deal.dealId);
      if (exists) {
        console.log('[SavedItems] Deal already saved:', deal.dealId);
        return 'duplicate';
      }
      if (!isPremium && savedDeals.length >= FREE_SAVED_LIMIT) {
        console.log('[SavedItems] Free limit reached, cannot save');
        return 'limit_reached';
      }
      const newDeal: SavedDeal = {
        ...deal,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        savedAt: new Date().toISOString(),
      };
      console.log('[SavedItems] Saving deal:', newDeal.title);
      const updated = [newDeal, ...savedDeals];
      setSavedDeals(updated);
      saveMutation.mutate(updated);

      if (userId) {
        void upsertSavedDeal(userId, {
          id: newDeal.id,
          deal_id: newDeal.dealId,
          title: newDeal.title,
          store_name: newDeal.storeName,
          price: newDeal.price,
          original_price: newDeal.originalPrice,
          savings_amount: newDeal.savingsAmount,
          photo_url: newDeal.photoUrl,
          category: newDeal.category,
          source_type: newDeal.sourceType,
          saved_at: newDeal.savedAt,
        });
      }

      return 'saved';
    },
    [savedDeals, saveMutation, isPremium, userId]
  );

  const unsaveDeal = useCallback(
    (dealId: string) => {
      console.log('[SavedItems] Removing saved deal:', dealId);
      const updated = savedDeals.filter((d) => d.dealId !== dealId);
      setSavedDeals(updated);
      saveMutation.mutate(updated);

      if (userId) {
        void deleteSavedDealRemote(userId, dealId);
      }
    },
    [savedDeals, saveMutation, userId]
  );

  const isDealSaved = useCallback(
    (dealId: string) => savedDeals.some((d) => d.dealId === dealId),
    [savedDeals]
  );

  return useMemo(() => ({
    savedDeals,
    saveDeal,
    unsaveDeal,
    isDealSaved,
    isLoading: savedQuery.isLoading,
    totalSavedCount,
    isAtFreeLimit,
    canSave,
    remainingFreeSlots,
    freeLimit: FREE_SAVED_LIMIT,
  }), [savedDeals, saveDeal, unsaveDeal, isDealSaved, savedQuery.isLoading, totalSavedCount, isAtFreeLimit, canSave, remainingFreeSlots]);
});
