import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';

export interface ConnectionUser {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string;
  bio: string;
}

interface ConnectionsData {
  following: ConnectionUser[];
  followers: ConnectionUser[];
}

const CONNECTIONS_KEY = 'user_connections_v2';

async function loadConnections(userId: string): Promise<ConnectionsData> {
  try {
    const raw = await AsyncStorage.getItem(`${CONNECTIONS_KEY}_${userId}`);
    if (!raw) return { following: [], followers: [] };
    const parsed = JSON.parse(raw);
    return {
      following: Array.isArray(parsed.following) ? parsed.following : [],
      followers: Array.isArray(parsed.followers) ? parsed.followers : [],
    };
  } catch {
    return { following: [], followers: [] };
  }
}

async function saveConnections(userId: string, data: ConnectionsData): Promise<void> {
  try {
    await AsyncStorage.setItem(`${CONNECTIONS_KEY}_${userId}`, JSON.stringify(data));
    console.log('[Connections] Saved connections for:', userId);
  } catch (e) {
    console.log('[Connections] Failed to save:', e);
  }
}

export const [ConnectionsProvider, useConnections] = createContextHook(() => {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [data, setData] = useState<ConnectionsData>({ following: [], followers: [] });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) {
      setData({ following: [], followers: [] });
      setLoaded(false);
      return;
    }
    const load = async () => {
      const stored = await loadConnections(userId);
      setData(stored);
      setLoaded(true);
      console.log('[Connections] Loaded:', stored.following.length, 'following,', stored.followers.length, 'followers');
    };
    void load();
  }, [userId]);

  const followMutation = useMutation({
    mutationFn: async (targetUser: ConnectionUser) => {
      if (!userId) throw new Error('Not signed in');
      const updated = { ...data };
      const alreadyFollowing = updated.following.some(u => u.user_id === targetUser.user_id);
      if (alreadyFollowing) return updated;
      updated.following = [...updated.following, targetUser];
      await saveConnections(userId, updated);
      return updated;
    },
    onSuccess: (updated) => {
      setData(updated);
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!userId) throw new Error('Not signed in');
      const updated = {
        ...data,
        following: data.following.filter(u => u.user_id !== targetUserId),
      };
      await saveConnections(userId, updated);
      return updated;
    },
    onSuccess: (updated) => {
      setData(updated);
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });

  const followUser = useCallback((user: ConnectionUser) => {
    followMutation.mutate(user);
  }, [followMutation]);

  const unfollowUser = useCallback((targetUserId: string) => {
    unfollowMutation.mutate(targetUserId);
  }, [unfollowMutation]);

  const isFollowing = useCallback((targetUserId: string): boolean => {
    return data.following.some(u => u.user_id === targetUserId);
  }, [data.following]);

  const isFollower = useCallback((targetUserId: string): boolean => {
    return data.followers.some(u => u.user_id === targetUserId);
  }, [data.followers]);

  const isConnection = useCallback((targetUserId: string): boolean => {
    return isFollowing(targetUserId) && isFollower(targetUserId);
  }, [isFollowing, isFollower]);

  const connections = useMemo(() => {
    const followerIds = new Set(data.followers.map(u => u.user_id));
    return data.following.filter(u => followerIds.has(u.user_id));
  }, [data.following, data.followers]);

  const addFollower = useCallback(async (follower: ConnectionUser) => {
    if (!userId) return;
    const alreadyFollower = data.followers.some(u => u.user_id === follower.user_id);
    if (alreadyFollower) return;
    const updated = {
      ...data,
      followers: [...data.followers, follower],
    };
    setData(updated);
    await saveConnections(userId, updated);
    console.log('[Connections] Added follower:', follower.display_name);
  }, [userId, data]);

  return useMemo(() => ({
    following: data.following,
    followers: data.followers,
    connections,
    followingCount: data.following.length,
    followersCount: data.followers.length,
    connectionsCount: connections.length,
    followUser,
    unfollowUser,
    addFollower,
    isFollowing,
    isFollower,
    isConnection,
    isLoaded: loaded,
  }), [data, connections, followUser, unfollowUser, addFollower, isFollowing, isFollower, isConnection, loaded]);
});
