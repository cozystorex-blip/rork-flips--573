import { supabase, isSupabaseConfigured } from '@/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function safeSupabaseCall<T>(
  operation: () => PromiseLike<{ data: T | null; error: { message: string; code?: string } | null }>,
  fallback: T,
  label: string
): Promise<{ data: T; source: 'supabase' | 'fallback' }> {
  if (!isSupabaseConfigured) {
    console.log(`[SupabaseData] ${label}: not configured, using fallback`);
    return { data: fallback, source: 'fallback' };
  }
  try {
    const { data, error } = await operation();
    if (error) {
      console.log(`[SupabaseData] ${label} error:`, error.message, error.code);
      return { data: fallback, source: 'fallback' };
    }
    return { data: data ?? fallback, source: 'supabase' };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`[SupabaseData] ${label} exception:`, msg);
    return { data: fallback, source: 'fallback' };
  }
}

export async function fetchProfile(userId: string) {
  const localRaw = await AsyncStorage.getItem('local_profile');
  const localProfile = localRaw ? JSON.parse(localRaw) : null;

  const result = await safeSupabaseCall(
    () => supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    localProfile,
    'fetchProfile'
  );

  if (result.source === 'supabase' && result.data) {
    await AsyncStorage.setItem('local_profile', JSON.stringify(result.data));
  }

  return result.data;
}

export async function upsertProfile(userId: string, profile: Record<string, unknown>) {
  const payload = { ...profile, id: userId, updated_at: new Date().toISOString() };
  await AsyncStorage.setItem('local_profile', JSON.stringify(payload));

  if (!isSupabaseConfigured) return payload;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.log('[SupabaseData] upsertProfile error:', error.message);
      return payload;
    }
    console.log('[SupabaseData] Profile synced to Supabase');
    return data ?? payload;
  } catch (e) {
    console.log('[SupabaseData] upsertProfile exception:', e);
    return payload;
  }
}

export async function fetchSavedDeals(userId: string) {
  const localRaw = await AsyncStorage.getItem('saved_deals_data');
  const localDeals = localRaw ? JSON.parse(localRaw) : [];

  const result = await safeSupabaseCall(
    () => supabase.from('saved_deals').select('*').eq('user_id', userId).order('saved_at', { ascending: false }),
    localDeals as unknown[],
    'fetchSavedDeals'
  );

  if (result.source === 'supabase' && Array.isArray(result.data)) {
    await AsyncStorage.setItem('saved_deals_data', JSON.stringify(result.data));
  }

  return (result.data ?? []) as unknown[];
}

export async function upsertSavedDeal(userId: string, deal: Record<string, unknown>) {
  const payload = { ...deal, user_id: userId };

  if (!isSupabaseConfigured) return payload;

  try {
    const { data, error } = await supabase
      .from('saved_deals')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.log('[SupabaseData] upsertSavedDeal error:', error.message);
      return payload;
    }
    return data ?? payload;
  } catch (e) {
    console.log('[SupabaseData] upsertSavedDeal exception:', e);
    return payload;
  }
}

export async function deleteSavedDeal(userId: string, dealId: string) {
  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase
      .from('saved_deals')
      .delete()
      .eq('user_id', userId)
      .eq('deal_id', dealId);

    if (error) {
      console.log('[SupabaseData] deleteSavedDeal error:', error.message);
    }
  } catch (e) {
    console.log('[SupabaseData] deleteSavedDeal exception:', e);
  }
}

export async function syncAllSavedDeals(userId: string, deals: Record<string, unknown>[]) {
  if (!isSupabaseConfigured) return;

  try {
    const rows = deals.map((d) => ({ ...d, user_id: userId }));
    if (rows.length === 0) return;

    const { error } = await supabase
      .from('saved_deals')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.log('[SupabaseData] syncAllSavedDeals error:', error.message);
    } else {
      console.log('[SupabaseData] Synced', rows.length, 'saved deals');
    }
  } catch (e) {
    console.log('[SupabaseData] syncAllSavedDeals exception:', e);
  }
}

export async function fetchScanHistory(userId: string) {
  const localRaw = await AsyncStorage.getItem('scan_history_data');
  const localHistory = localRaw ? JSON.parse(localRaw) : [];

  const result = await safeSupabaseCall(
    () => supabase.from('scan_history').select('*').eq('user_id', userId).order('scanned_at', { ascending: false }),
    localHistory as unknown[],
    'fetchScanHistory'
  );

  if (result.source === 'supabase' && Array.isArray(result.data)) {
    await AsyncStorage.setItem('scan_history_data', JSON.stringify(result.data));
  }

  return (result.data ?? []) as unknown[];
}

export async function upsertScanEntry(userId: string, entry: Record<string, unknown>) {
  const payload = { ...entry, user_id: userId };

  if (!isSupabaseConfigured) return payload;

  try {
    const { data, error } = await supabase
      .from('scan_history')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.log('[SupabaseData] upsertScanEntry error:', error.message);
      return payload;
    }
    return data ?? payload;
  } catch (e) {
    console.log('[SupabaseData] upsertScanEntry exception:', e);
    return payload;
  }
}

