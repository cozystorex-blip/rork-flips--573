import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { User, UserPlus, Users, Search, MessageCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { supabase } from '@/services/supabase';
import { CategoryColors } from '@/constants/colors';
import { CategoryLabels, UserProfile, CategoryType } from '@/types';
import CategoryIcon from '@/components/CategoryIcon';
import { useAuth } from '@/contexts/AuthContext';
import AdProfileCard from '@/components/ads/AdProfileCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 18;
const CARD_GAP = 12;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const FOLLOWED_STORAGE_KEY = 'followed_creators';

interface DiscoverProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  style: string;
  weekly_spend: number | null;
  logs_count: number | null;
  created_at: string;
}

function mapToUserProfile(dp: DiscoverProfile): UserProfile {
  const styleMap: Record<string, CategoryType> = {
    budget: 'budget',
    healthy: 'healthy',
    bulk: 'bulk',
    deals: 'deals',
  };
  return {
    id: dp.user_id,
    name: dp.display_name,
    avatar: dp.avatar_url || '',
    bio: dp.bio || '',
    weeklyAvgSpend: dp.weekly_spend ?? 0,
    dominantStyle: styleMap[dp.style] ?? 'budget',
    totalLogs: dp.logs_count ?? 0,
    publicLogs: [],
    weeklyHistory: [],
  };
}

const FollowingBubble = React.memo(function FollowingBubble({
  profile,
  catColor,
  onPress,
}: {
  profile: UserProfile;
  catColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.followingItem,
        pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
      ]}
      testID={`followed-bubble-${profile.id}`}
    >
      <View style={[styles.followingRing, { borderColor: catColor }]}>
        {profile.avatar ? (
          <Image source={{ uri: profile.avatar }} style={styles.followingAvatar} contentFit="cover" />
        ) : (
          <View style={[styles.followingAvatar, styles.followingPlaceholder]}>
            <User size={22} color={catColor} />
          </View>
        )}
      </View>
      <Text style={styles.followingName} numberOfLines={1}>
        {profile.name.split(' ')[0]}
      </Text>
    </Pressable>
  );
});

