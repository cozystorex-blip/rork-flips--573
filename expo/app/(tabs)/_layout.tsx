import { Tabs, useRouter } from "expo-router";
import { Home, Heart, Receipt, User, Scan } from "lucide-react-native";
import React, { useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";

function ScanTabButton() {
  const router = useRouter();

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/smart-scan");
  }, [router]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        scanStyles.wrapper,
        pressed && { transform: [{ scale: 0.92 }] },
      ]}
      testID="tab-scan-button"
    >
      <View style={scanStyles.button}>
        <View style={scanStyles.iconCircle}>
          <Scan size={26} color="#FFFFFF" strokeWidth={2.2} />
        </View>
      </View>
    </Pressable>
  );
}

const scanStyles = StyleSheet.create({
  wrapper: {
    position: "relative",
    top: -22,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  iconCircle: {
    justifyContent: "center",
    alignItems: "center",
  },
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#16A34A",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E5EA",
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600" as const,
          letterSpacing: 0.1,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          tabBarIcon: ({ color, size }) => (
            <Heart size={size} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "",
          tabBarButton: () => <ScanTabButton />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
          },
        }}
      />
      <Tabs.Screen
        name="receipts"
        options={{
          title: "Receipts",
          tabBarIcon: ({ color, size }) => (
            <Receipt size={size} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} strokeWidth={1.8} />
          ),
        }}
      />
    </Tabs>
  );
}
