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
import { User, UserPlus, CircleUserRound } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { mockProfiles } from '@/mocks/data';
import { supabase } from '@/services/supabase';
import { CategoryColors } from '@/constants/colors';
import { CategoryLabels, UserProfile, CategoryType } from '@/types';
import CategoryIcon from '@/components/CategoryIcon';
import { useAuth } from '@/contexts/AuthContext';
import NativeAdCard from '@/components/ads/NativeAdCard';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 16;
const CARD_GAP = 10;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const FOLLOWED_STORAGE_KEY = 'followed_creators';

const DiscoverCardBody = React.memo(function DiscoverCardBody({ profile, catColor }: { profile: UserProfile; catColor: string }) {
  const thumbs = profile.thumbnails ?? [];
  return (
    <View style={styles.cardBody}>
      <Text style={styles.profileName} numberOfLines={1}>
        {profile.name}
      </Text>
      <View style={[styles.styleTag, { backgroundColor: catColor + '10' }]}>
        <CategoryIcon category={profile.dominantStyle} size={11} color={catColor} />
        <Text style={[styles.styleTagText, { color: catColor }]}>
          {CategoryLabels[profile.dominantStyle]}
        </Text>
      </View>
      <View style={styles.statRow}>
        <Text style={styles.statValue}>{profile.totalLogs}</Text>
        <Text style={styles.statLabel}> posts</Text>
      </View>
      {thumbs.length > 0 && (
        <View style={styles.thumbRow}>
          {thumbs.slice(0, 4).map((uri, i) => (
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
  );
});

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
            console.log('[Discover] Loaded followed creators:', parsed.length);
          }
        } catch {
          console.log('[Discover] Failed to parse followed creators');
        }
      }
    });
  }, []);

  const discoverQuery = useQuery({
    queryKey: ['discover_profiles'],
    queryFn: async () => {
      console.log('[Discover] Fetching profiles from profiles_peoples');
      try {
        const { data, error } = await supabase
          .from('profiles_peoples')
          .select('*')
          .not('display_name', 'is', null)
          .neq('display_name', '')
          .order('created_at', { ascending: false });

        if (error) {
          console.log('[Discover] Fetch error:', error.message);
          return [];
        }
        console.log('[Discover] Loaded', data?.length ?? 0, 'real profiles');
        return (data as DiscoverProfile[]).map(mapToUserProfile);
      } catch (e) {
        console.log('[Discover] Network error fetching profiles:', e);
        return [];
      }
    },
    retry: 2,
  });

  const displayProfiles = useMemo(() => {
    const real = discoverQuery.data ?? [];
    const realIds = new Set(real.map((p) => p.id));
    const ownId = userId ?? '';
    const filteredReal = real.filter((p) => p.id !== ownId);
    const filteredMocks = mockProfiles.filter((p) => !realIds.has(p.id) && p.id !== ownId);
    const combined = [...filteredReal, ...filteredMocks];
    console.log('[Discover] Display profiles:', filteredReal.length, 'real +', filteredMocks.length, 'mock =', combined.length);
    return combined;
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
      console.log('[Discover] Updated followed:', next.length);
      return next;
    });
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const gridElements = useMemo(() => {
    const elements: React.ReactNode[] = [];
    const adPositions = new Set([6, 14, 22]);
    let cardIndex = 0;
    displayProfiles.forEach((p, index) => {
      const catColor = CategoryColors[p.dominantStyle];
      const isFollowed = followedIds.includes(p.id);
      const isOwnProfile = p.id === userId;

      const shouldInsertAd = displayProfiles.length >= 6 && adPositions.has(index);
      if (shouldInsertAd) {
        if (cardIndex % 2 !== 0) {
          elements.push(<View key={`spacer-${index}`} style={{ width: CARD_WIDTH }} />);
          cardIndex++;
        }
        elements.push(
          <View key={`ad-${index}`} style={styles.fullWidthCard}>
            <NativeAdCard index={index} />
          </View>
        );
        cardIndex = 0;
      }

      elements.push(
        <Pressable
          key={p.id}
          style={({ pressed }) => [
            styles.profileCard,
            { width: CARD_WIDTH },
            pressed && styles.cardPressed,
          ]}
          onPress={() => router.push(`/profile/${p.id}`)}
          testID={`profile-card-${p.id}`}
        >
          {p.avatar ? (
            <Image
              source={{ uri: p.avatar }}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={`avatar-${p.id}`}
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
                void toggleFollow(p.id);
              }}
              style={[
                styles.followBtn,
                isFollowed && styles.followBtnActive,
              ]}
              hitSlop={6}
              testID={`follow-btn-${p.id}`}
            >
              {isFollowed ? (
                <User size={11} color="#FFFFFF" strokeWidth={1.8} />
              ) : (
                <UserPlus size={11} color="#1C1C1E" strokeWidth={1.8} />
              )}
            </Pressable>
          )}
          <DiscoverCardBody profile={p} catColor={catColor} />
        </Pressable>
      );
      cardIndex++;
    });
    return elements;
  }, [displayProfiles, followedIds, userId, router, toggleFollow]);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 4 }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Profiles</Text>
          <Pressable
            onPress={() => {
              if (userId) {
                router.push(`/profile/${userId}`);
              } else {
                router.push('/auth');
              }
            }}
            style={({ pressed }) => [
              styles.accountBtn,
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={8}
            testID="header-account-btn"
          >
            <CircleUserRound size={26} color="#1C1C1E" strokeWidth={1.6} />
          </Pressable>
        </View>
        {followedProfiles.length > 0 && (
          <View style={styles.followingCard}>
            <View style={styles.followingHeader}>
              <Text style={styles.followingLabel}>Following</Text>
              <View style={styles.followingBadge}>
                <Text style={styles.followingBadgeText}>{followedProfiles.length}</Text>
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
                  <Pressable
                    key={p.id}
                    onPress={() => router.push(`/profile/${p.id}`)}
                    style={({ pressed }) => [
                      styles.followingItem,
                      pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                    ]}
                    testID={`followed-bubble-${p.id}`}
                  >
                    <View style={[styles.followingRing, { borderColor: catColor }]}>
                      {p.avatar ? (
                        <Image source={{ uri: p.avatar }} style={styles.followingAvatar} contentFit="cover" />
                      ) : (
                        <View style={[styles.followingAvatar, styles.followingPlaceholder]}>
                          <User size={24} color={catColor} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.followingName} numberOfLines={1}>
                      {p.name.split(' ')[0]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        <Text style={styles.discoverLabel}>Discover</Text>

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

        <View style={{ height: 24 }} />
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  screenTitle: {
    fontSize: 30,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  accountBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  followingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },
  followingLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#3C3C43',
  },
  followingBadge: {
    backgroundColor: '#1B7A45',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  followingAvatarRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 4,
  },
  followingItem: {
    alignItems: 'center',
    width: 58,
  },
  followingRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    padding: 2,
    marginBottom: 4,
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
    backgroundColor: '#F2F2F7',
  },
  followingName: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    textAlign: 'center' as const,
  },
  discoverLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  loadingContainer: {
    width: '100%',
    paddingVertical: 40,
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
    columnGap: CARD_GAP,
    marginBottom: 16,
  },
  fullWidthCard: {
    width: '100%',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative' as const,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  avatar: {
    width: '100%',
    height: CARD_WIDTH * 0.82,
    backgroundColor: '#F2F2F7',
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followBtnActive: {
    backgroundColor: '#1B7A45',
  },
  cardBody: {
    paddingHorizontal: 9,
    paddingTop: 5,
    paddingBottom: 7,
    gap: 2,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  styleTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  styleTagText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginTop: 2,
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
  loadingText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500' as const,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600' as const,
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: '#1B7A45',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  thumbRow: {
    flexDirection: 'row' as const,
    gap: 3,
    marginTop: 5,
  },
  thumbImg: {
    flex: 1,
    height: 36,
    borderRadius: 5,
    backgroundColor: '#F2F2F7',
  },
});
