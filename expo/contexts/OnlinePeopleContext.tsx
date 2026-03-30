import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface OnlineUser {
  id: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  style_tag: string;
  created_at: string;
  updated_at: string | null;
  is_online: boolean;
  last_seen: string | null;
}

export interface Connection {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'connected';
  created_at: string;
}

const CONNECTIONS_STORAGE_KEY = 'local_connections';

async function loadLocalConnections(): Promise<Connection[]> {
  try {
    const raw = await AsyncStorage.getItem(CONNECTIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveLocalConnections(connections: Connection[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CONNECTIONS_STORAGE_KEY, JSON.stringify(connections));
  } catch (e) {
    console.log('[OnlinePeople] Failed to save connections locally:', e);
  }
}

async function updatePresence(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !userId) return false;
  try {
    await supabase
      .from('profiles')
      .update({ is_online: true, last_seen: new Date().toISOString() })
      .eq('id', userId);
    console.log('[OnlinePeople] Presence updated for:', userId);
    return true;
  } catch (e) {
    console.log('[OnlinePeople] Presence update error:', e);
    return false;
  }
}

async function setOffline(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;
  try {
    await supabase
      .from('profiles')
      .update({ is_online: false, last_seen: new Date().toISOString() })
      .eq('id', userId);
  } catch (e) {
    console.log('[OnlinePeople] Set offline error:', e);
  }
}

export const [OnlinePeopleProvider, useOnlinePeople] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { userId, isAuthenticated } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);

  useEffect(() => {
    if (!userId || !isAuthenticated) return;

    void updatePresence(userId);

    const interval = setInterval(() => {
      void updatePresence(userId);
    }, 30000);

    return () => {
      clearInterval(interval);
      void setOffline(userId);
    };
  }, [userId, isAuthenticated]);

  const peopleQuery = useQuery({
    queryKey: ['online_people', userId],
    queryFn: async (): Promise<OnlineUser[]> => {
      if (!isSupabaseConfigured) {
        console.log('[OnlinePeople] Supabase not configured');
        return [];
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', userId ?? '')
          .not('display_name', 'eq', '')
          .not('display_name', 'eq', 'User')
          .order('last_seen', { ascending: false, nullsFirst: false })
          .limit(50);

        if (error) {
          console.log('[OnlinePeople] Fetch error:', error.message);
          return [];
        }

        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const users: OnlineUser[] = (data ?? []).map((u: Record<string, unknown>) => ({
          id: u.id as string,
          display_name: (u.display_name as string) || 'User',
          bio: (u.bio as string) || '',
          avatar_url: (u.avatar_url as string) || '',
          style_tag: (u.style_tag as string) || 'budget',
          created_at: (u.created_at as string) || '',
          updated_at: (u.updated_at as string) || null,
          is_online: u.is_online === true || ((u.last_seen as string) > fiveMinAgo),
          last_seen: (u.last_seen as string) || null,
        }));

        console.log('[OnlinePeople] Fetched', users.length, 'people,', users.filter(u => u.is_online).length, 'online');
        return users;
      } catch (e) {
        console.log('[OnlinePeople] Fetch threw:', e);
        return [];
      }
    },
    enabled: !!userId && isAuthenticated,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const connectionsQuery = useQuery({
    queryKey: ['connections', userId],
    queryFn: async (): Promise<Connection[]> => {
      if (!isSupabaseConfigured || !userId) {
        return loadLocalConnections();
      }

      try {
        const { data, error } = await supabase
          .from('connections')
          .select('*')
          .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

        if (error) {
          console.log('[OnlinePeople] Connections fetch error:', error.message);
          return loadLocalConnections();
        }

        const conns = (data ?? []) as Connection[];
        void saveLocalConnections(conns);
        return conns;
      } catch (e) {
        console.log('[OnlinePeople] Connections fetch threw:', e);
        return loadLocalConnections();
      }
    },
    enabled: !!userId && isAuthenticated,
    staleTime: 15000,
  });

  useEffect(() => {
    if (connectionsQuery.data) {
      setConnections(connectionsQuery.data);
    }
  }, [connectionsQuery.data]);

  const { mutateAsync: connectMutate } = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!userId) throw new Error('Not signed in');

      const newConn: Connection = {
        id: `${userId}_${targetUserId}`,
        from_user_id: userId,
        to_user_id: targetUserId,
        status: 'connected',
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('connections')
            .upsert({
              from_user_id: userId,
              to_user_id: targetUserId,
              status: 'connected',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'from_user_id,to_user_id' });

          if (error) {
            console.log('[OnlinePeople] Connect error:', error.message);
          } else {
            console.log('[OnlinePeople] Connected to:', targetUserId);
          }
        } catch (e) {
          console.log('[OnlinePeople] Connect threw:', e);
        }
      }

      const updated = [...connections.filter(c =>
        !(c.from_user_id === userId && c.to_user_id === targetUserId)
      ), newConn];
      void saveLocalConnections(updated);
      return updated;
    },
    onSuccess: (data) => {
      setConnections(data);
      void queryClient.invalidateQueries({ queryKey: ['connections', userId] });
    },
  });

  const { mutateAsync: disconnectMutate } = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!userId) throw new Error('Not signed in');

      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('connections')
            .delete()
            .eq('from_user_id', userId)
            .eq('to_user_id', targetUserId);
          console.log('[OnlinePeople] Disconnected from:', targetUserId);
        } catch (e) {
          console.log('[OnlinePeople] Disconnect threw:', e);
        }
      }

      const updated = connections.filter(c =>
        !(c.from_user_id === userId && c.to_user_id === targetUserId)
      );
      void saveLocalConnections(updated);
      return updated;
    },
    onSuccess: (data) => {
      setConnections(data);
      void queryClient.invalidateQueries({ queryKey: ['connections', userId] });
    },
  });

  const connectToUser = useCallback(async (targetUserId: string) => {
    await connectMutate(targetUserId);
  }, [connectMutate]);

  const disconnectFromUser = useCallback(async (targetUserId: string) => {
    await disconnectMutate(targetUserId);
  }, [disconnectMutate]);

  const isConnected = useCallback((targetUserId: string): boolean => {
    return connections.some(c =>
      (c.from_user_id === userId && c.to_user_id === targetUserId) ||
      (c.to_user_id === userId && c.from_user_id === targetUserId)
    );
  }, [connections, userId]);

  const getConnectionCount = useCallback((): number => {
    return connections.filter(c =>
      c.from_user_id === userId || c.to_user_id === userId
    ).length;
  }, [connections, userId]);

  const [isUserOnline, setIsUserOnline] = useState(false);

  useEffect(() => {
    if (userId && isAuthenticated) {
      setIsUserOnline(true);
    } else {
      setIsUserOnline(false);
    }
  }, [userId, isAuthenticated]);

  const goOnline = useCallback(async () => {
    if (!userId) return false;
    console.log('[OnlinePeople] Going online NOW for:', userId);
    const success = await updatePresence(userId);
    if (success) {
      setIsUserOnline(true);
      void queryClient.invalidateQueries({ queryKey: ['online_people', userId] });
    }
    return success;
  }, [userId, queryClient]);

  const allPeople = useMemo(() => peopleQuery.data ?? [], [peopleQuery.data]);
  const onlinePeople = useMemo(() => allPeople.filter(p => p.is_online), [allPeople]);

  return useMemo(() => ({
    people: allPeople,
    onlinePeople,
    connections,
    connectToUser,
    disconnectFromUser,
    isConnected,
    getConnectionCount,
    isLoading: peopleQuery.isLoading,
    refetch: peopleQuery.refetch,
    goOnline,
    isUserOnline,
  }), [allPeople, onlinePeople, connections, connectToUser, disconnectFromUser, isConnected, getConnectionCount, peopleQuery.isLoading, peopleQuery.refetch, goOnline, isUserOnline]);
});
