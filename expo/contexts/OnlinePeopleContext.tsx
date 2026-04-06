import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { AppState, AppStateStatus, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import {
  upsertPresence,
  fetchOnlineUsers,
  sendHeartbeat,
  markOffline,
  PresenceRecord,
  ToggleOnlineInput,
} from '@/services/presenceService';
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
const ONLINE_STATE_KEY = 'flips_online_state';
const ANON_ID_KEY = 'flips_anon_online_id';
const HEARTBEAT_INTERVAL = 12000;
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;
const ONLINE_USERS_POLL_INTERVAL = 5000;

interface PersistedOnlineState {
  wantsOnline: boolean;
  userId: string | null;
  timestamp: number;
}

async function loadPersistedState(): Promise<PersistedOnlineState | null> {
  try {
    const raw = await AsyncStorage.getItem(ONLINE_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedOnlineState;
    const age = Date.now() - parsed.timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      console.log('[OnlinePeople] Persisted state too old, clearing');
      await AsyncStorage.removeItem(ONLINE_STATE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function savePersistedState(state: PersistedOnlineState): Promise<void> {
  try {
    await AsyncStorage.setItem(ONLINE_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.log('[OnlinePeople] Failed to persist state:', e);
  }
}

async function clearPersistedState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONLINE_STATE_KEY);
  } catch {}
}

async function getOrCreateAnonId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(ANON_ID_KEY);
    if (existing) return existing;
    const id = 'anon_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    await AsyncStorage.setItem(ANON_ID_KEY, id);
    return id;
  } catch {
    return 'anon_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }
}

function presenceRecordToOnlineUser(record: PresenceRecord): OnlineUser {
  const lastSeenMs = new Date(record.last_seen).getTime();
  const isStale = Date.now() - lastSeenMs > 30000;
  return {
    id: record.user_id,
    name: record.full_name || 'Flip User',
    avatar_url: record.avatar_url || '',
    joinedAt: lastSeenMs,
    status: isStale ? 'idle' : 'active',
    activity: (record.activity as UserActivity) || 'browsing',
    scanCount: record.scan_count ?? 0,
    lastActive: lastSeenMs,
  };
}

export const [OnlinePeopleProvider, useOnlinePeople] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { userId, isAuthenticated } = useAuth();
  const { profile } = useProfile();
  const [isUserOnline, setIsUserOnline] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isGoingOnlineRef = useRef(false);
  const wantsOnlineRef = useRef(false);
  const mountedRef = useRef(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastUserIdRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    console.log('[OnlinePeople] Cleanup called');
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (channelRef.current) {
      try {
        void supabase.removeChannel(channelRef.current);
      } catch (e) {
        console.log('[OnlinePeople] Channel removal error:', e);
      }
      channelRef.current = null;
    }
    reconnectAttempts.current = 0;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  const buildPresencePayload = useCallback(() => {
    const displayName = profile?.display_name && profile.display_name !== 'User' && profile.display_name.trim()
      ? profile.display_name
      : 'Guest User';
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
    if (!mountedRef.current) return;
    try {
      const state = channel.presenceState();
      const now = Date.now();
      const deduped = new Map<string, OnlineUser>();

      for (const key of Object.keys(state)) {
        const presences = state[key] as Array<Record<string, unknown>>;
        for (const p of presences) {
          const pUserId = (p.user_id as string) ?? key;
          if (pUserId === userId) continue;

          const stableId = pUserId || `presence_${key}`;
          if (deduped.has(stableId)) {
            const existing = deduped.get(stableId)!;
            const pJoined = (p.joined_at as number) ?? 0;
            if (pJoined > existing.joinedAt) {
              deduped.set(stableId, {
                id: stableId,
                name: (p.name as string) ?? 'User',
                avatar_url: (p.avatar_url as string) ?? '',
                joinedAt: pJoined,
                status: 'active',
                activity: (p.activity as UserActivity) ?? 'browsing',
                scanCount: (p.scan_count as number) ?? 0,
                lastActive: now,
              });
            }
            continue;
          }

          deduped.set(stableId, {
            id: stableId,
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

      const users = Array.from(deduped.values());
      setOnlineUsers(users);
      setLastSyncedAt(now);
      console.log('[OnlinePeople] Realtime synced users (excluding self, deduped):', users.length);
    } catch (e) {
      console.log('[OnlinePeople] Sync error:', e);
    }
  }, [userId]);

  const toggleMutation = useMutation({
    mutationFn: async (input: ToggleOnlineInput): Promise<PresenceRecord> => {
      console.log('[OnlinePeople] toggleMutation called:', input.id, 'isOnline:', input.isOnline);
      return upsertPresence(input);
    },
    onSuccess: (data) => {
      if (!mountedRef.current) return;
      const nowOnline = data.is_online;
      console.log('[OnlinePeople] toggleMutation success, is_online:', nowOnline);
      setIsUserOnline(nowOnline);
      setConnectionState(nowOnline ? 'connected' : 'disconnected');
      if (nowOnline) {
        setLastSyncedAt(Date.now());
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    onError: (error) => {
      console.log('[OnlinePeople] toggleMutation error:', error);
      Alert.alert('Error', 'Could not update your status.');
    },
  });

  const onlineUsersQuery = useQuery({
    queryKey: ['online_users', userId],
    queryFn: async () => {
      const records = await fetchOnlineUsers(userId ?? undefined);
      return records.map(presenceRecordToOnlineUser);
    },
    enabled: isUserOnline,
    refetchInterval: isUserOnline ? ONLINE_USERS_POLL_INTERVAL : false,
    staleTime: 3000,
  });

  useEffect(() => {
    if (onlineUsersQuery.data && isUserOnline) {
      setOnlineUsers((prev) => {
        const dbUsers = onlineUsersQuery.data;
        const merged = new Map<string, OnlineUser>();

        for (const u of dbUsers) {
          merged.set(u.id, u);
        }
        for (const u of prev) {
          if (!merged.has(u.id)) {
            merged.set(u.id, u);
          } else {
            const existing = merged.get(u.id)!;
            if (u.lastActive > existing.lastActive) {
              merged.set(u.id, u);
            }
          }
        }

        const mergedArray = Array.from(merged.values());
        console.log('[OnlinePeople] Merged users (realtime+db, deduped):', mergedArray.length);
        return mergedArray;
      });
      setLastSyncedAt(Date.now());
    }
  }, [onlineUsersQuery.data, isUserOnline]);

  const connectChannel = useCallback(async (): Promise<boolean> => {
    if (!isSupabaseConfigured) {
      console.log('[OnlinePeople] Supabase not configured, local-only mode');
      if (mountedRef.current) {
        setIsUserOnline(true);
        setConnectionState('connected');
        setLastSyncedAt(Date.now());
        setOnlineUsers([]);
      }
      return true;
    }

    console.log('[OnlinePeople] Connecting channel for user:', userId);

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
        .on('presence', { event: 'join' }, ({ key }) => {
          console.log('[OnlinePeople] User joined:', key);
          syncPresenceState(channel);
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          console.log('[OnlinePeople] User left:', key);
          syncPresenceState(channel);
        });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Channel subscribe timeout'));
        }, 10000);

        channel.subscribe(async (status) => {
          console.log('[OnlinePeople] Channel status:', status);
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            try {
              const payload = buildPresencePayload();
              console.log('[OnlinePeople] Tracking presence:', payload.name);
              await channel.track(payload);
              resolve();
            } catch (trackErr) {
              reject(trackErr);
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timeout);
            reject(new Error(`Channel ${status}`));
          }
        });
      });

      channelRef.current = channel;
      reconnectAttempts.current = 0;

      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(() => {
        if (!channelRef.current || !mountedRef.current) return;
        try {
          const payload = buildPresencePayload();
          channelRef.current.track(payload).catch((e: unknown) => {
            console.log('[OnlinePeople] Heartbeat track failed:', e);
          });
          syncPresenceState(channelRef.current);

          if (userId) {
            void sendHeartbeat(userId);
          }
        } catch (e) {
          console.log('[OnlinePeople] Heartbeat error:', e);
        }
      }, HEARTBEAT_INTERVAL);

      if (mountedRef.current) {
        setIsUserOnline(true);
        setConnectionState('connected');
        setLastSyncedAt(Date.now());
      }

      console.log('[OnlinePeople] Connected successfully');
      return true;
    } catch (e) {
      console.log('[OnlinePeople] Connection failed:', e);
      cleanup();
      if (mountedRef.current) {
        setConnectionState('disconnected');
      }
      return false;
    }
  }, [userId, cleanup, syncPresenceState, buildPresencePayload]);

  const scheduleReconnect = useCallback(() => {
    if (!wantsOnlineRef.current || !mountedRef.current) return;
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      console.log('[OnlinePeople] Max reconnect attempts reached');
      if (mountedRef.current) {
        setIsUserOnline(false);
        setConnectionState('disconnected');
        wantsOnlineRef.current = false;
        void clearPersistedState();
      }
      return;
    }

    reconnectAttempts.current += 1;
    const delay = RECONNECT_DELAY * reconnectAttempts.current;
    console.log('[OnlinePeople] Scheduling reconnect attempt', reconnectAttempts.current, 'in', delay, 'ms');

    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(async () => {
      if (!wantsOnlineRef.current || !mountedRef.current) return;
      console.log('[OnlinePeople] Reconnecting...');
      const success = await connectChannel();
      if (!success && wantsOnlineRef.current) {
        scheduleReconnect();
      }
    }, delay);
  }, [connectChannel]);

  const handleToggleOnline = useCallback(async () => {
    if (isGoingOnlineRef.current) {
      console.log('[OnlinePeople] Already toggling, skipping');
      return;
    }

    const effectiveId = userId ?? await getOrCreateAnonId();
    const goingOnline = !isUserOnline;
    isGoingOnlineRef.current = true;
    wantsOnlineRef.current = goingOnline;

    console.log('[OnlinePeople] handleToggleOnline:', goingOnline ? 'GOING ONLINE' : 'GOING OFFLINE', 'id:', effectiveId);

    if (goingOnline) {
      setIsUserOnline(true);
      setConnectionState('connected');
      setLastSyncedAt(Date.now());
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      setIsUserOnline(false);
      setConnectionState('disconnected');
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      toggleMutation.mutate({
        id: effectiveId,
        isOnline: goingOnline,
        fullName: profile?.display_name || undefined,
        avatarUrl: profile?.avatar_url || undefined,
        scanCount: 0,
        phone: profile?.phone || undefined,
        services: profile?.services || undefined,
        email: profile?.email || undefined,
        vehicleType: profile?.vehicleType || undefined,
        serviceRadius: profile?.serviceRadius || undefined,
        city: profile?.city || undefined,
      });

      if (goingOnline) {
        connectChannel().then(async (channelSuccess) => {
          if (channelSuccess) {
            await savePersistedState({
              wantsOnline: true,
              userId: effectiveId,
              timestamp: Date.now(),
            });
            console.log('[OnlinePeople] Online state persisted');
          } else {
            scheduleReconnect();
          }
          isGoingOnlineRef.current = false;
        }).catch(() => {
          isGoingOnlineRef.current = false;
        });
        return;
      } else {
        cleanup();
        if (mountedRef.current) {
          setOnlineUsers([]);
          setLastSyncedAt(null);
        }
        void clearPersistedState();
        void markOffline(effectiveId);
      }
    } finally {
      isGoingOnlineRef.current = false;
    }
  }, [userId, profile, isUserOnline, toggleMutation, connectChannel, scheduleReconnect, cleanup]);

  const goOnline = useCallback(async (): Promise<boolean> => {
    if (isGoingOnlineRef.current) {
      console.log('[OnlinePeople] Already going online, skipping');
      return false;
    }
    if (isUserOnline && connectionState === 'connected') {
      console.log('[OnlinePeople] Already online');
      return true;
    }

    isGoingOnlineRef.current = true;
    wantsOnlineRef.current = true;
    console.log('[OnlinePeople] Going online...');

    try {
      if (userId && profile) {
        toggleMutation.mutate({
          id: userId,
          isOnline: true,
          fullName: profile.display_name || undefined,
          avatarUrl: profile.avatar_url || undefined,
          scanCount: 0,
          phone: profile.phone || undefined,
          services: profile.services || undefined,
          email: profile.email || undefined,
          vehicleType: profile.vehicleType || undefined,
          serviceRadius: profile.serviceRadius || undefined,
          city: profile.city || undefined,
        });
      }

      const success = await connectChannel();
      if (success) {
        await savePersistedState({
          wantsOnline: true,
          userId: userId ?? null,
          timestamp: Date.now(),
        });
        console.log('[OnlinePeople] Online state persisted');
        return true;
      } else {
        scheduleReconnect();
        return false;
      }
    } finally {
      isGoingOnlineRef.current = false;
    }
  }, [isUserOnline, connectionState, userId, profile, connectChannel, scheduleReconnect, toggleMutation]);

  const goOffline = useCallback(() => {
    console.log('[OnlinePeople] Going offline');
    wantsOnlineRef.current = false;
    isGoingOnlineRef.current = false;
    cleanup();

    if (userId) {
      toggleMutation.mutate({
        id: userId,
        isOnline: false,
        fullName: profile?.display_name || undefined,
        avatarUrl: profile?.avatar_url || undefined,
        phone: profile?.phone || undefined,
        services: profile?.services || undefined,
        email: profile?.email || undefined,
        vehicleType: profile?.vehicleType || undefined,
        serviceRadius: profile?.serviceRadius || undefined,
        city: profile?.city || undefined,
      });
      void markOffline(userId);
    }

    if (mountedRef.current) {
      setIsUserOnline(false);
      setOnlineUsers([]);
      setLastSyncedAt(null);
      setConnectionState('disconnected');
    }

    void clearPersistedState();
  }, [cleanup, userId, profile, toggleMutation]);

  useEffect(() => {
    if (!userId || !isAuthenticated) return;
    if (lastUserIdRef.current === userId) return;
    lastUserIdRef.current = userId;

    console.log('[OnlinePeople] Checking persisted state for user:', userId);
    loadPersistedState().then((state) => {
      if (!mountedRef.current) return;
      if (state && state.wantsOnline && state.userId === userId) {
        console.log('[OnlinePeople] Restoring online state for user:', userId);
        wantsOnlineRef.current = true;

        if (profile) {
          toggleMutation.mutate({
            id: userId,
            isOnline: true,
            fullName: profile.display_name || undefined,
            avatarUrl: profile.avatar_url || undefined,
            phone: profile.phone || undefined,
            services: profile.services || undefined,
            email: profile.email || undefined,
            vehicleType: profile.vehicleType || undefined,
            serviceRadius: profile.serviceRadius || undefined,
            city: profile.city || undefined,
          });
        }

        void connectChannel();
      }
    }).catch((e) => {
      console.log('[OnlinePeople] Failed to load persisted state:', e);
    });
  }, [userId, isAuthenticated, connectChannel, profile, toggleMutation]);

  useEffect(() => {
    if (!userId) {
      if (isUserOnline) {
        console.log('[OnlinePeople] User signed out, going offline');
        goOffline();
      }
      lastUserIdRef.current = null;
    }
  }, [userId, isUserOnline, goOffline]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextAppState;

      console.log('[OnlinePeople] AppState:', prevState, '->', nextAppState);

      if (prevState.match(/inactive|background/) && nextAppState === 'active') {
        if (wantsOnlineRef.current && userId) {
          console.log('[OnlinePeople] App foregrounded, reconnecting...');

          if (profile) {
            toggleMutation.mutate({
              id: userId,
              isOnline: true,
              fullName: profile.display_name || undefined,
              avatarUrl: profile.avatar_url || undefined,
              phone: profile.phone || undefined,
              services: profile.services || undefined,
              email: profile.email || undefined,
              vehicleType: profile.vehicleType || undefined,
              serviceRadius: profile.serviceRadius || undefined,
              city: profile.city || undefined,
            });
          }

          if (!channelRef.current || connectionState !== 'connected') {
            reconnectAttempts.current = 0;
            void connectChannel();
          } else {
            const payload = buildPresencePayload();
            channelRef.current.track(payload).catch((e: unknown) => {
              console.log('[OnlinePeople] Foreground re-track failed, reconnecting:', e);
              void connectChannel();
            });
          }

          void queryClient.invalidateQueries({ queryKey: ['online_users'] });
        }
      }

      if (nextAppState === 'background' && Platform.OS !== 'web') {
        console.log('[OnlinePeople] App backgrounded');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [userId, connectionState, connectChannel, buildPresencePayload, profile, toggleMutation, queryClient]);

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

  const isToggling = toggleMutation.isPending;

  return useMemo(() => ({
    handleToggleOnline,
    goOnline,
    goOffline,
    isUserOnline,
    onlineUsers,
    activeCount,
    lastSyncedAt,
    updateActivity,
    connectionState,
    isToggling,
  }), [handleToggleOnline, goOnline, goOffline, isUserOnline, onlineUsers, activeCount, lastSyncedAt, updateActivity, connectionState, isToggling]);
});
