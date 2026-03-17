import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '@/contexts/AuthContext';
import AppProviders from '@/components/providers/AppProviders';
import { initializeAds } from '@/services/adService';
import ProfileErrorBoundary from '@/components/ProfileErrorBoundary';

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
        router.replace('/auth' as any);
      } catch (e) {
        console.log('[AuthGate] Navigation to auth failed:', e);
      }
    } else if (isAuthenticated && inAuthScreen) {
      console.log('[AuthGate] Authenticated, redirecting to home');
      hasNavigated.current = true;
      try {
        router.replace('/' as any);
      } catch (e) {
        console.log('[AuthGate] Navigation to home failed:', e);
      }
    }
  }, [isAuthenticated, isLoading, segments, router]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back', headerStyle: { backgroundColor: '#111111' }, headerTintColor: '#F5F5F7', headerTitleStyle: { color: '#F5F5F7', fontWeight: '700' as const }, contentStyle: { backgroundColor: '#0A0A0A' } }}>
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
              <RootLayoutNav />
            </AuthGate>
          </ProfileErrorBoundary>
        </AppProviders>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
