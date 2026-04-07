import { supabase, isSupabaseConfigured } from '@/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ConnectionStatus = 'pending' | 'accepted' | 'declined';

export interface ConnectionRecord {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
}

export interface SearchedUser {
  id: string;
  display_name: string;
  avatar_url: string;
  city: string;
}

const CONNECTIONS_LOCAL_KEY = 'connections_local';

async function getLocalConnections(): Promise<ConnectionRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(CONNECTIONS_LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveLocalConnections(connections: ConnectionRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CONNECTIONS_LOCAL_KEY, JSON.stringify(connections));
  } catch (e) {
    console.log('[ConnectionsService] Failed to save local connections:', e);
  }
}

export async function searchUsers(query: string, currentUserId: string): Promise<SearchedUser[]> {
  if (!isSupabaseConfigured) {
    console.log('[ConnectionsService] Supabase not configured, cannot search');
    return [];
  }

  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < 2) return [];

  try {
    const { data: onlineData, error: onlineError } = await supabase
      .from('online_presence')
      .select('user_id')
      .eq('is_online', true);

    if (onlineError) {
      console.log('[ConnectionsService] Online presence check error:', onlineError.message);
    }

    const onlineUserIds = new Set<string>(
      (onlineData ?? []).map((r: Record<string, unknown>) => (r.user_id as string) ?? '')
    );
    console.log('[ConnectionsService] Online user IDs:', onlineUserIds.size);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, city')
      .neq('id', currentUserId)
      .ilike('display_name', `%${trimmed}%`)
      .limit(40);

    if (error) {
      console.log('[ConnectionsService] Search error:', error.message);
      return [];
    }

    const allProfiles = (data ?? []).map((u: Record<string, unknown>) => ({
      id: (u.id as string) ?? '',
      display_name: (u.display_name as string) ?? 'User',
      avatar_url: (u.avatar_url as string) ?? '',
      city: (u.city as string) ?? '',
    }));

    const results = allProfiles.filter(p => onlineUserIds.has(p.id));

    console.log('[ConnectionsService] Search found', results.length, 'online users for:', trimmed);
    return results;
  } catch (e) {
    console.log('[ConnectionsService] Search exception:', e);
    return [];
  }
}

export async function sendConnectionRequest(requesterId: string, receiverId: string): Promise<ConnectionRecord | null> {
  const now = new Date().toISOString();
  const id = `conn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const record: ConnectionRecord = {
    id,
    requester_id: requesterId,
    receiver_id: receiverId,
    status: 'pending',
    created_at: now,
    updated_at: now,
  };

  if (!isSupabaseConfigured) {
    console.log('[ConnectionsService] Supabase not configured, saving locally');
    const local = await getLocalConnections();
    local.push(record);
    await saveLocalConnections(local);
    return record;
  }

  try {
    const { data: existing } = await supabase
      .from('connections')
      .select('*')
      .or(
        `and(requester_id.eq.${requesterId},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${requesterId})`
      )
      .limit(1);

    if (existing && existing.length > 0) {
      const conn = existing[0] as ConnectionRecord;
      if (conn.status === 'accepted') {
        console.log('[ConnectionsService] Already connected');
        return conn;
      }
      if (conn.status === 'pending') {
        console.log('[ConnectionsService] Request already pending');
        return conn;
      }
      if (conn.status === 'declined') {
        const { data, error } = await supabase
          .from('connections')
          .update({ status: 'pending', requester_id: requesterId, receiver_id: receiverId, updated_at: now })
          .eq('id', conn.id)
          .select()
          .single();
        if (error) {
          console.log('[ConnectionsService] Re-request error:', error.message);
          return null;
        }
        return (data as ConnectionRecord) ?? null;
      }
    }

    const { data, error } = await supabase
      .from('connections')
      .insert({
        id: record.id,
        requester_id: record.requester_id,
        receiver_id: record.receiver_id,
        status: record.status,
        created_at: record.created_at,
        updated_at: record.updated_at,
      })
      .select()
      .single();

    if (error) {
      console.log('[ConnectionsService] Send request error:', error.message);
      const local = await getLocalConnections();
      local.push(record);
      await saveLocalConnections(local);
      return record;
    }

    console.log('[ConnectionsService] Connection request sent');
    return (data as ConnectionRecord) ?? record;
  } catch (e) {
    console.log('[ConnectionsService] Send request exception:', e);
    const local = await getLocalConnections();
    local.push(record);
    await saveLocalConnections(local);
    return record;
  }
}

export async function respondToRequest(connectionId: string, accept: boolean): Promise<ConnectionRecord | null> {
  const now = new Date().toISOString();
  const newStatus: ConnectionStatus = accept ? 'accepted' : 'declined';

  if (!isSupabaseConfigured) {
    const local = await getLocalConnections();
    const idx = local.findIndex(c => c.id === connectionId);
    if (idx >= 0) {
      local[idx].status = newStatus;
      local[idx].updated_at = now;
      await saveLocalConnections(local);
      return local[idx];
    }
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('connections')
      .update({ status: newStatus, updated_at: now })
      .eq('id', connectionId)
      .select()
      .single();

    if (error) {
      console.log('[ConnectionsService] Respond error:', error.message);
      return null;
    }

    console.log('[ConnectionsService] Connection', accept ? 'accepted' : 'declined');
    return (data as ConnectionRecord) ?? null;
  } catch (e) {
    console.log('[ConnectionsService] Respond exception:', e);
    return null;
  }
}

export async function removeConnection(connectionId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const local = await getLocalConnections();
    const filtered = local.filter(c => c.id !== connectionId);
    await saveLocalConnections(filtered);
    return true;
  }

  try {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId);

    if (error) {
      console.log('[ConnectionsService] Remove error:', error.message);
      return false;
    }

    console.log('[ConnectionsService] Connection removed');
    return true;
  } catch (e) {
    console.log('[ConnectionsService] Remove exception:', e);
    return false;
  }
}

export async function fetchMyConnections(userId: string): Promise<ConnectionRecord[]> {
  if (!isSupabaseConfigured) {
    const local = await getLocalConnections();
    return local.filter(c => c.requester_id === userId || c.receiver_id === userId);
  }

  try {
    const { data, error } = await supabase
      .from('connections')
      .select('*')
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (error) {
      console.log('[ConnectionsService] Fetch connections error:', error.message);
      const local = await getLocalConnections();
      return local.filter(c => c.requester_id === userId || c.receiver_id === userId);
    }

    const records = (data ?? []) as ConnectionRecord[];
    await saveLocalConnections(records);
    console.log('[ConnectionsService] Fetched', records.length, 'connections');
    return records;
  } catch (e) {
    console.log('[ConnectionsService] Fetch connections exception:', e);
    const local = await getLocalConnections();
    return local.filter(c => c.requester_id === userId || c.receiver_id === userId);
  }
}

export async function fetchUserProfiles(userIds: string[]): Promise<SearchedUser[]> {
  if (!isSupabaseConfigured || userIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, city')
      .in('id', userIds);

    if (error) {
      console.log('[ConnectionsService] Fetch profiles error:', error.message);
      return [];
    }

    return (data ?? []).map((u: Record<string, unknown>) => ({
      id: (u.id as string) ?? '',
      display_name: (u.display_name as string) ?? 'User',
      avatar_url: (u.avatar_url as string) ?? '',
      city: (u.city as string) ?? '',
    }));
  } catch (e) {
    console.log('[ConnectionsService] Fetch profiles exception:', e);
    return [];
  }
}
