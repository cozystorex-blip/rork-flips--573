import { Stack } from 'expo-router';
import React from 'react';
export default function ReceiptsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F2F2F7' },
      }}
    />
  );
}
