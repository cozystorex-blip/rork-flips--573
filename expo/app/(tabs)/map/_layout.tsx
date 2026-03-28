import { Stack } from 'expo-router';
import React from 'react';
export default function DealsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F5F3EF' },
      }}
    />
  );
}
