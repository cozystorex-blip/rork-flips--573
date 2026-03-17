import React, { useState, useCallback } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { X, Check, User, FileText, Camera } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useProfile } from '@/contexts/ProfileContext';
import { CategoryType } from '@/types';
import Colors, { CategoryColors } from '@/constants/colors';
import CategoryIcon from '@/components/CategoryIcon';
import {
  pickAndCropAvatar,
  uploadAvatarToSupabase,
  PermissionDeniedError,
  ValidationError,
  openAppSettings,
} from '@/services/uploadService';

const STYLE_OPTIONS: { key: CategoryType; label: string }[] = [
  { key: 'budget', label: 'Budget' },
  { key: 'healthy', label: 'Healthy' },
  { key: 'bulk', label: 'Bulk Buyer' },
  { key: 'deals', label: 'Deal Hunter' },
];

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
];

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, saveProfile, userId } = useProfile();

  const [name, setName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar_url ?? AVATAR_PRESETS[0]);
  const [dominantStyle, setDominantStyle] = useState<CategoryType>(
    profile?.style_tag ?? 'budget'
  );
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handlePickPhoto = useCallback(async () => {
    if (Platform.OS === 'web') {
      try {
        const result = await import('expo-image-picker').then((mod) =>
          mod.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        );
        if (!result.canceled && result.assets?.[0]) {
          setAvatar(result.assets[0].uri);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (e) {
        console.log('[EditProfile] Web gallery pick error:', e);
        Alert.alert('Error', 'Could not pick image. Please use a preset avatar.');
      }
      return;
    }
    try {
      setUploadingAvatar(true);
      const result = await pickAndCropAvatar();
      if (!result) {
        setUploadingAvatar(false);
        return;
      }

      if (!userId) {
        Alert.alert('Error', 'You must be signed in to upload a photo.');
        setUploadingAvatar(false);
        return;
      }

      const publicUrl = await uploadAvatarToSupabase(result.uri, userId);
      setAvatar(publicUrl);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('[EditProfile] Avatar uploaded:', publicUrl);
    } catch (e: unknown) {
      console.log('[EditProfile] Avatar upload error:', e);
      if (e instanceof PermissionDeniedError) {
        Alert.alert(
          'Photo Access Required',
          'Photo access is required for custom uploads. You can still use a preset avatar.',
          [
            {
              text: 'Open Settings',
              onPress: () => openAppSettings(),
            },
            {
              text: 'Use Preset Avatar',
              style: 'cancel',
            },
          ]
        );
      } else if (e instanceof ValidationError) {
        Alert.alert('Invalid Photo', e.message);
      } else {
        const msg = e instanceof Error ? e.message : 'Failed to upload photo';
        Alert.alert('Upload Failed', msg + '\n\nYou can still save your profile with a preset avatar.');
      }
    } finally {
      setUploadingAvatar(false);
    }
  }, [userId]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name Required', 'Please enter your display name.');
      return;
    }
    if (trimmedName.length < 2) {
      Alert.alert('Name Too Short', 'Display name must be at least 2 characters.');
      return;
    }
    if (trimmedName.length > 30) {
      Alert.alert('Name Too Long', 'Display name must be 30 characters or less.');
      return;
    }

    if (!userId) {
      Alert.alert('Not Signed In', 'Please sign in to save your profile.');
      return;
    }

    setSaving(true);
    try {
      console.log('[EditProfile] Saving profile for user:', userId);
      await saveProfile({
        display_name: trimmedName,
        bio: bio.trim(),
        avatar_url: avatar || AVATAR_PRESETS[0],
        style_tag: dominantStyle,
      });
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      console.log('[EditProfile] Profile saved successfully:', trimmedName);
      try {
        router.back();
      } catch (navErr) {
        console.log('[EditProfile] Navigation back failed:', navErr);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save profile';
      console.log('[EditProfile] Save error:', msg);
      Alert.alert('Save Failed', msg + '\n\nYour changes may have been saved locally. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [name, bio, avatar, dominantStyle, saveProfile, router, userId]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <X size={20} color={Colors.text} />
          </Pressable>
          <Text style={styles.topTitle}>
            {profile?.display_name ? 'Edit Profile' : 'Create Profile'}
          </Text>
          <Pressable
            onPress={handleSave}
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            disabled={saving}
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
          <View style={styles.avatarSection}>
            <Pressable onPress={handlePickPhoto} disabled={uploadingAvatar} style={styles.avatarPreview}>
              {uploadingAvatar ? (
                <View style={styles.avatarLoading}>
                  <ActivityIndicator size="large" color="#1C1C1E" />
                </View>
              ) : (
                <Image
                  source={{ uri: avatar || AVATAR_PRESETS[0] }}
                  style={styles.avatarImg}
                  contentFit="cover"
                />
              )}
              <View style={styles.cameraOverlay}>
                <Camera size={16} color="#FFFFFF" />
              </View>
            </Pressable>

            <Text style={styles.sectionLabel}>CHOOSE AVATAR</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.avatarRow}
            >
              {Platform.OS !== 'web' && (
                <Pressable
                  onPress={handlePickPhoto}
                  disabled={uploadingAvatar}
                  style={[styles.avatarOption, styles.uploadOption]}
                >
                  <Camera size={22} color="#1C1C1E" />
                </Pressable>
              )}
              {AVATAR_PRESETS.map((url) => (
                <Pressable
                  key={url}
                  onPress={() => {
                    setAvatar(url);
                    void Haptics.selectionAsync();
                  }}
                  style={[
                    styles.avatarOption,
                    avatar === url && styles.avatarOptionActive,
                  ]}
                >
                  <Image
                    source={{ uri: url }}
                    style={styles.avatarOptionImg}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>YOUR NAME</Text>
            <View style={styles.inputRow}>
              <User size={16} color={Colors.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="Display name (2–30 chars)"
                placeholderTextColor={Colors.textTertiary}
                value={name}
                onChangeText={setName}
                maxLength={30}
                testID="profile-name-input"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BIO</Text>
            <View style={styles.inputRow}>
              <FileText size={16} color={Colors.textTertiary} style={styles.bioIcon} />
              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="Tell people about your shopping style..."
                placeholderTextColor={Colors.textTertiary}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={120}
                testID="profile-bio-input"
              />
            </View>
            <Text style={styles.charCount}>{bio.length}/120</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>YOUR STYLE</Text>
            <View style={styles.styleGrid}>
              {STYLE_OPTIONS.map(({ key, label }) => {
                const isActive = dominantStyle === key;
                const color = CategoryColors[key];
                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.styleOption,
                      isActive && {
                        backgroundColor: color + '15',
                        borderColor: color,
                      },
                    ]}
                    onPress={() => {
                      setDominantStyle(key);
                      void Haptics.selectionAsync();
                    }}
                  >
                    <View style={[styles.styleIconWrap, { backgroundColor: isActive ? color + '18' : '#F0F0F2' }]}>
                      <CategoryIcon category={key} size={20} color={isActive ? color : Colors.textTertiary} />
                    </View>
                    <Text
                      style={[
                        styles.styleLabel,
                        isActive && { color, fontWeight: '700' as const },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
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
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#00A344',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    minWidth: 80,
    justifyContent: 'center',
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarPreview: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarImg: {
    width: 90,
    height: 90,
  },
  avatarLoading: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00A344',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  avatarOption: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  avatarOptionActive: {
    borderColor: '#00C853',
  },
  uploadOption: {
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderColor: '#636366',
    borderWidth: 2,
  },
  avatarOptionImg: {
    width: 52,
    height: 52,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
    padding: 0,
  },
  bioIcon: {
    marginTop: 2,
  },
  bioInput: {
    minHeight: 60,
  },
  charCount: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginTop: 6,
  },
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  styleOption: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  styleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  styleLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },

});
