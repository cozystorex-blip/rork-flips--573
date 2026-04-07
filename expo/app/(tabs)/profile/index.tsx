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
  TextInput,
} from 'react-native';
import { Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  LogOut,
  Scan,
  Bookmark,
  Wifi,
  WifiOff,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useScanHistory } from '@/contexts/ScanHistoryContext';
import { useSavedItems } from '@/contexts/SavedItemsContext';
import { useOnlinePeople } from '@/contexts/OnlinePeopleContext';
import { useConnections } from '@/contexts/ConnectionsContext';
import { router } from 'expo-router';

import AdMobBanner from '@/components/ads/AdMobBanner';


export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, isAuthenticated } = useAuth();
  const { profile, saveProfile } = useProfile();
  const { entries: scanEntries } = useScanHistory();
  const { savedDeals } = useSavedItems();
  const { isUserOnline, handleToggleOnline, connectionState } = useOnlinePeople();
  const { friends } = useConnections();

  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.trim().toLowerCase();
    return friends.filter((f) => (f.profile.display_name || 'User').toLowerCase().includes(q));
  }, [friends, searchQuery]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [savingName, setSavingName] = useState(false);

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



  const handleTapAvatar = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('[Profile] Avatar tapped, navigating to edit-profile');
    router.push('/edit-profile');
  }, []);

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
              style={({ pressed }) => [styles.avatarOuter, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
              testID="profile-avatar-tap"
            >
              <View style={styles.avatar}>
                {profile?.avatar_url ? (
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
          {isUserOnline && (
            <View style={styles.friendsSection}>
              <View style={styles.friendsHeader}>
                <Text style={styles.friendsTitle}>My People</Text>
                <Pressable
                  onPress={() => router.push('/connections')}
                  style={({ pressed }) => [styles.manageFriendsBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.manageFriendsBtnText}>Manage</Text>
                </Pressable>
              </View>

              <View style={styles.searchBarSimple}>
                <Search size={15} color="#8E8E93" strokeWidth={2} />
                <TextInput
                  style={styles.searchInputSimple}
                  placeholder="Search friends"
                  placeholderTextColor="#C7C7CC"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                  testID="profile-search-input"
                />
                {searchQuery.length > 0 && (
                  <Pressable
                    onPress={() => setSearchQuery('')}
                    hitSlop={8}
                    style={({ pressed }) => [pressed && { opacity: 0.5 }]}
                  >
                    <Text style={styles.searchClearText}>×</Text>
                  </Pressable>
                )}
              </View>

              {filteredFriends.length > 0 ? (
                <View style={styles.friendsList}>
                  {filteredFriends.map((f) => (
                    <Pressable
                      key={f.connection.id}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={({ pressed }) => [styles.friendRow, pressed && { opacity: 0.7, backgroundColor: '#F5F5F7' }]}
                    >
                      <View style={styles.friendAvatarWrap}>
                        {f.profile.avatar_url ? (
                          <Image source={{ uri: f.profile.avatar_url }} style={styles.friendAvatar} contentFit="cover" />
                        ) : (
                          <Text style={styles.friendAvatarInitial}>{(f.profile.display_name || 'U').charAt(0).toUpperCase()}</Text>
                        )}
                      </View>
                      <View style={styles.friendInfo}>
                        <Text style={styles.friendName} numberOfLines={1}>{f.profile.display_name || 'User'}</Text>
                        {f.profile.city ? <Text style={styles.friendCity} numberOfLines={1}>{f.profile.city}</Text> : null}
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyFriends}>
                  <Text style={styles.emptyFriendsText}>
                    {searchQuery.trim() ? 'No friends match your search' : 'No connections yet'}
                  </Text>
                  {!searchQuery.trim() && (
                    <Pressable
                      onPress={() => router.push('/connections')}
                      style={({ pressed }) => [styles.addFriendsBtn, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={styles.addFriendsBtnText}>Find People</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          )}

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
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  greenHeader: {
    backgroundColor: '#0D0D0D',
    paddingBottom: 32,
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
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
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

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameText: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
    marginTop: 22,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 28,
    gap: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800' as const,
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
    backgroundColor: 'rgba(255,255,255,0.10)',
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
    backgroundColor: 'rgba(52,199,89,0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(52,199,89,0.5)',
  },
  onlineBtnInactive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -16,
    paddingTop: 22,
    minHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
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
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FF3B30',
  },
  friendsSection: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
  },
  friendsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  friendsTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  manageFriendsBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  manageFriendsBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0058A3',
  },
  searchBarSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  },
  searchInputSimple: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400' as const,
    color: '#1C1C1E',
    padding: 0,
    margin: 0,
  },
  searchClearText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#8E8E93',
    lineHeight: 20,
  },
  friendsList: {
    gap: 2,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    gap: 12,
  },
  friendAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8E8ED',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    overflow: 'hidden' as const,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  friendAvatarInitial: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1C1C1E',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  friendCity: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 1,
  },
  emptyFriends: {
    alignItems: 'center' as const,
    paddingVertical: 24,
  },
  emptyFriendsText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#8E8E93',
  },
  addFriendsBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
  },
  addFriendsBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
