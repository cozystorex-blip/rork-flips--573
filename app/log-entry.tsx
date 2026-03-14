import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Modal,
  ActivityIndicator,
  LayoutAnimation,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import {
  X,
  Camera,
  Check,
  UtensilsCrossed,
  ShoppingCart,
  Car,
  Zap,
  Tv,
  ShoppingBag,
  Home,
  MoreHorizontal,
  AlertTriangle,
  ScanLine,
  RefreshCw,
  Trash2,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Image as ImageIcon,
  Edit3,
  PenLine,
  ShieldAlert,
  Info,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { useExpenses } from '@/contexts/ExpenseContext';
import { ExpenseCategoryType, ExpenseCategoryLabels } from '@/types';
import Colors, { ExpenseCategoryColors } from '@/constants/colors';
import {
  ReceiptItem,
  suggestCategory,
  getItemsPreview,
  computeConfidence,
  sanitizeItems,
  selectBestTotal,
  validateTotal,
} from '@/services/receiptParsing';
import { preprocessReceiptImage, estimateImageQuality } from '@/services/receiptImagePreprocess';


const CATEGORIES: { key: ExpenseCategoryType; icon: React.ComponentType<{ size: number; color: string }> }[] = [
  { key: 'food', icon: UtensilsCrossed },
  { key: 'grocery', icon: ShoppingCart },
  { key: 'transport', icon: Car },
  { key: 'utility_bills', icon: Zap },
  { key: 'shopping', icon: ShoppingBag },
  { key: 'home', icon: Home },
  { key: 'subscriptions', icon: Tv },
  { key: 'other', icon: MoreHorizontal },
];

const receiptSchema = z.object({
  merchant_name: z.string().describe('Store or merchant name from the receipt header. Usually the first or largest text at the top.'),
  transaction_date: z.string().nullable().describe('Date in YYYY-MM-DD format. Try ALL common formats: MM/DD/YYYY, MM-DD-YYYY, YYYY/MM/DD, DD/MM/YYYY, Month DD YYYY, etc. null only if absolutely no date visible anywhere on receipt.'),
  items: z.array(
    z.object({
      name: z.string().describe('Item name EXACTLY as printed on the receipt line. Do NOT rename, rephrase, or substitute. Copy the text as-is, preserving abbreviations, codes, and store shorthand. Only fix obvious OCR spacing issues like missing spaces between words.'),
      quantity: z.number().describe('Quantity if shown (e.g. 2x, QTY 2), otherwise 1'),
      unit_price: z.number().describe('Price per single unit in dollars'),
      total_price: z.number().describe('Line total = quantity * unit_price, as shown on receipt'),
    })
  ).describe('EVERY purchasable line item. Do NOT include subtotal, tax, tip, total, change, cash tendered, balance, payment, discount, savings, coupon, loyalty, or reward lines as items. Item names must be copied verbatim from the receipt — do NOT guess, translate, or replace with a different product name.'),
  subtotal: z.number().nullable().describe('Subtotal before tax/tip. Labeled SUBTOTAL, SUB TOTAL, or similar. null if not explicitly shown.'),
  tax: z.number().nullable().describe('Tax amount if shown (SALES TAX, TAX, HST, GST, VAT). null if not shown.'),
  tip: z.number().nullable().describe('Tip/gratuity/service charge amount. null if not shown.'),
  final_total: z.number().describe('The FINAL amount actually paid. This is the amount after ALL additions (tax, tip) and ALL deductions (discounts, coupons, savings, cashback). Look for labels like TOTAL, GRAND TOTAL, AMOUNT DUE, BALANCE DUE, TOTAL CHARGED, YOU PAID, NET TOTAL. If multiple totals exist, pick the one that represents what the customer actually paid — usually the LAST and LARGEST total on the receipt, UNLESS there is a discount applied after it. Do NOT use subtotal, tax-only, change, or savings amounts.'),
  payment_method: z.string().nullable().describe('Payment method (VISA *1234, MASTERCARD, CASH, DEBIT, AMEX, DISCOVER, APPLE PAY). null if not shown.'),
  discount_amount: z.number().nullable().describe('Total discount/savings/coupon amount if shown. null if none.'),
  all_total_candidates: z.array(z.number()).describe('List ALL dollar amounts on the receipt that appear next to total-like labels (TOTAL, SUBTOTAL, TAX TOTAL, GRAND TOTAL, AMOUNT DUE, etc). This helps verify the correct final total.'),
});

type ReceiptExtraction = z.infer<typeof receiptSchema>;

type ScanPhase = 'idle' | 'preprocessing' | 'extracting' | 'validating' | 'done' | 'error';

interface ReviewState {
  amount: string;
  merchant: string;
  category: ExpenseCategoryType;
  date: string;
  items: ReceiptItem[];
  subtotal: number | null;
  tax: number | null;
  tip: number | null;
  discount: number | null;
  paymentMethod: string | null;
  rawExtraction: ReceiptExtraction | null;
  confidence: number;
  reasons: string[];
  needsReview: boolean;
  imagePath?: string;
  totalValidationIssues: string[];
}

const SCAN_PHASE_MESSAGES: Record<ScanPhase, string> = {
  idle: '',
  preprocessing: 'Optimizing image...',
  extracting: 'Reading receipt with AI...',
  validating: 'Verifying amounts...',
  done: 'Complete!',
  error: 'Something went wrong',
};

export default function LogEntryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addExpense } = useExpenses();

  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategoryType>('food');
  const [notes, setNotes] = useState<string>('');
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanPhase, setScanPhase] = useState<ScanPhase>('idle');
  const [scanError, setScanError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [showReview, setShowReview] = useState<boolean>(false);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [itemsExpanded, setItemsExpanded] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [manualExpanded, setManualExpanded] = useState<boolean>(false);
  const manualChevronRotation = useRef(new Animated.Value(0)).current;

  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.5)).current;
  const scanPulse = useRef(new Animated.Value(1)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  const confidenceLabel = useMemo(() => {
    const value = review?.confidence ?? 0;
    if (value >= 0.80) return 'High';
    if (value >= 0.60) return 'Medium';
    return 'Low';
  }, [review?.confidence]);

  const confidenceColor = useMemo(() => {
    const value = review?.confidence ?? 0;
    if (value >= 0.80) return '#16A34A';
    if (value >= 0.60) return '#D97706';
    return '#DC2626';
  }, [review?.confidence]);

  const itemsTotal = useMemo(() => {
    if (!review?.items) return 0;
    return review.items.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [review?.items]);

  const startScanPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanPulse, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(scanPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [scanPulse]);

  const stopScanPulse = useCallback(() => {
    scanPulse.stopAnimation();
    scanPulse.setValue(1);
  }, [scanPulse]);

  const animateProgress = useCallback((toPercent: number, duration: number) => {
    Animated.timing(progressWidth, { toValue: toPercent, duration, useNativeDriver: false }).start();
  }, [progressWidth]);

  const resetProgress = useCallback(() => {
    progressWidth.setValue(0);
  }, [progressWidth]);

  const applyExtraction = useCallback((extracted: ReceiptExtraction, imagePath?: string) => {
    console.log('[ReceiptScanner] Applying extraction:', JSON.stringify(extracted, null, 2));

    const items = sanitizeItems(extracted.items);
    const itemsSum = items.reduce((sum, i) => sum + i.totalPrice, 0);
    const tax = extracted.tax ?? 0;
    const tip = extracted.tip ?? 0;

    const { bestTotal, reason: totalReason } = selectBestTotal({
      finalTotal: extracted.final_total,
      subtotal: extracted.subtotal,
      tax: extracted.tax,
      tip: extracted.tip,
      allTotals: extracted.all_total_candidates,
    });

    console.log('[ReceiptScanner] Best total:', bestTotal, 'reason:', totalReason);

    let finalTotal = bestTotal;
    if (finalTotal <= 0) {
      finalTotal = +(itemsSum + tax + tip).toFixed(2);
    }

    const totalValidation = validateTotal(finalTotal, extracted.subtotal, extracted.tax, extracted.tip, itemsSum);

    console.log('[ReceiptScanner] Reconciliation: items=$' + itemsSum.toFixed(2) +
      ' subtotal=$' + (extracted.subtotal ?? itemsSum).toFixed(2) +
      ' tax=$' + tax.toFixed(2) +
      ' tip=$' + tip.toFixed(2) +
      ' discount=$' + (extracted.discount_amount ?? 0).toFixed(2) +
      ' final=$' + finalTotal.toFixed(2));
    console.log('[ReceiptScanner] Total validation:', totalValidation);

    const categorySuggestion = suggestCategory(extracted.merchant_name, items);
    const { confidence, reasons, needsReview } = computeConfidence({
      merchantName: extracted.merchant_name,
      transactionDate: extracted.transaction_date,
      finalTotal,
      subtotal: extracted.subtotal,
      tax: extracted.tax,
      tip: extracted.tip,
      items,
    });

    if (!totalValidation.isValid) {
      totalValidation.issues.forEach((issue) => {
        if (!reasons.includes(issue)) {
          reasons.push(issue);
        }
      });
    }

    console.log('[ReceiptScanner] Items count:', items.length);
    console.log('[ReceiptScanner] Confidence:', confidence, 'needsReview:', needsReview, 'Reasons:', reasons);

    const reviewState: ReviewState = {
      amount: finalTotal > 0 ? finalTotal.toFixed(2) : '',
      merchant: extracted.merchant_name ?? '',
      category: categorySuggestion,
      date: extracted.transaction_date ?? '',
      items,
      subtotal: extracted.subtotal ?? (itemsSum > 0 ? +itemsSum.toFixed(2) : null),
      tax: extracted.tax,
      tip: extracted.tip,
      discount: extracted.discount_amount,
      paymentMethod: extracted.payment_method,
      rawExtraction: extracted,
      confidence,
      reasons,
      needsReview,
      imagePath,
      totalValidationIssues: totalValidation.issues,
    };

    setReview(reviewState);
    setTitle(extracted.merchant_name || 'Receipt Expense');
    setAmount(finalTotal > 0 ? finalTotal.toFixed(2) : '');
    setCategory(categorySuggestion);
    setNotes(getItemsPreview(items) ? `Scanned: ${getItemsPreview(items)}` : 'Scanned receipt');
    setShowReview(true);
  }, []);

  const runParsePipeline = useCallback(async (imageUri: string): Promise<void> => {
    setScanPhase('preprocessing');
    animateProgress(25, 1500);

    const preProcessed = await preprocessReceiptImage(imageUri, 'receipt');
    const quality = estimateImageQuality(preProcessed.width, preProcessed.height, preProcessed.sizeKB);
    console.log('[ReceiptScanner] Image quality estimate:', quality);

    if (quality === 'poor') {
      console.log('[ReceiptScanner] Warning: low quality image, results may be inaccurate');
    }

    setScanPhase('extracting');
    animateProgress(70, 8000);

    const extracted = await generateObject({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', image: `data:image/jpeg;base64,${preProcessed.base64}` },
            {
              type: 'text',
              text: `You are an expert receipt OCR parser. Extract ALL information from this receipt image with maximum accuracy.

STEP 1 — READ THE ENTIRE RECEIPT TOP TO BOTTOM BEFORE EXTRACTING.
Look at every line of text. Identify the structure: header → items → subtotal → tax → total → payment.

STEP 2 — MERCHANT NAME:
- Usually the FIRST or LARGEST text at the very top.
- Include store number/location if visible (e.g. "WALMART #1234").
- Do NOT use address lines as merchant name.

STEP 3 — DATE:
- Look in header, footer, and transaction detail lines.
- Convert ANY format to YYYY-MM-DD.
- Common formats: MM/DD/YYYY, MM-DD-YYYY, DD/MM/YYYY, YYYY/MM/DD, Month DD YYYY, DD-Mon-YY.
- Set null ONLY if absolutely no date visible anywhere.

STEP 4 — ITEM EXTRACTION (CRITICAL — READ CAREFULLY):
- Capture EVERY product/service line item with its name and price.
- Items are lines with a product name AND a dollar amount on the same line or adjacent line.
- For each: exact name as printed, quantity if shown (default 1), unit_price per unit, total_price for line.

ITEM NAME ACCURACY RULES (MANDATORY):
- Copy the item name EXACTLY as it appears on the receipt. Do NOT rename, rephrase, translate, or substitute.
- Receipt items often use store-specific abbreviations and shorthand (e.g. "HNZ RELSH SQZ" = Heinz Relish Squeeze). Keep the abbreviation as-is.
- Do NOT replace one product with a completely different product. For example, do NOT turn a food item into a beauty/pharmacy item or vice versa.
- If the text is messy or ambiguous, keep the closest readable version of what is printed. Do NOT invent a clean product name that differs from the source text.
- Only fix obvious OCR character errors (e.g. "0" read as "O", "1" read as "l") when the correction is clearly safe.
- Preserve store codes, SKU fragments, size/weight suffixes (e.g. "12.7OZ"), and department prefixes exactly as shown.
- When in doubt, keep the raw text rather than guessing a product name.

- DO NOT include ANY of these as items:
  × SUBTOTAL, SUB TOTAL
  × TAX, SALES TAX, HST, GST, VAT
  × TIP, GRATUITY, SERVICE CHARGE
  × TOTAL, GRAND TOTAL, AMOUNT DUE
  × CHANGE, CHANGE DUE
  × CASH TENDERED, AMOUNT TENDERED
  × DISCOUNT, SAVINGS, COUPON, PROMO
  × LOYALTY, REWARD, CASHBACK
  × BALANCE, PAYMENT, CREDIT, DEBIT
- Include ALL items even if abbreviated or unclear.
- If a line shows weight × price/lb, calculate the total_price from that.

STEP 5 — TOTALS (CRITICAL):
- subtotal: Amount BEFORE tax/tip. Look for "SUBTOTAL" or "SUB TOTAL" label. null if not shown.
- tax: Tax amount. Look for "TAX", "SALES TAX", "HST", "GST", "VAT". null if not shown.
- tip: Tip/gratuity amount. null if not shown.
- discount_amount: Total discount/savings/coupon. null if none.
- final_total: The amount the customer ACTUALLY PAID.
  • This is AFTER tax, tip, AND discounts.
  • If multiple "TOTAL" lines exist, the LAST one is usually correct.
  • "GRAND TOTAL" or "AMOUNT DUE" > "TOTAL" > "SUBTOTAL".
  • NEVER use CHANGE, CASH TENDERED, or SAVINGS as final_total.
  • Formula check: final_total ≈ subtotal + tax + tip - discount
- all_total_candidates: List EVERY dollar amount next to any total-like label.

STEP 6 — PAYMENT:
- payment_method: VISA *1234, CASH, DEBIT, AMEX, APPLE PAY, etc. null if not shown.

ACCURACY RULES:
- Read numbers carefully. $1.99 vs $19.99 matters.
- If text is blurry, use your best estimate for required fields, null for nullable.
- Double-check that final_total > subtotal (unless discount makes it less).
- Verify: sum of items ≈ subtotal (within reasonable tolerance).`,
            },
          ],
        },
      ],
      schema: receiptSchema,
    });

    setScanPhase('validating');
    animateProgress(95, 500);

    console.log('[ReceiptScanner] generateObject result received');
    applyExtraction(extracted, preProcessed.uri);

    setScanPhase('done');
    animateProgress(100, 200);
  }, [applyExtraction, animateProgress]);

  const handleImageCapture = useCallback(async (mode: 'camera' | 'gallery') => {
    setScanError(null);

    try {
      let result: ImagePicker.ImagePickerResult;

      if (mode === 'camera') {
        if (Platform.OS === 'web') {
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.85,
            allowsEditing: false,
          });
        } else {
          const permResult = await ImagePicker.requestCameraPermissionsAsync();
          if (!permResult.granted) {
            Alert.alert(
              'Camera Access Needed',
              'Please allow camera access in your device Settings to scan receipts.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => {
                  if (Platform.OS === 'ios') {
                    void import('react-native').then(({ Linking }) => Linking.openURL('app-settings:'));
                  }
                }},
              ]
            );
            return;
          }
          result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.85,
            allowsEditing: false,
          });
        }
      } else {
        if (Platform.OS !== 'web') {
          const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permResult.granted) {
            Alert.alert(
              'Photo Access Needed',
              'Please allow photo library access in your device Settings to upload receipts.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => {
                  if (Platform.OS === 'ios') {
                    void import('react-native').then(({ Linking }) => Linking.openURL('app-settings:'));
                  }
                }},
              ]
            );
            return;
          }
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.85,
          allowsEditing: false,
        });
      }

      if (result.canceled || !result.assets?.[0]?.uri) return;

      setScanning(true);
      setScanPhase('idle');
      setScanError(null);
      startScanPulse();
      resetProgress();

      await runParsePipeline(result.assets[0].uri);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('[ReceiptScanner] Scan error:', errorMessage);
      setScanPhase('error');
      progressWidth.setValue(0);
      if (errorMessage.includes('Failed to read image') || errorMessage.includes('corrupted')) {
        setScanError('Could not read this image. The file may be corrupted — try taking a new photo.');
      } else if (errorMessage.includes('timeout') || errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setScanError('Network issue — please check your connection and try again.');
      } else if (errorMessage.includes('Failed to process') || errorMessage.includes('base64') || errorMessage.includes('preprocess')) {
        setScanError('Could not process this image. Try a clearer photo or different angle.');
      } else {
        setScanError('Could not read this receipt. You can retry, try a different photo, or enter manually.');
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setScanning(false);
      stopScanPulse();
    }
  }, [runParsePipeline, startScanPulse, stopScanPulse, resetProgress, progressWidth]);

  const handleScanReceipt = useCallback(() => {
    void handleImageCapture('camera');
  }, [handleImageCapture]);

  const handlePickFromGallery = useCallback(() => {
    void handleImageCapture('gallery');
  }, [handleImageCapture]);

  const recalcTotal = useCallback((updatedItems: ReceiptItem[], tax: number | null, tip: number | null): string => {
    const itemsSum = updatedItems.reduce((sum, i) => sum + i.totalPrice, 0);
    const total = itemsSum + (tax ?? 0) + (tip ?? 0);
    return total.toFixed(2);
  }, []);

  const removeItem = useCallback((index: number) => {
    setReview((prev) => {
      if (!prev) return prev;
      const updated = [...prev.items];
      updated.splice(index, 1);
      const newSubtotal = updated.reduce((sum, i) => sum + i.totalPrice, 0);
      return {
        ...prev,
        items: updated,
        subtotal: +newSubtotal.toFixed(2),
        amount: recalcTotal(updated, prev.tax, prev.tip),
      };
    });
  }, [recalcTotal]);

  const updateItemQuantity = useCallback((index: number, delta: number) => {
    setReview((prev) => {
      if (!prev) return prev;
      const updated = [...prev.items];
      const item = { ...updated[index] };
      const newQty = Math.max(1, item.quantity + delta);
      item.quantity = newQty;
      item.totalPrice = +(item.unitPrice * newQty).toFixed(2);
      updated[index] = item;
      const newSubtotal = updated.reduce((sum, i) => sum + i.totalPrice, 0);
      return {
        ...prev,
        items: updated,
        subtotal: +newSubtotal.toFixed(2),
        amount: recalcTotal(updated, prev.tax, prev.tip),
      };
    });
  }, [recalcTotal]);

  const handleSave = useCallback(() => {
    if (isSaving) return;

    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter an expense title.');
      return;
    }

    const parsedAmount = Number.parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid final total amount.');
      return;
    }

    const duplicateKey = `${title.trim()}_${parsedAmount.toFixed(2)}_${category}`;
    if (lastSavedId === duplicateKey) {
      Alert.alert('Already Saved', 'This expense was just saved. Create a new one or go back.');
      return;
    }

    setIsSaving(true);

    try {
      const itemSummary = review ? getItemsPreview(review.items) : '';

      addExpense({
        title: title.trim(),
        category,
        categoryId: category,
        amount: parsedAmount,
        notes: notes.trim() || undefined,
        note: notes.trim() || undefined,
        merchant: review?.merchant || undefined,
        receiptRawText: review?.rawExtraction ? JSON.stringify(review.rawExtraction) : undefined,
        receiptItemsPreview: itemSummary || undefined,
        receiptConfidence: review?.confidence ?? undefined,
        receiptImagePath: review?.imagePath || undefined,
      });

      setLastSavedId(duplicateKey);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccess(true);
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
        Animated.timing(successOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setTimeout(() => {
          Animated.timing(successOpacity, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => {
            setShowSuccess(false);
            successScale.setValue(0.5);
            router.back();
          });
        }, 850);
      });
    } catch (error) {
      console.log('[ReceiptScanner] Save error:', error);
      Alert.alert('Save Failed', 'Could not save this expense. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [title, amount, category, notes, addExpense, review, router, successScale, successOpacity, isSaving, lastSavedId]);

  const confirmReview = useCallback(() => {
    if (!review) return;
    if (isSaving) return;

    const parsedAmount = Number.parseFloat(review.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Total', 'Please enter a valid total amount before confirming.');
      return;
    }

    if (!review.merchant.trim()) {
      Alert.alert('Missing Merchant', 'Please enter a merchant/store name before confirming.');
      return;
    }

    setIsSaving(true);

    try {
      const merchantName = review.merchant.trim();
      const itemSummary = getItemsPreview(review.items);

      console.log('[ReceiptScanner] Auto-saving confirmed receipt:', merchantName, parsedAmount);

      addExpense({
        title: merchantName,
        category: review.category ?? category,
        categoryId: review.category ?? category,
        amount: parsedAmount,
        notes: itemSummary ? `Scanned: ${itemSummary}` : 'Scanned receipt',
        note: itemSummary ? `Scanned: ${itemSummary}` : 'Scanned receipt',
        merchant: merchantName,
        receiptRawText: review.rawExtraction ? JSON.stringify(review.rawExtraction) : undefined,
        receiptItemsPreview: itemSummary || undefined,
        receiptConfidence: review.confidence ?? undefined,
        receiptImagePath: review.imagePath || undefined,
      });

      setShowReview(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccess(true);
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
        Animated.timing(successOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setTimeout(() => {
          Animated.timing(successOpacity, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => {
            setShowSuccess(false);
            successScale.setValue(0.5);
            router.back();
          });
        }, 850);
      });
    } catch (error) {
      console.log('[ReceiptScanner] Confirm save error:', error);
      Alert.alert('Save Failed', 'Could not save this receipt. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [review, category, addExpense, router, successScale, successOpacity, isSaving]);

  const handleManualEntry = useCallback(() => {
    setScanError(null);
    setScanPhase('idle');
  }, []);

  const toggleManualEntry = useCallback(() => {
    void Haptics.selectionAsync();
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext(LayoutAnimation.create(280, 'easeInEaseOut', 'opacity'));
    }
    const next = !manualExpanded;
    setManualExpanded(next);
    Animated.spring(manualChevronRotation, {
      toValue: next ? 1 : 0,
      useNativeDriver: true,
      tension: 120,
      friction: 14,
    }).start();
  }, [manualExpanded, manualChevronRotation]);

  const renderReviewItem = useCallback(({ item, index }: { item: ReceiptItem; index: number }) => (
    <View style={styles.reviewItemRow}>
      <View style={styles.reviewItemLeft}>
        <Text style={styles.reviewItemName} numberOfLines={2}>{item.name}</Text>
        {item.quantity > 1 && (
          <Text style={styles.reviewItemQty}>{item.quantity} × ${item.unitPrice.toFixed(2)}</Text>
        )}
      </View>
      <View style={styles.reviewItemRight}>
        <Text style={styles.reviewItemPrice}>${item.totalPrice.toFixed(2)}</Text>
        <View style={styles.reviewItemActions}>
          <Pressable
            style={styles.qtyBtn}
            onPress={() => updateItemQuantity(index, -1)}
            hitSlop={8}
          >
            <Minus size={12} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <Pressable
            style={styles.qtyBtn}
            onPress={() => updateItemQuantity(index, 1)}
            hitSlop={8}
          >
            <Plus size={12} color={Colors.textSecondary} />
          </Pressable>
          <Pressable
            style={styles.removeBtn}
            onPress={() => removeItem(index)}
            hitSlop={8}
          >
            <Trash2 size={13} color="#DC2626" />
          </Pressable>
        </View>
      </View>
    </View>
  ), [updateItemQuantity, removeItem]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn} testID="close-log-entry">
            <X size={20} color={Colors.text} />
          </Pressable>
          <Text style={styles.topTitle}>Add Expense</Text>
          <Pressable
            onPress={handleSave}
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            disabled={isSaving}
            testID="save-expense-btn"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Check size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save</Text>
              </>
            )}
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <>
          <View style={styles.scanSection}>
            <Text style={styles.scanSectionTitle}>Scan Receipt</Text>
            <Text style={styles.scanSectionSubtitle}>Take a photo or upload from your library</Text>
            <View style={styles.modeSwitch}>
              <Pressable style={styles.modeBtnActive} onPress={handleScanReceipt} disabled={scanning} testID="scan-receipt-btn">
                {scanning && scanPhase !== 'idle' ? (
                  <Animated.View style={{ transform: [{ scale: scanPulse }] }}>
                    <ScanLine size={18} color="#FFFFFF" />
                  </Animated.View>
                ) : (
                  <Camera size={18} color="#FFFFFF" />
                )}
                <Text style={styles.modeBtnTextActive}>{scanning ? 'Scanning...' : 'Camera'}</Text>
              </Pressable>
              <Pressable style={styles.modeBtn} onPress={handlePickFromGallery} disabled={scanning} testID="gallery-btn">
                <ImageIcon size={18} color={Colors.textSecondary} />
                <Text style={styles.modeBtnText}>Gallery</Text>
              </Pressable>
            </View>
          </View>

          {scanning && (
            <View style={styles.scanProgressCard}>
              <View style={styles.scanProgressHeader}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.scanProgressText}>{SCAN_PHASE_MESSAGES[scanPhase]}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: progressWidth.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={styles.scanPhaseHint}>
                {scanPhase === 'preprocessing' && 'Optimizing image quality for best results...'}
                {scanPhase === 'extracting' && 'AI is reading every line of your receipt...'}
                {scanPhase === 'validating' && 'Cross-checking totals and amounts...'}
              </Text>
            </View>
          )}

          {scanError && !scanning && (
            <View style={styles.errorCard}>
              <View style={styles.errorHeader}>
                <ShieldAlert size={18} color="#DC2626" />
                <Text style={styles.errorTitle}>Scan Issue</Text>
              </View>
              <Text style={styles.errorMessage}>{scanError}</Text>
              <View style={styles.errorActions}>
                <Pressable style={styles.retryBtn} onPress={handleScanReceipt}>
                  <RefreshCw size={14} color={Colors.text} />
                  <Text style={styles.retryBtnText}>Retake Photo</Text>
                </Pressable>
                <Pressable style={styles.retryBtn} onPress={handlePickFromGallery}>
                  <ImageIcon size={14} color={Colors.text} />
                  <Text style={styles.retryBtnText}>Upload</Text>
                </Pressable>
                <Pressable style={styles.manualBtn} onPress={handleManualEntry}>
                  <Edit3 size={14} color="#FFFFFF" />
                  <Text style={styles.manualBtnText}>Manual</Text>
                </Pressable>
              </View>
            </View>
          )}

          <Pressable
            style={styles.manualEntryTrigger}
            onPress={toggleManualEntry}
            testID="toggle-manual-entry"
          >
            <View style={styles.manualEntryTriggerLeft}>
              <View style={styles.manualEntryIconWrap}>
                <PenLine size={15} color={Colors.accent} />
              </View>
              <View>
                <Text style={styles.manualEntryTriggerTitle}>Enter manually</Text>
                <Text style={styles.manualEntryTriggerSub}>Title, amount, category & notes</Text>
              </View>
            </View>
            <Animated.View style={{
              transform: [{
                rotate: manualChevronRotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '90deg'],
                }),
              }],
            }}>
              <ChevronRight size={18} color={Colors.textTertiary} />
            </Animated.View>
          </Pressable>

          {manualExpanded && (
          <View style={styles.manualFieldsContainer}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TITLE</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="What did you spend on?" placeholderTextColor={Colors.textTertiary} testID="expense-title-input" />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>AMOUNT</Text>
              <View style={styles.amountRow}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput style={styles.amountInput} placeholder="0.00" placeholderTextColor={Colors.textTertiary} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} testID="expense-amount-input" />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CATEGORY</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map(({ key, icon: Icon }) => {
                  const active = category === key;
                  const color = ExpenseCategoryColors[key];
                  return (
                    <Pressable key={key} style={[styles.categoryChip, active && { backgroundColor: `${color}15`, borderColor: color }]} onPress={() => setCategory(key)} testID={`category-${key}`}>
                      <Icon size={16} color={active ? color : Colors.textTertiary} />
                      <Text style={[styles.categoryChipText, active && { color }]}>{ExpenseCategoryLabels[key]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>NOTES (OPTIONAL)</Text>
              <TextInput style={[styles.input, styles.notesInput]} placeholder="Add any notes..." placeholderTextColor={Colors.textTertiary} value={notes} onChangeText={setNotes} multiline numberOfLines={3} testID="expense-notes-input" />
            </View>
          </View>
          )}

          <View style={{ height: 80 }} />
          </>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showReview} animationType="slide" transparent onRequestClose={() => setShowReview(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.reviewSheet}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewTitle}>Review Receipt</Text>
              <Pressable onPress={() => setShowReview(false)} hitSlop={12} testID="close-review">
                <X size={20} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.reviewScrollContent}>
              <View style={styles.confidenceRow}>
                <View style={[styles.confidenceBadge, { backgroundColor: `${confidenceColor}15` }]}>
                  <View style={[styles.confidenceDot, { backgroundColor: confidenceColor }]} />
                  <Text style={[styles.confidenceText, { color: confidenceColor }]}>{confidenceLabel} Confidence</Text>
                </View>
                {review?.paymentMethod && (
                  <Text style={styles.paymentMethod}>{review.paymentMethod}</Text>
                )}
              </View>

              {review?.needsReview && (
                <View style={styles.reviewRequiredBanner}>
                  <Info size={15} color="#1D4ED8" />
                  <Text style={styles.reviewRequiredText}>Please verify the highlighted fields before saving</Text>
                </View>
              )}

              {(review?.reasons ?? []).length > 0 && (
                <View style={styles.warningsBox}>
                  {(review?.reasons ?? []).map((reason, idx) => (
                    <View key={`${reason}-${idx}`} style={styles.warningRow}>
                      <AlertTriangle size={13} color="#D97706" />
                      <Text style={styles.warningText}>{reason}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.reviewFieldGroup}>
                <Text style={styles.reviewFieldLabel}>MERCHANT</Text>
                <TextInput
                  style={[
                    styles.reviewInput,
                    !review?.merchant.trim() && styles.reviewInputWarning,
                  ]}
                  value={review?.merchant ?? ''}
                  onChangeText={(v) => setReview((prev) => prev ? { ...prev, merchant: v } : prev)}
                  placeholder="Merchant name"
                  placeholderTextColor={Colors.textTertiary}
                  testID="review-merchant"
                />
              </View>

              <View style={styles.reviewFieldRow}>
                <View style={styles.reviewFieldHalf}>
                  <Text style={styles.reviewFieldLabel}>DATE</Text>
                  <TextInput
                    style={[
                      styles.reviewInput,
                      !review?.date.trim() && styles.reviewInputWarning,
                    ]}
                    value={review?.date ?? ''}
                    onChangeText={(v) => setReview((prev) => prev ? { ...prev, date: v } : prev)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.textTertiary}
                    testID="review-date"
                  />
                </View>
                <View style={styles.reviewFieldHalf}>
                  <Text style={styles.reviewFieldLabel}>TOTAL PAID</Text>
                  <View style={[
                    styles.totalInputRow,
                    (review?.totalValidationIssues ?? []).length > 0 && styles.totalInputWarning,
                  ]}>
                    <Text style={styles.totalDollar}>$</Text>
                    <TextInput
                      style={styles.reviewInputTotal}
                      value={review?.amount ?? ''}
                      onChangeText={(v) => setReview((prev) => prev ? { ...prev, amount: v } : prev)}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      placeholderTextColor={Colors.textTertiary}
                      testID="review-total"
                    />
                  </View>
                </View>
              </View>

              {review?.discount !== null && review?.discount !== undefined && review.discount > 0 && (
                <View style={styles.discountBanner}>
                  <Text style={styles.discountText}>Discount/savings detected: -${review.discount.toFixed(2)}</Text>
                </View>
              )}

              <Pressable style={styles.itemsHeader} onPress={() => setItemsExpanded((p) => !p)}>
                <View style={styles.itemsHeaderLeft}>
                  <Text style={styles.itemsHeaderTitle}>Items</Text>
                  <View style={styles.itemCountBadge}>
                    <Text style={styles.itemCountText}>{review?.items.length ?? 0}</Text>
                  </View>
                </View>
                <View style={styles.itemsHeaderRight}>
                  <Text style={styles.itemsTotalText}>${itemsTotal.toFixed(2)}</Text>
                  {itemsExpanded ? <ChevronUp size={16} color={Colors.textSecondary} /> : <ChevronDown size={16} color={Colors.textSecondary} />}
                </View>
              </Pressable>

              {itemsExpanded && (
                <View style={styles.itemsList}>
                  {(review?.items ?? []).map((item, index) => (
                    <View key={`${item.name}-${index}`}>
                      {renderReviewItem({ item, index })}
                    </View>
                  ))}
                  {(review?.items ?? []).length === 0 && (
                    <Text style={styles.noItemsText}>No items detected</Text>
                  )}
                </View>
              )}

              <View style={styles.breakdownSection}>
                {review?.subtotal !== null && review?.subtotal !== undefined && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Subtotal</Text>
                    <Text style={styles.breakdownValue}>${review.subtotal.toFixed(2)}</Text>
                  </View>
                )}
                {review?.tax !== null && review?.tax !== undefined && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Tax</Text>
                    <Text style={styles.breakdownValue}>${review.tax.toFixed(2)}</Text>
                  </View>
                )}
                {review?.tip !== null && review?.tip !== undefined && review.tip > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Tip</Text>
                    <Text style={styles.breakdownValue}>${review.tip.toFixed(2)}</Text>
                  </View>
                )}
                {review?.discount !== null && review?.discount !== undefined && review.discount > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Discount</Text>
                    <Text style={[styles.breakdownValue, { color: '#16A34A' }]}>-${review.discount.toFixed(2)}</Text>
                  </View>
                )}
                <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                  <Text style={styles.breakdownTotalLabel}>Total Paid</Text>
                  <Text style={styles.breakdownTotalValue}>${review?.amount ?? '0.00'}</Text>
                </View>
              </View>

              <View style={styles.reviewCategorySection}>
                <Text style={styles.reviewFieldLabel}>CATEGORY</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map(({ key, icon: Icon }) => {
                    const active = review?.category === key;
                    const color = ExpenseCategoryColors[key];
                    return (
                      <Pressable
                        key={key}
                        style={[styles.categoryChip, active && { backgroundColor: `${color}15`, borderColor: color }]}
                        onPress={() => setReview((prev) => prev ? { ...prev, category: key } : prev)}
                      >
                        <Icon size={16} color={active ? color : Colors.textTertiary} />
                        <Text style={[styles.categoryChipText, active && { color }]}>{ExpenseCategoryLabels[key]}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.reviewActions}>
                <Pressable style={styles.rescanBtn} onPress={() => { setShowReview(false); void handleImageCapture('camera'); }} testID="retake-btn">
                  <RefreshCw size={14} color={Colors.text} />
                  <Text style={styles.rescanBtnText}>Retake</Text>
                </Pressable>
                <Pressable style={styles.rescanBtn} onPress={() => { setShowReview(false); void handleImageCapture('gallery'); }} testID="upload-btn">
                  <ImageIcon size={14} color={Colors.text} />
                  <Text style={styles.rescanBtnText}>Upload</Text>
                </Pressable>
                <Pressable style={styles.confirmBtn} onPress={confirmReview} testID="confirm-review-btn">
                  <Check size={16} color="#FFFFFF" />
                  <Text style={styles.confirmBtnText}>Confirm</Text>
                </Pressable>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {showSuccess && (
        <Modal transparent visible animationType="none">
          <View style={styles.successOverlay}>
            <Animated.View style={[styles.successContent, { opacity: successOpacity, transform: [{ scale: successScale }] }]}>
              <View style={styles.successCircle}>
                <Check size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.successText}>Expense Added</Text>
            </Animated.View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.headerBg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border, ...Colors.headerShadow },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  topTitle: { fontSize: 16, fontWeight: '600' as const, color: Colors.text },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#262626', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, minWidth: 80, justifyContent: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 14, fontWeight: '600' as const, color: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  scanSection: { marginBottom: 4 },
  scanSectionTitle: { fontSize: 16, fontWeight: '600' as const, color: Colors.text, marginBottom: 4 },
  scanSectionSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 14, fontWeight: '400' as const },
  modeSwitch: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DBDBDB' },
  modeBtnActive: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: '#262626', borderWidth: 1, borderColor: '#262626' },
  modeBtnText: { fontSize: 14, fontWeight: '500' as const, color: Colors.textSecondary },
  modeBtnTextActive: { fontSize: 14, fontWeight: '500' as const, color: '#FFFFFF' },
  scanProgressCard: { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#BFDBFE' },
  scanProgressHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  scanProgressText: { fontSize: 14, fontWeight: '600' as const, color: '#1D4ED8' },
  progressBarBg: { height: 6, backgroundColor: '#DBEAFE', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: 6, backgroundColor: '#3B82F6', borderRadius: 3 },
  scanPhaseHint: { fontSize: 12, color: '#6B7280', lineHeight: 16 },
  errorCard: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FECACA' },
  errorHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  errorTitle: { fontSize: 15, fontWeight: '700' as const, color: '#991B1B' },
  errorMessage: { fontSize: 13, color: '#7F1D1D', lineHeight: 18, marginBottom: 14 },
  errorActions: { flexDirection: 'row', gap: 8 },
  retryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  retryBtnText: { fontSize: 12, fontWeight: '600' as const, color: Colors.text },
  manualBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1C1C1E' },
  manualBtnText: { fontSize: 12, fontWeight: '600' as const, color: '#FFFFFF' },
  manualEntryTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  manualEntryTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  manualEntryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2D6A4F0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualEntryTriggerTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  manualEntryTriggerSub: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  manualFieldsContainer: {
    marginTop: 8,
  },
  section: { marginBottom: 22 },
  sectionLabel: { fontSize: 11, fontWeight: '600' as const, color: Colors.textTertiary, letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' as const },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, fontSize: 15, color: Colors.text, fontWeight: '400' as const, borderWidth: StyleSheet.hairlineWidth, borderColor: '#DBDBDB' },
  notesInput: { minHeight: 80, paddingTop: 14 },
  amountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: '#DBDBDB' },
  dollarSign: { fontSize: 22, fontWeight: '600' as const, color: Colors.text, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '600' as const, color: Colors.text, paddingVertical: 14 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DBDBDB' },
  categoryChipText: { fontSize: 13, fontWeight: '500' as const, color: Colors.textSecondary },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  reviewSheet: { backgroundColor: '#FAFAFA', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%', paddingTop: 18, paddingHorizontal: 18 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  reviewTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  reviewScrollContent: { paddingBottom: 20 },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  confidenceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  confidenceDot: { width: 7, height: 7, borderRadius: 4 },
  confidenceText: { fontSize: 12, fontWeight: '700' as const },
  paymentMethod: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary },
  reviewRequiredBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  reviewRequiredText: { fontSize: 13, color: '#1D4ED8', flex: 1, fontWeight: '500' as const },
  warningsBox: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginBottom: 14, gap: 4 },
  warningRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  warningText: { fontSize: 12, color: '#92400E', flex: 1, lineHeight: 16 },
  reviewFieldGroup: { marginBottom: 12 },
  reviewFieldLabel: { fontSize: 11, fontWeight: '600' as const, color: Colors.textTertiary, letterSpacing: 0.8, marginBottom: 6 },
  reviewFieldRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  reviewFieldHalf: { flex: 1 },
  reviewInput: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 13, fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: '#DBDBDB' },
  reviewInputWarning: { borderColor: '#FCD34D', borderWidth: 1.5, backgroundColor: '#FFFBEB' },
  totalInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF3', borderWidth: 1.5, borderColor: '#86EFAC', borderRadius: 12, paddingHorizontal: 13 },
  totalInputWarning: { borderColor: '#FCD34D', backgroundColor: '#FFFBEB' },
  totalDollar: { fontSize: 18, fontWeight: '800' as const, color: '#166534', marginRight: 2 },
  reviewInputTotal: { flex: 1, fontSize: 18, fontWeight: '800' as const, color: '#166534', paddingVertical: 12 },
  discountBanner: { backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  discountText: { fontSize: 13, fontWeight: '600' as const, color: '#059669' },
  itemsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  itemsHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemsHeaderTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  itemCountBadge: { backgroundColor: '#262626', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  itemCountText: { fontSize: 11, fontWeight: '700' as const, color: '#FFFFFF' },
  itemsHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemsTotalText: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  itemsList: { backgroundColor: '#FFFFFF', borderRadius: 10, overflow: 'hidden', marginBottom: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: '#EFEFEF' },
  reviewItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.border },
  reviewItemLeft: { flex: 1, marginRight: 10 },
  reviewItemName: { fontSize: 14, fontWeight: '600' as const, color: Colors.text, lineHeight: 18 },
  reviewItemQty: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  reviewItemRight: { alignItems: 'flex-end', gap: 4 },
  reviewItemPrice: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  reviewItemActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 12, fontWeight: '700' as const, color: Colors.text, minWidth: 14, textAlign: 'center' as const },
  removeBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginLeft: 2 },
  noItemsText: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center' as const, paddingVertical: 16 },
  breakdownSection: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, marginBottom: 14, gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: '#EFEFEF' },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' as const },
  breakdownValue: { fontSize: 13, color: Colors.text, fontWeight: '600' as const },
  breakdownTotal: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8, marginTop: 4 },
  breakdownTotalLabel: { fontSize: 15, fontWeight: '800' as const, color: Colors.text },
  breakdownTotalValue: { fontSize: 15, fontWeight: '800' as const, color: '#166534' },
  reviewCategorySection: { marginBottom: 14 },
  reviewActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  rescanBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, borderRadius: 12, backgroundColor: '#F3F4F6', paddingVertical: 13 },
  rescanBtnText: { fontSize: 13, fontWeight: '600' as const, color: Colors.text },
  confirmBtn: { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 12, backgroundColor: '#262626', paddingVertical: 13 },
  confirmBtnText: { color: '#FFFFFF', fontWeight: '700' as const, fontSize: 14 },
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  successContent: { alignItems: 'center', gap: 16 },
  successCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#2D6A4F', justifyContent: 'center', alignItems: 'center' },
  successText: { fontSize: 20, fontWeight: '700' as const, color: '#FFFFFF' },


});
