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
  Users,
  UserPlus,
  ChevronRight,
  Settings,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useConnections } from '@/contexts/ConnectionsContext';
import { useOnlineUsers, type OnlineUser } from '@/contexts/OnlineUsersContext';
import {
  pickAndCropAvatar,
  uploadAvatarToSupabase,
  PermissionDeniedError,
  ValidationError,
  openAppSettings,
} from '@/services/uploadService';

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 10000) return (n / 1000).toFixed(0) + 'K';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut, isAuthenticated } = useAuth();
  const { profile, saveProfile, userId, hasProfile } = useProfile();
  const { followingCount, followersCount, connectionsCount } = useConnections();
  const { onlineUsers, onlineCount, isConnected } = useOnlineUsers();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const memberSince = useMemo(() => {
    if (profile?.created_at) {
      return new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return 'Recently joined';
  }, [profile]);

  const displayName = profile?.display_name && profile.display_name !== 'User'
    ? profile.display_name
    : user?.email?.split('@')[0] || 'Flip User';

  const usernameDisplay = profile?.username ? `@${profile.username}` : null;

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
      } catch {
        Alert.alert('Error', 'Could not pick image.');
      }
      return;
    }
    try {
      setUploadingAvatar(true);
      const result = await pickAndCropAvatar();
      if (!result) { setUploadingAvatar(false); return; }
      if (!userId) { Alert.alert('Error', 'You must be signed in.'); setUploadingAvatar(false); return; }
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
        Alert.alert('Upload Failed', e instanceof Error ? e.message : 'Failed to upload photo');
      }
    } finally {
      setUploadingAvatar(false);
    }
  }, [saveProfile, userId]);

  const handleSignOut = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => { void signOut(); } },
    ]);
  };

  if (!hasProfile && !profile?.display_name) {
    return (
      <View style={[styles.setupRoot, { paddingTop: insets.top }]}>
        <View style={styles.setupContent}>
          <View style={styles.setupIconWrap}>
            <UserPlus size={32} color="#16A34A" />
          </View>
          <Text style={styles.setupTitle}>Set Up Your Profile</Text>
          <Text style={styles.setupSub}>Create your profile to connect with others</Text>
          <Pressable
            style={({ pressed }) => [styles.setupBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
            onPress={() => router.push('/edit-profile')}
          >
            <Text style={styles.setupBtnText}>Create Profile</Text>
          </Pressable>
          {isAuthenticated && (
            <Pressable onPress={handleSignOut} style={styles.setupSignOut}>
              <LogOut size={14} color="#8E8E93" />
              <Text style={styles.setupSignOutText}>Sign Out</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.headerTop}>
            <View style={{ width: 36 }} />
            <Text style={styles.headerTitle}>Profile</Text>
            <Pressable
              onPress={() => router.push('/edit-profile')}
              hitSlop={8}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Settings size={22} color="#1C1C1E" />
            </Pressable>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.avatarSection}>
              <Pressable onPress={() => { void handlePickImage(); }} disabled={uploadingAvatar}>
                <View style={styles.avatarOuter}>
                  {uploadingAvatar ? (
                    <View style={styles.avatarLoading}>
                      <ActivityIndicator size="small" color="#16A34A" />
                    </View>
                  ) : profile?.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} contentFit="cover" />
                  ) : (
                    <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
                  )}
                  <View style={styles.cameraBadge}>
                    <Camera size={11} color="#FFF" />
                  </View>
                </View>
              </Pressable>
            </View>

            <Text style={styles.displayName}>{displayName}</Text>
            {usernameDisplay && <Text style={styles.username}>{usernameDisplay}</Text>}
            {profile?.bio ? <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text> : null}
            <Text style={styles.memberSince}>Member since {memberSince}</Text>

            <View style={styles.statsRow}>
              <Pressable
                style={styles.statItem}
                onPress={() => router.push({ pathname: '/people-list', params: { type: 'followers' } })}
              >
                <Text style={styles.statValue}>{formatCount(followersCount)}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </Pressable>
              <View style={styles.statDivider} />
              <Pressable
                style={styles.statItem}
                onPress={() => router.push({ pathname: '/people-list', params: { type: 'following' } })}
              >
                <Text style={styles.statValue}>{formatCount(followingCount)}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </Pressable>
              <View style={styles.statDivider} />
              <Pressable
                style={styles.statItem}
                onPress={() => router.push({ pathname: '/people-list', params: { type: 'connections' } })}
              >
                <Text style={styles.statValue}>{formatCount(connectionsCount)}</Text>
                <Text style={styles.statLabel}>Connections</Text>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.85 }]}
              onPress={() => router.push('/edit-profile')}
            >
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View style={[styles.communitySection, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Users size={16} color="#1C1C1E" />
              <Text style={styles.sectionTitle}>Community</Text>
            </View>
            <View style={styles.onlineBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.onlineBadgeText}>{onlineCount} online</Text>
            </View>
          </View>

          {onlineCount > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.onlineScroll}>
              {onlineUsers.map((u) => (
                <OnlineUserBubble key={u.user_id} user={u} />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyOnline}>
              <Text style={styles.emptyOnlineText}>
                {isConnected ? 'No other members online' : 'Connecting...'}
              </Text>
            </View>
          )}
        </Animated.View>

        <Animated.View style={[styles.linksSection, { opacity: fadeAnim }]}>
          <LinkRow
            label="Followers"
            count={followersCount}
            onPress={() => router.push({ pathname: '/people-list', params: { type: 'followers' } })}
          />
          <LinkRow
            label="Following"
            count={followingCount}
            onPress={() => router.push({ pathname: '/people-list', params: { type: 'following' } })}
          />
          <LinkRow
            label="Connections"
            count={connectionsCount}
            onPress={() => router.push({ pathname: '/people-list', params: { type: 'connections' } })}
            isLast
          />
        </Animated.View>

        {isAuthenticated && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [styles.signOutRow, pressed && { opacity: 0.7 }]}
            >
              <LogOut size={16} color="#FF3B30" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const OnlineUserBubble = React.memo(({ user }: { user: OnlineUser }) => {
  const initial = (user.display_name || 'U').charAt(0).toUpperCase();
  return (
    <View style={styles.bubbleWrap}>
      <View style={styles.bubble}>
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.bubbleImg} contentFit="cover" />
        ) : (
          <Text style={styles.bubbleInitial}>{initial}</Text>
        )}
        <View style={styles.bubbleDot} />
      </View>
      <Text style={styles.bubbleName} numberOfLines={1}>{user.display_name || 'User'}</Text>
    </View>
  );
});

