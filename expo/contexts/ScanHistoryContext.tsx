import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePremium } from '@/contexts/PremiumContext';
import { deleteScanImage } from '@/services/imagePersistence';
import type { SmartScanResult } from '@/services/smartScanService';

const STORAGE_KEY = 'scan_history_data';
const FREE_HISTORY_LIMIT = 7;

export interface ScanHistoryEntry {
  id: string;
  result: SmartScanResult;
  imageUri: string | null;
  scannedAt: string;
}

export const [ScanHistoryProvider, useScanHistory] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { isPremium } = usePremium();
  const [entries, setEntries] = useState<ScanHistoryEntry[]>([]);

  const historyQuery = useQuery({
    queryKey: ['scan_history'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        console.log('[ScanHistory] Loaded entries from storage');
        return JSON.parse(stored) as ScanHistoryEntry[];
      }
      return [];
    },
  });

  useEffect(() => {
    if (historyQuery.data) {
      setEntries(historyQuery.data);
    }
  }, [historyQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (updated: ScanHistoryEntry[]) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['scan_history'] });
    },
  });

  const mutate = saveMutation.mutate;

  const addEntry = useCallback(
    (result: SmartScanResult, imageUri?: string, existingId?: string): string | null => {
      if (result.item_type === 'receipt') {
        console.log('[ScanHistory] Skipping receipt type');
        return null;
      }
      const entryId = existingId ?? (Date.now().toString() + Math.random().toString(36).substring(2, 6));
      const newEntry: ScanHistoryEntry = {
        id: entryId,
        result,
        imageUri: imageUri ?? null,
        scannedAt: new Date().toISOString(),
      };
      console.log('[ScanHistory] Adding entry:', newEntry.result.item_name, 'id:', entryId, 'imageUri:', imageUri ? 'yes' : 'no');
      setEntries((prev) => {
        const updated = [newEntry, ...prev];
        mutate(updated);
        return updated;
      });
      return entryId;
    },
    [mutate]
  );

  const getEntryById = useCallback(
    (id: string): ScanHistoryEntry | undefined => {
      return entries.find((e) => e.id === id);
    },
    [entries]
  );

  const updateEntryImage = useCallback(
    (id: string, newImageUri: string) => {
      console.log('[ScanHistory] Updating image for entry:', id);
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === id);
        if (idx === -1) {
          console.log('[ScanHistory] updateEntryImage: entry not found:', id);
          return prev;
        }
        const updated = [...prev];
        updated[idx] = { ...updated[idx], imageUri: newImageUri };
        mutate(updated);
        return updated;
      });
    },
    [mutate]
  );

  const deleteEntry = useCallback(
    (id: string) => {
      console.log('[ScanHistory] Deleting entry:', id);
      setEntries((prev) => {
        const entry = prev.find((e) => e.id === id);
        if (entry?.imageUri) {
          void deleteScanImage(entry.imageUri);
        }
        const updated = prev.filter((e) => e.id !== id);
        mutate(updated);
        return updated;
      });
    },
    [mutate]
  );

  const clearHistory = useCallback(() => {
    console.log('[ScanHistory] Clearing all history');
    setEntries((prev) => {
      for (const entry of prev) {
        if (entry.imageUri) {
          void deleteScanImage(entry.imageUri);
        }
      }
      mutate([]);
      return [];
    });
  }, [mutate]);

  const visibleEntries = useMemo(() => {
    if (isPremium) return entries;
    return entries.slice(0, FREE_HISTORY_LIMIT);
  }, [entries, isPremium]);

  const totalCount = entries.length;
  const hiddenCount = isPremium ? 0 : Math.max(0, entries.length - FREE_HISTORY_LIMIT);
  const hasHiddenEntries = hiddenCount > 0;
  const isAtFreeLimit = !isPremium && entries.length >= FREE_HISTORY_LIMIT;

  return useMemo(() => ({
    entries: visibleEntries,
    allEntries: entries,
    totalCount,
    hiddenCount,
    hasHiddenEntries,
    isAtFreeLimit,
    addEntry,
    getEntryById,
    updateEntryImage,
    deleteEntry,
    clearHistory,
    isLoading: historyQuery.isLoading,
    freeLimit: FREE_HISTORY_LIMIT,
  }), [
    visibleEntries, entries, totalCount, hiddenCount, hasHiddenEntries,
    isAtFreeLimit, addEntry, getEntryById, updateEntryImage, deleteEntry, clearHistory, historyQuery.isLoading,
  ]);
});
