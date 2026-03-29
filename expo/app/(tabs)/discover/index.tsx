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
import { User, UserPlus, Users } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { supabase } from '@/services/supabase';
import { CategoryColors } from '@/constants/colors';
import { CategoryLabels, UserProfile, CategoryType } from '@/types';
import CategoryIcon from '@/components/CategoryIcon';
import { useAuth } from '@/contexts/AuthContext';
import AdProfileCard from '@/components/ads/AdProfileCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 20;
const CARD_GAP = 10;
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
        pressed && { opacity: 0.7 },
      ]}
      testID={`followed-bubble-${profile.id}`}
    >
      <View style={[styles.followingRing, { borderColor: catColor }]}>
        {profile.avatar ? (
          <Image source={{ uri: profile.avatar }} style={styles.followingAvatar} contentFit="cover" />
        ) : (
          <View style={[styles.followingAvatar, styles.followingPlaceholder]}>
            <User size={20} color={catColor} />
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
            <User size={30} color={catColor} strokeWidth={1.5} />
          </View>
        )}
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
        <View style={styles.styleTag}>
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
      duration: 300,
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
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>Community</Text>
        </View>

        {followedProfiles.length > 0 && (
          <View style={styles.followingSection}>
            <View style={styles.followingHeader}>
              <Text style={styles.followingLabel}>Following</Text>
              <Text style={styles.followingCount}>{followedProfiles.length}</Text>
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
            <ActivityIndicator size="small" color="#34C759" />
            <Text style={styles.loadingText}>Loading profiles...</Text>
          </View>
        ) : discoverQuery.isError ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>Could not load profiles</Text>
            <Pressable
              onPress={() => { void discoverQuery.refetch(); }}
              style={({ pressed }) => [
                styles.retryBtn,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : displayProfiles.length === 0 ? (
          <Animated.View style={[styles.emptyWrapper, { opacity: fadeAnim }]}>
            <View style={styles.emptyCard}>
              <Users size={32} color="#636366" strokeWidth={1.3} />
              <Text style={styles.emptyTitle}>No profiles yet</Text>
              <Text style={styles.emptySubtext}>
                Be the first to set up your profile and start connecting with other shoppers
              </Text>
              <View style={styles.emptyHintsRow}>
                <Text style={styles.emptyHintText}>Share finds</Text>
                <Text style={styles.emptyHintDot}>·</Text>
                <Text style={styles.emptyHintText}>Follow shoppers</Text>
                <Text style={styles.emptyHintDot}>·</Text>
                <Text style={styles.emptyHintText}>Discover deals</Text>
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
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingHorizontal: H_PADDING,
  },
  screenHeader: {
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  followingSection: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
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
    color: '#FFFFFF',
  },
  followingCount: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8E8E93',
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
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    padding: 2,
    marginBottom: 5,
    overflow: 'hidden',
  },
  followingAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  followingPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
  },
  followingName: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
  },
  loadingContainer: {
    width: '100%',
    paddingVertical: 60,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  errorText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500' as const,
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: '#34C759',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
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
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.85,
  },
  avatarContainer: {
    position: 'relative' as const,
  },
  avatar: {
    width: '100%',
    height: CARD_WIDTH * 0.85,
    backgroundColor: '#2C2C2E',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  followBtn: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followBtnActive: {
    backgroundColor: '#34C759',
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 3,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  styleTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  styleTagText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 3,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
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
    backgroundColor: '#2C2C2E',
  },
  emptyWrapper: {
    paddingTop: 20,
  },
  emptyCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginTop: 4,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#8E8E93',
    textAlign: 'center' as const,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  emptyHintsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  emptyHintText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#636366',
  },
  emptyHintDot: {
    fontSize: 13,
    color: '#48484A',
  },
});
