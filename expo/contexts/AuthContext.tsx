import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email: string;
}

const AUTH_STORAGE_KEY = 'local_auth_user';

async function loadStoredUser(): Promise<AuthUser | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function storeUser(user: AuthUser | null): Promise<void> {
  try {
    if (user) {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch (e) {
    console.log('[AuthContext] Storage error:', e);
  }
}

function generateLocalId(): string {
  return 'local_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function supabaseUserToAuthUser(u: User): AuthUser {
  return { id: u.id, email: u.email ?? '' };
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    console.log('[AuthContext] Initializing auth, supabase configured:', isSupabaseConfigured);

    async function init() {
      if (isSupabaseConfigured) {
        try {
          const { data: { session: existingSession }, error } = await supabase.auth.getSession();
          if (!mounted) return;

          if (error) {
            console.log('[AuthContext] getSession error:', error.message);
          }

          if (existingSession?.user) {
            console.log('[AuthContext] Restored Supabase session for:', existingSession.user.email);
            const authUser = supabaseUserToAuthUser(existingSession.user);
            setSession(existingSession);
            setUser(authUser);
            await storeUser(authUser);
          } else {
            console.log('[AuthContext] No Supabase session found');
            const stored = await loadStoredUser();
            if (stored && mounted) {
              console.log('[AuthContext] Restored local user:', stored.email);
              setUser(stored);
            }
          }
        } catch (e) {
          console.log('[AuthContext] Supabase init error:', e);
          const stored = await loadStoredUser();
          if (stored && mounted) {
            setUser(stored);
          }
        }
      } else {
        const stored = await loadStoredUser();
        if (stored && mounted) {
          console.log('[AuthContext] Restored local user (offline):', stored.email);
          setUser(stored);
        }
      }

      if (mounted) setIsLoading(false);
    }

    void init();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
        if (!mountedRef.current) return;
        console.log('[AuthContext] Auth state change:', event);

        if (newSession?.user) {
          const authUser = supabaseUserToAuthUser(newSession.user);
          setSession(newSession);
          setUser(authUser);
          void storeUser(authUser);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          void storeUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      const msg = 'Please enter an email address.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
    if (password.length < 6) {
      const msg = 'Password must be at least 6 characters.';
      setAuthError(msg);
      return { success: false, error: msg };
    }

    if (isSupabaseConfigured) {
      console.log('[AuthContext] Supabase sign up for:', trimmedEmail);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
        });

        if (error) {
          console.log('[AuthContext] Sign up error:', error.message);
          const msg = error.message === 'User already registered'
            ? 'An account with this email already exists. Try signing in.'
            : error.message;
          setAuthError(msg);
          return { success: false, error: msg };
        }

        if (data.user) {
          const authUser = supabaseUserToAuthUser(data.user);
          setSession(data.session);
          setUser(authUser);
          await storeUser(authUser);
          console.log('[AuthContext] Supabase sign up success:', authUser.id);
          return { success: true, error: null };
        }

        console.log('[AuthContext] Sign up returned no user — may need email confirmation');
        return { success: true, error: null };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Sign up failed. Please try again.';
        console.log('[AuthContext] Sign up exception:', msg);
        setAuthError(msg);
        return { success: false, error: msg };
      }
    }

    console.log('[AuthContext] Local sign up for:', trimmedEmail);
    const newUser: AuthUser = { id: generateLocalId(), email: trimmedEmail };
    setUser(newUser);
    await storeUser(newUser);
    return { success: true, error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      const msg = 'Please enter an email address.';
      setAuthError(msg);
      return { success: false, error: msg };
    }

    if (isSupabaseConfigured) {
      console.log('[AuthContext] Supabase sign in for:', trimmedEmail);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (error) {
          console.log('[AuthContext] Sign in error:', error.message);
          let msg = error.message;
          if (msg === 'Invalid login credentials') {
            msg = 'Invalid email or password. Please try again.';
          }
          setAuthError(msg);
          return { success: false, error: msg };
        }

        if (data.user) {
          const authUser = supabaseUserToAuthUser(data.user);
          setSession(data.session);
          setUser(authUser);
          await storeUser(authUser);
          console.log('[AuthContext] Supabase sign in success:', authUser.id);
          return { success: true, error: null };
        }

        return { success: false, error: 'Sign in failed.' };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Sign in failed. Please try again.';
        console.log('[AuthContext] Sign in exception:', msg);
        setAuthError(msg);
        return { success: false, error: msg };
      }
    }

    console.log('[AuthContext] Local sign in for:', trimmedEmail);
    const stored = await loadStoredUser();
    if (stored && stored.email === trimmedEmail) {
      setUser(stored);
      return { success: true, error: null };
    }
    const newUser: AuthUser = { id: stored?.id ?? generateLocalId(), email: trimmedEmail };
    setUser(newUser);
    await storeUser(newUser);
    return { success: true, error: null };
  }, []);

  const signOut = useCallback(async () => {
    console.log('[AuthContext] Signing out');
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.log('[AuthContext] Supabase sign out error:', e);
      }
    }
    setSession(null);
    setUser(null);
    await storeUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
        if (error) {
          console.log('[AuthContext] Reset password error:', error.message);
          return { success: false, error: error.message };
        }
        console.log('[AuthContext] Password reset email sent');
        return { success: true, error: null };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to send reset email.';
        return { success: false, error: msg };
      }
    }
    console.log('[AuthContext] Password reset not available in offline mode');
    return { success: true, error: null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true, error: null };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to update password.';
        return { success: false, error: msg };
      }
    }
    return { success: true, error: null };
  }, []);

  const clearError = useCallback(() => setAuthError(null), []);

  return useMemo(() => ({
    session: session ?? (user ? { user } : null),
    user,
    userId: user?.id ?? null,
    isLoading,
    isAuthenticated: !!user,
    authError,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    clearError,
  }), [user, session, isLoading, authError, signUp, signIn, signOut, resetPassword, updatePassword, clearError]);
});
