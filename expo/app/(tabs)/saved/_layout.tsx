import { Stack } from 'expo-router';
import React from 'react';
export default function SavedLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0A0A' },
      }}
    />
  );
}
