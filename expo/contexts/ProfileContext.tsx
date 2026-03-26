import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
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
}

const PROFILE_STORAGE_KEY = 'local_profile';

const STYLE_TAG_TO_STYLE: Record<string, string> = {
  budget: 'budget',
  healthy: 'healthy',
  bulk: 'bulk',
  deals: 'deals',
};

function makeDefaultProfile(userId: string): MyProfile {
  return {
    id: userId,
    display_name: '',
    bio: '',
    avatar_url: '',
    style_tag: 'budget',
    created_at: new Date().toISOString(),
    updated_at: null,
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

async function ensureProfileRow(userId: string): Promise<MyProfile | null> {
  if (!isSupabaseConfigured) return null;

  try {
    console.log('[ProfileContext] Attempting to auto-create profile row for:', userId);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          display_name: 'User',
          bio: '',
          avatar_url: '',
          style_tag: 'budget',
          updated_at: now,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )
      .select()
      .maybeSingle();

    if (error) {
      console.log('[ProfileContext] Auto-create profile error:', error.message, error.code);
      return null;
    }

    if (data) {
      console.log('[ProfileContext] Profile row ensured:', data.display_name);
      return data as MyProfile;
    }

    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (existing) return existing as MyProfile;

    return null;
  } catch (e) {
    console.log('[ProfileContext] ensureProfileRow threw:', e instanceof Error ? e.message : e);
    return null;
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
      console.log('[ProfileContext] Fetching profile for:', safeUserId, 'supabase configured:', isSupabaseConfigured);

      if (isSupabaseConfigured && userId) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          if (error) {
            console.log('[ProfileContext] Supabase fetch error:', error.message, error.code, error.details);
          } else if (data) {
            console.log('[ProfileContext] Profile loaded from Supabase:', data.display_name);
            const p = data as MyProfile;
            void saveLocalProfile(p);
            return p;
          } else {
            console.log('[ProfileContext] No profile row found, attempting auto-create for:', userId);
            const created = await ensureProfileRow(userId);
            if (created) {
              void saveLocalProfile(created);
              return created;
            }
          }
        } catch (e) {
          console.log('[ProfileContext] Supabase fetch threw:', e instanceof Error ? e.message : e);
        }
      }

      try {
        const local = await loadLocalProfile();
        if (local && local.id === safeUserId) {
          console.log('[ProfileContext] Using local fallback profile');
          return local;
        }
      } catch (e) {
        console.log('[ProfileContext] Local profile load failed:', e);
      }

      console.log('[ProfileContext] No profile found, returning default for:', safeUserId);
      return makeDefaultProfile(safeUserId);
    },
    enabled: !!userId && isAuthenticated,
    retry: 1,
    retryDelay: 2000,
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

  useEffect(() => {
    if (!isSupabaseConfigured || !userId || !profile) return;
    if (!(profile.display_name ?? '').trim() || profile.display_name === 'User') return;
    const ensureDiscoverable = async () => {
      try {
        const { data: existing } = await supabase
          .from('profiles_peoples')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle();
        if (!existing) {
          console.log('[ProfileContext] Auto-creating profiles_peoples entry for:', userId);
          const styleVal = STYLE_TAG_TO_STYLE[profile.style_tag] ?? profile.style_tag;
          await supabase
            .from('profiles_peoples')
            .upsert({
              user_id: userId,
              display_name: profile.display_name,
              bio: profile.bio ?? '',
              avatar_url: profile.avatar_url ?? '',
              style: styleVal,
              weekly_spend: 0,
              logs_count: 0,
            }, { onConflict: 'user_id' });
          console.log('[ProfileContext] profiles_peoples auto-created');
          void queryClient.invalidateQueries({ queryKey: ['discover_profiles'] });
        }
      } catch (e) {
        console.log('[ProfileContext] Auto-create profiles_peoples failed (non-fatal):', e);
      }
    };
    void ensureDiscoverable();
  }, [userId, profile, queryClient]);

  const { mutateAsync: mutateProfile } = useMutation({
    mutationFn: async (p: Partial<Omit<MyProfile, 'id' | 'created_at'>>) => {
      if (!userId) throw new Error('Please sign in to save your profile.');

      const now = new Date().toISOString();
      const displayName = (p.display_name ?? '').trim() || 'User';
      const bio = (p.bio ?? '').trim();
      const avatarUrl = (p.avatar_url ?? '').trim();
      const styleTag = p.style_tag ?? 'budget';

      console.log('[ProfileContext] Saving profile for user:', userId);

      const payload = {
        id: userId,
        display_name: displayName,
        bio,
        avatar_url: avatarUrl,
        style_tag: styleTag,
        updated_at: now,
      };

      let savedProfile: MyProfile | null = null;
      let supabaseSaved = false;

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .upsert(payload, { onConflict: 'id' })
            .select()
            .single();

          if (error) {
            console.log('[ProfileContext] Supabase save error:', JSON.stringify({
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint,
            }));
          } else {
            console.log('[ProfileContext] Profile saved to Supabase successfully');
            savedProfile = data as MyProfile;
            supabaseSaved = true;
          }
        } catch (e) {
          console.log('[ProfileContext] Supabase save threw:', e instanceof Error ? e.message : e);
        }
      }

      if (!savedProfile) {
        savedProfile = {
          id: userId,
          display_name: displayName,
          bio,
          avatar_url: avatarUrl,
          style_tag: styleTag,
          created_at: profile?.created_at ?? now,
          updated_at: now,
        };
        console.log('[ProfileContext] Using local profile as fallback');
      }

      await saveLocalProfile(savedProfile);

      if (supabaseSaved && isSupabaseConfigured) {
        const styleVal = STYLE_TAG_TO_STYLE[styleTag] ?? styleTag;
        try {
          const { error: ppError } = await supabase
            .from('profiles_peoples')
            .upsert({
              user_id: userId,
              display_name: displayName,
              bio,
              avatar_url: avatarUrl,
              style: styleVal,
              weekly_spend: 0,
              logs_count: 0,
            }, { onConflict: 'user_id' })
            .select();

          if (ppError) {
            console.log('[ProfileContext] profiles_peoples sync error:', ppError.message);
          } else {
            console.log('[ProfileContext] profiles_peoples synced');
            void queryClient.invalidateQueries({ queryKey: ['discover_profiles'] });
          }
        } catch (syncErr) {
          console.log('[ProfileContext] profiles_peoples sync failed (non-fatal):', syncErr);
        }
      }

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
