import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

export const isSupabaseConfigured: boolean = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'));

if (!isSupabaseConfigured) {
  console.warn('[Supabase] Not configured — running in offline mode.',
    'URL present:', !!supabaseUrl,
    'URL value:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : '(empty)',
    'Key present:', !!supabaseAnonKey,
    'Key length:', supabaseAnonKey.length,
  );
}

const safeUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const safeKey = isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key';

function createTimeoutSignal(ms: number): AbortSignal | undefined {
  try {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      return AbortSignal.timeout(ms);
    }
  } catch {
    // fallback below
  }
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  } catch {
    return undefined;
  }
}

export const supabase: SupabaseClient = createClient(safeUrl, safeKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: isSupabaseConfigured,
    persistSession: isSupabaseConfigured,
    detectSessionInUrl: false,
  },
  global: {
    fetch: (url, options) => {
      if (!isSupabaseConfigured) {
        console.log('[Supabase] Fetch blocked — not configured');
        return Promise.resolve(new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 503, headers: { 'Content-Type': 'application/json' } }));
      }
      const signal = options?.signal ?? createTimeoutSignal(15000);
      return fetch(url as string, { ...options, signal }).catch((err) => {
        console.log('[Supabase] Fetch error for', typeof url === 'string' ? url.substring(0, 60) : 'unknown', ':', err?.message ?? err);
        throw err;
      });
    },
  },
});

console.log('[Supabase] Client initialized:', isSupabaseConfigured ? 'ONLINE — ' + safeUrl.substring(0, 40) + '...' : 'OFFLINE MODE',
  'Platform:', Platform.OS,
);
