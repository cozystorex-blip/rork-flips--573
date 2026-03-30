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
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  LogOut,
  Camera,
  Users,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useOnlineUsers, OnlineUser } from '@/contexts/OnlineUsersContext';
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
  const { onlineUsers, onlineCount, isConnected } = useOnlineUsers();
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
          console.log('[Profile] Web avatar picked:', result.assets[0].uri);
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
      console.log('[Profile] Avatar uploaded and saved:', publicUrl);
    } catch (e: unknown) {
      console.log('[Profile] Avatar upload error:', e);
      if (e instanceof PermissionDeniedError) {
        Alert.alert(
          'Photo Access Required',
          'Please allow access to your photo library to change your profile picture.',
          [
            { text: 'Open Settings', onPress: () => openAppSettings() },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
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
          .then(() => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            console.log('[Profile] Name updated to:', trimmed);
          })
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
              .then(() => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                console.log('[Profile] Name updated to:', trimmed);
              })
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
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => { void signOut(); },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.greenFull, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.topBar} />

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
        </View>

        <View style={styles.onlineSection}>
          <View style={styles.onlineHeader}>
            <View style={styles.onlineHeaderLeft}>
              <Users size={16} color="rgba(255,255,255,0.85)" strokeWidth={2} />
              <Text style={styles.onlineTitle}>Online Now</Text>
            </View>
            <View style={styles.onlineBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.onlineCountText}>
                {onlineCount} {onlineCount === 1 ? 'user' : 'users'}
              </Text>
            </View>
          </View>

          {onlineCount > 0 ? (
            <FlatList
              data={onlineUsers}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.onlineList}
              keyExtractor={(item) => item.user_id}
              renderItem={({ item }) => <OnlineUserCard user={item} />}
            />
          ) : (
            <View style={styles.emptyOnline}>
              <Text style={styles.emptyOnlineText}>
                {isConnected ? 'No other users online right now' : 'Connecting...'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.spacer} />

        <Animated.View style={[styles.bottomArea, { opacity: fadeAnim }]}>
          {isAuthenticated && (
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.7 }]}
            >
              <LogOut size={16} color="rgba(255,255,255,0.7)" strokeWidth={1.8} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const OnlineUserCard = React.memo(({ user }: { user: OnlineUser }) => {
  const initial = (user.display_name || 'U').charAt(0).toUpperCase();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.onlineCard}>
      <View style={styles.onlineAvatarWrap}>
        <View style={styles.onlineAvatar}>
          {user.avatar_url ? (
            <Image
              source={{ uri: user.avatar_url }}
              style={styles.onlineAvatarImg}
              contentFit="cover"
            />
          ) : (
            <Text style={styles.onlineAvatarInitial}>{initial}</Text>
          )}
        </View>
        <Animated.View style={[styles.onlineIndicator, { opacity: pulseAnim }]} />
      </View>
      <Text style={styles.onlineCardName} numberOfLines={1}>
        {user.display_name || 'User'}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#16A34A',
  },
  greenFull: {
    flex: 1,
    backgroundColor: '#16A34A',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: -0.2,
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
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3.5,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  avatarInitial: {
    fontSize: 52,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  avatarLoading: {
    width: 130,
    height: 130,
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
    fontSize: 30,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },

  memberText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  emailText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
  },
  mediaRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 28,
    gap: 12,
  },
  videoCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  video: {
    width: '100%' as const,
    height: 160,
  },
  videoOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  videoLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  onlineSection: {
    marginTop: 28,
    paddingLeft: 20,
  },
  onlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingRight: 20,
  },
  onlineHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#4ADE80',
  },
  onlineCountText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.9)',
  },
  onlineList: {
    gap: 12,
    paddingRight: 20,
  },
  onlineCard: {
    alignItems: 'center',
    width: 72,
  },
  onlineAvatarWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  onlineAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  onlineAvatarImg: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  onlineAvatarInitial: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4ADE80',
    borderWidth: 2.5,
    borderColor: '#16A34A',
  },
  onlineCardName: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center' as const,
    maxWidth: 72,
  },
  emptyOnline: {
    paddingVertical: 20,
    paddingRight: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    marginRight: 20,
  },
  emptyOnlineText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.5)',
  },
  spacer: {
    flex: 1,
  },
  bottomArea: {
    paddingBottom: 10,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.7)',
  },
});
