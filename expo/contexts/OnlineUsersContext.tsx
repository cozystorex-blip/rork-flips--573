import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { AppState, AppStateStatus } from 'react-native';

export interface OnlineUser {
  user_id: string;
  display_name: string;
  avatar_url: string;
  joined_at: string;
}

export const [OnlineUsersProvider, useOnlineUsers] = createContextHook(() => {
  const { userId, isAuthenticated } = useAuth();
  const { profile } = useProfile();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !isAuthenticated || !userId) {
      setOnlineUsers([]);
      setIsConnected(false);
      return;
    }

    const channelName = 'online-presence';
    console.log('[OnlineUsers] Joining presence channel:', channelName);

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('[OnlineUsers] Presence sync, state keys:', Object.keys(state).length);
        
        const users: OnlineUser[] = [];
        for (const key of Object.keys(state)) {
          const presences = state[key] as Array<Record<string, unknown>>;
          if (presences && presences.length > 0) {
            const p = presences[0];
            if (key !== userId) {
              users.push({
                user_id: key,
                display_name: (p.display_name as string) || 'User',
                avatar_url: (p.avatar_url as string) || '',
                joined_at: (p.joined_at as string) || new Date().toISOString(),
              });
            }
          }
        }
        
        console.log('[OnlineUsers] Online users (excluding self):', users.length);
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: { key: string; newPresences: unknown[] }) => {
        console.log('[OnlineUsers] User joined:', key, newPresences?.length);
      })
      .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
        console.log('[OnlineUsers] User left:', key);
      })
      .subscribe(async (status: string) => {
        console.log('[OnlineUsers] Channel status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          await channel.track({
            display_name: profile?.display_name || 'User',
            avatar_url: profile?.avatar_url || '',
            joined_at: new Date().toISOString(),
          });
          console.log('[OnlineUsers] Tracking presence for:', userId);
        }
      });

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        console.log('[OnlineUsers] App foregrounded, re-tracking');
        void channel.track({
          display_name: profile?.display_name || 'User',
          avatar_url: profile?.avatar_url || '',
          joined_at: new Date().toISOString(),
        });
      }
    };

    const appStateSub = AppState.addEventListener('change', handleAppState);

    return () => {
      console.log('[OnlineUsers] Cleaning up presence channel');
      appStateSub.remove();
      void supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [userId, isAuthenticated, profile?.display_name, profile?.avatar_url]);

  useEffect(() => {
    if (!isSupabaseConfigured || !isAuthenticated || !userId || !isConnected) return;
    
    const channelName = 'online-presence';
    const channels = supabase.getChannels();
    const existing = channels.find((c: { topic: string }) => c.topic === `realtime:${channelName}`);
    if (existing) {
      console.log('[OnlineUsers] Updating tracked profile info');
      void existing.track({
        display_name: profile?.display_name || 'User',
        avatar_url: profile?.avatar_url || '',
        joined_at: new Date().toISOString(),
      });
    }
  }, [profile?.display_name, profile?.avatar_url, isConnected, userId, isAuthenticated]);

  const onlineCount = useMemo(() => onlineUsers.length, [onlineUsers]);

  return useMemo(() => ({
    onlineUsers,
    onlineCount,
    isConnected,
  }), [onlineUsers, onlineCount, isConnected]);
});
