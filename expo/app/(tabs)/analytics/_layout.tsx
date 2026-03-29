import { Stack } from 'expo-router';
import React from 'react';
export default function AnalyticsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F4F5F0' },
      }}
    />
  );
}
