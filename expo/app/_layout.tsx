import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { PremiumProvider } from "@/contexts/PremiumContext";
import { ScanHistoryProvider } from "@/contexts/ScanHistoryContext";
import { SavedItemsProvider } from "@/contexts/SavedItemsContext";
import { ScanProcessProvider } from "@/contexts/ScanProcessContext";
import { ExpenseProvider } from "@/contexts/ExpenseContext";
import { BlocksProvider } from "@/contexts/BlocksContext";
import { BusinessProvider } from "@/contexts/BusinessContext";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="smart-scan" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="code-scanner" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="auth" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="log-entry" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="post-detail" options={{ headerShown: false }} />
      <Stack.Screen name="receipt-detail" options={{ headerShown: false }} />
      <Stack.Screen name="place-profile" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="map-full" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="post-deal" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="create-block" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="+not-found" />
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
        <AuthProvider>
          <ProfileProvider>
            <PremiumProvider>
              <ScanHistoryProvider>
                <SavedItemsProvider>
                  <ExpenseProvider>
                    <BlocksProvider>
                      <BusinessProvider>
                        <ScanProcessProvider>
                          <RootLayoutNav />
                        </ScanProcessProvider>
                      </BusinessProvider>
                    </BlocksProvider>
                  </ExpenseProvider>
                </SavedItemsProvider>
              </ScanHistoryProvider>
            </PremiumProvider>
          </ProfileProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
