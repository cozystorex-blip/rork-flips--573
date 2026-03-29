import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import { PremiumProvider } from "@/contexts/PremiumContext";
import { ExpenseProvider } from "@/contexts/ExpenseContext";
import { ScanHistoryProvider } from "@/contexts/ScanHistoryContext";
import { SavedItemsProvider } from "@/contexts/SavedItemsContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { BlocksProvider } from "@/contexts/BlocksContext";
import { BusinessProvider } from "@/contexts/BusinessContext";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="smart-scan" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="receipt-detail" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="post-detail" options={{ headerShown: false, presentation: "modal" }} />
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
          <PremiumProvider>
            <ExpenseProvider>
              <ScanHistoryProvider>
                <SavedItemsProvider>
                  <ProfileProvider>
                    <BlocksProvider>
                      <BusinessProvider>
                        <RootLayoutNav />
                      </BusinessProvider>
                    </BlocksProvider>
                  </ProfileProvider>
                </SavedItemsProvider>
              </ScanHistoryProvider>
            </ExpenseProvider>
          </PremiumProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
