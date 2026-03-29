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
  Crown,
  X,
  Bookmark,
  ScanLine,
  Sparkles,
  Shield,
  RotateCcw,
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
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    } else {
      backdropAnim.setValue(0);
      slideAnim.setValue(SCREEN_H);
    }
  }, [visible, backdropAnim, slideAnim, pulseAnim]);

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
            <X size={20} color="#8E8E93" strokeWidth={2.2} />
          </Pressable>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.heroSection}>
              <Animated.View style={[styles.crownCircle, { transform: [{ scale: pulseAnim }] }]}>
                <Crown size={32} color="#D4A017" strokeWidth={2} />
              </Animated.View>
              <Text style={styles.heroTitle}>Unlock Flips Premium</Text>
              <Text style={styles.heroSubtitle}>
                Save unlimited items, scan without limits, and enjoy an ad-free experience.
              </Text>
            </View>

            <View style={styles.usageSection}>
              <Text style={styles.usageSectionTitle}>Your current usage</Text>
              <View style={styles.usageRow}>
                <View style={styles.usageItem}>
                  <View style={styles.usageLabelRow}>
                    <Bookmark size={12} color="#0066CC" strokeWidth={2} />
                    <Text style={styles.usageLabel}>Saves</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${Math.min(savesPercent, 100)}%` }, savesPercent >= 85 && styles.progressBarWarning]} />
                  </View>
                  <Text style={styles.usageCount}>{savesUsed} / {freeLimit}</Text>
                </View>
                <View style={styles.usageItem}>
                  <View style={styles.usageLabelRow}>
                    <ScanLine size={12} color="#0066CC" strokeWidth={2} />
                    <Text style={styles.usageLabel}>Scans</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${Math.min(scansPercent, 100)}%` }, scansPercent >= 85 && styles.progressBarWarning]} />
                  </View>
                  <Text style={styles.usageCount}>{scansUsed} / {scanFreeLimit}</Text>
                </View>
              </View>
            </View>

            <View style={styles.benefitsGrid}>
              {BENEFITS.map((b, idx) => {
                const Icon = b.icon;
                return (
                  <View key={idx} style={styles.benefitCell}>
                    <View style={styles.benefitCellIcon}>
                      <Icon size={18} color="#0066CC" strokeWidth={2} />
                    </View>
                    <Text style={styles.benefitCellLabel}>{b.label}</Text>
                    <Text style={styles.benefitCellDesc}>{b.desc}</Text>
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
                <View style={styles.planRadio}>
                  {selectedPlan === 'annual' && <View style={styles.planRadioInner} />}
                </View>
                <View style={styles.planInfo}>
                  <View style={styles.planNameRow}>
                    <Text style={[styles.planName, selectedPlan === 'annual' && styles.planNameSelected]}>
                      Yearly
                    </Text>
                    <View style={styles.bestValueBadge}>
                      <Sparkles size={9} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.bestValueText}>BEST VALUE</Text>
                    </View>
                  </View>
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

            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
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
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Crown size={18} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.upgradeBtnText}>
                      Continue with {selectedPlan === 'annual' ? 'Yearly' : 'Monthly'}
                    </Text>
                  </>
                )}
              </Pressable>
            </Animated.View>

            <Pressable
              onPress={handleRestore}
              disabled={isBusy}
              style={styles.restoreBtn}
              testID="paywall-restore-btn"
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color="#AEAEB2" />
              ) : (
                <View style={styles.restoreRow}>
                  <RotateCcw size={13} color="#8E8E93" strokeWidth={2} />
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
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#F0F5FA',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: Platform.OS === 'ios' ? 54 : 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0EAF2',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  crownCircle: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#FFF3D0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#F0D860',
    marginBottom: 18,
    shadowColor: '#D4A017',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 5,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900' as const,
    color: '#0D1B2A',
    letterSpacing: -0.8,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: '#3A4F65',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  usageSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#4A6FA5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E0EAF2',
  },
  usageSectionTitle: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#5A7A94',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 14,
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
    color: '#0D1B2A',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#D0DDE8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: '#0066CC',
    borderRadius: 4,
  },
  progressBarWarning: {
    backgroundColor: '#E67E22',
  },
  usageCount: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#5A7A94',
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  benefitCell: {
    width: '47%' as unknown as number,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#4A6FA5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E0EAF2',
  },
  benefitCellIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E0EFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  benefitCellLabel: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#0D1B2A',
    textAlign: 'center' as const,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  benefitCellDesc: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#5A7A94',
    textAlign: 'center' as const,
    lineHeight: 15,
  },
  plansSection: {
    gap: 10,
    marginBottom: 20,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#D0DDE8',
    gap: 14,
  },
  planOptionSelected: {
    borderColor: '#0066CC',
    backgroundColor: '#F0F7FF',
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#B8C9D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0066CC',
  },
  planInfo: {
    flex: 1,
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#3A4F65',
    letterSpacing: -0.2,
  },
  planNameSelected: {
    color: '#0D1B2A',
  },
  bestValueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#0066CC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bestValueText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#0D1B2A',
    letterSpacing: -0.3,
    marginTop: 4,
  },
  planSub: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#5A7A94',
    marginTop: 2,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0066CC',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    minHeight: 58,
    shadowColor: '#003D7A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  upgradeBtnPressed: {
    backgroundColor: '#0052A3',
    transform: [{ scale: 0.97 }],
  },
  upgradeBtnDisabled: {
    opacity: 0.7,
  },
  upgradeBtnText: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: '#FFFFFF',
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
    color: '#8E8E93',
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
    color: '#8E8E93',
    textDecorationLine: 'underline' as const,
  },
  legalDot: {
    fontSize: 12,
    color: '#C7C7CC',
  },
  legalDisclaimer: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: '#AEAEB2',
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
    color: '#7A8FA3',
    textDecorationLine: 'underline' as const,
  },
});
