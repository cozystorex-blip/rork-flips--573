import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
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

async function loadLocalProfile(): Promise<MyProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveLocalProfile(profile: MyProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    console.log('[ProfileContext] Profile saved to local storage');
  } catch (e) {
    console.log('[ProfileContext] Failed to save locally:', e);
  }
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
        const local = await loadLocalProfile();
        if (local && local.id === safeUserId) {
          console.log('[ProfileContext] Loaded local profile:', local.display_name);
          return local;
        }
      } catch (e) {
        console.log('[ProfileContext] Local profile load failed:', e);
      }

      console.log('[ProfileContext] No profile found, returning default for:', safeUserId);
      const defaultProfile = makeDefaultProfile(safeUserId);
      await saveLocalProfile(defaultProfile);
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

      console.log('[ProfileContext] Saving profile locally for user:', userId);
      await saveLocalProfile(savedProfile);
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
