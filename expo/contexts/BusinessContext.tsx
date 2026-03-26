import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'claimed_places_v1';

export interface ClaimedPlace {
  placeId: string;
  userId: string;
  businessName: string;
  isVerified: boolean;
  claimedAt: string;
}

export const [BusinessProvider, useBusiness] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [claims, setClaims] = useState<ClaimedPlace[]>([]);

  const claimsQuery = useQuery({
    queryKey: ['claimed_places'],
    queryFn: async () => {
      console.log('[BusinessContext] Loading claims from storage');
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as ClaimedPlace[];
      }
      return [];
    },
  });

  useEffect(() => {
    if (claimsQuery.data) {
      setClaims(claimsQuery.data);
    }
  }, [claimsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (updatedClaims: ClaimedPlace[]) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedClaims));
      console.log('[BusinessContext] Claims saved, count:', updatedClaims.length);
      return updatedClaims;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['claimed_places'] });
    },
  });

  const { mutate } = saveMutation;

  const claimPlace = useCallback(
    (placeId: string, userId: string, businessName: string) => {
      const existing = claims.find((c) => c.placeId === placeId);
      if (existing) {
        console.log('[BusinessContext] Place already claimed:', placeId);
        return null;
      }
      const newClaim: ClaimedPlace = {
        placeId,
        userId,
        businessName,
        isVerified: false,
        claimedAt: new Date().toISOString(),
      };
      console.log('[BusinessContext] Claiming place:', placeId, 'by', userId);
      const updated = [...claims, newClaim];
      setClaims(updated);
      mutate(updated);
      return newClaim;
    },
    [claims, mutate]
  );

  const verifyPlace = useCallback(
    (placeId: string) => {
      const updated = claims.map((c) =>
        c.placeId === placeId ? { ...c, isVerified: true } : c
      );
      setClaims(updated);
      mutate(updated);
    },
    [claims, mutate]
  );

  const unclaimPlace = useCallback(
    (placeId: string) => {
      const updated = claims.filter((c) => c.placeId !== placeId);
      setClaims(updated);
      mutate(updated);
    },
    [claims, mutate]
  );

  const getClaimForPlace = useCallback(
    (placeId: string) => claims.find((c) => c.placeId === placeId) ?? null,
    [claims]
  );

  const getClaimsForUser = useCallback(
    (userId: string) => claims.filter((c) => c.userId === userId),
    [claims]
  );

  return useMemo(() => ({
    claims,
    claimPlace,
    verifyPlace,
    unclaimPlace,
    getClaimForPlace,
    getClaimsForUser,
    isLoading: claimsQuery.isLoading,
  }), [claims, claimPlace, verifyPlace, unclaimPlace, getClaimForPlace, getClaimsForUser, claimsQuery.isLoading]);
});
