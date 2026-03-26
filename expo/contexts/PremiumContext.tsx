import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform, Alert } from 'react-native';

let Purchases: any = null;
let LOG_LEVEL: any = {};
let PURCHASES_ERROR_CODE: any = {};
type CustomerInfo = any;
type PurchasesPackage = any;
type PurchasesError = any;

let purchasesModuleLoaded = false;
if (Platform.OS !== 'web') {
  try {
    const mod = require('react-native-purchases');
    Purchases = mod.default ?? mod;
    LOG_LEVEL = mod.LOG_LEVEL ?? {};
    PURCHASES_ERROR_CODE = mod.PURCHASES_ERROR_CODE ?? {};
    purchasesModuleLoaded = true;
    console.log('[PremiumContext] react-native-purchases module loaded successfully');
  } catch (e) {
    console.warn('[PremiumContext] react-native-purchases module not available:', e);
  }
} else {
  console.log('[PremiumContext] Skipping react-native-purchases on web');
}

const ENTITLEMENT_ID = 'premium';

function getRCApiKey(): string {
  if (Platform.OS === 'web') return '';
  if (__DEV__) {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? '';
  }
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? '',
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? '',
    default: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? '',
  }) as string;
}

let rcConfigured = false;
if (purchasesModuleLoaded && Purchases) {
  const apiKey = getRCApiKey();
  if (apiKey) {
    try {
      const storeLabel = __DEV__ ? 'Test Store (dev)' : Platform.OS === 'ios' ? 'App Store' : Platform.OS === 'android' ? 'Play Store' : 'Unknown';
      console.log('[PremiumContext] Platform:', Platform.OS, '__DEV__:', __DEV__);
      console.log('[PremiumContext] Configuring RevenueCat with key:', apiKey.substring(0, 8) + '...', 'store:', storeLabel);
      Purchases.configure({ apiKey });
      rcConfigured = true;
      if (__DEV__ && LOG_LEVEL.DEBUG !== undefined) {
        void Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }
    } catch (e) {
      console.warn('[PremiumContext] RevenueCat configure failed:', e);
    }
  } else {
    console.warn('[PremiumContext] No RevenueCat API key found for platform:', Platform.OS);
  }
} else if (Platform.OS !== 'web') {
  console.warn('[PremiumContext] RevenueCat module not loaded, premium features disabled');
}

export type PlanType = 'annual' | 'monthly';