export async function deleteScanEntry(userId: string, entryId: string) {
  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase
      .from('scan_history')
      .delete()
      .eq('user_id', userId)
      .eq('id', entryId);

    if (error) {
      console.log('[SupabaseData] deleteScanEntry error:', error.message);
    }
  } catch (e) {
    console.log('[SupabaseData] deleteScanEntry exception:', e);
  }
}

export async function clearScanHistory(userId: string) {
  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase
      .from('scan_history')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.log('[SupabaseData] clearScanHistory error:', error.message);
    }
  } catch (e) {
    console.log('[SupabaseData] clearScanHistory exception:', e);
  }
}

export async function fetchBlocks(userId: string) {
  const localRaw = await AsyncStorage.getItem(`blocks_local_${userId}`);
  const localBlocks = localRaw ? JSON.parse(localRaw) : [];

  const result = await safeSupabaseCall(
    () => supabase.from('profile_blocks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    localBlocks as unknown[],
    'fetchBlocks'
  );

  if (result.source === 'supabase' && Array.isArray(result.data)) {
    await AsyncStorage.setItem(`blocks_local_${userId}`, JSON.stringify(result.data));
  }

  return (result.data ?? []) as unknown[];
}

export async function upsertBlock(userId: string, block: Record<string, unknown>) {
  const payload = { ...block, user_id: userId };

  if (!isSupabaseConfigured) return payload;

  try {
    const { data, error } = await supabase
      .from('profile_blocks')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.log('[SupabaseData] upsertBlock error:', error.message);
      return payload;
    }
    return data ?? payload;
  } catch (e) {
    console.log('[SupabaseData] upsertBlock exception:', e);
    return payload;
  }
}

export async function deleteBlock(userId: string, blockId: string) {
  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase
      .from('profile_blocks')
      .delete()
      .eq('user_id', userId)
      .eq('id', blockId);

    if (error) {
      console.log('[SupabaseData] deleteBlock error:', error.message);
    }
  } catch (e) {
    console.log('[SupabaseData] deleteBlock exception:', e);
  }
}

export async function fetchExpenses(userId: string) {
  const localRaw = await AsyncStorage.getItem('expenses_data');
  const localExpenses = localRaw ? JSON.parse(localRaw) : [];

  const result = await safeSupabaseCall(
    () => supabase.from('expenses').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    localExpenses as unknown[],
    'fetchExpenses'
  );

  if (result.source === 'supabase' && Array.isArray(result.data)) {
    await AsyncStorage.setItem('expenses_data', JSON.stringify(result.data));
  }

  return (result.data ?? []) as unknown[];
}

export async function upsertExpense(userId: string, expense: Record<string, unknown>) {
  const payload = { ...expense, user_id: userId };

  if (!isSupabaseConfigured) return payload;

  try {
    const { data, error } = await supabase
      .from('expenses')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.log('[SupabaseData] upsertExpense error:', error.message);
      return payload;
    }
    return data ?? payload;
  } catch (e) {
    console.log('[SupabaseData] upsertExpense exception:', e);
    return payload;
  }
}

export async function deleteExpense(userId: string, expenseId: string) {
  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('user_id', userId)
      .eq('id', expenseId);

    if (error) {
      console.log('[SupabaseData] deleteExpense error:', error.message);
    }
  } catch (e) {
    console.log('[SupabaseData] deleteExpense exception:', e);
  }
}

export async function fetchClaimedPlaces(userId: string) {
  const localRaw = await AsyncStorage.getItem('claimed_places_v1');
  const localClaims = localRaw ? JSON.parse(localRaw) : [];

  const result = await safeSupabaseCall(
    () => supabase.from('claimed_places').select('*').eq('user_id', userId).order('claimed_at', { ascending: false }),
    localClaims as unknown[],
    'fetchClaimedPlaces'
  );

  if (result.source === 'supabase' && Array.isArray(result.data)) {
    await AsyncStorage.setItem('claimed_places_v1', JSON.stringify(result.data));
  }

  return (result.data ?? []) as unknown[];
}

export async function upsertClaimedPlace(userId: string, claim: Record<string, unknown>) {
  const payload = { ...claim, user_id: userId };

  if (!isSupabaseConfigured) return payload;

  try {
    const { data, error } = await supabase
      .from('claimed_places')
      .upsert(payload, { onConflict: 'place_id,user_id' })
      .select()
      .single();

    if (error) {
      console.log('[SupabaseData] upsertClaimedPlace error:', error.message);
      return payload;
    }
    return data ?? payload;
  } catch (e) {
    console.log('[SupabaseData] upsertClaimedPlace exception:', e);
    return payload;
  }
}

export async function deleteClaimedPlace(userId: string, placeId: string) {
  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase
      .from('claimed_places')
      .delete()
      .eq('user_id', userId)
      .eq('place_id', placeId);

    if (error) {
      console.log('[SupabaseData] deleteClaimedPlace error:', error.message);
    }
  } catch (e) {
    console.log('[SupabaseData] deleteClaimedPlace exception:', e);
  }
}
