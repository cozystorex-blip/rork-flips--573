import { Tabs, useRouter } from "expo-router";
import { Home, Heart, User } from "lucide-react-native";
import React, { useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";

const SCAN_SIZE = 62;

function ScanTabButton() {
  const router = useRouter();

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/smart-scan");
  }, [router]);

  return (
    <View style={scanStyles.outerWrapper}>
      <View style={scanStyles.halfCircleBg} />
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          scanStyles.circle,
          pressed && { opacity: 0.9, transform: [{ scale: 0.93 }] },
        ]}
        testID="tab-scan-button"
      >
        <View style={scanStyles.scannerIcon}>
          <View style={scanStyles.cornerTL} />
          <View style={scanStyles.cornerTR} />
          <View style={scanStyles.cornerBL} />
          <View style={scanStyles.cornerBR} />
          <View style={scanStyles.scanLine} />
        </View>
      </Pressable>
    </View>
  );
}

const scanStyles = StyleSheet.create({
  outerWrapper: {
    width: SCAN_SIZE + 36,
    height: SCAN_SIZE + 10,
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: -(SCAN_SIZE / 2 + 4),
  },
  halfCircleBg: {
    position: "absolute",
    bottom: 0,
    width: SCAN_SIZE + 36,
    height: (SCAN_SIZE + 36) / 2,
    borderTopLeftRadius: (SCAN_SIZE + 36) / 2,
    borderTopRightRadius: (SCAN_SIZE + 36) / 2,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5EA",
  },
  circle: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    borderRadius: SCAN_SIZE / 2,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0D7A2F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    marginBottom: 6,
  },
  scannerIcon: {
    width: 24,
    height: 20,
    position: "relative",
  },
  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 8,
    height: 8,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderColor: "#FFFFFF",
    borderTopLeftRadius: 2,
  },
  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: "#FFFFFF",
    borderTopRightRadius: 2,
  },
  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 8,
    height: 8,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderColor: "#FFFFFF",
    borderBottomLeftRadius: 2,
  },
  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 8,
    height: 8,
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
        name="saved"
        options={{
          title: "",
          tabBarIcon: ({ color, size }) => (
            <Heart size={size} color={color} strokeWidth={1.8} />
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
