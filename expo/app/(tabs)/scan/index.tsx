import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function ScanPlaceholder() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/smart-scan');
  }, [router]);

  return <View style={styles.root} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
});
