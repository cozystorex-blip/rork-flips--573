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
    <View style={scanStyles.wrapper}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          scanStyles.touchArea,
          pressed && { transform: [{ scale: 0.95 }] },
        ]}
        testID="tab-scan-button"
      >
        <View style={scanStyles.halfCircle}>
          <View style={scanStyles.iconWrap}>
            <Scan size={28} color="#FFFFFF" strokeWidth={2.4} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const HALF_SIZE = 64;

const scanStyles = StyleSheet.create({
  wrapper: {
    position: "relative",
    top: -HALF_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    width: HALF_SIZE + 16,
    height: HALF_SIZE,
  },
  touchArea: {
    width: HALF_SIZE + 16,
    height: HALF_SIZE,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  halfCircle: {
    width: HALF_SIZE + 16,
    height: HALF_SIZE,
    borderTopLeftRadius: (HALF_SIZE + 16) / 2,
    borderTopRightRadius: (HALF_SIZE + 16) / 2,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconWrap: {
    marginTop: 6,
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
