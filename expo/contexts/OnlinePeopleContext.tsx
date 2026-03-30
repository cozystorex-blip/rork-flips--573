import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';

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
  const { userId, isAuthenticated } = useAuth();
  const [isUserOnline, setIsUserOnline] = useState(false);

  useEffect(() => {
    if (!userId || !isAuthenticated) {
      setIsUserOnline(false);
      return;
    }

    let interval: ReturnType<typeof setInterval> | null = null;

    if (isUserOnline) {
      interval = setInterval(() => {
        void updatePresence(userId);
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (isUserOnline) {
        void setOffline(userId);
      }
    };
  }, [userId, isAuthenticated, isUserOnline]);

  const goOnline = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      console.log('[OnlinePeople] Cannot go online: no userId');
      return false;
    }
    if (isUserOnline) {
      console.log('[OnlinePeople] Already online');
      return true;
    }
    console.log('[OnlinePeople] Going online NOW for:', userId);
    try {
      const success = await updatePresence(userId);
      if (success) {
        setIsUserOnline(true);
        console.log('[OnlinePeople] Successfully went online');
      } else {
        console.log('[OnlinePeople] updatePresence returned false');
      }
      return success;
    } catch (e) {
      console.log('[OnlinePeople] goOnline error:', e);
      return false;
    }
  }, [userId, isUserOnline]);

  return useMemo(() => ({
    goOnline,
    isUserOnline,
  }), [goOnline, isUserOnline]);
});
