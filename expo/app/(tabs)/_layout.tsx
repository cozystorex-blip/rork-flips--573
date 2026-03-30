import { Tabs, useRouter } from "expo-router";
import { Home, Heart, Receipt, User } from "lucide-react-native";
import React, { useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";

const SCAN_WIDTH = 72;
const SCAN_HEIGHT = 40;

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
          pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
        ]}
        testID="tab-scan-button"
      >
        <View style={scanStyles.halfCircle}>
          <View style={scanStyles.scannerIcon}>
            <View style={scanStyles.cornerTL} />
            <View style={scanStyles.cornerTR} />
            <View style={scanStyles.cornerBL} />
            <View style={scanStyles.cornerBR} />
            <View style={scanStyles.scanLine} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const scanStyles = StyleSheet.create({
  wrapper: {
    position: "relative",
    top: -SCAN_HEIGHT + 2,
    justifyContent: "center",
    alignItems: "center",
    width: SCAN_WIDTH,
    height: SCAN_HEIGHT + 10,
  },
  touchArea: {
    width: SCAN_WIDTH,
    height: SCAN_HEIGHT + 10,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  halfCircle: {
    width: SCAN_WIDTH,
    height: SCAN_HEIGHT,
    borderTopLeftRadius: SCAN_WIDTH / 2,
    borderTopRightRadius: SCAN_WIDTH / 2,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0D7A2F",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  scannerIcon: {
    width: 24,
    height: 20,
    marginTop: 4,
    position: "relative",
  },
  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 7,
    height: 7,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderColor: "#FFFFFF",
    borderTopLeftRadius: 2,
  },
  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 7,
    height: 7,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: "#FFFFFF",
    borderTopRightRadius: 2,
  },
  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 7,
    height: 7,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderColor: "#FFFFFF",
    borderBottomLeftRadius: 2,
  },
  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 7,
    height: 7,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: "#FFFFFF",
    borderBottomRightRadius: 2,
  },
  scanLine: {
    position: "absolute",
    top: "45%" as any,
    left: 3,
    right: 3,
    height: 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 1,
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
