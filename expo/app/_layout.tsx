import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import AppProviders from '@/components/providers/AppProviders';
import { initializeAds } from '@/services/adService';
import ProfileErrorBoundary from '@/components/ProfileErrorBoundary';
import SubscriptionPaywall from '@/components/SubscriptionPaywall';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const hasNavigated = React.useRef(false);

  useEffect(() => {
    if (isLoading) {
      console.log('[AuthGate] Still loading auth state, waiting...');
      return;
    }

    const inAuthScreen = segments[0] === 'auth';

    if (!isAuthenticated && !inAuthScreen) {
      console.log('[AuthGate] Not authenticated, redirecting to auth');
      hasNavigated.current = true;
      try {
        router.replace('/auth');
      } catch (e) {
        console.log('[AuthGate] Navigation to auth failed:', e);
      }
    } else if (isAuthenticated && inAuthScreen) {
      console.log('[AuthGate] Authenticated, redirecting to home');
      hasNavigated.current = true;
      try {
        router.replace('/');
      } catch (e) {
        console.log('[AuthGate] Navigation to home failed:', e);
      }
    }
  }, [isAuthenticated, isLoading, segments, router]);

  return <>{children}</>;
}

function PaywallGate({ children }: { children: React.ReactNode }) {
  const { isPremium, isLoading } = usePremium();
  const { isAuthenticated } = useAuth();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const hasShownRef = React.useRef(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isPremium && !hasShownRef.current) {
      console.log('[PaywallGate] Showing subscription paywall on app open');
      const timer = setTimeout(() => {
        setPaywallVisible(true);
        hasShownRef.current = true;
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, isPremium]);

  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active' && isAuthenticated && !isPremium && !isLoading) {
        console.log('[PaywallGate] App foregrounded, showing paywall');
        setPaywallVisible(true);
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [isAuthenticated, isPremium, isLoading]);

  const handleClosePaywall = useCallback(() => {
    console.log('[PaywallGate] Paywall dismissed');
    setPaywallVisible(false);
  }, []);

  return (
    <>
      {children}
      <SubscriptionPaywall visible={paywallVisible} onClose={handleClosePaywall} />
    </>
  );
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back', headerStyle: { backgroundColor: '#FFFFFF' }, headerTintColor: '#1C1C1E', headerTitleStyle: { color: '#1C1C1E', fontWeight: '600' as const }, contentStyle: { backgroundColor: '#F2F2F7' }, headerShadowVisible: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="auth"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="log-entry"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="profile/[id]"
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="place-profile"
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="map-full"
        options={{
          presentation: 'fullScreenModal',
          headerShown: false,
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create-block"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="post-deal"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="smart-scan"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="post-detail"
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="receipt-detail"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
    void initializeAds();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppProviders>
          <ProfileErrorBoundary>
            <AuthGate>
              <PaywallGate>
                <RootLayoutNav />
              </PaywallGate>
            </AuthGate>
          </ProfileErrorBoundary>
        </AppProviders>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