export const [PremiumProvider, usePremium] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [isPremium, setIsPremium] = useState<boolean>(false);

  const customerInfoQuery = useQuery({
    queryKey: ['rc_customer_info'],
    queryFn: async () => {
      if (!rcConfigured) return null;
      try {
        const info = await Purchases.getCustomerInfo();
        console.log('[PremiumContext] Customer info loaded, active entitlements:', Object.keys(info.entitlements.active));
        console.log('[PremiumContext] App user ID:', info.originalAppUserId);
        return info;
      } catch (err) {
        console.error('[PremiumContext] Failed to get customer info:', err);
        return null;
      }
    },
    refetchInterval: rcConfigured ? 60000 : false,
    retry: 2,
    retryDelay: 1000,
    enabled: rcConfigured,
  });

  const offeringsQuery = useQuery({
    queryKey: ['rc_offerings'],
    queryFn: async () => {
      if (!rcConfigured) return null;
      try {
        const offerings = await Purchases.getOfferings();
        console.log('[PremiumContext] Offerings loaded:', offerings.current?.identifier);
        if (offerings.current) {
          console.log('[PremiumContext] Available packages:', offerings.current.availablePackages.map((p: any) => `${p.identifier} (${p.product.priceString})`));
        } else {
          console.warn('[PremiumContext] No current offering found — check RevenueCat dashboard');
        }
        return offerings.current ?? null;
      } catch (err) {
        console.error('[PremiumContext] Failed to get offerings:', err);
        return null;
      }
    },
    staleTime: 300000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 5000),
    enabled: rcConfigured,
  });

  useEffect(() => {
    if (customerInfoQuery.data) {
      const hasPremium = customerInfoQuery.data.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
      console.log('[PremiumContext] Premium entitlement active:', hasPremium);
      setIsPremium(hasPremium);
    }
  }, [customerInfoQuery.data]);

  useEffect(() => {
    if (!rcConfigured) return;
    const listener = (info: CustomerInfo) => {
      console.log('[PremiumContext] Customer info updated via listener');
      const hasPremium = info.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
      setIsPremium(hasPremium);
      void queryClient.invalidateQueries({ queryKey: ['rc_customer_info'] });
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [queryClient]);

  const getPackageForPlan = useCallback(async (plan: PlanType): Promise<PurchasesPackage> => {
    let offering = offeringsQuery.data;
    if (!offering) {
      console.log('[PremiumContext] No cached offerings, fetching fresh...');
      const fresh = await Purchases.getOfferings();
      offering = fresh.current ?? null;
      if (!offering) {
        throw new Error('No offerings available. Please check your internet connection and try again.');
      }
    }

    const targetId = plan === 'annual' ? '$rc_annual' : '$rc_monthly';
    const targetType = plan === 'annual' ? 'ANNUAL' : 'MONTHLY';

    const pkg = offering.availablePackages.find(
      (p: any) => p.packageType === targetType || p.identifier === targetId
    ) ?? offering.availablePackages[0];

    if (!pkg) {
      throw new Error('No subscription package found.');
    }

    console.log('[PremiumContext] Selected package:', pkg.identifier, 'product:', pkg.product.identifier, 'price:', pkg.product.priceString);
    return pkg;
  }, [offeringsQuery.data]);

  const purchaseMutation = useMutation({
    mutationFn: async (plan: PlanType) => {
      if (!rcConfigured) {
        throw new Error('Purchases not available on this platform');
      }
      const pkg = await getPackageForPlan(plan);
      console.log('[PremiumContext] Purchasing package:', pkg.identifier, 'product:', pkg.product.identifier, 'price:', pkg.product.priceString, 'store:', Platform.OS);
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return customerInfo;
    },
    onSuccess: (info) => {
      console.log('[PremiumContext] Purchase successful, entitlements:', Object.keys(info.entitlements.active));
      const hasPremium = info.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
      setIsPremium(hasPremium);
      void queryClient.invalidateQueries({ queryKey: ['rc_customer_info'] });
      if (hasPremium) {
        Alert.alert('Welcome to Premium!', 'Your subscription is now active. Enjoy unlimited access!');
      }
    },
    onError: (err: any) => {
      const purchasesError = err as PurchasesError;
      if (
        purchasesError?.userCancelled ||
        purchasesError?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
      ) {
        console.log('[PremiumContext] Purchase cancelled by user');
        return;
      }
      console.error('[PremiumContext] Purchase error code:', purchasesError?.code, 'message:', purchasesError?.message);
      let title = 'Purchase Failed';
      let message = 'Something went wrong. Please try again.';
      if (purchasesError?.code === PURCHASES_ERROR_CODE.NETWORK_ERROR) {
        message = 'Network error. Please check your connection and try again.';
      } else if (purchasesError?.code === PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR) {
        message = 'This product is not available for purchase right now. Please try again later.';
      } else if (purchasesError?.code === PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR) {
        message = 'Purchases are not allowed on this device. Please check your device settings.';
      } else if (purchasesError?.code === PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR) {
        message = Platform.OS === 'ios'
          ? 'There was an issue with the App Store. Please check your Apple ID and try again.'
          : 'There was an issue with the Play Store. Please try again in a moment.';
      } else if (purchasesError?.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
        title = 'Payment Pending';
        message = 'Your payment is being processed. Your subscription will activate once payment completes.';
      }
      Alert.alert(title, message);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!rcConfigured) {
        throw new Error('Purchases not available on this platform');
      }
      console.log('[PremiumContext] Restoring purchases...');
      const info = await Purchases.restorePurchases();
      console.log('[PremiumContext] Restore result, active entitlements:', Object.keys(info.entitlements.active));
      return info;
    },
    onSuccess: (info) => {
      const hasPremium = info.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
      setIsPremium(hasPremium);
      void queryClient.invalidateQueries({ queryKey: ['rc_customer_info'] });
      if (hasPremium) {
        Alert.alert('Restored!', 'Your premium subscription has been restored.');
      } else {
        Alert.alert('No Subscription Found', 'We couldn\'t find an active subscription for this account.');
      }
    },
    onError: (err: any) => {
      const purchasesError = err as PurchasesError;
      console.error('[PremiumContext] Restore error code:', purchasesError?.code, 'message:', purchasesError?.message);
      Alert.alert('Restore Failed', 'Something went wrong. Please try again.');
    },
  });

  const purchaseWithPlan = useCallback((plan: PlanType) => {
    console.log('[PremiumContext] Initiating purchase for plan:', plan);
    purchaseMutation.mutate(plan);
  }, [purchaseMutation]);

  const upgradeToPremium = useCallback(() => {
    console.log('[PremiumContext] Initiating purchase (annual default)');
    purchaseMutation.mutate('annual');
  }, [purchaseMutation]);

  const restorePurchases = useCallback(() => {
    restoreMutation.mutate();
  }, [restoreMutation]);

  const currentOffering = offeringsQuery.data ?? null;

  const annualPrice = useMemo(() => {
    if (!currentOffering) return '$29.99/year';
    const pkg = currentOffering.availablePackages.find(
      (p: any) => p.packageType === 'ANNUAL' || p.identifier === '$rc_annual'
    ) ?? currentOffering.availablePackages[0];
    if (!pkg) return '$29.99/year';
    return `${pkg.product.priceString}/year`;
  }, [currentOffering]);

  const monthlyPrice = useMemo(() => {
    if (!currentOffering) return '$4.99/mo';
    const pkg = currentOffering.availablePackages.find(
      (p: any) => p.packageType === 'MONTHLY' || p.identifier === '$rc_monthly'
    );
    if (!pkg) return '$4.99/mo';
    return `${pkg.product.priceString}/mo`;
  }, [currentOffering]);

  const annualPriceRaw = useMemo(() => {
    if (!currentOffering) return '$29.99';
    const pkg = currentOffering.availablePackages.find(
      (p: any) => p.packageType === 'ANNUAL' || p.identifier === '$rc_annual'
    );
    if (!pkg) return '$29.99';
    return pkg.product.priceString;
  }, [currentOffering]);

  const monthlyPriceRaw = useMemo(() => {
    if (!currentOffering) return '$4.99';
    const pkg = currentOffering.availablePackages.find(
      (p: any) => p.packageType === 'MONTHLY' || p.identifier === '$rc_monthly'
    );
    if (!pkg) return '$4.99';
    return pkg.product.priceString;
  }, [currentOffering]);

  return useMemo(() => ({
    isPremium,
    upgradeToPremium,
    purchaseWithPlan,
    restorePurchases,
    isLoading: customerInfoQuery.isLoading,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    currentOffering,
    annualPrice,
    monthlyPrice,
    annualPriceRaw,
    monthlyPriceRaw,
  }), [
    isPremium, upgradeToPremium, purchaseWithPlan, restorePurchases,
    customerInfoQuery.isLoading, purchaseMutation.isPending,
    restoreMutation.isPending, currentOffering, annualPrice, monthlyPrice,
    annualPriceRaw, monthlyPriceRaw,
  ]);
});
