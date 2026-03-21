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
import { User, UserPlus } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { supabase } from '@/services/supabase';
import { CategoryColors } from '@/constants/colors';
import { CategoryLabels, UserProfile, CategoryType } from '@/types';
import CategoryIcon from '@/components/CategoryIcon';
import { useAuth } from '@/contexts/AuthContext';
import AdProfileCard from '@/components/ads/AdProfileCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 16;
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
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

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
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8 }]}
      >
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
            <ActivityIndicator size="small" color="#8E8E93" />
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
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    paddingHorizontal: H_PADDING,
  },
  headerSection: {
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    letterSpacing: -0.8,
  },
  screenSubtitle: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 2,
  },
  accountBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 4,
  },
  followingSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  followingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  followingLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  followingCount: {
    backgroundColor: '#1B7A45',
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
    backgroundColor: '#F2F2F7',
  },
  followingName: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#3C3C43',
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
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  loadingContainer: {
    width: '100%',
    paddingVertical: 48,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500' as const,
    marginTop: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600' as const,
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: '#1B7A45',
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 12,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: CARD_GAP,
    columnGap: CARD_GAP,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
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
    backgroundColor: '#F2F2F7',
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  followBtnActive: {
    backgroundColor: '#1B7A45',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cardBody: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 3,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  styleTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
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
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 13,
    color: '#8E8E93',
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
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
  },
});
