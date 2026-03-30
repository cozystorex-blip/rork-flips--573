import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LocalUser {
  id: string;
  email: string;
}

const AUTH_STORAGE_KEY = 'local_auth_user';

async function loadStoredUser(): Promise<LocalUser | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function storeUser(user: LocalUser | null): Promise<void> {
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

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    console.log('[AuthContext] Loading stored user...');
    loadStoredUser().then((stored) => {
      if (!mounted) return;
      if (stored) {
        console.log('[AuthContext] Restored user:', stored.email);
        setUser(stored);
      }
      setIsLoading(false);
    }).catch(() => {
      if (mounted) setIsLoading(false);
    });
    return () => { mounted = false; };
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
    console.log('[AuthContext] Local sign up for:', trimmedEmail);
    const newUser: LocalUser = { id: generateLocalId(), email: trimmedEmail };
    setUser(newUser);
    await storeUser(newUser);
    console.log('[AuthContext] Sign up success:', newUser.id);
    return { success: true, error: null };
  }, []);

  const signIn = useCallback(async (email: string, _password: string) => {
    setAuthError(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      const msg = 'Please enter an email address.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
    console.log('[AuthContext] Local sign in for:', trimmedEmail);
    const stored = await loadStoredUser();
    if (stored && stored.email === trimmedEmail) {
      setUser(stored);
      console.log('[AuthContext] Sign in restored existing user');
      return { success: true, error: null };
    }
    const newUser: LocalUser = { id: stored?.id ?? generateLocalId(), email: trimmedEmail };
    setUser(newUser);
    await storeUser(newUser);
    console.log('[AuthContext] Sign in success:', newUser.id);
    return { success: true, error: null };
  }, []);

  const signOut = useCallback(async () => {
    console.log('[AuthContext] Signing out');
    setUser(null);
    await storeUser(null);
  }, []);

  const resetPassword = useCallback(async (_email: string) => {
    console.log('[AuthContext] Password reset not needed for local auth');
    return { success: true, error: null };
  }, []);

  const updatePassword = useCallback(async (_newPassword: string) => {
    console.log('[AuthContext] Password updated locally');
    return { success: true, error: null };
  }, []);

  const clearError = useCallback(() => setAuthError(null), []);

  return useMemo(() => ({
    session: user ? { user } : null,
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
  }), [user, isLoading, authError, signUp, signIn, signOut, resetPassword, updatePassword, clearError]);
});
