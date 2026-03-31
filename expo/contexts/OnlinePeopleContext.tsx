import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useState, useRef, useEffect } from 'react';

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

const SIMULATED_USERS: Omit<OnlineUser, 'joinedAt' | 'status' | 'activity' | 'scanCount' | 'lastActive'>[] = [
  { id: 'u1', name: 'Sarah M.', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face' },
  { id: 'u2', name: 'Jake R.', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face' },
  { id: 'u3', name: 'Mia Chen', avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop&crop=face' },
  { id: 'u4', name: 'David K.', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=face' },
  { id: 'u5', name: 'Priya S.', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face' },
  { id: 'u6', name: 'Carlos G.', avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face' },
  { id: 'u7', name: 'Emma W.', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=face' },
  { id: 'u8', name: 'Liam T.', avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=face' },
  { id: 'u9', name: 'Zoe B.', avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=face' },
  { id: 'u10', name: 'Noah P.', avatar_url: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=120&h=120&fit=crop&crop=face' },
];

const ACTIVITIES: UserActivity[] = ['scanning', 'browsing', 'saving', 'idle'];

function pickRandomActivity(): UserActivity {
  const weights = [0.3, 0.35, 0.2, 0.15];
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (r <= cumulative) return ACTIVITIES[i];
  }
  return 'browsing';
}

function pickRandomUsers(count: number): OnlineUser[] {
  const shuffled = [...SIMULATED_USERS].sort(() => Math.random() - 0.5);
  const now = Date.now();
  return shuffled.slice(0, count).map((u, i) => ({
    ...u,
    joinedAt: now - Math.floor(Math.random() * 120000) - i * 5000,
    status: Math.random() > 0.15 ? 'active' as const : 'idle' as const,
    activity: pickRandomActivity(),
    scanCount: Math.floor(Math.random() * 12) + 1,
    lastActive: now - Math.floor(Math.random() * 30000),
  }));
}

export const [OnlinePeopleProvider, useOnlinePeople] = createContextHook(() => {
  const [isUserOnline, setIsUserOnline] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const dripTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimers = useCallback(() => {
    if (dripTimerRef.current) {
      clearInterval(dripTimerRef.current);
      dripTimerRef.current = null;
    }
    if (activityTimerRef.current) {
      clearInterval(activityTimerRef.current);
      activityTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopTimers();
  }, [stopTimers]);

  const goOnline = useCallback(async (): Promise<boolean> => {
    if (isUserOnline) {
      console.log('[OnlinePeople] Already online');
      return true;
    }
    console.log('[OnlinePeople] Going online NOW');
    setIsUserOnline(true);
    setLastSyncedAt(Date.now());

    const initialCount = 3 + Math.floor(Math.random() * 3);
    const initialUsers = pickRandomUsers(initialCount);
    setOnlineUsers(initialUsers);
    console.log('[OnlinePeople] Instantly connected with', initialCount, 'users');

    stopTimers();
    const usedIds = new Set(initialUsers.map(u => u.id));

    dripTimerRef.current = setInterval(() => {
      setOnlineUsers(prev => {
        if (prev.length >= 8) return prev;
        const available = SIMULATED_USERS.filter(u => !usedIds.has(u.id));
        if (available.length === 0) return prev;
        const pick = available[Math.floor(Math.random() * available.length)];
        usedIds.add(pick.id);
        const newUser: OnlineUser = {
          ...pick,
          joinedAt: Date.now(),
          status: 'active',
          activity: pickRandomActivity(),
          scanCount: Math.floor(Math.random() * 5) + 1,
          lastActive: Date.now(),
        };
        console.log('[OnlinePeople] New user joined:', newUser.name);
        return [...prev, newUser];
      });
    }, 4000 + Math.floor(Math.random() * 6000));

    activityTimerRef.current = setInterval(() => {
      setOnlineUsers(prev => {
        const now = Date.now();
        return prev.map(u => {
          if (Math.random() < 0.3) {
            const newActivity = pickRandomActivity();
            const newScanCount = newActivity === 'scanning' ? u.scanCount + 1 : u.scanCount;
            return {
              ...u,
              activity: newActivity,
              status: newActivity === 'idle' ? 'idle' as const : 'active' as const,
              scanCount: newScanCount,
              lastActive: now,
            };
          }
          return u;
        });
      });
      setLastSyncedAt(Date.now());
    }, 8000);

    return true;
  }, [isUserOnline, stopTimers]);

  const goOffline = useCallback(() => {
    console.log('[OnlinePeople] Going offline');
    setIsUserOnline(false);
    setOnlineUsers([]);
    setLastSyncedAt(null);
    stopTimers();
  }, [stopTimers]);

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
  }), [goOnline, goOffline, isUserOnline, onlineUsers, activeCount, lastSyncedAt]);
});
