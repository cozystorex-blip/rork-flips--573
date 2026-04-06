import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';

export default function ScanTabScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      const timer = setTimeout(() => {
        router.push('/smart-scan');
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isFocused, router]);

  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color="#0058A3" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