const LinkRow = React.memo(({ label, count, onPress, isLast }: { label: string; count: number; onPress: () => void; isLast?: boolean }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.linkRow, !isLast && styles.linkRowBorder, pressed && { backgroundColor: '#F8F8FA' }]}
  >
    <Text style={styles.linkLabel}>{label}</Text>
    <View style={styles.linkRight}>
      <Text style={styles.linkCount}>{formatCount(count)}</Text>
      <ChevronRight size={16} color="#C7C7CC" />
    </View>
  </Pressable>
));

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  setupRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setupContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  setupIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0FAF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  setupTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.4,
  },
  setupSub: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center' as const,
    lineHeight: 21,
  },
  setupBtn: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 8,
  },
  setupBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  setupSignOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 10,
  },
  setupSignOutText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500' as const,
  },
  header: {},
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#1C1C1E',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  avatarSection: {
    marginBottom: 14,
  },
  avatarOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#F0F0F2',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: '#E8E8ED',
  },
  avatarImg: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#8E8E93',
  },
  avatarLoading: {
    width: 84,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.4,
  },
  username: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#8E8E93',
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    color: '#555558',
    textAlign: 'center' as const,
    lineHeight: 20,
    marginTop: 6,
    paddingHorizontal: 8,
  },
  memberSince: {
    fontSize: 12,
    color: '#AEAEB2',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 16,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#8E8E93',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: '#D1D1D6',
  },
  editBtn: {
    width: '100%',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  communitySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1C1C1E',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FAF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  onlineBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#16A34A',
  },
  onlineScroll: {
    gap: 14,
    paddingRight: 4,
  },
  emptyOnline: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptyOnlineText: {
    fontSize: 13,
    color: '#AEAEB2',
    fontWeight: '500' as const,
  },
  bubbleWrap: {
    alignItems: 'center',
    width: 60,
  },
  bubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F0F2',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  bubbleImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  bubbleInitial: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#8E8E93',
  },
  bubbleDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#16A34A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  bubbleName: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#555558',
    textAlign: 'center' as const,
    maxWidth: 60,
  },
  linksSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  linkRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8ED',
  },
  linkLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#1C1C1E',
  },
  linkRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkCount: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#8E8E93',
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#FF3B30',
  },
});
