import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function ScanPlaceholder() {
  return <View style={styles.root} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
});
