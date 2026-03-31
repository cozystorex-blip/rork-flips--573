import { supabase, isSupabaseConfigured } from '@/services/supabase';

export interface PresenceRecord {
  user_id: string;
  is_online: boolean;
  full_name: string;
  avatar_url: string;
  last_seen: string;
  updated_at: string;
  profile_ready: boolean;
  scan_count: number;
  activity: string;
}

export interface ToggleOnlineInput {
  id: string;
  isOnline: boolean;
  fullName?: string;
  avatarUrl?: string;
  scanCount?: number;
}

export async function upsertPresence(input: ToggleOnlineInput): Promise<PresenceRecord> {
  const now = new Date().toISOString();
  const record: PresenceRecord = {
    user_id: input.id,
    is_online: input.isOnline,
    full_name: input.fullName || 'Flip User',
    avatar_url: input.avatarUrl || '',
    last_seen: now,
    updated_at: now,
    profile_ready: true,
    scan_count: input.scanCount ?? 0,
    activity: 'browsing',
  };

  if (!isSupabaseConfigured) {
    console.log('[PresenceService] Supabase not configured, returning local record');
    return record;
  }

  try {
    const { data, error } = await supabase
      .from('online_presence')
      .upsert(
        {
          user_id: record.user_id,
          is_online: record.is_online,
          full_name: record.full_name,
          avatar_url: record.avatar_url,
          last_seen: record.last_seen,
          updated_at: record.updated_at,
          profile_ready: record.profile_ready,
          scan_count: record.scan_count,
          activity: record.activity,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.log('[PresenceService] Upsert error (table may not exist):', error.message);
      return record;
    }

    console.log('[PresenceService] Upsert success:', data?.user_id, 'online:', data?.is_online);
    return (data as PresenceRecord) ?? record;
  } catch (e) {
    console.log('[PresenceService] Upsert failed:', e);
    return record;
  }
}

export async function fetchOnlineUsers(excludeUserId?: string): Promise<PresenceRecord[]> {
  if (!isSupabaseConfigured) {
    console.log('[PresenceService] Supabase not configured, returning empty list');
    return [];
  }

  try {
    let query = supabase
      .from('online_presence')
      .select('*')
      .eq('is_online', true)
      .order('updated_at', { ascending: false });

    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.log('[PresenceService] Fetch online users error:', error.message);
      return [];
    }

    const now = Date.now();
    const STALE_THRESHOLD = 60000;
    const activeUsers = (data as PresenceRecord[]).filter((u) => {
      const lastSeen = new Date(u.last_seen).getTime();
      return now - lastSeen < STALE_THRESHOLD;
    });

    console.log('[PresenceService] Fetched', activeUsers.length, 'online users');
    return activeUsers;
  } catch (e) {
    console.log('[PresenceService] Fetch failed:', e);
    return [];
  }
}

export async function sendHeartbeat(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('online_presence')
      .update({ last_seen: now, updated_at: now })
      .eq('user_id', userId)
      .eq('is_online', true);

    if (error) {
      console.log('[PresenceService] Heartbeat error:', error.message);
    }
  } catch (e) {
    console.log('[PresenceService] Heartbeat failed:', e);
  }
}

export async function markOffline(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('online_presence')
      .update({ is_online: false, updated_at: now })
      .eq('user_id', userId);

    if (error) {
      console.log('[PresenceService] Mark offline error:', error.message);
    } else {
      console.log('[PresenceService] Marked offline:', userId);
    }
  } catch (e) {
    console.log('[PresenceService] Mark offline failed:', e);
  }
}
