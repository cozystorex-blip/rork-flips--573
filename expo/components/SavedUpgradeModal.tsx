import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Bookmark, ScanLine, Shield, X, Zap, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePremium, type PlanType } from '@/contexts/PremiumContext';

const { width: SCREEN_W } = Dimensions.get('window');

interface SavedUpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  currentCount: number;
  freeLimit: number;
}

const BENEFITS: { icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>; label: string }[] = [
  { icon: Shield, label: 'Ad-free experience' },
  { icon: Bookmark, label: 'Unlimited saves' },
  { icon: ScanLine, label: 'Unlimited scan history' },
];

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://rork.app/privacy';

export default function SavedUpgradeModal({ visible, onClose, currentCount, freeLimit }: SavedUpgradeModalProps) {
  const {
    purchaseWithPlan, restorePurchases, isPurchasing, isRestoring,
    annualPriceRaw,
  } = usePremium();
  const selectedPlan: PlanType = 'annual';
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, tension: 120, friction: 14 }),
      ]).start();
    } else {
      backdropAnim.setValue(0);
      slideAnim.setValue(0);
    }
  }, [visible, backdropAnim, slideAnim]);

  const handleClose = useCallback(() => {
    if (isPurchasing || isRestoring) return;
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [backdropAnim, slideAnim, onClose, isPurchasing, isRestoring]);

  const handleUpgrade = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    purchaseWithPlan(selectedPlan);
  }, [purchaseWithPlan, selectedPlan]);

  const handleRestore = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    restorePurchases();
  }, [restorePurchases]);

  const isBusy = isPurchasing || isRestoring;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
        </Pressable>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: slideAnim,
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [60, 0],
                }),
              }],
            },
          ]}
        >
          <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={12} testID="upgrade-close">
            <X size={18} color="#666666" strokeWidth={2} />
          </Pressable>

          <View style={styles.iconRow}>
            <View style={styles.iconBubble}>
              <Zap size={28} color="#22C55E" strokeWidth={2} fill="#22C55E" />
            </View>
          </View>

          <Text style={styles.headline}>You've hit your free limit</Text>
          <Text style={styles.subline}>
            {currentCount} of {freeLimit} saved items used.{'\n'}
            Upgrade to keep saving finds, scans, and value items.
          </Text>

          <View style={styles.benefitsList}>
            {BENEFITS.map((b, idx) => {
              const Icon = b.icon;
              return (
                <View key={idx} style={styles.benefitRow}>
                  <View style={styles.benefitDot}>
                    <Icon size={14} color="#22C55E" strokeWidth={2} />
                  </View>
                  <Text style={styles.benefitText}>{b.label}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planLabelSelected}>Yearly</Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>BEST VALUE</Text>
              </View>
            </View>
            <Text style={styles.planPriceSelected}>{annualPriceRaw}/yr</Text>
            <Text style={styles.planSubSelected}>That's just ~$2.50/mo</Text>
          </View>

          <Pressable
            onPress={handleUpgrade}
            disabled={isBusy}
            style={({ pressed }) => [
              styles.upgradeBtn,
              pressed && !isBusy && styles.upgradeBtnPressed,
              isBusy && styles.upgradeBtnDisabled,
            ]}
            testID="upgrade-btn"
          >
            {isPurchasing ? (
              <ActivityIndicator size="small" color="#0A0A0A" />
            ) : (
              <>
                <Zap size={16} color="#0A0A0A" strokeWidth={2.2} fill="#0A0A0A" />
                <Text style={styles.upgradeBtnText}>
                  Subscribe — {annualPriceRaw}/yr
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={handleRestore}
            disabled={isBusy}
            style={styles.restoreBtn}
            testID="restore-btn"
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color="#555555" />
            ) : (
              <View style={styles.restoreRow}>
                <RotateCcw size={12} color="#555555" strokeWidth={2} />
                <Text style={styles.restoreText}>Restore Purchases</Text>
              </View>
            )}
          </Pressable>

          <View style={styles.legalRow}>
            <Text
              style={styles.legalLink}
              onPress={() => void Linking.openURL(TERMS_URL)}
            >
              Terms of Use
            </Text>
            <Text style={styles.legalDot}>·</Text>
            <Text
              style={styles.legalLink}
              onPress={() => void Linking.openURL(PRIVACY_URL)}
            >
              Privacy Policy
            </Text>
          </View>

          <Text style={styles.legalDisclaimer}>
            Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
          </Text>

          <Pressable onPress={handleClose} disabled={isBusy} testID="upgrade-later-btn">
            <Text style={styles.laterText}>Maybe later</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  card: {
    width: Math.min(SCREEN_W - 48, 380),
    backgroundColor: '#111111',
    borderRadius: 20,
    paddingTop: 28,
    paddingBottom: 18,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  iconRow: {
    marginBottom: 16,
  },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#22C55E15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22C55E33',
  },
  headline: {
    fontSize: 19,
    fontWeight: '700' as const,
    color: '#F5F5F5',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subline: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  benefitsList: {
    width: '100%',
    marginBottom: 20,
    gap: 10,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitDot: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#22C55E12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#F5F5F5',
    flex: 1,
  },
  planCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#22C55E',
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#22C55E08',
    marginBottom: 18,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planLabelSelected: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#22C55E',
    letterSpacing: -0.1,
  },
  saveBadge: {
    backgroundColor: '#22C55E',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  saveBadgeText: {
    fontSize: 8,
    fontWeight: '800' as const,
    color: '#0A0A0A',
    letterSpacing: 0.5,
  },
  planPriceSelected: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#F5F5F5',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  planSubSelected: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#666666',
    marginTop: 2,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: '100%',
    minHeight: 48,
  },
  upgradeBtnPressed: {
    backgroundColor: '#16A34A',
    transform: [{ scale: 0.97 }],
  },
  upgradeBtnDisabled: {
    opacity: 0.7,
  },
  upgradeBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0A0A0A',
    letterSpacing: -0.2,
  },
  restoreBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 30,
  },
  restoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  restoreText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#555555',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  legalLink: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#555555',
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontSize: 11,
    color: '#333333',
  },
  legalDisclaimer: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: '#444444',
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  laterText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#555555',
    marginTop: 10,
  },
});
