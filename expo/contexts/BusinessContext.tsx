import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchClaimedPlaces as fetchClaimedPlacesRemote,
  upsertClaimedPlace as upsertClaimedPlaceRemote,
  deleteClaimedPlace as deleteClaimedPlaceRemote,
} from '@/services/supabaseData';

const STORAGE_KEY = 'claimed_places_v1';

export interface ClaimedPlace {
  placeId: string;
  userId: string;
  businessName: string;
  isVerified: boolean;
  claimedAt: string;
}

function normalizeClaim(raw: Record<string, unknown>): ClaimedPlace {
  return {
    placeId: ((raw.placeId ?? raw.place_id) as string) ?? '',
    userId: ((raw.userId ?? raw.user_id) as string) ?? '',
    businessName: ((raw.businessName ?? raw.business_name) as string) ?? '',
    isVerified: ((raw.isVerified ?? raw.is_verified) as boolean) ?? false,
    claimedAt: ((raw.claimedAt ?? raw.claimed_at) as string) ?? new Date().toISOString(),
  };
}

export const [BusinessProvider, useBusiness] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const [claims, setClaims] = useState<ClaimedPlace[]>([]);

  const claimsQuery = useQuery({
    queryKey: ['claimed_places', userId],
    queryFn: async () => {
      if (userId) {
        try {
          const remote = await fetchClaimedPlacesRemote(userId);
          if (Array.isArray(remote) && remote.length > 0) {
            console.log('[BusinessContext] Loaded', remote.length, 'claims from remote');
            return remote.map((r) => normalizeClaim(r as Record<string, unknown>));
          }
        } catch (e) {
          console.log('[BusinessContext] Remote fetch failed:', e);
        }
      }

      console.log('[BusinessContext] Loading claims from storage');
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as ClaimedPlace[];
      }
      return [];
    },
    staleTime: 30000,
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
      void queryClient.invalidateQueries({ queryKey: ['claimed_places', userId] });
    },
  });

  const { mutate } = saveMutation;

  const claimPlace = useCallback(
    (placeId: string, claimUserId: string, businessName: string) => {
      const existing = claims.find((c) => c.placeId === placeId);
      if (existing) {
        console.log('[BusinessContext] Place already claimed:', placeId);
        return null;
      }
      const newClaim: ClaimedPlace = {
        placeId,
        userId: claimUserId,
        businessName,
        isVerified: false,
        claimedAt: new Date().toISOString(),
      };
      console.log('[BusinessContext] Claiming place:', placeId, 'by', claimUserId);
      const updated = [...claims, newClaim];
      setClaims(updated);
      mutate(updated);

      if (userId) {
        void upsertClaimedPlaceRemote(userId, {
          place_id: newClaim.placeId,
          business_name: newClaim.businessName,
          is_verified: newClaim.isVerified,
          claimed_at: newClaim.claimedAt,
        });
      }

      return newClaim;
    },
    [claims, mutate, userId]
  );

  const verifyPlace = useCallback(
    (placeId: string) => {
      const updated = claims.map((c) =>
        c.placeId === placeId ? { ...c, isVerified: true } : c
      );
      setClaims(updated);
      mutate(updated);

      if (userId) {
        void upsertClaimedPlaceRemote(userId, {
          place_id: placeId,
          is_verified: true,
        });
      }
    },
    [claims, mutate, userId]
  );

  const unclaimPlace = useCallback(
    (placeId: string) => {
      const updated = claims.filter((c) => c.placeId !== placeId);
      setClaims(updated);
      mutate(updated);

      if (userId) {
        void deleteClaimedPlaceRemote(userId, placeId);
      }
    },
    [claims, mutate, userId]
  );

  const getClaimForPlace = useCallback(
    (placeId: string) => claims.find((c) => c.placeId === placeId) ?? null,
    [claims]
  );

  const getClaimsForUser = useCallback(
    (targetUserId: string) => claims.filter((c) => c.userId === targetUserId),
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
