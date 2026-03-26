import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, TextStyle } from 'react-native';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  style?: TextStyle;
}

export default function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  style,
}: AnimatedCounterProps) {
  const animValue = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = React.useState('0');

  useEffect(() => {
    animValue.setValue(0);
    const anim = Animated.timing(animValue, {
      toValue: value,
      duration: 900,
      useNativeDriver: false,
    });
    anim.start();

    const listener = animValue.addListener(({ value: v }) => {
      setDisplay(v.toFixed(decimals));
    });

    return () => {
      anim.stop();
      animValue.removeListener(listener);
    };
  }, [value, decimals, animValue]);

  if (value === 0) {
    return (
      <Text style={[styles.text, style]}>
        {prefix}0.00{suffix}
      </Text>
    );
  }

  return (
    <Text style={[styles.text, style]}>
      {prefix}
      {display}
      {suffix}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
});