const ProfileCard = React.memo(function ProfileCard({
  profile,
  catColor,
  isFollowed,
  isOwnProfile,
  onPress,
  onToggleFollow,
}: {
  profile: UserProfile;
  catColor: string;
  isFollowed: boolean;
  isOwnProfile: boolean;
  onPress: () => void;
  onToggleFollow: () => void;
}) {
  const thumbs = profile.thumbnails ?? [];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.profileCard,
        { width: CARD_WIDTH },
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      testID={`profile-card-${profile.id}`}
    >
      <View style={styles.avatarContainer}>
        {profile.avatar ? (
          <Image
            source={{ uri: profile.avatar }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={`avatar-${profile.id}`}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <User size={32} color={catColor} strokeWidth={1.5} />
          </View>
        )}
        <View style={styles.avatarOverlay} />
        {!isOwnProfile && (
          <Pressable
            onPress={(e) => {
              if (typeof e.stopPropagation === 'function') {
                e.stopPropagation();
              }
              onToggleFollow();
            }}
            style={[
              styles.followBtn,
              isFollowed && styles.followBtnActive,
            ]}
            hitSlop={6}
            testID={`follow-btn-${profile.id}`}
          >
            {isFollowed ? (
              <User size={11} color="#FFFFFF" strokeWidth={2} />
            ) : (
              <UserPlus size={11} color="#FFFFFF" strokeWidth={2} />
            )}
          </Pressable>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.profileName} numberOfLines={1}>
          {profile.name}
        </Text>
        <View style={[styles.styleTag, { backgroundColor: catColor + '14' }]}>
          <CategoryIcon category={profile.dominantStyle} size={10} color={catColor} />
          <Text style={[styles.styleTagText, { color: catColor }]}>
            {CategoryLabels[profile.dominantStyle]}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statValue}>{profile.totalLogs}</Text>
          <Text style={styles.statLabel}> posts</Text>
        </View>
        {thumbs.length > 0 && (
          <View style={styles.thumbRow}>
            {thumbs.slice(0, 3).map((uri, i) => (
              <Image
                key={`thumb-${i}`}
                source={{ uri }}
                style={styles.thumbImg}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
});

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const emptyScale = useRef(new Animated.Value(0.94)).current;

  const [followedIds, setFollowedIds] = useState<string[]>([]);

  useEffect(() => {
    void AsyncStorage.getItem(FOLLOWED_STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setFollowedIds(parsed);
            console.log('[Profiles] Loaded followed creators:', parsed.length);
          }
        } catch {
          console.log('[Profiles] Failed to parse followed creators');
        }
      }
    });
  }, []);

  const discoverQuery = useQuery({
    queryKey: ['discover_profiles'],
    queryFn: async () => {
      console.log('[Profiles] Fetching profiles from profiles_peoples');
      try {
        const { data, error } = await supabase
          .from('profiles_peoples')
          .select('*')
          .not('display_name', 'is', null)
          .neq('display_name', '')
          .order('created_at', { ascending: false });

        if (error) {
          console.log('[Profiles] Fetch error:', error.message);
          return [];
        }
        console.log('[Profiles] Loaded', data?.length ?? 0, 'real profiles');
        return (data as DiscoverProfile[]).map(mapToUserProfile);
      } catch (e) {
        console.log('[Profiles] Network error fetching profiles:', e);
        return [];
      }
    },
    retry: 2,
  });

  const displayProfiles = useMemo(() => {
    const real = discoverQuery.data ?? [];
    const ownId = userId ?? '';
    const filteredReal = real.filter((p) => p.id !== ownId);
    console.log('[Profiles] Display profiles:', filteredReal.length, 'real');
    return filteredReal;
  }, [discoverQuery.data, userId]);

  const followedProfiles = useMemo(() => {
    return displayProfiles.filter((p) => followedIds.includes(p.id));
  }, [displayProfiles, followedIds]);

  const toggleFollow = useCallback(async (profileId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFollowedIds((prev) => {
      const next = prev.includes(profileId)
        ? prev.filter((id) => id !== profileId)
        : [...prev, profileId];
      void AsyncStorage.setItem(FOLLOWED_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      console.log('[Profiles] Updated followed:', next.length);
      return next;
    });
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(emptyScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 10,
        }),
      ]),
    ]).start();
  }, [fadeAnim, headerFade, emptyScale]);

  const navigateToProfile = useCallback((id: string) => {
    void Haptics.selectionAsync();
    router.push(`/profile/${id}`);
  }, [router]);

  const gridElements = useMemo(() => {
    const elements: React.ReactNode[] = [];
    const adPositions = new Set([6, 14, 22]);
    displayProfiles.forEach((p, index) => {
      const catColor = CategoryColors[p.dominantStyle];
      const isFollowed = followedIds.includes(p.id);
      const isOwnProfile = p.id === userId;

      if (displayProfiles.length >= 4 && adPositions.has(index)) {
        elements.push(
          <AdProfileCard key={`ad-card-${index}`} width={CARD_WIDTH} index={index} />
        );
      }

      elements.push(
        <ProfileCard
          key={p.id}
          profile={p}
          catColor={catColor}
          isFollowed={isFollowed}
          isOwnProfile={isOwnProfile}
          onPress={() => navigateToProfile(p.id)}
          onToggleFollow={() => void toggleFollow(p.id)}
        />
      );
    });
    return elements;
  }, [displayProfiles, followedIds, userId, navigateToProfile, toggleFollow]);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
      >
        <Animated.View style={[styles.screenHeader, { opacity: headerFade }]}>
          <Text style={styles.screenTitle}>Community</Text>
          <Text style={styles.screenSubtitle}>Connect with other shoppers</Text>
        </Animated.View>

        {followedProfiles.length > 0 && (
          <View style={styles.followingSection}>
            <View style={styles.followingHeader}>
              <Text style={styles.followingLabel}>People You Added</Text>
              <View style={styles.followingCount}>
                <Text style={styles.followingCountText}>{followedProfiles.length}</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.followingAvatarRow}
            >
              {followedProfiles.map((p) => {
                const catColor = CategoryColors[p.dominantStyle];
                return (
                  <FollowingBubble
                    key={p.id}
                    profile={p}
                    catColor={catColor}
                    onPress={() => navigateToProfile(p.id)}
                  />
                );
              })}
            </ScrollView>
          </View>
        )}

        {discoverQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#22C55E" />
            <Text style={styles.loadingText}>Loading profiles...</Text>
          </View>
        ) : discoverQuery.isError ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>Could not load profiles</Text>
            <Pressable
              onPress={() => { void discoverQuery.refetch(); }}
              style={({ pressed }) => [
                styles.retryBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : displayProfiles.length === 0 ? (
          <Animated.View style={[styles.emptyWrapper, { opacity: fadeAnim, transform: [{ scale: emptyScale }] }]}>
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconRow}>
                <View style={[styles.emptyIconCircle, styles.emptyIconCircleSmall]}>
                  <Search size={16} color="#666666" strokeWidth={1.8} />
                </View>
                <View style={styles.emptyIconCircleLarge}>
                  <Users size={30} color="#22C55E" strokeWidth={1.5} />
                </View>
                <View style={[styles.emptyIconCircle, styles.emptyIconCircleSmall]}>
                  <MessageCircle size={16} color="#666666" strokeWidth={1.8} />
                </View>
              </View>
              <Text style={styles.emptyTitle}>No profiles yet</Text>
              <Text style={styles.emptySubtext}>
                Be the first to set up your profile and start connecting with other shoppers
              </Text>
              <View style={styles.emptyDivider} />
              <View style={styles.emptyHintsRow}>
                <View style={styles.emptyHint}>
                  <View style={styles.emptyHintDot} />
                  <Text style={styles.emptyHintText}>Share your finds</Text>
                </View>
                <View style={styles.emptyHint}>
                  <View style={styles.emptyHintDot} />
                  <Text style={styles.emptyHintText}>Follow shoppers</Text>
                </View>
                <View style={styles.emptyHint}>
                  <View style={styles.emptyHintDot} />
                  <Text style={styles.emptyHintText}>Discover deals</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.grid, { opacity: fadeAnim }]}>
            {gridElements}
          </Animated.View>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollContent: {
    paddingHorizontal: H_PADDING,
  },
  screenHeader: {
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 34,
    fontWeight: '900' as const,
    color: '#F5F5F5',
    letterSpacing: -1,
  },
  screenSubtitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#22C55E',
    marginTop: 3,
    letterSpacing: 0.2,
    textTransform: 'uppercase' as const,
  },
  headerSection: {
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  accountBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  followingSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  followingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  followingLabel: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: '#F5F5F5',
    letterSpacing: -0.2,
  },
  followingCount: {
    backgroundColor: '#22C55E',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  followingCountText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  followingAvatarRow: {
    flexDirection: 'row',
    gap: 14,
    paddingRight: 4,
  },
  followingItem: {
    alignItems: 'center',
    width: 56,
  },
  followingRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2.5,
    padding: 2,
    marginBottom: 5,
    overflow: 'hidden',
  },
  followingAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  followingPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111111',
  },
  followingName: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#F5F5F5',
    textAlign: 'center' as const,
  },
  sectionDivider: {
    marginBottom: 12,
  },
  trendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#F5F5F5',
    letterSpacing: -0.2,
  },
  loadingContainer: {
    width: '100%',
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500' as const,
    marginTop: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#A0A0A0',
    fontWeight: '600' as const,
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: '#22C55E',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: CARD_GAP,
    columnGap: CARD_GAP,
  },
  profileCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  avatarContainer: {
    position: 'relative' as const,
  },
  avatar: {
    width: '100%',
    height: CARD_WIDTH * 0.85,
    backgroundColor: '#111111',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'transparent',
  },
  followBtn: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  followBtnActive: {
    backgroundColor: '#22C55E',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 3,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: '#F5F5F5',
    letterSpacing: -0.2,
  },
  styleTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 2,
  },
  styleTagText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 3,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: '#F5F5F5',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400' as const,
  },
  thumbRow: {
    flexDirection: 'row' as const,
    gap: 3,
    marginTop: 6,
  },
  thumbImg: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#111111',
  },
  emptyWrapper: {
    paddingTop: 20,
    paddingHorizontal: 4,
  },
  emptyCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 22,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  emptyIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIconCircleSmall: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  emptyIconCircleLarge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#22C55E18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 21,
    fontWeight: '900' as const,
    color: '#F5F5F5',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#666666',
    textAlign: 'center' as const,
    paddingHorizontal: 12,
    lineHeight: 21,
  },
  emptyDivider: {
    width: 48,
    height: 2,
    backgroundColor: '#2A2A2A',
    borderRadius: 1,
    marginTop: 24,
    marginBottom: 20,
  },
  emptyHintsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  emptyHint: {
    alignItems: 'center',
    gap: 6,
  },
  emptyHintDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    opacity: 0.5,
  },
  emptyHintText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#A0A0A0',
    letterSpacing: -0.1,
  },
});
