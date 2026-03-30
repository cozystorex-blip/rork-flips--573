import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { AppState, AppStateStatus } from 'react-native';

export interface OnlineUser {
  user_id: string;
  display_name: string;
  avatar_url: string;
  joined_at: string;
}

const COMMUNITY_USERS_KEY = 'community_users';
const LAST_ACTIVE_KEY = 'last_active_timestamp';

async function loadCommunityUsers(): Promise<OnlineUser[]> {
  try {
    const raw = await AsyncStorage.getItem(COMMUNITY_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

async function saveCommunityUsers(users: OnlineUser[]): Promise<void> {
  try {
    await AsyncStorage.setItem(COMMUNITY_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.log('[OnlineUsers] Failed to save community users:', e);
  }
}

export const [OnlineUsersProvider, useOnlineUsers] = createContextHook(() => {
  const { userId, isAuthenticated } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  const communityQuery = useQuery({
    queryKey: ['community_users', userId],
    queryFn: async (): Promise<OnlineUser[]> => {
      console.log('[OnlineUsers] Loading community profiles');
      const stored = await loadCommunityUsers();
      console.log('[OnlineUsers] Loaded community users:', stored.length);
      return stored;
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 10000,
  });

  useEffect(() => {
    if (!isAuthenticated || !userId || !profile) return;

    const displayName = profile.display_name && profile.display_name !== 'User'
      ? profile.display_name
      : '';

    if (!displayName) return;

    const registerSelf = async () => {
      console.log('[OnlineUsers] Registering self in community:', userId);
      const existing = await loadCommunityUsers();

      const now = new Date().toISOString();
      const selfEntry: OnlineUser = {
        user_id: userId,
        display_name: profile.display_name || 'User',
        avatar_url: profile.avatar_url || '',
        joined_at: now,
      };

      const filtered = existing.filter(u => u.user_id !== userId);
      const updated = [selfEntry, ...filtered];

      await saveCommunityUsers(updated);
      await AsyncStorage.setItem(LAST_ACTIVE_KEY, now);
      console.log('[OnlineUsers] Self registered, total community:', updated.length);

      void queryClient.invalidateQueries({ queryKey: ['community_users', userId] });
    };

    void registerSelf();
  }, [userId, isAuthenticated, profile, queryClient]);

  useEffect(() => {
    if (!userId || !isAuthenticated) return;

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active' && profile) {
        console.log('[OnlineUsers] App foregrounded, refreshing');
        void queryClient.invalidateQueries({ queryKey: ['community_users', userId] });
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [userId, isAuthenticated, profile, queryClient]);

  useEffect(() => {
    if (communityQuery.data && userId) {
      const others = communityQuery.data.filter(u => u.user_id !== userId);
      console.log('[OnlineUsers] Community members (excluding self):', others.length);
      setOnlineUsers(others);
    } else {
      setOnlineUsers([]);
    }
  }, [communityQuery.data, userId]);

  const onlineCount = useMemo(() => onlineUsers.length, [onlineUsers]);

  const removeUser = useCallback(async (targetUserId: string) => {
    const existing = await loadCommunityUsers();
    const updated = existing.filter(u => u.user_id !== targetUserId);
    await saveCommunityUsers(updated);
    void queryClient.invalidateQueries({ queryKey: ['community_users', userId] });
  }, [queryClient, userId]);

  return useMemo(() => ({
    onlineUsers,
    onlineCount,
    isConnected: isAuthenticated && !!userId,
    removeUser,
  }), [onlineUsers, onlineCount, isAuthenticated, userId, removeUser]);
});
