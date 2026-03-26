import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Camera, Crosshair, Sparkles, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import Colors from '@/constants/colors';
import { useCreatures } from '@/contexts/CreatureContext';
import { MOCK_CREATURES, RARITY_CONFIG } from '@/mocks/creatures';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const VIEWFINDER_SIZE = SCREEN_WIDTH * 0.72;

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const { addCreature } = useCreatures();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<(typeof MOCK_CREATURES)[number] | null>(null);
  const [showResult, setShowResult] = useState(false);

  const scanPulse = useRef(new Animated.Value(0)).current;
  const scanLineY = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const cornerPulse = useRef(new Animated.Value(1)).current;
  const bgPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(cornerPulse, { toValue: 1.06, duration: 2000, useNativeDriver: true }),
        Animated.timing(cornerPulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bgPulse, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(bgPulse, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, [cornerPulse, bgPulse]);

  const startScan = useCallback(() => {
    if (scanning) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScanning(true);
    setShowResult(false);

    scanLineY.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineY, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(scanLineY, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scanPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(scanPulse, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    setTimeout(() => {
      const randomCreature = MOCK_CREATURES[Math.floor(Math.random() * MOCK_CREATURES.length)];
      const newCreature = {
        ...randomCreature,
        id: Date.now().toString(),
        scannedAt: new Date().toISOString(),
      };

      setScanning(false);
      setResult(newCreature);
      setShowResult(true);
      addCreature(newCreature);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.spring(resultSlide, {
        toValue: 0,
        tension: 50,
        friction: 9,
        useNativeDriver: true,
      }).start();
    }, 3000);
  }, [scanning, scanLineY, scanPulse, resultSlide, addCreature]);

  const dismissResult = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(resultSlide, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowResult(false);
      setResult(null);
    });
  }, [resultSlide]);

  const scanLineTranslate = scanLineY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, VIEWFINDER_SIZE - 4],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.bgGlow, { opacity: bgPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] }) }]} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <Camera size={20} color={Colors.accent} strokeWidth={2} />
          <Text style={styles.headerTitle}>Scan Mode</Text>
        </View>
        {scanning && (
          <View style={styles.scanningBadge}>
            <View style={styles.scanningDot} />
            <Text style={styles.scanningText}>Analyzing...</Text>
          </View>
        )}
      </View>

      <View style={styles.viewfinderArea}>
        <Animated.View style={[styles.viewfinder, { transform: [{ scale: cornerPulse }] }]}>
          <Svg width={VIEWFINDER_SIZE} height={VIEWFINDER_SIZE} viewBox={`0 0 ${VIEWFINDER_SIZE} ${VIEWFINDER_SIZE}`}>
            <Rect x={0} y={0} width={VIEWFINDER_SIZE} height={VIEWFINDER_SIZE} rx={24} fill="rgba(0,0,0,0.3)" stroke={scanning ? Colors.accent : Colors.border} strokeWidth={2} />
            <Line x1={30} y1={2} x2={70} y2={2} stroke={Colors.accent} strokeWidth={3} strokeLinecap="round" />
            <Line x1={2} y1={30} x2={2} y2={70} stroke={Colors.accent} strokeWidth={3} strokeLinecap="round" />
            <Line x1={VIEWFINDER_SIZE - 70} y1={2} x2={VIEWFINDER_SIZE - 30} y2={2} stroke={Colors.accent} strokeWidth={3} strokeLinecap="round" />
            <Line x1={VIEWFINDER_SIZE - 2} y1={30} x2={VIEWFINDER_SIZE - 2} y2={70} stroke={Colors.accent} strokeWidth={3} strokeLinecap="round" />
            <Line x1={30} y1={VIEWFINDER_SIZE - 2} x2={70} y2={VIEWFINDER_SIZE - 2} stroke={Colors.accent} strokeWidth={3} strokeLinecap="round" />
            <Line x1={2} y1={VIEWFINDER_SIZE - 70} x2={2} y2={VIEWFINDER_SIZE - 30} stroke={Colors.accent} strokeWidth={3} strokeLinecap="round" />
            <Line x1={VIEWFINDER_SIZE - 70} y1={VIEWFINDER_SIZE - 2} x2={VIEWFINDER_SIZE - 30} y2={VIEWFINDER_SIZE - 2} stroke={Colors.accent} strokeWidth={3} strokeLinecap="round" />
            <Line x1={VIEWFINDER_SIZE - 2} y1={VIEWFINDER_SIZE - 70} x2={VIEWFINDER_SIZE - 2} y2={VIEWFINDER_SIZE - 30} stroke={Colors.accent} strokeWidth={3} strokeLinecap="round" />
            <Circle cx={VIEWFINDER_SIZE / 2} cy={VIEWFINDER_SIZE / 2} r={3} fill={Colors.accent} opacity={0.6} />
            <Line x1={VIEWFINDER_SIZE / 2 - 12} y1={VIEWFINDER_SIZE / 2} x2={VIEWFINDER_SIZE / 2 - 4} y2={VIEWFINDER_SIZE / 2} stroke={Colors.accent} strokeWidth={1} opacity={0.4} />
            <Line x1={VIEWFINDER_SIZE / 2 + 4} y1={VIEWFINDER_SIZE / 2} x2={VIEWFINDER_SIZE / 2 + 12} y2={VIEWFINDER_SIZE / 2} stroke={Colors.accent} strokeWidth={1} opacity={0.4} />
            <Line x1={VIEWFINDER_SIZE / 2} y1={VIEWFINDER_SIZE / 2 - 12} x2={VIEWFINDER_SIZE / 2} y2={VIEWFINDER_SIZE / 2 - 4} stroke={Colors.accent} strokeWidth={1} opacity={0.4} />
            <Line x1={VIEWFINDER_SIZE / 2} y1={VIEWFINDER_SIZE / 2 + 4} x2={VIEWFINDER_SIZE / 2} y2={VIEWFINDER_SIZE / 2 + 12} stroke={Colors.accent} strokeWidth={1} opacity={0.4} />
          </Svg>

          {scanning && (
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [{ translateY: scanLineTranslate }],
                  opacity: scanPulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
                },
              ]}
            />
          )}

          <View style={styles.viewfinderCenter}>
            {!scanning && !showResult && (
              <View style={styles.pawPlaceholder}>
                <Svg width={60} height={60} viewBox="0 0 24 24" fill="none">
                  <Circle cx="9" cy="6.5" r="2" fill={Colors.textTertiary} opacity={0.5} />
                  <Circle cx="15" cy="6.5" r="2" fill={Colors.textTertiary} opacity={0.5} />
                  <Circle cx="5.5" cy="10.5" r="1.8" fill={Colors.textTertiary} opacity={0.5} />
                  <Circle cx="18.5" cy="10.5" r="1.8" fill={Colors.textTertiary} opacity={0.5} />
                  <Path d="M8 15.5C8 13 9.5 11.5 12 11.5C14.5 11.5 16 13 16 15.5C16 18 14 20 12 20C10 20 8 18 8 15.5Z" fill={Colors.textTertiary} opacity={0.5} />
                </Svg>
                <Text style={styles.pawText}>Point at an animal</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </View>

      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 100 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.scanButton,
            scanning && styles.scanButtonActive,
            pressed && { transform: [{ scale: 0.95 }] },
          ]}
          onPress={scanning ? undefined : startScan}
          testID="scan-button"
        >
          <View style={[styles.scanButtonInner, scanning && styles.scanButtonInnerActive]}>
            {scanning ? (
              <Animated.View style={{ opacity: scanPulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }}>
                <Crosshair size={28} color={Colors.dark} strokeWidth={2.5} />
              </Animated.View>
            ) : (
              <Crosshair size={28} color={Colors.dark} strokeWidth={2.5} />
            )}
          </View>
        </Pressable>
        <Text style={styles.scanHint}>{scanning ? 'Identifying creature...' : 'Tap to scan'}</Text>
      </View>

      {showResult && result && (
        <Animated.View style={[styles.resultOverlay, { transform: [{ translateY: resultSlide }] }]}>
          <Pressable style={styles.resultDismiss} onPress={dismissResult}>
            <View style={styles.resultHandle} />
          </Pressable>
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Sparkles size={16} color={Colors.gold} strokeWidth={2} />
              <Text style={styles.resultDiscovered}>Creature Discovered!</Text>
            </View>
            <Image source={{ uri: result.imageUrl }} style={styles.resultImage} contentFit="cover" />
            <Text style={styles.resultName}>{result.name}</Text>
            <Text style={styles.resultSciName}>{result.scientificName}</Text>
            <View style={[styles.resultRarity, { backgroundColor: RARITY_CONFIG[result.rarity]?.bgColor ?? 'rgba(144,164,174,0.15)' }]}>
              <Text style={[styles.resultRarityText, { color: RARITY_CONFIG[result.rarity]?.color ?? '#90A4AE' }]}>
                {RARITY_CONFIG[result.rarity]?.label ?? 'Common'}
              </Text>
            </View>
            <View style={styles.resultXpRow}>
              <Zap size={16} color={Colors.accent} strokeWidth={2} />
              <Text style={styles.resultXpText}>+{result.xpReward} XP earned!</Text>
            </View>
            <Text style={styles.resultFunFact}>{result.funFact}</Text>
            <Pressable style={styles.resultCloseBtn} onPress={dismissResult}>
              <Text style={styles.resultCloseBtnText}>Continue Exploring</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  bgGlow: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    width: '80%',
    height: '40%',
    borderRadius: 200,
    backgroundColor: Colors.accentGlow,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  scanningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,230,118,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.2)',
  },
  scanningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  scanningText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
  viewfinderArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    position: 'absolute',
    top: 2,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: Colors.accent,
    borderRadius: 1,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  viewfinderCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pawPlaceholder: {
    alignItems: 'center',
    gap: 12,
  },
  pawText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  bottomArea: {
    alignItems: 'center',
    paddingTop: 16,
  },
  scanButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.darkCardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  scanButtonActive: {
    borderColor: Colors.accentDim,
    backgroundColor: Colors.accent,
  },
  scanButtonInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButtonInnerActive: {
    backgroundColor: Colors.accentDim,
  },
  scanHint: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  resultOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.darkCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomWidth: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  resultDismiss: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resultHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
  },
  resultCard: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  resultDiscovered: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.gold,
  },
  resultImage: {
    width: 100,
    height: 100,
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  resultName: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  resultSciName: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    fontStyle: 'italic' as const,
    marginBottom: 10,
  },
  resultRarity: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 12,
  },
  resultRarityText: {
    fontSize: 12,
    fontWeight: '800' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  resultXpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  resultXpText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.accent,
  },
  resultFunFact: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  resultCloseBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  resultCloseBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.dark,
  },
});
