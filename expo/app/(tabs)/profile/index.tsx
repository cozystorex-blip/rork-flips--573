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
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  LogOut,
  Camera,
  Wifi,
  WifiOff,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useOnlinePeople, OnlineUser } from '@/contexts/OnlinePeopleContext';

import {
  pickAndCropAvatar,
  uploadAvatarToSupabase,
  PermissionDeniedError,
  ValidationError,
  openAppSettings,
} from '@/services/uploadService';

function OnlineUserCard({ user, index }: { user: OnlineUser; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const timeSinceJoin = useMemo(() => {
    const diff = Date.now() - user.joinedAt;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins === 1) return '1m ago';
    return `${mins}m ago`;
  }, [user.joinedAt]);

  return (
    <Animated.View style={[styles.userCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.userAvatarWrap}>
        <Image source={{ uri: user.avatar_url }} style={styles.userAvatar} contentFit="cover" />
        <View style={[styles.statusDot, user.status === 'active' ? styles.statusActive : styles.statusIdle]} />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
        <Text style={styles.userJoined}>Joined {timeSinceJoin}</Text>
      </View>
    </Animated.View>
  );
}

const MemoizedOnlineUserCard = React.memo(OnlineUserCard);

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, isAuthenticated } = useAuth();
  const { profile, saveProfile, userId } = useProfile();
  const { goOnline, goOffline, isUserOnline, onlineUsers } = useOnlinePeople();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [goingOnline, setGoingOnline] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const onlineListFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    Animated.timing(onlineListFade, {
      toValue: isUserOnline ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isUserOnline, onlineListFade]);

  const handleGoOnline = useCallback(async () => {
    if (goingOnline) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isUserOnline) {
      goOffline();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setGoingOnline(true);
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 120, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    try {
      const success = await goOnline();
      if (success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log('[Profile] Went online successfully');
      } else {
        Alert.alert('Error', 'Could not go online. Try again.');
      }
    } catch {
      Alert.alert('Error', 'Could not go online. Try again.');
    } finally {
      setGoingOnline(false);
    }
  }, [goingOnline, isUserOnline, goOnline, goOffline, pulseAnim]);

  const memberSince = useMemo(() => {
    if (profile?.created_at) {
      return new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return 'March 2024';
  }, [profile]);

  const displayName = profile?.display_name && profile.display_name !== 'User'
    ? profile.display_name
    : user?.email?.split('@')[0] || 'Flip User';

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

  const renderOnlineUser = useCallback(({ item, index }: { item: OnlineUser; index: number }) => (
    <MemoizedOnlineUserCard user={item} index={index} />
  ), []);

  const keyExtractor = useCallback((item: OnlineUser) => item.id, []);

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

            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Pressable
                onPress={() => { void handleGoOnline(); }}
                style={({ pressed }) => [
                  styles.onlineBadgeRow,
                  isUserOnline && styles.onlineBadgeActive,
                  pressed && { opacity: 0.8 },
                ]}
                testID="go-online-btn"
              >
                {goingOnline ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    {isUserOnline ? (
                      <Wifi size={16} color="#FFFFFF" strokeWidth={2.5} />
                    ) : (
                      <WifiOff size={16} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                    )}
                    <Text style={styles.onlineBadgeLabel}>
                      {isUserOnline ? `Online · ${onlineUsers.length} nearby` : 'Go Online'}
                    </Text>
                  </>
                )}
              </Pressable>
            </Animated.View>

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
          {isUserOnline && onlineUsers.length > 0 && (
            <Animated.View style={[styles.onlineSection, { opacity: onlineListFade }]}>
              <View style={styles.onlineHeader}>
                <View style={styles.onlineHeaderLeft}>
                  <View style={styles.liveDot} />
                  <Text style={styles.onlineSectionTitle}>People Online</Text>
                </View>
                <Text style={styles.onlineCount}>{onlineUsers.length}</Text>
              </View>

              <FlatList
                data={onlineUsers}
                renderItem={renderOnlineUser}
                keyExtractor={keyExtractor}
                scrollEnabled={false}
                contentContainerStyle={styles.usersList}
              />
            </Animated.View>
          )}

          {!isUserOnline && (
            <View style={styles.offlineHint}>
              <WifiOff size={32} color="#C7C7CC" strokeWidth={1.5} />
              <Text style={styles.offlineTitle}>You're Offline</Text>
              <Text style={styles.offlineSubtitle}>
                Tap "Go Online" to instantly connect with other users in the app
              </Text>
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
    marginTop: 4,
  },
  emailText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  onlineBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    gap: 8,
    alignSelf: 'center',
  },
  onlineBadgeActive: {
    backgroundColor: 'rgba(52,199,89,0.35)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  onlineBadgeLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
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
  onlineSection: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  onlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  onlineHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  onlineSectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  onlineCount: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#16A34A',
    backgroundColor: 'rgba(22,163,74,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  usersList: {
    gap: 2,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  userAvatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E5EA',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statusActive: {
    backgroundColor: '#34C759',
  },
  statusIdle: {
    backgroundColor: '#FF9500',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  userJoined: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 2,
  },
  offlineHint: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  offlineTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#8E8E93',
    marginTop: 12,
  },
  offlineSubtitle: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#AEAEB2',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
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
