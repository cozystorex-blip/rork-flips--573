import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  X,
  Camera,
  Check,
  Tag,
  ShoppingCart,
  Home,
  Package,
  Apple,
  ShieldAlert,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { z } from 'zod';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { saveLocalDeal } from '@/services/localDealsService';
import type { VerifiedDealRow } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_HEIGHT = SCREEN_WIDTH * 0.65;

const CATEGORIES: { key: string; label: string; icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }> }[] = [
  { key: 'Deals', label: 'Deals', icon: Tag },
  { key: 'Grocery', label: 'Grocery', icon: ShoppingCart },
  { key: 'Home', label: 'Home', icon: Home },
  { key: 'Bulk', label: 'Bulk', icon: Package },
  { key: 'Healthy', label: 'Healthy', icon: Apple },
];

const BANNED_WORDS = [
  'nsfw', 'porn', 'sex', 'nude', 'kill', 'hate', 'racist', 'slur',
  'drug', 'weapon', 'gun', 'bomb', 'terror', 'illegal',
];

function containsBannedContent(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_WORDS.some((w) => lower.includes(w));
}

const itemValidationSchema = z.object({
  has_product: z.boolean().describe('Whether there is a real product, item, price tag, shelf label, sale sign, store merchandise, or store-related find visible in the image'),
  confidence: z.number().min(0).max(1).describe('Confidence score 0-1 of whether this is a valid find/product image'),
  item_name: z.string().nullable().describe('The name of the product/item if detected'),
  brand: z.string().nullable().describe('The brand name if visible'),
  estimated_price: z.string().nullable().describe('Price shown on the tag or shelf label if visible'),
  original_price: z.string().nullable().describe('Original/regular price if visible (for calculating savings)'),
  store_guess: z.string().nullable().describe('The store name if visible or recognizable'),
  category_guess: z.string().nullable().describe('Suggested category: Deals, Budget, Healthy, Bulk, Home, or Grocery'),
  deal_type_guess: z.string().nullable().describe('Type of deal: hot_deal, clearance, bogo, weekly_ad, limited, price_drop, or null'),
  find_tag_guess: z.string().nullable().describe('Suggested find tag: hidden_gem, worth_it, budget_pick, trending, nice_find, or null'),
  is_inappropriate: z.boolean().describe('Whether the image contains inappropriate, explicit, violent, hateful, or unsafe content'),
  rejection_reason: z.string().nullable().describe('If no product is found or content is inappropriate, explain why the image was rejected'),
});

type ItemValidation = z.infer<typeof itemValidationSchema>;

