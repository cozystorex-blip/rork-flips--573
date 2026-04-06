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
  Scan,
  Bookmark,
  Camera,
  Wifi,
  WifiOff,
  Users,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useScanHistory } from '@/contexts/ScanHistoryContext';
import { useSavedItems } from '@/contexts/SavedItemsContext';
import { useOnlinePeople } from '@/contexts/OnlinePeopleContext';
import { useConnections } from '@/contexts/ConnectionsContext';
import { pickAndCropAvatar, uploadAvatarToSupabase } from '@/services/uploadService';
import AdMobBanner from '@/components/ads/AdMobBanner';
import { router } from 'expo-router';


export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, isAuthenticated } = useAuth();
  const { profile, saveProfile } = useProfile();
  const { entries: scanEntries } = useScanHistory();
  const { savedDeals } = useSavedItems();
  const { isUserOnline, handleToggleOnline, connectionState, onlineUsers } = useOnlinePeople();
  const { connectedUserIds, friends, requestCount } = useConnections();

  const connectedOnlineUsers = useMemo(() => {
    const seen = new Map<string, typeof onlineUsers[number]>();
    for (const u of onlineUsers) {
      if (!connectedUserIds.has(u.id)) continue;
      if (seen.has(u.id)) {
        const existing = seen.get(u.id)!;
        if (u.lastActive > existing.lastActive) {
          seen.set(u.id, u);
        }
      } else {
        seen.set(u.id, u);
      }
    }
    return Array.from(seen.values());
  }, [onlineUsers, connectedUserIds]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [savingName, setSavingName] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  useEffect(() => {
    if (isUserOnline) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isUserOnline, pulseAnim]);


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



  const handleTapAvatar = useCallback(async () => {
    if (savingAvatar) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('[Profile] Avatar tapped, opening image picker');

    try {
      setSavingAvatar(true);
      const picked = await pickAndCropAvatar();
      if (!picked) {
        console.log('[Profile] User cancelled avatar picker');
        setSavingAvatar(false);
        return;
      }

      console.log('[Profile] Avatar picked, persisting...');
      const userId = user?.id ?? 'anonymous';
      const persistedUri = await uploadAvatarToSupabase(picked.uri, userId);

      console.log('[Profile] Avatar persisted, saving to profile:', persistedUri.substring(0, 60));
      await saveProfile({ avatar_url: persistedUri });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('[Profile] Avatar saved successfully');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update profile picture';
      console.log('[Profile] Avatar update error:', msg);
      if (msg.includes('Permission') || msg.includes('permission')) {
        Alert.alert('Permission Needed', msg);
      } else {
        Alert.alert('Update Failed', msg);
      }
    } finally {
      setSavingAvatar(false);
    }
  }, [savingAvatar, user, saveProfile]);

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
            <Pressable
              onPress={handleTapAvatar}
              disabled={savingAvatar}
              style={({ pressed }) => [styles.avatarOuter, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
              testID="profile-avatar-tap"
            >
              <View style={styles.avatar}>
                {savingAvatar ? (
                  <ActivityIndicator size="large" color="#FFFFFF" />
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
              <View style={styles.avatarCameraBadge}>
                <Camera size={12} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </Pressable>

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
            {user?.email ? (
              <Text style={styles.emailText}>{user.email}</Text>
            ) : null}

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

            <Pressable
              onPress={handleToggleOnline}
              disabled={false}
              style={({ pressed }) => [
                styles.onlineBtn,
                isUserOnline ? styles.onlineBtnActive : styles.onlineBtnInactive,

                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
              testID="profile-online-toggle"
            >
              {isUserOnline ? (
                <Animated.View style={[styles.onlineDot, { opacity: pulseAnim }]} />
              ) : null}
              {connectionState === 'connecting' ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
              ) : isUserOnline ? (
                <Wifi size={16} color="#FFFFFF" strokeWidth={2.2} />
              ) : (
                <WifiOff size={16} color="rgba(255,255,255,0.7)" strokeWidth={2} />
              )}
              <Text style={styles.onlineBtnText}>
                {connectionState === 'connecting' ? 'Connecting…' : isUserOnline ? 'Online' : 'Go Online'}
              </Text>
            </Pressable>

          </View>
        </View>

        <View style={styles.whiteContent}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/connections');
            }}
            style={({ pressed }) => [styles.connectionsBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
            testID="connections-btn"
          >
            <View style={styles.connectionsBtnLeft}>
              <View style={styles.connectionsBtnIcon}>
                <Users size={18} color="#16A34A" strokeWidth={2.2} />
              </View>
              <View>
                <Text style={styles.connectionsBtnTitle}>My Connections</Text>
                <Text style={styles.connectionsBtnSub}>
                  {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
                  {requestCount > 0 ? ` · ${requestCount} pending` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.connectionsBtnRight}>
              {requestCount > 0 ? (
                <View style={styles.requestBadge}>
                  <Text style={styles.requestBadgeText}>{requestCount}</Text>
                </View>
              ) : null}
              <ChevronRight size={18} color="#C7C7CC" strokeWidth={2} />
            </View>
          </Pressable>

          {isUserOnline && connectedOnlineUsers.length > 0 ? (
            <View style={styles.onlineSection}>
              <Text style={styles.onlineSectionTitle}>Connections Online</Text>
              <Text style={styles.onlineSectionCount}>{connectedOnlineUsers.length} online now</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.onlineList}>
                {connectedOnlineUsers.map((u) => (
                  <View key={u.id} style={styles.onlineCard}>
                    <View style={styles.onlineAvatarWrap}>
                      {u.avatar_url ? (
                        <Image source={{ uri: u.avatar_url }} style={styles.onlineAvatar} contentFit="cover" />
                      ) : (
                        <Text style={styles.onlineAvatarInitial}>{(u.name || 'U').charAt(0).toUpperCase()}</Text>
                      )}
                      <View style={styles.onlineIndicator} />
                    </View>
                    <Text style={styles.onlineName} numberOfLines={1}>{u.name || 'User'}</Text>
                    <Text style={styles.onlineActivity}>{u.activity === 'scanning' ? 'Scanning' : u.activity === 'saving' ? 'Saving' : 'Browsing'}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : isUserOnline ? (
            <View style={styles.onlineSection}>
              <Text style={styles.onlineSectionTitle}>Connections Online</Text>
              <Text style={styles.onlineEmptyText}>None of your connections are online right now</Text>
            </View>
          ) : null}

          <View style={styles.adSection}>
            <AdMobBanner />
          </View>

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
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#16A34A',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
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
  onlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    alignSelf: 'center',
  },
  onlineBtnActive: {
    backgroundColor: 'rgba(52,199,89,0.35)',
    borderWidth: 1.5,
    borderColor: 'rgba(52,199,89,0.6)',
  },
  onlineBtnInactive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  onlineBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
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


  adSection: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
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
  connectionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  connectionsBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectionsBtnIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionsBtnTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  connectionsBtnSub: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 2,
  },
  connectionsBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requestBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  requestBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  onlineSection: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  onlineSectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  onlineSectionCount: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#16A34A',
    marginTop: 2,
    marginBottom: 12,
  },
  onlineEmptyText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 6,
  },
  onlineList: {
    gap: 14,
    paddingVertical: 4,
  },
  onlineCard: {
    alignItems: 'center' as const,
    width: 72,
  },
  onlineAvatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 6,
    position: 'relative' as const,
    overflow: 'visible' as const,
  },
  onlineAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  onlineAvatarInitial: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#16A34A',
  },
  onlineIndicator: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  onlineName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    textAlign: 'center' as const,
    maxWidth: 72,
  },
  onlineActivity: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: '#8E8E93',
    marginTop: 1,
  },
});
