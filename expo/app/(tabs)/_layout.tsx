import { Tabs } from 'expo-router';
import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Compass, Grid3x3, User } from 'lucide-react-native';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Colors from '@/constants/colors';

function ScanTabIcon({ focused }: { focused: boolean }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (focused) {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0.7, duration: 1200, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
          ]),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0.3);
    }
  }, [focused, pulseAnim, glowAnim]);

  return (
    <View style={scanStyles.wrapper}>
      <Animated.View style={[scanStyles.glowRing, { opacity: glowAnim, transform: [{ scale: pulseAnim }] }]} />
      <Animated.View style={[scanStyles.container, focused && scanStyles.containerFocused, { transform: [{ scale: pulseAnim }] }]}>
        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
          <Defs>
            <RadialGradient id="pawGlow" cx="12" cy="12" r="12">
              <Stop offset="0" stopColor={Colors.accent} stopOpacity="0.3" />
              <Stop offset="1" stopColor={Colors.accent} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {focused && <Circle cx="12" cy="12" r="12" fill="url(#pawGlow)" />}
          <Circle cx="9" cy="6.5" r="2" fill={focused ? Colors.accent : Colors.textSecondary} />
          <Circle cx="15" cy="6.5" r="2" fill={focused ? Colors.accent : Colors.textSecondary} />
          <Circle cx="5.5" cy="10.5" r="1.8" fill={focused ? Colors.accent : Colors.textSecondary} />
          <Circle cx="18.5" cy="10.5" r="1.8" fill={focused ? Colors.accent : Colors.textSecondary} />
          <Path
            d="M8 15.5C8 13 9.5 11.5 12 11.5C14.5 11.5 16 13 16 15.5C16 18 14 20 12 20C10 20 8 18 8 15.5Z"
            fill={focused ? Colors.accent : Colors.textSecondary}
          />
        </Svg>
        {focused && <View style={scanStyles.scanLine} />}
      </Animated.View>
    </View>
  );
}

const scanStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    width: 72,
    height: 72,
  },
  glowRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accentGlow,
  },
  container: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.darkCard,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  containerFocused: {
    borderColor: Colors.accent,
    backgroundColor: Colors.darkCardAlt,
    shadowColor: Colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  scanLine: {
    position: 'absolute',
    bottom: 10,
    width: 24,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.accent,
    opacity: 0.6,
  },
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.dark,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600' as const,
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => <Compass size={size} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => <ScanTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: 'Collection',
          tabBarIcon: ({ color, size }) => <Grid3x3 size={size} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} strokeWidth={1.8} />,
        }}
      />
    </Tabs>
  );
}
