import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProfile, upsertProfile } from '@/services/supabaseData';
import { CategoryType } from '@/types';

export interface MyProfile {
  id: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  style_tag: CategoryType;
  created_at: string;
  updated_at: string | null;
  phone: string;
  services: string[];
  email: string;
  vehicleType: string;
  serviceRadius: number;
  city: string;
}

const PROFILE_STORAGE_KEY = 'local_profile';

function makeDefaultProfile(userId: string): MyProfile {
  return {
    id: userId,
    display_name: '',
    bio: '',
    avatar_url: '',
    style_tag: 'budget',
    created_at: new Date().toISOString(),
    updated_at: null,
    phone: '',
    services: [],
    email: '',
    vehicleType: '',
    serviceRadius: 0,
    city: '',
  };
}

function normalizeProfile(raw: Record<string, unknown>, userId: string): MyProfile {
  return {
    id: (raw.id as string) ?? userId,
    display_name: (raw.display_name as string) ?? '',
    bio: (raw.bio as string) ?? '',
    avatar_url: (raw.avatar_url as string) ?? '',
    style_tag: (raw.style_tag as CategoryType) ?? 'budget',
    created_at: (raw.created_at as string) ?? new Date().toISOString(),
    updated_at: (raw.updated_at as string) ?? null,
    phone: (raw.phone as string) ?? '',
    services: Array.isArray(raw.services) ? raw.services as string[] : [],
    email: (raw.email as string) ?? '',
    vehicleType: ((raw.vehicleType ?? raw.vehicle_type) as string) ?? '',
    serviceRadius: ((raw.serviceRadius ?? raw.service_radius) as number) ?? 0,
    city: (raw.city as string) ?? '',
  };
}

export const [ProfileProvider, useProfile] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { userId, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<MyProfile | null>(null);

  const profileQuery = useQuery({
    queryKey: ['my_profile', userId],
    queryFn: async (): Promise<MyProfile> => {
      const safeUserId = userId ?? 'anonymous';
      console.log('[ProfileContext] Loading profile for:', safeUserId);

      try {
        const remote = await fetchProfile(safeUserId);
        if (remote && typeof remote === 'object') {
          const normalized = normalizeProfile(remote as Record<string, unknown>, safeUserId);
          if (normalized.display_name || normalized.bio || normalized.avatar_url) {
            console.log('[ProfileContext] Loaded profile:', normalized.display_name);
            return normalized;
          }
        }
      } catch (e) {
        console.log('[ProfileContext] Remote profile load failed:', e);
      }

      try {
        const localRaw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
        if (localRaw) {
          const local = JSON.parse(localRaw);
          if (local && local.id === safeUserId) {
            console.log('[ProfileContext] Loaded local profile:', local.display_name);
            return normalizeProfile(local, safeUserId);
          }
        }
      } catch (e) {
        console.log('[ProfileContext] Local profile load failed:', e);
      }

      console.log('[ProfileContext] No profile found, returning default for:', safeUserId);
      const defaultProfile = makeDefaultProfile(safeUserId);
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(defaultProfile));
      return defaultProfile;
    },
    enabled: !!userId && isAuthenticated,
    retry: 1,
    staleTime: 30000,
    gcTime: 300000,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
    } else if (profileQuery.isError && userId) {
      console.log('[ProfileContext] Query errored, setting default profile');
      setProfile(makeDefaultProfile(userId));
    }
  }, [profileQuery.data, profileQuery.isError, userId]);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
    }
  }, [userId]);

  const { mutateAsync: mutateProfile } = useMutation({
    mutationFn: async (p: Partial<Omit<MyProfile, 'id' | 'created_at'>>) => {
      if (!userId) throw new Error('Please sign in to save your profile.');

      const now = new Date().toISOString();
      const current = profile ?? makeDefaultProfile(userId);

      const savedProfile: MyProfile = {
        id: userId,
        display_name: p.display_name !== undefined ? (p.display_name.trim() || 'User') : current.display_name,
        bio: p.bio !== undefined ? p.bio.trim() : current.bio,
        avatar_url: p.avatar_url !== undefined ? p.avatar_url.trim() : current.avatar_url,
        style_tag: p.style_tag ?? current.style_tag,
        created_at: current.created_at,
        updated_at: now,
        phone: p.phone !== undefined ? p.phone.trim() : current.phone,
        services: p.services !== undefined ? p.services : current.services,
        email: p.email !== undefined ? p.email.trim() : current.email,
        vehicleType: p.vehicleType !== undefined ? p.vehicleType.trim() : current.vehicleType,
        serviceRadius: p.serviceRadius !== undefined ? p.serviceRadius : current.serviceRadius,
        city: p.city !== undefined ? p.city.trim() : current.city,
      };

      console.log('[ProfileContext] Saving profile for user:', userId);
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(savedProfile));

      void upsertProfile(userId, {
        ...savedProfile,
        vehicle_type: savedProfile.vehicleType,
        service_radius: savedProfile.serviceRadius,
      });

      return savedProfile;
    },
    onSuccess: (data) => {
      setProfile(data);
      void queryClient.invalidateQueries({ queryKey: ['my_profile', userId] });
    },
  });

  const saveProfile = useCallback(
    async (updates: Partial<Omit<MyProfile, 'id' | 'created_at'>>) => {
      await mutateProfile(updates);
    },
    [mutateProfile]
  );

  const hasProfile = profile !== null && (profile.display_name ?? '').trim().length > 0 && profile.display_name !== 'User' && profile.display_name !== '';
  const isProfileLoading = profileQuery.isLoading && !!userId && !profileQuery.isError;

  return useMemo(() => ({
    profile,
    hasProfile,
    saveProfile,
    isLoading: isProfileLoading,
    isError: profileQuery.isError,
    refetch: profileQuery.refetch,
    userId,
  }), [profile, hasProfile, saveProfile, isProfileLoading, profileQuery.isError, profileQuery.refetch, userId]);
});