async function validateItemImage(imageUri: string): Promise<ItemValidation> {
  console.log('[PostDeal] Validating image for product presence...');
  try {
    let base64: string;

    if (Platform.OS === 'web') {
      const resp = await fetch(imageUri);
      const blob = await resp.blob();
      base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1] ?? '');
        };
        reader.readAsDataURL(blob);
      });
    } else {
      base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    const result = await generateObject({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a finds/deal post validator for a budgeting app. Your job is to approve images that show real products, store items, household goods, food items, beauty products, gadgets, or any legitimate store-related find.

APPROVE if you see:
- A product on a store shelf with or without visible price tag
- A close-up of a price tag, sale sign, or clearance sticker
- A product package/box with visible branding
- Store signage showing deals or promotions
- A hardware/tool/home improvement/building supply item
- A product in packaging (even without store context)
- An interesting or useful consumer product
- Organization or home items
- Fashion accessories or clothing items
- Any legitimate consumer product worth sharing

REJECT if you see:
- Explicit, sexual, or nude content
- Violence, weapons, or disturbing imagery
- Hateful or offensive content
- Illegal products or substances
- Selfies with no product visible
- Random scenery with no product
- Screenshots, memes, text messages
- Blurry or completely unrecognizable images
- Empty rooms, walls, floors with nothing interesting
- Spam or misleading content

Also flag is_inappropriate=true for any explicit, violent, hateful, or unsafe content.

Be moderately lenient for product images. Give a confidence score. If confidence is below 0.3, reject it.
Suggest a find_tag_guess if appropriate: hidden_gem, worth_it, budget_pick, trending, or nice_find.`,
            },
            {
              type: 'image',
              image: `data:image/jpeg;base64,${base64}`,
            },
          ],
        },
      ],
      schema: itemValidationSchema,
    });

    console.log('[PostDeal] Validation result:', JSON.stringify(result));
    return result;
  } catch (err) {
    console.log('[PostDeal] Validation error, allowing with warning:', err);
    return {
      has_product: true,
      confidence: 0.5,
      item_name: null,
      brand: null,
      estimated_price: null,
      original_price: null,
      store_guess: null,
      category_guess: null,
      deal_type_guess: null,
      find_tag_guess: null,
      is_inappropriate: false,
      rejection_reason: null,
    };
  }
}

async function uploadDealPhoto(uri: string, userId: string | null): Promise<string | null> {
  try {
    console.log('[PostDeal] Compressing image before upload...');
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 900 } }],
      { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
    );

    const userPrefix = userId ?? 'anon';
    const fileName = `deals/${userPrefix}/deal_${Date.now()}.jpg`;

    let fileData: Uint8Array | Blob;

    if (Platform.OS === 'web') {
      const resp = await fetch(manipulated.uri);
      fileData = await resp.blob();
    } else {
      const b64 = await FileSystem.readAsStringAsync(manipulated.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binaryString = atob(b64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileData = bytes;
    }

    console.log('[PostDeal] Uploading to Supabase storage...');
    const { error: uploadError } = await supabase.storage
      .from('deal_photos')
      .upload(fileName, fileData, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.log('[PostDeal] Storage upload error:', uploadError.message);
      return uri;
    }

    const { data: urlData } = supabase.storage.from('deal_photos').getPublicUrl(fileName);
    console.log('[PostDeal] Photo uploaded:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (err) {
    console.log('[PostDeal] Photo upload failed, using local URI:', err);
    return uri;
  }
}

export default function PostDealScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  const [dealTitle, setDealTitle] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Deals');
  const [submitted, setSubmitted] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ItemValidation | null>(null);
  const [rejected, setRejected] = useState(false);

  const [detectedStore, setDetectedStore] = useState('');
  const [detectedPrice, setDetectedPrice] = useState('');
  const [detectedOriginalPrice, setDetectedOriginalPrice] = useState('');

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const canSubmit = useMemo(() => {
    return dealTitle.trim().length > 0 && !rejected && !validating;
  }, [dealTitle, rejected, validating]);

  const handleImageSelected = useCallback(async (uri: string) => {
    setImageUri(uri);
    setRejected(false);
    setValidation(null);
    setValidating(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('[PostDeal] Image selected, starting validation...');

    try {
      const result = await validateItemImage(uri);
      setValidation(result);

      if (!result.has_product || result.confidence < 0.3 || result.is_inappropriate) {
        setRejected(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        console.log('[PostDeal] Image rejected:', result.rejection_reason);
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (result.item_name && !dealTitle.trim()) {
          setDealTitle(result.item_name);
        }
        if (result.store_guess) {
          setDetectedStore(result.store_guess);
        }
        if (result.estimated_price) {
          setDetectedPrice(result.estimated_price.replace(/[^0-9.]/g, ''));
        }
        if (result.original_price) {
          setDetectedOriginalPrice(result.original_price.replace(/[^0-9.]/g, ''));
        }
        if (result.category_guess) {
          const match = CATEGORIES.find(
            (c) => c.key.toLowerCase() === (result.category_guess ?? '').toLowerCase()
          );
          if (match) setSelectedCategory(match.key);
        }
        console.log('[PostDeal] Image validated, confidence:', result.confidence);
      }
    } catch (err) {
      console.log('[PostDeal] Validation error:', err);
    } finally {
      setValidating(false);
    }
  }, [dealTitle]);

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        await handleImageSelected(result.assets[0].uri);
      }
    } catch (err) {
      console.log('[PostDeal] Image pick error:', err);
    }
  }, [handleImageSelected]);

  const takePhoto = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        await pickImage();
        return;
      }
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Access', 'Please allow camera access to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        await handleImageSelected(result.assets[0].uri);
      }
    } catch (err) {
      console.log('[PostDeal] Camera error:', err);
    }
  }, [pickImage, handleImageSelected]);

  const clearImage = useCallback(() => {
    setImageUri(null);
    setValidation(null);
    setRejected(false);
    setDetectedStore('');
    setDetectedPrice('');
    setDetectedOriginalPrice('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return;

    if (!dealTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a name for your find.');
      return;
    }

    if (containsBannedContent(dealTitle)) {
      Alert.alert('Content Not Allowed', 'Your post contains content that is not allowed.');
      return;
    }

    setSubmitting(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let photoUrl: string | null = null;
      if (imageUri) {
        setUploadProgress('Uploading photo...');
        photoUrl = await uploadDealPhoto(imageUri, userId);
      }

      setUploadProgress('Posting find...');

      const parsedPrice = detectedPrice.trim() ? Number.parseFloat(detectedPrice.replace(/[^0-9.]/g, '')) : null;
      const parsedOriginalPrice = detectedOriginalPrice.trim() ? Number.parseFloat(detectedOriginalPrice.replace(/[^0-9.]/g, '')) : null;

      let computedSavingsVal: number | null = null;
      let computedSavingsPercent: number | null = null;
      if (parsedOriginalPrice && parsedPrice && parsedOriginalPrice > parsedPrice) {
        computedSavingsVal = parsedOriginalPrice - parsedPrice;
        computedSavingsPercent = Math.round(((parsedOriginalPrice - parsedPrice) / parsedOriginalPrice) * 100);
      }

      const VALID_CATEGORIES = ['Deals', 'Budget', 'Healthy', 'Bulk', 'Home', 'Grocery'] as const;
      const rawCategory = selectedCategory || 'Deals';
      const categoryValue = VALID_CATEGORIES.includes(rawCategory as typeof VALID_CATEGORIES[number])
        ? rawCategory
        : 'Deals';

      const nowISO = new Date().toISOString();
      const localDealId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const storeName = detectedStore.trim() || 'Unknown Store';

      const localDeal: VerifiedDealRow = {
        id: localDealId,
        store_name: storeName,
        title: dealTitle.trim(),
        description: null,
        category: categoryValue,
        price: (Number.isFinite(parsedPrice) && parsedPrice !== null && parsedPrice > 0) ? parsedPrice : null,
        original_price: (Number.isFinite(parsedOriginalPrice) && parsedOriginalPrice !== null && parsedOriginalPrice > 0) ? parsedOriginalPrice : null,
        savings_amount: (Number.isFinite(computedSavingsVal) && computedSavingsVal !== null && computedSavingsVal > 0) ? computedSavingsVal : null,
        savings_percent: computedSavingsPercent,
        city: null,
        photo_url: photoUrl ?? null,
        source_type: 'user',
        source_url: null,
        user_id: userId ?? null,
        is_active: true,
        is_verified: false,
        created_at: nowISO,
        last_verified: null,
        brand_slug: null,
        deal_expires_at: null,
        moderation_status: 'pending',
      };

      let savedToSupabase = false;

      try {
        const insertPayload: Record<string, unknown> = {
          store_name: storeName,
          title: dealTitle.trim(),
          source_type: 'user',
          is_active: true,
          category: categoryValue,
          moderation_status: 'pending',
        };

        if (Number.isFinite(parsedPrice) && parsedPrice !== null && parsedPrice > 0) insertPayload.price = parsedPrice;
        if (Number.isFinite(parsedOriginalPrice) && parsedOriginalPrice !== null && parsedOriginalPrice > 0) insertPayload.original_price = parsedOriginalPrice;
        if (Number.isFinite(computedSavingsVal) && computedSavingsVal !== null && computedSavingsVal > 0) insertPayload.savings_amount = computedSavingsVal;
        if (computedSavingsPercent !== null) insertPayload.savings_percent = computedSavingsPercent;
        if (photoUrl) insertPayload.photo_url = photoUrl;
        if (userId) insertPayload.user_id = userId;

        console.log('[PostDeal] Inserting deal to Supabase:', JSON.stringify(insertPayload));

        const { data: insertData, error: insertError } = await supabase
          .from('deals')
          .insert([insertPayload])
          .select();

        if (insertError) {
          console.log('[PostDeal] Supabase insert error:', JSON.stringify(insertError));
        } else {
          savedToSupabase = true;
          if (insertData && insertData[0]) {
            localDeal.id = insertData[0].id;
          }
          console.log('[PostDeal] Supabase success:', JSON.stringify(insertData));
        }
      } catch (supaErr) {
        console.log('[PostDeal] Supabase save failed, using local storage:', supaErr);
      }

      if (!savedToSupabase) {
        console.log('[PostDeal] Saving deal locally as fallback');
      }
      await saveLocalDeal(localDeal);
      console.log('[PostDeal] Deal saved locally:', localDeal.id);

      await queryClient.invalidateQueries({ queryKey: ['deals'] });

      setSubmitted(true);
      setUploadProgress('');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }),
        Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, tension: 150, friction: 6 }).start();
      });

      setTimeout(() => {
        router.back();
      }, 1400);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.log('[PostDeal] Error:', message);
      Alert.alert('Post Failed', `Could not post your find: ${message}`);
      setUploadProgress('');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, submitting, userId, dealTitle, imageUri, router, queryClient, selectedCategory, detectedStore, detectedPrice, detectedOriginalPrice, successScale, successOpacity, checkScale]);

  if (submitted) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Animated.View style={[styles.successContainer, { opacity: successOpacity, transform: [{ scale: successScale }] }]}>
          <Animated.View style={[styles.successIconOuter, { transform: [{ scale: checkScale }] }]}>
            <View style={styles.successIcon}>
              <Check size={28} color="#FFFFFF" strokeWidth={3} />
            </View>
          </Animated.View>
          <Text style={styles.successTitle}>Find Posted!</Text>
          <Text style={styles.successSub}>Your find is under review and will appear once approved</Text>
          <View style={styles.successDealPreview}>
            {imageUri && (
              <Image source={{ uri: imageUri }} style={styles.successPreviewImage} contentFit="cover" />
            )}
            <View style={styles.successPreviewInfo}>
              <Text style={styles.successPreviewTitle} numberOfLines={1}>{dealTitle}</Text>
              {detectedStore ? (
                <Text style={styles.successPreviewStore} numberOfLines={1}>{detectedStore}</Text>
              ) : null}
            </View>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            hitSlop={12}
            testID="post-deal-close"
          >
            <X size={18} color="#3C3C43" />
          </Pressable>
          <Text style={styles.headerTitle}>Post a Find</Text>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
            style={({ pressed }) => [
              styles.postBtn,
              (!canSubmit || submitting) && styles.postBtnDisabled,
              pressed && canSubmit && !submitting && { opacity: 0.85 },
            ]}
            testID="post-deal-submit"
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.postBtnText}>Post</Text>
            )}
          </Pressable>
        </View>

        <Animated.View style={[styles.body, { opacity: fadeAnim }]}>
          {/* Photo upload */}
          <View style={styles.photoSection}>
            {imageUri ? (
              <View style={styles.photoPreviewWrap}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.photoPreview}
                  contentFit="cover"
                  transition={200}
                />
                {validating && (
                  <View style={styles.validatingOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.validatingText}>Checking...</Text>
                  </View>
                )}
                {!validating && validation?.has_product && !rejected && (
                  <View style={styles.validOverlay}>
                    <Check size={11} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.validOverlayText}>Looks good</Text>
                  </View>
                )}
                {rejected && (
                  <View style={styles.rejectedOverlay}>
                    <ShieldAlert size={11} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.rejectedOverlayText}>Not valid</Text>
                  </View>
                )}
                <Pressable
                  onPress={clearImage}
                  style={({ pressed }) => [styles.photoChangeBtn, pressed && { opacity: 0.8 }]}
                  hitSlop={8}
                >
                  <Camera size={13} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.photoChangeBtnText}>Change</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  if (Platform.OS === 'web') {
                    void pickImage();
                  } else {
                    Alert.alert('Add Photo', 'Choose a source', [
                      { text: 'Camera', onPress: takePhoto },
                      { text: 'Photo Library', onPress: pickImage },
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                  }
                }}
                style={({ pressed }) => [styles.photoPlaceholder, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]}
                testID="deal-add-photo"
              >
                <View style={styles.photoIconCircle}>
                  <Camera size={26} color="#1B5E3B" strokeWidth={1.6} />
                </View>
                <Text style={styles.photoAddLabel}>Add photo</Text>
                <Text style={styles.photoAddSub}>Optional</Text>
              </Pressable>
            )}
          </View>

          {rejected && validation?.rejection_reason && (
            <View style={styles.rejectionCard}>
              <ShieldAlert size={14} color="#DC2626" strokeWidth={1.8} />
              <Text style={styles.rejectionText}>{validation.rejection_reason}</Text>
            </View>
          )}

          {/* Title input */}
          <View style={styles.inputSection}>
            <TextInput
              style={styles.titleInput}
              placeholder="Item name or deal title"
              placeholderTextColor="#C7C7CC"
              value={dealTitle}
              onChangeText={setDealTitle}
              testID="deal-title-input"
              returnKeyType="done"
              maxLength={80}
              autoFocus={false}
            />
            <View style={styles.inputLine} />
          </View>

          {/* Category chips */}
          <View style={styles.chipRow}>
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.key;
              const IconComp = cat.icon;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => { setSelectedCategory(cat.key); void Haptics.selectionAsync(); }}
                  style={[
                    styles.chip,
                    isActive && styles.chipActive,
                  ]}
                  testID={`category-${cat.key}`}
                >
                  <IconComp size={14} color={isActive ? '#FFFFFF' : '#8E8E93'} strokeWidth={1.8} />
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {submitting && uploadProgress ? (
            <View style={styles.progressRow}>
              <ActivityIndicator size="small" color="#1B5E3B" />
              <Text style={styles.progressText}>{uploadProgress}</Text>
            </View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#F5F5F7',
    letterSpacing: -0.3,
  },
  postBtn: {
    backgroundColor: '#00A344',
    paddingHorizontal: 24,
    paddingVertical: 9,
    borderRadius: 20,
    minWidth: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnDisabled: {
    opacity: 0.3,
  },
  postBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  photoSection: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  photoPreviewWrap: {
    position: 'relative' as const,
    borderRadius: 18,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: PHOTO_HEIGHT,
  },
  validatingOverlay: {
    position: 'absolute' as const,
    bottom: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  validatingText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  validOverlay: {
    position: 'absolute' as const,
    bottom: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(27,94,59,0.88)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
  },
  validOverlayText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  rejectedOverlay: {
    position: 'absolute' as const,
    bottom: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(220,38,38,0.88)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rejectedOverlayText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  photoChangeBtn: {
    position: 'absolute' as const,
    bottom: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  photoChangeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  photoPlaceholder: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  photoIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00C85318',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  photoAddLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#F5F5F7',
  },
  photoAddSub: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#636366',
  },
  rejectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#FF453A18',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FF453A30',
  },
  rejectionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#FF453A',
    lineHeight: 18,
  },
  inputSection: {
    marginTop: 28,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '500' as const,
    color: '#F5F5F7',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  inputLine: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginTop: 10,
    borderRadius: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 24,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
  },
  chipActive: {
    backgroundColor: '#00A344',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#636366',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 32,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#00C853',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
    backgroundColor: '#0A0A0A',
  },
  successIconOuter: {
    marginBottom: 4,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#00A344',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#F5F5F7',
    letterSpacing: -0.5,
  },
  successSub: {
    fontSize: 14,
    color: '#636366',
    fontWeight: '400' as const,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  successDealPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  successPreviewImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#2A2A2A',
  },
  successPreviewInfo: {
    flex: 1,
    gap: 3,
  },
  successPreviewTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#F5F5F7',
  },
  successPreviewStore: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#636366',
  },
});
