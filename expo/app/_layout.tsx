import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PremiumProvider } from "@/contexts/PremiumContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { ScanHistoryProvider } from "@/contexts/ScanHistoryContext";
import { ScanProcessProvider } from "@/contexts/ScanProcessContext";
import { SavedItemsProvider } from "@/contexts/SavedItemsContext";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="smart-scan" options={{ headerShown: false, presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PremiumProvider>
          <AuthProvider>
            <ProfileProvider>
                <ScanHistoryProvider>
                  <SavedItemsProvider>
                    <ScanProcessProvider>
                      <RootLayoutNav />
                    </ScanProcessProvider>
                  </SavedItemsProvider>
                </ScanHistoryProvider>
            </ProfileProvider>
          </AuthProvider>
        </PremiumProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
