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
  X,
  Bookmark,
  ScanLine,
  Shield,
  RotateCcw,
  Check,
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
  { icon: Shield, label: 'Ad-free experience', desc: 'No interruptions while you browse' },
  { icon: Bookmark, label: 'Unlimited saves', desc: 'Save as many items as you want' },
  { icon: ScanLine, label: 'Full scan history', desc: 'Access all your past scans' },
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

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      ]).start();
    } else {
      backdropAnim.setValue(0);
      slideAnim.setValue(SCREEN_H);
    }
  }, [visible, backdropAnim, slideAnim]);

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
            <X size={16} color="#8E8E93" strokeWidth={2.2} />
          </Pressable>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.heroSection}>
              <Text style={styles.heroTitle}>Flips Premium</Text>
              <Text style={styles.heroSubtitle}>
                Unlimited saves, full scan history, and no ads.
              </Text>
            </View>

            <View style={styles.usageSection}>
              <View style={styles.usageRow}>
                <View style={styles.usageItem}>
                  <View style={styles.usageLabelRow}>
                    <Bookmark size={12} color="#34C759" strokeWidth={2} />
                    <Text style={styles.usageLabel}>Saves</Text>
                    <Text style={styles.usageCount}>{savesUsed}/{freeLimit}</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${Math.min(savesPercent, 100)}%` }, savesPercent >= 85 && styles.progressBarWarning]} />
                  </View>
                </View>
                <View style={styles.usageItem}>
                  <View style={styles.usageLabelRow}>
                    <ScanLine size={12} color="#34C759" strokeWidth={2} />
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
                  <View key={idx} style={[styles.benefitRow, idx < BENEFITS.length - 1 && styles.benefitRowBorder]}>
                    <View style={styles.benefitIcon}>
                      <Icon size={18} color="#34C759" strokeWidth={1.8} />
                    </View>
                    <View style={styles.benefitText}>
                      <Text style={styles.benefitLabel}>{b.label}</Text>
                      <Text style={styles.benefitDesc}>{b.desc}</Text>
                    </View>
                    <Check size={16} color="#34C759" strokeWidth={2} />
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
                <View style={[styles.planRadio, selectedPlan === 'annual' && styles.planRadioSelected]}>
                  {selectedPlan === 'annual' && <View style={styles.planRadioInner} />}
                </View>
                <View style={styles.planInfo}>
                  <View style={styles.planNameRow}>
                    <Text style={[styles.planName, selectedPlan === 'annual' && styles.planNameActive]}>
                      Yearly
                    </Text>
                    {selectedPlan === 'annual' && (
                      <View style={styles.bestValueBadge}>
                        <Text style={styles.bestValueText}>Best Value</Text>
                      </View>
                    )}
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
                <View style={[styles.planRadio, selectedPlan === 'monthly' && styles.planRadioSelected]}>
                  {selectedPlan === 'monthly' && <View style={styles.planRadioInner} />}
                </View>
                <View style={styles.planInfo}>
                  <Text style={[styles.planName, selectedPlan === 'monthly' && styles.planNameActive]}>
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
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.upgradeBtnText}>
                    Continue with {selectedPlan === 'annual' ? 'Yearly' : 'Monthly'}
                  </Text>
                  <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.2} />
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
                <ActivityIndicator size="small" color="#636366" />
              ) : (
                <View style={styles.restoreRow}>
                  <RotateCcw size={13} color="#636366" strokeWidth={2} />
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
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#000000',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    marginTop: Platform.OS === 'ios' ? 54 : 36,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1C1C1E',
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
  heroTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  usageSection: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
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
    fontWeight: '500' as const,
    color: '#FFFFFF',
    flex: 1,
  },
  usageCount: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#8E8E93',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#2C2C2E',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: '#34C759',
    borderRadius: 2,
  },
  progressBarWarning: {
    backgroundColor: '#FF9500',
  },
  benefitsSection: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  benefitRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    flex: 1,
  },
  benefitLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#FFFFFF',
  },
  benefitDesc: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 1,
  },
  plansSection: {
    gap: 10,
    marginBottom: 20,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    gap: 14,
  },
  planOptionSelected: {
    borderColor: '#34C759',
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#48484A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planRadioSelected: {
    borderColor: '#34C759',
  },
  planRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
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
    fontWeight: '600' as const,
    color: '#8E8E93',
  },
  planNameActive: {
    color: '#FFFFFF',
  },
  bestValueBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginTop: 4,
  },
  planSub: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 2,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#34C759',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    minHeight: 54,
  },
  upgradeBtnPressed: {
    backgroundColor: '#2DA44E',
  },
  upgradeBtnDisabled: {
    opacity: 0.6,
  },
  upgradeBtnText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFFFFF',
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
    fontWeight: '400' as const,
    color: '#636366',
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
    color: '#636366',
    textDecorationLine: 'underline' as const,
  },
  legalDot: {
    fontSize: 12,
    color: '#48484A',
  },
  legalDisclaimer: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: '#48484A',
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
    fontWeight: '400' as const,
    color: '#636366',
  },
});
