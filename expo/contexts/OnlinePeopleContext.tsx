import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type UserActivity = 'scanning' | 'browsing' | 'saving' | 'idle';

export interface OnlineUser {
  id: string;
  name: string;
  avatar_url: string;
  joinedAt: number;
  status: 'active' | 'idle';
  activity: UserActivity;
  scanCount: number;
  lastActive: number;
}

const CHANNEL_NAME = 'flips-online-presence';

export const [OnlinePeopleProvider, useOnlinePeople] = createContextHook(() => {
  const { userId } = useAuth();
  const { profile } = useProfile();
  const [isUserOnline, setIsUserOnline] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (channelRef.current) {
      console.log('[OnlinePeople] Removing channel');
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const buildPresencePayload = useCallback(() => {
    const displayName = profile?.display_name && profile.display_name !== 'User' && profile.display_name.trim()
      ? profile.display_name
      : 'Flip User';
    return {
      user_id: userId ?? 'anon',
      name: displayName,
      avatar_url: profile?.avatar_url ?? '',
      joined_at: Date.now(),
      activity: 'browsing' as UserActivity,
      scan_count: 0,
    };
  }, [userId, profile]);

  const syncPresenceState = useCallback((channel: RealtimeChannel) => {
    const state = channel.presenceState();
    console.log('[OnlinePeople] Syncing presence state, keys:', Object.keys(state).length);
    const now = Date.now();
    const users: OnlineUser[] = [];

    const seenIds = new Set<string>();
    for (const key of Object.keys(state)) {
      const presences = state[key] as Array<Record<string, unknown>>;
      for (const p of presences) {
        const pUserId = (p.user_id as string) ?? key;
        if (pUserId === userId) continue;

        let uniqueId = pUserId || `presence_${key}`;
        if (seenIds.has(uniqueId)) {
          uniqueId = `${uniqueId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        }
        seenIds.add(uniqueId);

        users.push({
          id: uniqueId,
          name: (p.name as string) ?? 'User',
          avatar_url: (p.avatar_url as string) ?? '',
          joinedAt: (p.joined_at as number) ?? now,
          status: 'active',
          activity: (p.activity as UserActivity) ?? 'browsing',
          scanCount: (p.scan_count as number) ?? 0,
          lastActive: now,
        });
      }
    }

    setOnlineUsers(users);
    setLastSyncedAt(now);
    console.log('[OnlinePeople] Users online (excluding self):', users.length);
  }, [userId]);

  const goOnline = useCallback(async (): Promise<boolean> => {
    if (isUserOnline) {
      console.log('[OnlinePeople] Already online');
      return true;
    }

    if (!isSupabaseConfigured) {
      console.log('[OnlinePeople] Supabase not configured, going online in local-only mode');
      setIsUserOnline(true);
      setLastSyncedAt(Date.now());
      setOnlineUsers([]);
      return true;
    }

    console.log('[OnlinePeople] Going online with Supabase Presence');

    try {
      cleanup();

      const channel = supabase.channel(CHANNEL_NAME, {
        config: { presence: { key: userId ?? 'anon' } },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          console.log('[OnlinePeople] Presence sync event');
          syncPresenceState(channel);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('[OnlinePeople] User joined:', key, newPresences);
          syncPresenceState(channel);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('[OnlinePeople] User left:', key, leftPresences);
          syncPresenceState(channel);
        });

      const subResult = channel.subscribe(async (status) => {
        console.log('[OnlinePeople] Channel status:', status);
        if (status === 'SUBSCRIBED') {
          const payload = buildPresencePayload();
          console.log('[OnlinePeople] Tracking presence with payload:', payload.name);
          await channel.track(payload);
        }
      });

      console.log('[OnlinePeople] Subscribe result:', subResult);
      channelRef.current = channel;

      heartbeatRef.current = setInterval(() => {
        if (channelRef.current) {
          syncPresenceState(channelRef.current);
        }
      }, 15000);

      setIsUserOnline(true);
      setLastSyncedAt(Date.now());
      return true;
    } catch (e) {
      console.log('[OnlinePeople] Error going online:', e);
      cleanup();
      return false;
    }
  }, [isUserOnline, userId, cleanup, syncPresenceState, buildPresencePayload]);

  const goOffline = useCallback(() => {
    console.log('[OnlinePeople] Going offline');
    setIsUserOnline(false);
    setOnlineUsers([]);
    setLastSyncedAt(null);
    cleanup();
  }, [cleanup]);

  const updateActivity = useCallback((activity: UserActivity) => {
    if (!channelRef.current || !isUserOnline) return;
    const payload = buildPresencePayload();
    payload.activity = activity;
    channelRef.current.track(payload).catch((e: unknown) => {
      console.log('[OnlinePeople] Failed to update activity:', e);
    });
  }, [isUserOnline, buildPresencePayload]);

  const activeCount = useMemo(() => {
    return onlineUsers.filter(u => u.status === 'active').length;
  }, [onlineUsers]);

  return useMemo(() => ({
    goOnline,
    goOffline,
    isUserOnline,
    onlineUsers,
    activeCount,
    lastSyncedAt,
    updateActivity,
  }), [goOnline, goOffline, isUserOnline, onlineUsers, activeCount, lastSyncedAt, updateActivity]);
});
