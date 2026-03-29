import { Tabs } from "expo-router";
import { Home, Heart, Receipt, User } from "lucide-react-native";
import React from "react";

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
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="receipts"
        options={{
          title: "Receipts",
          tabBarIcon: ({ color, size }) => <Receipt size={size} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} strokeWidth={1.8} />,
        }}
      />
    </Tabs>
  );
}
