import { Tabs } from "expo-router";
import { Home, Camera, Bookmark, User } from "lucide-react-native";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#16A34A",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "rgba(0,0,0,0.06)",
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600" as const,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} fill={color === "#16A34A" ? color : "transparent"} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "",
          tabBarIcon: ({ color, size }) => (
            <View style={styles.scanIconWrap}>
              <Camera size={size} color={color} fill={color === "#16A34A" ? color : "transparent"} />
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/smart-scan");
          },
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saves",
          tabBarIcon: ({ color, size }) => <Bookmark size={size} color={color} fill={color === "#16A34A" ? color : "transparent"} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} fill={color === "#16A34A" ? color : "transparent"} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanIconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
