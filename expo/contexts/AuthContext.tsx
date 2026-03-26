import createContextHook from '@nkzw/create-context-hook';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { Session, User } from '@supabase/supabase-js';
import { associateAdProfile } from '@/services/adService';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [_initialCheckDone, setInitialCheckDone] = useState(false);
  const initialCheckRef = useRef(false);

  useEffect(() => {
    console.log('[AuthContext] Initializing auth listener, configured:', isSupabaseConfigured);
    let isMounted = true;

    if (!isSupabaseConfigured) {
      console.log('[AuthContext] Supabase not configured, skipping auth');
      initialCheckRef.current = true;
      setInitialCheckDone(true);
      setIsLoading(false);
      return;
    }

    const initTimeout = setTimeout(() => {
      if (isMounted && !initialCheckRef.current) {
        console.log('[AuthContext] Session check timed out after 10s, continuing without session');
        initialCheckRef.current = true;
        setInitialCheckDone(true);
        setIsLoading(false);
      }
    }, 10000);

    const getSessionSafe = async () => {
      try {
        console.log('[AuthContext] Calling getSession...');
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error) {
          console.log('[AuthContext] getSession returned error:', error.message);
        }
        const s = data?.session ?? null;
        console.log('[AuthContext] Initial session:', s ? 'exists' : 'none', s?.user?.id);
        setSession(s);
        setUser(s?.user ?? null);
      } catch (err) {
        if (!isMounted) return;
        console.log('[AuthContext] getSession threw:', err instanceof Error ? err.message : err);
      } finally {
        if (isMounted) {
          initialCheckRef.current = true;
          setInitialCheckDone(true);
          setIsLoading(false);
        }
      }
    };
    void getSessionSafe();

    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const result = supabase.auth.onAuthStateChange((_event, s) => {
        if (!isMounted) return;
        console.log('[AuthContext] Auth state changed:', _event, s?.user?.id);
        setSession(s);
        setUser(s?.user ?? null);
        try { associateAdProfile(s?.user?.id ?? null); } catch (e) { console.log('[AuthContext] associateAdProfile error:', e); }
        if (!initialCheckRef.current) {
          initialCheckRef.current = true;
          setInitialCheckDone(true);
        }
        setIsLoading(false);
      });
      subscription = result.data.subscription;
    } catch (e) {
      console.log('[AuthContext] onAuthStateChange setup error:', e);
      setInitialCheckDone(true);
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
      clearTimeout(initTimeout);
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      const msg = 'Backend not configured. Please check your Supabase credentials.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
    console.log('[AuthContext] Signing up:', email);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        console.log('[AuthContext] Sign up error:', error.message);
        setAuthError(error.message);
        return { success: false, error: error.message };
      }
      console.log('[AuthContext] Sign up success:', data.user?.id);
      return { success: true, error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign up failed';
      console.log('[AuthContext] Sign up threw:', msg);
      setAuthError(msg);
      return { success: false, error: msg };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      const msg = 'Backend not configured. Please check your Supabase credentials.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
    console.log('[AuthContext] Signing in:', email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.log('[AuthContext] Sign in error:', error.message);
        setAuthError(error.message);
        return { success: false, error: error.message };
      }
      console.log('[AuthContext] Sign in success:', data.user?.id);
      return { success: true, error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign in failed';
      console.log('[AuthContext] Sign in threw:', msg);
      setAuthError(msg);
      return { success: false, error: msg };
    }
  }, []);

  const signOut = useCallback(async () => {
    console.log('[AuthContext] Signing out');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.log('[AuthContext] Sign out error:', error.message);
      }
    } catch (e) {
      console.log('[AuthContext] Sign out threw:', e);
    }
    setSession(null);
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    console.log('[AuthContext] Sending password reset for:', email);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        console.log('[AuthContext] Reset password error:', error.message);
        return { success: false, error: error.message };
      }
      console.log('[AuthContext] Reset email sent successfully');
      return { success: true, error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Password reset failed';
      console.log('[AuthContext] Reset password threw:', msg);
      return { success: false, error: msg };
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    console.log('[AuthContext] Updating password');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        console.log('[AuthContext] Update password error:', error.message);
        return { success: false, error: error.message };
      }
      console.log('[AuthContext] Password updated successfully');
      return { success: true, error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Password update failed';
      console.log('[AuthContext] Update password threw:', msg);
      return { success: false, error: msg };
    }
  }, []);

  const clearError = useCallback(() => setAuthError(null), []);

  return useMemo(() => ({
    session,
    user,
    userId: user?.id ?? null,
    isLoading,
    isAuthenticated: !!session,
    authError,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    clearError,
  }), [session, user, isLoading, authError, signUp, signIn, signOut, resetPassword, updatePassword, clearError]);
});
