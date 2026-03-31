import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Animated,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  LogOut,
  Camera,
  Scan,
  Bookmark,
  Clock,
  ShoppingBag,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useScanHistory } from '@/contexts/ScanHistoryContext';
import { useSavedItems } from '@/contexts/SavedItemsContext';
import SyncBadge from '@/components/SyncBadge';

import {
  pickAndCropAvatar,
  uploadAvatarToSupabase,
  PermissionDeniedError,
  ValidationError,
  openAppSettings,
} from '@/services/uploadService';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, isAuthenticated } = useAuth();
  const { profile, saveProfile, userId } = useProfile();
  const { entries: scanEntries } = useScanHistory();
  const { savedDeals } = useSavedItems();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const memberSince = useMemo(() => {
    if (profile?.created_at) {
      return new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return 'March 2024';
  }, [profile]);

  const displayName = profile?.display_name && profile.display_name !== 'User'
    ? profile.display_name
    : user?.email?.split('@')[0] || 'Flip User';

  const totalScans = scanEntries.length;
  const totalSaved = savedDeals.length;

  const handlePickImage = useCallback(async () => {
    void Haptics.selectionAsync();

    if (Platform.OS === 'web') {
      try {
        const mod = await import('expo-image-picker');
        const result = await mod.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
        if (!result.canceled && result.assets?.[0]) {
          await saveProfile({ avatar_url: result.assets[0].uri });
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (e) {
        console.log('[Profile] Web gallery pick error:', e);
        Alert.alert('Error', 'Could not pick image.');
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
      await saveProfile({ avatar_url: publicUrl });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      if (e instanceof PermissionDeniedError) {
        Alert.alert('Photo Access Required', 'Please allow access to your photo library.', [
          { text: 'Open Settings', onPress: () => openAppSettings() },
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else if (e instanceof ValidationError) {
        Alert.alert('Invalid Photo', e.message);
      } else {
        const msg = e instanceof Error ? e.message : 'Failed to upload photo';
        Alert.alert('Upload Failed', msg);
      }
    } finally {
      setUploadingAvatar(false);
    }
  }, [saveProfile, userId]);

  const handleTapName = useCallback(() => {
    void Haptics.selectionAsync();

    if (Platform.OS === 'web') {
      const newName = window.prompt('Enter your display name', displayName);
      if (newName !== null) {
        const trimmed = newName.trim();
        if (!trimmed || trimmed.length < 2) {
          Alert.alert('Invalid Name', 'Display name must be at least 2 characters.');
          return;
        }
        if (trimmed.length > 30) {
          Alert.alert('Name Too Long', 'Display name must be 30 characters or less.');
          return;
        }
        setSavingName(true);
        saveProfile({ display_name: trimmed })
          .then(() => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
          .catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : 'Failed to save name';
            Alert.alert('Save Failed', msg);
          })
          .finally(() => setSavingName(false));
      }
      return;
    }

    Alert.prompt(
      'Change Name',
      'Enter your display name',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (value?: string) => {
            const trimmed = (value ?? '').trim();
            if (!trimmed || trimmed.length < 2) {
              Alert.alert('Invalid Name', 'Display name must be at least 2 characters.');
              return;
            }
            if (trimmed.length > 30) {
              Alert.alert('Name Too Long', 'Display name must be 30 characters or less.');
              return;
            }
            setSavingName(true);
            saveProfile({ display_name: trimmed })
              .then(() => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
              .catch((e: unknown) => {
                const msg = e instanceof Error ? e.message : 'Failed to save name';
                Alert.alert('Save Failed', msg);
              })
              .finally(() => setSavingName(false));
          },
        },
      ],
      'plain-text',
      displayName
    );
  }, [displayName, saveProfile]);

  const handleSignOut = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => { void signOut(); },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.greenHeader, { paddingTop: insets.top + 12 }]}>
          <View style={styles.profileSection}>
            <View style={styles.avatarOuter}>
              <View style={styles.avatar}>
                {uploadingAvatar ? (
                  <View style={styles.avatarLoading}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  </View>
                ) : profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={styles.avatarImage}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={styles.avatarInitial}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <Pressable
                style={styles.cameraBtn}
                hitSlop={6}
                onPress={() => { void handlePickImage(); }}
                disabled={uploadingAvatar}
              >
                <Camera size={14} color="#16A34A" strokeWidth={2} />
              </Pressable>
            </View>

            <Pressable
              onPress={handleTapName}
              disabled={savingName}
              style={({ pressed }) => [styles.nameRow, pressed && { opacity: 0.7 }]}
              testID="profile-name-tap"
            >
              {savingName ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.nameText}>{displayName}</Text>
              )}
            </Pressable>

            <Text style={styles.memberText}>Member since {memberSince}</Text>
            {user?.email && (
              <Text style={styles.emailText}>{user.email}</Text>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={styles.statIconWrap}>
                  <Scan size={16} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Text style={styles.statValue}>{totalScans}</Text>
                <Text style={styles.statLabel}>Scans</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={styles.statIconWrap}>
                  <Bookmark size={16} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Text style={styles.statValue}>{totalSaved}</Text>
                <Text style={styles.statLabel}>Saved</Text>
              </View>
            </View>

            <View style={styles.runnerContainer}>
              <Image
                source={{ uri: 'https://media.giphy.com/media/3o7budMRwZvNGJ3pyE/giphy.gif' }}
                style={styles.runnerGif}
                contentFit="contain"
                testID="old-guy-running-gif"
              />
            </View>
          </View>
        </View>

        <View style={styles.whiteContent}>
          <View style={styles.syncStatusRow}>
            <SyncBadge itemCount={totalScans + totalSaved} />
          </View>

          {(totalScans > 0 || totalSaved > 0) && (
            <View style={styles.activitySection}>
              <Text style={styles.activityTitle}>Your Activity</Text>
              <View style={styles.activityGrid}>
                {totalScans > 0 && (
                  <View style={styles.activityCard}>
                    <View style={[styles.activityCardIcon, { backgroundColor: 'rgba(22,163,74,0.1)' }]}>
                      <Scan size={18} color="#16A34A" strokeWidth={2} />
                    </View>
                    <Text style={styles.activityCardValue}>{totalScans}</Text>
                    <Text style={styles.activityCardLabel}>Items Scanned</Text>
                  </View>
                )}
                {totalSaved > 0 && (
                  <View style={styles.activityCard}>
                    <View style={[styles.activityCardIcon, { backgroundColor: 'rgba(255,149,0,0.1)' }]}>
                      <ShoppingBag size={18} color="#FF9500" strokeWidth={2} />
                    </View>
                    <Text style={styles.activityCardValue}>{totalSaved}</Text>
                    <Text style={styles.activityCardLabel}>Deals Saved</Text>
                  </View>
                )}
                <View style={styles.activityCard}>
                  <View style={[styles.activityCardIcon, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
                    <Clock size={18} color="#007AFF" strokeWidth={2} />
                  </View>
                  <Text style={styles.activityCardValue}>{memberSince.split(' ')[0]}</Text>
                  <Text style={styles.activityCardLabel}>Joined</Text>
                </View>
              </View>
            </View>
          )}

          <Animated.View style={[styles.bottomArea, { opacity: fadeAnim }]}>
            {isAuthenticated && (
              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.7 }]}
              >
                <LogOut size={16} color="#FF3B30" strokeWidth={1.8} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </Pressable>
            )}
          </Animated.View>

          <View style={{ height: insets.bottom + 20 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  greenHeader: {
    backgroundColor: '#16A34A',
    paddingBottom: 28,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarOuter: {
    position: 'relative',
    marginBottom: 18,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3.5,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  avatarInitial: {
    fontSize: 44,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  avatarLoading: {
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameText: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },

  memberText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
  },
  emailText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 0,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 4,
  },

  runnerContainer: {
    marginTop: 16,
    alignItems: 'center',
    width: 160,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  runnerGif: {
    width: 160,
    height: 120,
    borderRadius: 16,
  },
  whiteContent: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -14,
    paddingTop: 20,
    minHeight: 300,
  },
  syncStatusRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
  },

  activitySection: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  activityTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  activityGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  activityCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  activityCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityCardValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  activityCardLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#8E8E93',
    marginTop: 2,
    textAlign: 'center' as const,
  },
  bottomArea: {
    paddingTop: 16,
    paddingBottom: 10,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginHorizontal: 16,
    backgroundColor: '#FFF0F0',
    borderRadius: 14,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FF3B30',
  },

});
