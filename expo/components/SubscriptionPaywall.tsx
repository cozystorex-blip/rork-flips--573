import React, { useRef, useEffect, useCallback, useState } from 'react';
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
  ScrollView,
  Platform,
} from 'react-native';
import {
  Zap,
  X,
  Bookmark,
  ScanLine,
  Shield,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePremium, type PlanType } from '@/contexts/PremiumContext';
import { useSavedItems } from '@/contexts/SavedItemsContext';
import { useScanHistory } from '@/contexts/ScanHistoryContext';

const { height: SCREEN_H } = Dimensions.get('window');

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://rork.app/privacy';

const BENEFITS = [
  { icon: Shield, label: 'Ad-free experience', desc: 'No interruptions' },
  { icon: Bookmark, label: 'Unlimited saves', desc: 'Never lose a deal' },
  { icon: ScanLine, label: 'Scan history', desc: 'Full access to scans' },
];

interface SubscriptionPaywallProps {
  visible: boolean;
  onClose: () => void;
}

export default function SubscriptionPaywall({ visible, onClose }: SubscriptionPaywallProps) {
  const {
    purchaseWithPlan, restorePurchases, isPurchasing, isRestoring,
    annualPriceRaw, monthlyPriceRaw,
  } = usePremium();
  const { totalSavedCount, freeLimit } = useSavedItems();
  const { totalCount: scanCount, freeLimit: scanFreeLimit } = useScanHistory();

  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.6, duration: 1400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      backdropAnim.setValue(0);
      slideAnim.setValue(SCREEN_H);
    }
  }, [visible, backdropAnim, slideAnim, glowAnim]);

  const handleClose = useCallback(() => {
    if (isPurchasing || isRestoring) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 250, useNativeDriver: true }),
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

  const savesUsed = Math.min(totalSavedCount, freeLimit);
  const scansUsed = Math.min(scanCount, scanFreeLimit);
  const savesPercent = (savesUsed / freeLimit) * 100;
  const scansPercent = (scansUsed / scanFreeLimit) * 100;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={16} testID="paywall-close">
            <X size={18} color="#666666" strokeWidth={2.2} />
          </Pressable>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.heroSection}>
              <Animated.View style={[styles.iconContainer, { opacity: glowAnim }]}>
                <View style={styles.iconInner}>
                  <Zap size={34} color="#22C55E" strokeWidth={2.2} fill="#22C55E" />
                </View>
              </Animated.View>
              <View style={styles.heroTextWrap}>
                <Text style={styles.heroLabel}>FLIPS</Text>
                <Text style={styles.heroTitle}>Go Premium</Text>
              </View>
              <Text style={styles.heroSubtitle}>
                Unlock the full Flips experience with unlimited saves, scans, and zero ads.
              </Text>
            </View>

            <View style={styles.usageSection}>
              <View style={styles.usageRow}>
                <View style={styles.usageItem}>
                  <View style={styles.usageLabelRow}>
                    <Bookmark size={12} color="#22C55E" strokeWidth={2} />
                    <Text style={styles.usageLabel}>Saves</Text>
                    <Text style={styles.usageCount}>{savesUsed}/{freeLimit}</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${Math.min(savesPercent, 100)}%` }, savesPercent >= 85 && styles.progressBarWarning]} />
                  </View>
                </View>
                <View style={styles.usageItem}>
                  <View style={styles.usageLabelRow}>
                    <ScanLine size={12} color="#22C55E" strokeWidth={2} />
                    <Text style={styles.usageLabel}>Scans</Text>
                    <Text style={styles.usageCount}>{scansUsed}/{scanFreeLimit}</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${Math.min(scansPercent, 100)}%` }, scansPercent >= 85 && styles.progressBarWarning]} />
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.benefitsSection}>
              {BENEFITS.map((b, idx) => {
                const Icon = b.icon;
                return (
                  <View key={idx} style={styles.benefitRow}>
                    <View style={styles.benefitIcon}>
                      <Icon size={18} color="#22C55E" strokeWidth={2} />
                    </View>
                    <View style={styles.benefitText}>
                      <Text style={styles.benefitLabel}>{b.label}</Text>
                      <Text style={styles.benefitDesc}>{b.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.plansSection}>
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setSelectedPlan('annual');
                }}
                style={[
                  styles.planOption,
                  selectedPlan === 'annual' && styles.planOptionSelected,
                ]}
                testID="paywall-plan-annual"
              >
                {selectedPlan === 'annual' && (
                  <View style={styles.bestValueBadge}>
                    <Sparkles size={9} color="#0A0A0A" strokeWidth={2.5} />
                    <Text style={styles.bestValueText}>BEST VALUE</Text>
                  </View>
                )}
                <View style={styles.planRadio}>
                  {selectedPlan === 'annual' && <View style={styles.planRadioInner} />}
                </View>
                <View style={styles.planInfo}>
                  <Text style={[styles.planName, selectedPlan === 'annual' && styles.planNameSelected]}>
                    Yearly
                  </Text>
                  <Text style={styles.planPrice}>{annualPriceRaw}/year</Text>
                  <Text style={styles.planSub}>~$2.50/mo · Save 58%</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setSelectedPlan('monthly');
                }}
                style={[
                  styles.planOption,
                  selectedPlan === 'monthly' && styles.planOptionSelected,
                ]}
                testID="paywall-plan-monthly"
              >
                <View style={styles.planRadio}>
                  {selectedPlan === 'monthly' && <View style={styles.planRadioInner} />}
                </View>
                <View style={styles.planInfo}>
                  <Text style={[styles.planName, selectedPlan === 'monthly' && styles.planNameSelected]}>
                    Monthly
                  </Text>
                  <Text style={styles.planPrice}>{monthlyPriceRaw}/month</Text>
                  <Text style={styles.planSub}>Cancel anytime</Text>
                </View>
              </Pressable>
            </View>

            <Pressable
              onPress={handleUpgrade}
              disabled={isBusy}
              style={({ pressed }) => [
                styles.upgradeBtn,
                pressed && !isBusy && styles.upgradeBtnPressed,
                isBusy && styles.upgradeBtnDisabled,
              ]}
              testID="paywall-subscribe-btn"
            >
              {isPurchasing ? (
                <ActivityIndicator size="small" color="#0A0A0A" />
              ) : (
                <>
                  <Text style={styles.upgradeBtnText}>
                    Continue with {selectedPlan === 'annual' ? 'Yearly' : 'Monthly'}
                  </Text>
                  <ArrowRight size={18} color="#0A0A0A" strokeWidth={2.5} />
                </>
              )}
            </Pressable>

            <Pressable
              onPress={handleRestore}
              disabled={isBusy}
              style={styles.restoreBtn}
              testID="paywall-restore-btn"
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color="#555555" />
              ) : (
                <View style={styles.restoreRow}>
                  <RotateCcw size={13} color="#555555" strokeWidth={2} />
                  <Text style={styles.restoreText}>Restore Purchases</Text>
                </View>
              )}
            </Pressable>

            <View style={styles.legalSection}>
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
            </View>

            <Pressable onPress={handleClose} disabled={isBusy} style={styles.skipBtn} testID="paywall-skip">
              <Text style={styles.skipText}>Continue with free plan</Text>
            </Pressable>

            <View style={{ height: Platform.OS === 'ios' ? 34 : 16 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: Platform.OS === 'ios' ? 54 : 36,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
    paddingTop: 8,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#22C55E12',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#22C55E33',
  },
  iconInner: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#22C55E18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#22C55E',
    letterSpacing: 3,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900' as const,
    color: '#F5F5F5',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  usageSection: {
    backgroundColor: '#141414',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222222',
  },
  usageRow: {
    gap: 14,
  },
  usageItem: {
    gap: 6,
  },
  usageLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  usageLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#F5F5F5',
    flex: 1,
  },
  usageCount: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#666666',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#222222',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#22C55E',
    borderRadius: 3,
  },
  progressBarWarning: {
    backgroundColor: '#F59E0B',
  },
  benefitsSection: {
    gap: 0,
    marginBottom: 24,
    backgroundColor: '#141414',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222222',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#22C55E12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    flex: 1,
  },
  benefitLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#F5F5F5',
    letterSpacing: -0.2,
  },
  benefitDesc: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#666666',
    marginTop: 2,
  },
  plansSection: {
    gap: 10,
    marginBottom: 20,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#222222',
    gap: 14,
    position: 'relative' as const,
    overflow: 'hidden',
  },
  planOptionSelected: {
    borderColor: '#22C55E',
    backgroundColor: '#22C55E08',
  },
  bestValueBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#22C55E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  bestValueText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#0A0A0A',
    letterSpacing: 0.5,
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#888888',
    letterSpacing: -0.2,
  },
  planNameSelected: {
    color: '#F5F5F5',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#F5F5F5',
    letterSpacing: -0.3,
    marginTop: 4,
  },
  planSub: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#666666',
    marginTop: 2,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#22C55E',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    minHeight: 58,
  },
  upgradeBtnPressed: {
    backgroundColor: '#16A34A',
    transform: [{ scale: 0.97 }],
  },
  upgradeBtnDisabled: {
    opacity: 0.7,
  },
  upgradeBtnText: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: '#0A0A0A',
    letterSpacing: 0.1,
  },
  restoreBtn: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  restoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#555555',
  },
  legalSection: {
    marginTop: 16,
    alignItems: 'center',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#555555',
    textDecorationLine: 'underline' as const,
  },
  legalDot: {
    fontSize: 12,
    color: '#333333',
  },
  legalDisclaimer: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: '#444444',
    textAlign: 'center' as const,
    lineHeight: 14,
    marginTop: 10,
    paddingHorizontal: 8,
  },
  skipBtn: {
    marginTop: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#555555',
    textDecorationLine: 'underline' as const,
  },
});
