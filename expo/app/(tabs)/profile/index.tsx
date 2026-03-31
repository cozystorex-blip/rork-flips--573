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
  Scan,
  Bookmark,
  Clock,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useOnlinePeople, OnlineUser, UserActivity } from '@/contexts/OnlinePeopleContext';
import { useScanHistory } from '@/contexts/ScanHistoryContext';
import { useSavedItems } from '@/contexts/SavedItemsContext';

import {
  pickAndCropAvatar,
  uploadAvatarToSupabase,
  PermissionDeniedError,
  ValidationError,
  openAppSettings,
} from '@/services/uploadService';

const ACTIVITY_LABELS: Record<UserActivity, string> = {
  scanning: 'Scanning',
  browsing: 'Browsing',
  saving: 'Saving',
  idle: 'Idle',
};

function OnlineUserCard({ user, index }: { user: OnlineUser; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      delay: index * 40,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, index]);

  return (
    <Animated.View style={[styles.userCard, { opacity: fadeAnim }]}>
      <View style={styles.userAvatarWrap}>
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.userAvatar} contentFit="cover" />
        ) : (
          <View style={[styles.userAvatar, styles.userAvatarFallback]}>
            <Text style={styles.userAvatarInitial}>{(user.name || 'U').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={[styles.statusDot, user.status === 'active' ? styles.statusActive : styles.statusIdle]} />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
        <Text style={styles.userActivity}>{ACTIVITY_LABELS[user.activity]}</Text>
      </View>
      {user.scanCount > 0 && (
        <View style={styles.userScanBadge}>
          <Scan size={10} color="#8E8E93" strokeWidth={2} />
          <Text style={styles.userScanCount}>{user.scanCount}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const MemoizedOnlineUserCard = React.memo(OnlineUserCard);

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, isAuthenticated } = useAuth();
  const { profile, saveProfile, userId } = useProfile();
  const { handleToggleOnline, isUserOnline, onlineUsers, activeCount, connectionState, isToggling } = useOnlinePeople();
  const { entries: scanEntries } = useScanHistory();
  const { savedDeals } = useSavedItems();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const isConnecting = connectionState === 'connecting' || isToggling;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleGoOnline = useCallback(() => {
    if (isConnecting) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void handleToggleOnline();
  }, [isConnecting, handleToggleOnline]);

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
        <View style={[styles.profileHeader, { paddingTop: insets.top + 20 }]}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarOuter}>
              <View style={styles.avatar}>
                {uploadingAvatar ? (
                  <ActivityIndicator size="large" color="#2D6A4F" />
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
                <Camera size={13} color="#2D6A4F" strokeWidth={2} />
              </Pressable>
            </View>

            <View style={styles.nameArea}>
              <Pressable
                onPress={handleTapName}
                disabled={savingName}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                testID="profile-name-tap"
              >
                {savingName ? (
                  <ActivityIndicator size="small" color="#1A1A1A" />
                ) : (
                  <Text style={styles.nameText}>{displayName}</Text>
                )}
              </Pressable>
              <Text style={styles.memberText}>Since {memberSince}</Text>
              {user?.email && (
                <Text style={styles.emailText}>{user.email}</Text>
              )}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalScans}</Text>
              <Text style={styles.statLabel}>Scans</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalSaved}</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{isUserOnline ? activeCount : 0}</Text>
              <Text style={styles.statLabel}>Online</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionArea}>
          <Pressable
            onPress={handleGoOnline}
            style={({ pressed }) => [
              styles.onlineToggle,
              isUserOnline && styles.onlineToggleActive,
              pressed && { opacity: 0.85 },
            ]}
            testID="go-online-btn"
          >
            <View style={styles.onlineToggleLeft}>
              {isConnecting ? (
                <ActivityIndicator size="small" color={isUserOnline ? '#2D6A4F' : '#8E8E93'} />
              ) : isUserOnline ? (
                <Wifi size={18} color="#2D6A4F" strokeWidth={2} />
              ) : (
                <WifiOff size={18} color="#8E8E93" strokeWidth={1.8} />
              )}
              <View>
                <Text style={[styles.onlineToggleTitle, isUserOnline && styles.onlineToggleTitleActive]}>
                  {isUserOnline
                    ? onlineUsers.length > 0
                      ? `Online · ${onlineUsers.length} nearby`
                      : 'Online'
                    : 'Go Online'}
                </Text>
                <Text style={styles.onlineToggleSub}>
                  {isUserOnline ? 'Connected to Flips network' : 'See other Flips users nearby'}
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color="#C7C7CC" strokeWidth={2} />
          </Pressable>

          {isUserOnline && onlineUsers.length > 0 && (
            <View style={styles.onlineUsersCard}>
              <View style={styles.onlineUsersHeader}>
                <View style={styles.liveDot} />
                <Text style={styles.onlineUsersTitle}>People Online</Text>
                <Text style={styles.onlineUsersCount}>{onlineUsers.length}</Text>
              </View>
              <FlatList
                data={onlineUsers}
                renderItem={renderOnlineUser}
                keyExtractor={keyExtractor}
                scrollEnabled={false}
              />
            </View>
          )}

          {isUserOnline && onlineUsers.length === 0 && (
            <View style={styles.noUsersCard}>
              <Wifi size={18} color="#C7C7CC" strokeWidth={1.5} />
              <Text style={styles.noUsersText}>No other users online right now</Text>
            </View>
          )}

          {(totalScans > 0 || totalSaved > 0) && (
            <View style={styles.activityCard}>
              <Text style={styles.activityCardTitle}>Activity</Text>
              <View style={styles.activityRows}>
                {totalScans > 0 && (
                  <View style={styles.activityRow}>
                    <View style={[styles.activityIcon, { backgroundColor: '#F0F7F4' }]}>
                      <Scan size={16} color="#2D6A4F" strokeWidth={2} />
                    </View>
                    <Text style={styles.activityLabel}>Items Scanned</Text>
                    <Text style={styles.activityValue}>{totalScans}</Text>
                  </View>
                )}
                {totalSaved > 0 && (
                  <View style={styles.activityRow}>
                    <View style={[styles.activityIcon, { backgroundColor: '#FFF5EB' }]}>
                      <Bookmark size={16} color="#E07C3E" strokeWidth={2} />
                    </View>
                    <Text style={styles.activityLabel}>Deals Saved</Text>
                    <Text style={styles.activityValue}>{totalSaved}</Text>
                  </View>
                )}
                <View style={styles.activityRow}>
                  <View style={[styles.activityIcon, { backgroundColor: '#EFF6FF' }]}>
                    <Clock size={16} color="#3B82F6" strokeWidth={2} />
                  </View>
                  <Text style={styles.activityLabel}>Member Since</Text>
                  <Text style={styles.activityValue}>{memberSince.split(' ')[0]}</Text>
                </View>
              </View>
            </View>
          )}

          {isAuthenticated && (
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.7 }]}
            >
              <LogOut size={16} color="#FF3B30" strokeWidth={1.8} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          )}
        </View>

        <View style={{ height: insets.bottom + 20 }} />
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
  profileHeader: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 24,
  },
  avatarOuter: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F7F4',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#2D6A4F',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#F2F2F7',
  },
  nameArea: {
    flex: 1,
  },
  nameText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    letterSpacing: -0.4,
  },
  memberText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 3,
  },
  emailText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#AEAEB2',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#8E8E93',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E5EA',
  },
  sectionArea: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  onlineToggleActive: {
    borderWidth: 1.5,
    borderColor: 'rgba(45,106,79,0.15)',
  },
  onlineToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  onlineToggleTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
  onlineToggleTitleActive: {
    color: '#2D6A4F',
  },
  onlineToggleSub: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 2,
  },
  onlineUsersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  onlineUsersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  onlineUsersTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1A1A1A',
    flex: 1,
    letterSpacing: -0.2,
  },
  onlineUsersCount: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#2D6A4F',
    backgroundColor: '#F0F7F4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  userAvatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E5EA',
  },
  userAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F7F4',
  },
  userAvatarInitial: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2D6A4F',
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
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
  userActivity: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 1,
  },
  userScanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  userScanCount: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#8E8E93',
  },
  noUsersCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  noUsersText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#AEAEB2',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  activityCardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1A1A1A',
    letterSpacing: -0.2,
    marginBottom: 14,
  },
  activityRows: {
    gap: 0,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400' as const,
    color: '#3C3C43',
  },
  activityValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1A1A1A',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginTop: 4,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FF3B30',
  },
});
