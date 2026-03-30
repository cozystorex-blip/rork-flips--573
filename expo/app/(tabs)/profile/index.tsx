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
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  LogOut,
  Camera,
  Users,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
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

const UserListItem = React.memo(function UserListItem({
  user,
  connected,
  onPress,
}: {
  user: OnlineUser;
  connected: boolean;
  onPress: () => void;
}) {
  const initial = (user.display_name || '?').charAt(0).toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.personListItem,
        pressed && { backgroundColor: '#F0F0F2' },
      ]}
      testID={`person-list-${user.id}`}
    >
      <View style={styles.personListAvatarWrap}>
        {user.avatar_url ? (
          <Image
            source={{ uri: user.avatar_url }}
            style={styles.personListAvatar}
            contentFit="cover"
          />
        ) : (
          <View style={styles.personListAvatarPlaceholder}>
            <Text style={styles.personListInitial}>{initial}</Text>
          </View>
        )}
        {user.is_online && <View style={styles.listOnlineDot} />}
      </View>
      <View style={styles.personListInfo}>
        <Text style={styles.personListName} numberOfLines={1}>{user.display_name}</Text>
        {user.bio ? (
          <Text style={styles.personListBio} numberOfLines={1}>{user.bio}</Text>
        ) : (
          <Text style={[styles.personListStatus, !user.is_online && { color: '#8E8E93' }]}>
            {user.is_online ? 'Online' : 'Offline'}
          </Text>
        )}
      </View>
      {connected && (
        <View style={styles.connectedBadge}>
          <Text style={styles.connectedBadgeText}>Connected</Text>
        </View>
      )}
      <ChevronRight size={16} color="#C7C7CC" />
    </Pressable>
  );
});

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut, isAuthenticated } = useAuth();
  const { profile, saveProfile, userId } = useProfile();
  const { people, onlinePeople, isConnected, isLoading: peopleLoading, refetch } = useOnlinePeople();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const handlePressPerson = useCallback((person: OnlineUser) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/profile/[id]', params: { id: person.id } });
  }, [router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={['#16A34A']}
          />
        }
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

            <View style={styles.onlineBadgeRow}>
              <View style={styles.onlinePulse} />
              <Text style={styles.onlineBadgeLabel}>{onlinePeople.length} Online</Text>
              <Text style={styles.onlineBadgeSub}>· {people.length} total users</Text>
            </View>
          </View>
        </View>

        <View style={styles.whiteContent}>
          {peopleLoading && people.length === 0 ? (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="small" color="#16A34A" />
              <Text style={styles.loadingText}>Finding people...</Text>
            </View>
          ) : people.length === 0 ? (
            <View style={styles.emptyPeopleSection}>
              <View style={styles.emptyPeopleIcon}>
                <Users size={24} color="#8E8E93" />
              </View>
              <Text style={styles.emptyPeopleTitle}>No one here yet</Text>
              <Text style={styles.emptyPeopleSub}>
                When other users join, they'll appear here
              </Text>
            </View>
          ) : (
            <View style={styles.usersListSection}>
              {people.map((person) => (
                <UserListItem
                  key={person.id}
                  user={person}
                  connected={isConnected(person.id)}
                  onPress={() => handlePressPerson(person)}
                />
              ))}
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
    paddingHorizontal: 16,
    gap: 8,
    alignSelf: 'center',
  },
  onlinePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  onlineBadgeLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  onlineBadgeSub: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.6)',
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
  loadingSection: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500' as const,
  },
  usersListSection: {
    marginBottom: 16,
  },
  personListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 1,
  },
  personListAvatarWrap: {
    position: 'relative',
  },
  personListAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E5E5EA',
  },
  personListAvatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E0F2E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  personListInitial: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#16A34A',
  },
  listOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  personListInfo: {
    flex: 1,
    gap: 2,
  },
  personListName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  personListBio: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 17,
  },
  personListStatus: {
    fontSize: 13,
    color: '#34C759',
    fontWeight: '500' as const,
  },
  connectedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  connectedBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#16A34A',
  },
  emptyPeopleSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
    gap: 6,
  },
  emptyPeopleIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyPeopleTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#1C1C1E',
  },
  emptyPeopleSub: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
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
