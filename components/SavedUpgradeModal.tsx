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
import { Bookmark, ScanLine, TrendingUp, X, Crown, Archive, RotateCcw } from 'lucide-react-native';
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
  { icon: Bookmark, label: 'Unlimited saved items' },
  { icon: ScanLine, label: 'Unlimited scan history' },
  { icon: TrendingUp, label: 'Full resale value tracking' },
  { icon: Archive, label: 'Extended saved collection' },
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
            <X size={18} color="#AEAEB2" strokeWidth={2} />
          </Pressable>

          <View style={styles.iconRow}>
            <View style={styles.crownBubble}>
              <Crown size={28} color="#D4A017" strokeWidth={2} />
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
                    <Icon size={14} color="#1B5E3B" strokeWidth={2} />
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
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Crown size={16} color="#FFFFFF" strokeWidth={2.2} />
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
              <ActivityIndicator size="small" color="#AEAEB2" />
            ) : (
              <View style={styles.restoreRow}>
                <RotateCcw size={12} color="#AEAEB2" strokeWidth={2} />
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    width: Math.min(SCREEN_W - 48, 380),
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 28,
    paddingBottom: 18,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRow: {
    marginBottom: 16,
  },
  crownBubble: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F5E6A3',
  },
  headline: {
    fontSize: 19,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subline: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#6B7280',
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
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    flex: 1,
  },
  planCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#1B7A45',
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
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
    color: '#1B5E3B',
    letterSpacing: -0.1,
  },
  saveBadge: {
    backgroundColor: '#1B7A45',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  saveBadgeText: {
    fontSize: 8,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  planPriceSelected: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1B5E3B',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  planSubSelected: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#3D8B5E',
    marginTop: 2,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1B7A45',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: '100%',
    minHeight: 48,
    shadowColor: '#1B7A45',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeBtnPressed: {
    backgroundColor: '#166B3D',
    transform: [{ scale: 0.97 }],
  },
  upgradeBtnDisabled: {
    opacity: 0.7,
  },
  upgradeBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
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
    color: '#8E8E93',
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
    color: '#8E8E93',
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontSize: 11,
    color: '#C7C7CC',
  },
  legalDisclaimer: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: '#AEAEB2',
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  laterText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8E8E93',
    marginTop: 10,
  },
});
