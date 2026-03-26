import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePremium } from '@/contexts/PremiumContext';
import { useScanHistory } from '@/contexts/ScanHistoryContext';

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

export const [SavedItemsProvider, useSavedItems] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { isPremium } = usePremium();
  const { entries: visibleScanEntries } = useScanHistory();
  const [savedDeals, setSavedDeals] = useState<SavedDeal[]>([]);

  const savedQuery = useQuery({
    queryKey: ['saved_deals'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        console.log('[SavedItems] Loaded saved deals from storage');
        return JSON.parse(stored) as SavedDeal[];
      }
      return [];
    },
  });

  useEffect(() => {
    if (savedQuery.data) {
      setSavedDeals(savedQuery.data);
    }
  }, [savedQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (updated: SavedDeal[]) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['saved_deals'] });
    },
  });

  const totalSavedCount = savedDeals.length + visibleScanEntries.length;
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
      if (!isPremium && (savedDeals.length + visibleScanEntries.length) >= FREE_SAVED_LIMIT) {
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
      return 'saved';
    },
    [savedDeals, saveMutation, isPremium, visibleScanEntries.length]
  );

  const unsaveDeal = useCallback(
    (dealId: string) => {
      console.log('[SavedItems] Removing saved deal:', dealId);
      const updated = savedDeals.filter((d) => d.dealId !== dealId);
      setSavedDeals(updated);
      saveMutation.mutate(updated);
    },
    [savedDeals, saveMutation]
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
