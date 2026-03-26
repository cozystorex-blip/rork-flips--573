import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { X, Check, Camera, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useBlocks } from '@/contexts/BlocksContext';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import { uploadBlockImageToSupabase } from '@/services/uploadService';
import * as ImageManipulator from 'expo-image-manipulator';



export default function CreateBlockScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const _params = useLocalSearchParams<{ userId?: string }>();
  const { addBlock } = useBlocks();
  const { userId } = useAuth();

  const [headerImageUrl, setHeaderImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const hasImage = headerImageUrl.trim().length > 0;
  const canSave = hasImage && !saving;

  const processAndUpload = useCallback(async (uri: string) => {
    setUploadingImage(true);
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      if (!userId) {
        Alert.alert('Error', 'Not authenticated');
        setUploadingImage(false);
        return;
      }
      console.log('[CreateBlock] Processed image URI:', manipulated.uri.substring(0, 80));
      try {
        const publicUrl = await uploadBlockImageToSupabase(manipulated.uri, userId);
        setHeaderImageUrl(publicUrl);
        console.log('[CreateBlock] Image uploaded to Supabase:', publicUrl);
      } catch (uploadErr) {
        console.log('[CreateBlock] Supabase upload failed, using local URI as fallback:', uploadErr);
        setHeaderImageUrl(manipulated.uri);
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to process image';
      console.log('[CreateBlock] Process image error:', msg);
      Alert.alert('Image Error', msg);
    } finally {
      setUploadingImage(false);
    }
  }, [userId]);

  const handlePickFromGallery = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission Needed', 'Allow photo access in Settings to pick from gallery.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      await processAndUpload(result.assets[0].uri);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to select image';
      console.log('[CreateBlock] Gallery pick error:', msg);
      Alert.alert('Image Error', msg);
    }
  }, [processAndUpload]);

  const handleTakePhoto = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Camera is not available on web.');
      return;
    }
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Allow camera access in Settings to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      await processAndUpload(result.assets[0].uri);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to take photo';
      console.log('[CreateBlock] Camera error:', msg);
      Alert.alert('Camera Error', msg);
    }
  }, [processAndUpload]);

  const handleSave = useCallback(async () => {
    if (!hasImage) {
      Alert.alert('Photo Required', 'Please select or upload a photo.');
      return;
    }

    setSaving(true);
    try {
      const timestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

      console.log('[CreateBlock] Saving block with image:', headerImageUrl.substring(0, 60));

      await addBlock({
        title: `Photo ${timestamp}`,
        description: description.trim(),
        headerImageUrl: headerImageUrl.trim(),
        blockType: 'tip',
        styleBadge: null,
        showNewBadge: false,
        actionType: 'none',
        actionLabel: '',
        placeId: undefined,
        url: undefined,
      });

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('[CreateBlock] Photo saved successfully');
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save photo';
      console.log('[CreateBlock] Save error:', msg);
      Alert.alert('Save Failed', 'Could not save photo. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [headerImageUrl, description, addBlock, router, hasImage]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn} testID="close-create-block">
            <X size={20} color={Colors.text} />
          </Pressable>
          <Text style={styles.topTitle}>Add Photo</Text>
          <Pressable
            onPress={handleSave}
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            disabled={!canSave}
            testID="save-block-btn"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Check size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save</Text>
              </>
            )}
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {hasImage && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: headerImageUrl }} style={styles.imagePreview} contentFit="cover" />
              <Pressable style={styles.removeImageBtn} onPress={() => setHeaderImageUrl('')}>
                <X size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          )}

          {!hasImage && !uploadingImage && (
            <View style={styles.emptyPreview}>
              <Camera size={32} color={Colors.textTertiary} />
              <Text style={styles.emptyPreviewText}>Select a photo to post</Text>
            </View>
          )}

          {uploadingImage && !hasImage && (
            <View style={styles.emptyPreview}>
              <ActivityIndicator size="large" color="#1C1C1E" />
              <Text style={styles.emptyPreviewText}>Processing photo...</Text>
            </View>
          )}

          <View style={styles.pickerRow}>
            <Pressable
              onPress={handlePickFromGallery}
              disabled={uploadingImage}
              style={({ pressed }) => [styles.pickerBtn, pressed && { opacity: 0.7 }]}
              testID="pick-gallery-btn"
            >
              <View style={styles.pickerIconCircle}>
                <ImageIcon size={22} color="#1C1C1E" />
              </View>
              <Text style={styles.pickerBtnText}>Gallery</Text>
            </Pressable>
            {Platform.OS !== 'web' && (
              <Pressable
                onPress={handleTakePhoto}
                disabled={uploadingImage}
                style={({ pressed }) => [styles.pickerBtn, pressed && { opacity: 0.7 }]}
                testID="pick-camera-btn"
              >
                <View style={styles.pickerIconCircle}>
                  <Camera size={22} color="#1C1C1E" />
                </View>
                <Text style={styles.pickerBtnText}>Camera</Text>
              </Pressable>
            )}
          </View>

          <TextInput
            style={styles.descriptionInput}
            placeholder="Add a description (optional)"
            placeholderTextColor={Colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={200}
            testID="block-description-input"
          />

          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.headerBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    ...Colors.headerShadow,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.text },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    minWidth: 80,
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: { fontSize: 14, fontWeight: '600' as const, color: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, gap: 16 },
  imagePreviewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    aspectRatio: 1,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyPreviewText: {
    fontSize: 15,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
  },
  pickerBtn: {
    alignItems: 'center',
    gap: 8,
  },
  pickerIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
  },
  pickerBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },

  descriptionInput: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
});
