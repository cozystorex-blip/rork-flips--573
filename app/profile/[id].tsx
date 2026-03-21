import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Plus, BadgeCheck, User, ImageIcon, Layers, SquarePen, DoorOpen, Grid3X3, X, Tag, Heart, Share2, ChevronDown } from 'lucide-react-native';
import { BlockTagLeft, CategoryLabels, CategoryType, UserProfileBlock } from '@/types';
import Colors, { CategoryColors } from '@/constants/colors';
import CategoryIcon from '@/components/CategoryIcon';

import { useProfile } from '@/contexts/ProfileContext';
import { useBlocks, useUserBlocks } from '@/contexts/BlocksContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useSavedItems } from '@/contexts/SavedItemsContext';
import { useScanHistory } from '@/contexts/ScanHistoryContext';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import AdMobBanner from '@/components/ads/AdMobBanner';
import AdBlockTile from '@/components/ads/AdBlockTile';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AD_BLOCK_GAP = 2;
const AD_BLOCK_COLUMNS = 3;
const AD_BLOCK_SIZE = (SCREEN_WIDTH - 40 - AD_BLOCK_GAP * (AD_BLOCK_COLUMNS - 1)) / AD_BLOCK_COLUMNS;
const FOLLOWED_STORAGE_KEY = 'followed_creators';
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.72;
const _PLACEHOLDER_IMG = '';

function getBlockImageUri(url?: string): string {
  if (!url || !url.trim()) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('file://') || trimmed.startsWith('/') || trimmed.startsWith('data:')) return trimmed;
  return '';
}

interface OtherUserProfile {
  user_id: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  style: string;
  weekly_spend: number | null;
  logs_count: number | null;
}

interface PreviewPost {
  imageUrl: string;
  description: string;
  title: string;
  tagLeft: string;
  createdAt: string;
  userName: string;
}

function formatTimeAgo(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

const PostPreviewDrawer = React.memo(function PostPreviewDrawer({
  visible,
  post,
  onClose,
}: {
  visible: boolean;
  post: PreviewPost | null;
  onClose: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(DRAWER_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [internalVisible, setInternalVisible] = useState(false);

  useEffect(() => {
    if (visible && post) {
      setInternalVisible(true);
      slideAnim.setValue(DRAWER_HEIGHT);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 200,
          friction: 22,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!visible && internalVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: DRAWER_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setInternalVisible(false);
      });
    }
  }, [visible, post, slideAnim, backdropAnim, internalVisible]);

  if (!internalVisible || !post) return null;

  const initials = post.userName
    ? post.userName.split(' ').map((w) => w.charAt(0).toUpperCase()).slice(0, 2).join('')
    : '?';

  return (
    <Modal transparent visible={internalVisible} animationType="none" statusBarTranslucent>
      <View style={drawerStyles.container}>
        <Pressable style={drawerStyles.backdropPress} onPress={onClose}>
          <Animated.View style={[drawerStyles.backdrop, { opacity: backdropAnim }]} />
        </Pressable>

        <Animated.View
          style={[
            drawerStyles.drawer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={drawerStyles.handleBar} />

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              drawerStyles.closeBtn,
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={12}
          >
            <X size={18} color="#8E8E93" strokeWidth={2.2} />
          </Pressable>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={drawerStyles.scrollContent}
          >
            {post.userName ? (
              <View style={drawerStyles.authorRow}>
                <View style={drawerStyles.authorAvatar}>
                  <Text style={drawerStyles.authorInitials}>{initials}</Text>
                </View>
                <View style={drawerStyles.authorInfo}>
                  <Text style={drawerStyles.authorName}>{post.userName}</Text>
                  {post.createdAt ? (
                    <Text style={drawerStyles.authorTime}>{formatTimeAgo(post.createdAt)}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {post.imageUrl ? (
              <View style={drawerStyles.imageWrap}>
                <Image
                  source={{ uri: post.imageUrl }}
                  style={drawerStyles.image}
                  contentFit="cover"
                  transition={200}
                />
              </View>
            ) : null}

            <View style={drawerStyles.actionsRow}>
              <Pressable style={drawerStyles.actionBtn} hitSlop={8}>
                <Heart size={21} color="#1C1C1E" strokeWidth={1.5} />
              </Pressable>
              <Pressable style={drawerStyles.actionBtn} hitSlop={8}>
                <Share2 size={19} color="#1C1C1E" strokeWidth={1.5} />
              </Pressable>
            </View>

            {(post.description || post.title) ? (
              <View style={drawerStyles.captionArea}>
                {post.userName ? (
                  <Text style={drawerStyles.captionText}>
                    <Text style={drawerStyles.captionBoldName}>{post.userName}</Text>
                    {'  '}
                    {post.description || post.title}
                  </Text>
                ) : (
                  <Text style={drawerStyles.captionText}>{post.description || post.title}</Text>
                )}
              </View>
            ) : null}

            {post.tagLeft ? (
              <View style={drawerStyles.tagRow}>
                <View style={drawerStyles.tagPill}>
                  <Tag size={10} color="#1B5E3B" strokeWidth={2} />
                  <Text style={drawerStyles.tagText}>{post.tagLeft}</Text>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
});

const drawerStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  drawer: {
    height: DRAWER_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 24,
    overflow: 'hidden',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D1D6',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
  },
  authorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1B5E3B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorInitials: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  authorInfo: {
    flex: 1,
    gap: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
  authorTime: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '400' as const,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F0F0F2',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  actionBtn: {
    padding: 2,
  },
  captionArea: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  captionText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  captionBoldName: {
    fontWeight: '700' as const,
    color: '#1A1A1A',
  },
  tagRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1B5E3B0C',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#1B5E3B',
    letterSpacing: 0.3,
  },
});

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const profileCtx = useProfile();
  const profile_safe = profileCtx ?? { profile: null, hasProfile: false, isLoading: false, isError: false, refetch: () => Promise.resolve({} as any), userId: null, saveProfile: async () => {} };
  const { profile: myProfile, hasProfile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = profile_safe;
  const { deleteBlock, isLoading: blocksLoading } = useBlocks();
  const { userId, signOut } = useAuth();
  const { getClaimsForUser } = useBusiness();
  const { totalSavedCount } = useSavedItems();
  const { totalCount: scanCount } = useScanHistory();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [followedCount, setFollowedCount] = useState(0);
  const [previewPost, setPreviewPost] = useState<PreviewPost | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [photosExpanded, setPhotosExpanded] = useState(true);
  const photosRotateAnim = useRef(new Animated.Value(1)).current;

  const togglePhotos = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const toValue = photosExpanded ? 0 : 1;
    setPhotosExpanded(!photosExpanded);
    Animated.spring(photosRotateAnim, {
      toValue,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  }, [photosExpanded, photosRotateAnim]);

  useEffect(() => {
    void AsyncStorage.getItem(FOLLOWED_STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setFollowedCount(parsed.length);
          }
        } catch {
          // ignore
        }
      }
    });
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const isMe = id === 'me' || id === userId;
  const profileUserId = isMe ? (userId ?? '') : (id ?? '');

  const otherProfileQuery = useQuery({
    queryKey: ['other_profile', profileUserId],
    queryFn: async (): Promise<OtherUserProfile | null> => {
      if (!profileUserId) return null;
      console.log('[ProfileScreen] Fetching other user profile:', profileUserId);

      if (!isSupabaseConfigured) {
        console.log('[ProfileScreen] Supabase not configured, skipping remote fetch');
        return null;
      }

      try {
        const { data, error } = await supabase
          .from('profiles_peoples')
          .select('*')
          .eq('user_id', profileUserId)
          .maybeSingle();

        if (!error && data) {
          console.log('[ProfileScreen] Profile found by user_id:', data.display_name);
          return data as OtherUserProfile;
        }

        console.log('[ProfileScreen] Not found by user_id, trying id column:', profileUserId);
        const { data: data2, error: error2 } = await supabase
          .from('profiles_peoples')
          .select('*')
          .eq('id', profileUserId)
          .maybeSingle();

        if (!error2 && data2) {
          console.log('[ProfileScreen] Profile found by id:', data2.display_name);
          return data2 as OtherUserProfile;
        }

        console.log('[ProfileScreen] No Supabase profile found for:', profileUserId);
        return null;
      } catch (e) {
        console.log('[ProfileScreen] Query error, falling back:', e);
        return null;
      }
    },
    enabled: !isMe && !!profileUserId,
    retry: 1,
  });

  const otherProfile = otherProfileQuery.data ?? null;

  const myBlocks = useUserBlocks(profileUserId);

  const otherBlocksQuery = useQuery({
    queryKey: ['user_blocks', profileUserId],
    queryFn: async () => {
      if (!profileUserId) return [];
      console.log('[ProfileScreen] Fetching blocks from Supabase for other user:', profileUserId);
      try {
        const { data, error } = await supabase
          .from('blocks')
          .select('*')
          .eq('user_id', profileUserId)
          .order('created_at', { ascending: false });

        if (error) {
          console.log('[ProfileScreen] Other user blocks fetch error:', error.message);
          return [];
        }
        console.log('[ProfileScreen] Other user blocks loaded:', data?.length ?? 0);
        const typeToTag: Record<string, BlockTagLeft> = {
          deal: 'DEAL', tip: 'TIP', store: 'STORE', list: 'LIST', recipe: 'RECIPE', bulk_purchase: 'BULK',
        };
        return (data ?? []).map((sb: Record<string, unknown>): UserProfileBlock => ({
          id: sb.id as string,
          userId: sb.user_id as string,
          title: (sb.title as string) ?? '',
          description: (sb.description as string) ?? '',
          headerImageUrl: (sb.header_image_url as string) ?? '',
          tagLeft: typeToTag[(sb.block_type as string)] ?? 'TIP',
          badgeRight: sb.show_new_badge ? 'NEW' : null,
          actionLabel: (sb.action_label as string) ?? '',
          actionType: 'none',
          placeId: (sb.place_id as string) ?? undefined,
          url: (sb.url as string) ?? undefined,
          createdAt: (sb.created_at as string) ?? '',
        }));
      } catch (e) {
        console.log('[ProfileScreen] Other user blocks query threw:', e);
        return [];
      }
    },
    enabled: !isMe && !!profileUserId,
  });

  const userBlocks = isMe ? myBlocks : (otherBlocksQuery.data ?? []);
  const userClaims = getClaimsForUser(profileUserId);
  const hasVerifiedBusiness = userClaims.some((c) => c.isVerified);

  const openPostPreview = useCallback((block: UserProfileBlock, displayName: string) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPreviewPost({
      imageUrl: getBlockImageUri(block.headerImageUrl),
      description: block.description || '',
      title: block.title || '',
      tagLeft: block.tagLeft || '',
      createdAt: block.createdAt || '',
      userName: displayName,
    });
    setPreviewVisible(true);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewVisible(false);
  }, []);

  const handleDeleteBlock = useCallback((blockId: string) => {
    Alert.alert('Delete Photo', 'Are you sure you want to delete this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteBlock(blockId);
          console.log('[ProfileScreen] Block deleted:', blockId);
        },
      },
    ]);
  }, [deleteBlock]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          void signOut();
          router.replace('/auth');
        },
      },
    ]);
  }, [signOut, router]);

  const profileHeaderOptions = useMemo(() => ({
    title: 'Profile',
    headerBackTitle: 'Back',
    headerStyle: { backgroundColor: Colors.background },
    headerTintColor: Colors.text,
    headerShadowVisible: false,
  }), []);

  if (isMe && profileLoading && !myProfile) {
    return (
      <View style={styles.emptyContainer}>
        <Stack.Screen options={profileHeaderOptions} />
        <ActivityIndicator size="large" color="#1A1A1A" />
        <Text style={styles.loadingHint}>Loading profile...</Text>
      </View>
    );
  }

  if (isMe && profileError && !myProfile) {
    return (
      <View style={styles.emptyContainer}>
        <Stack.Screen options={profileHeaderOptions} />
        <Text style={styles.emptyText}>Could not load profile</Text>
        <Pressable
          style={styles.createBtn}
          onPress={() => { void refetchProfile(); }}
        >
          <Text style={styles.createBtnText}>Retry</Text>
        </Pressable>
        <Pressable
          style={styles.createBtn}
          onPress={() => router.push('/edit-profile')}
        >
          <Text style={styles.createBtnText}>Create Profile</Text>
        </Pressable>
        <Pressable
          style={styles.signOutBtn}
          onPress={handleSignOut}
          testID="sign-out-button-error"
        >
          <DoorOpen size={18} color="#FF3B30" strokeWidth={1.8} />
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </Pressable>
      </View>
    );
  }

  if (isMe && !hasProfile && !profileLoading) {
    return (
      <View style={styles.emptyContainer}>
        <Stack.Screen
          options={{
            title: 'Profile',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.text,
            headerShadowVisible: false,
          }}
        />
        <Text style={styles.emptyText}>Set up your profile</Text>
        <Pressable
          style={styles.createBtn}
          onPress={() => router.push('/edit-profile')}
        >
          <Text style={styles.createBtnText}>Create Profile</Text>
        </Pressable>
        <Pressable
          style={styles.signOutBtn}
          onPress={handleSignOut}
          testID="sign-out-button"
        >
          <DoorOpen size={18} color="#FF3B30" strokeWidth={1.8} />
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </Pressable>
      </View>
    );
  }

  if (!isMe) {
    if (otherProfileQuery.isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <Stack.Screen options={profileHeaderOptions} />
          <ActivityIndicator size="large" color="#1A1A1A" />
        </View>
      );
    }

    if (!otherProfile) {
      return (
        <View style={styles.emptyContainer}>
          <Stack.Screen options={profileHeaderOptions} />
          <Text style={styles.emptyText}>Profile not available</Text>
        </View>
      );
    }

    const styleMap: Record<string, CategoryType> = {
      budget: 'budget', healthy: 'healthy', bulk: 'bulk', deals: 'deals',
    };
    const otherCatColor = CategoryColors[styleMap[otherProfile.style] ?? 'budget'] ?? '#9CA3AF';
    const otherStyleTag = styleMap[otherProfile.style] ?? 'budget';
    const otherBlocks = userBlocks;

    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: otherProfile.display_name,
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.text,
            headerShadowVisible: false,
          }}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View style={[styles.profileHeader, { opacity: fadeAnim }]}>
            {otherProfile.avatar_url ? (
              <Image
                source={{ uri: otherProfile.avatar_url }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: otherCatColor + '20' }]}>
                <User size={36} color={otherCatColor} />
              </View>
            )}
            <View style={styles.nameRow}>
              <Text style={styles.name}>{otherProfile.display_name}</Text>
              {hasVerifiedBusiness && (
                <BadgeCheck size={18} color="#2563EB" />
              )}
            </View>
            <View style={[styles.styleTag, { backgroundColor: otherCatColor + '14' }]}>
              <CategoryIcon category={otherStyleTag} size={14} color={otherCatColor} />
              <Text style={[styles.styleTagText, { color: otherCatColor }]}>
                {CategoryLabels[otherStyleTag] ?? otherProfile.style}
              </Text>
            </View>
            {otherProfile.bio ? (
              <Text style={styles.bio}>{otherProfile.bio}</Text>
            ) : null}
          </Animated.View>

          <Animated.View style={[styles.statsContainer, { opacity: fadeAnim }]}>
            <View style={styles.statsInner}>
              <View style={styles.statBlock}>
                <Text style={styles.statBlockValue}>{otherBlocks.length}</Text>
                <Text style={styles.statBlockLabel}>Posts</Text>
              </View>
              <View style={styles.statDivider} />

              <View style={styles.statBlock}>
                <Text style={styles.statBlockValue}>0</Text>
                <Text style={styles.statBlockLabel}>Saved</Text>
              </View>
            </View>
          </Animated.View>

          <AdMobBanner />

          <Animated.View style={[styles.photosSection, { opacity: fadeAnim }]}>
            <View style={styles.photosSectionHeaderRow}>
              <Pressable
                onPress={togglePhotos}
                style={({ pressed }) => [
                  styles.photosSectionHeader,
                  { flex: 1 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.photoTabActive}>
                  <Grid3X3 size={15} color="#1A1A1A" />
                  <Text style={styles.photoTabTextActive}>Photos</Text>
                  {otherBlocks.length > 0 && (
                    <View style={styles.photosCountBadge}>
                      <Text style={styles.photosCountText}>{otherBlocks.length}</Text>
                    </View>
                  )}
                </View>
                <Animated.View style={{ transform: [{ rotate: photosRotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
                  <ChevronDown size={18} color="#86868B" strokeWidth={2.2} />
                </Animated.View>
              </Pressable>
            </View>
            {photosExpanded && (
              otherBlocksQuery.isLoading ? (
                <View style={styles.emptyPostsContainer}>
                  <ActivityIndicator size="small" color="#8E8E93" />
                </View>
              ) : otherBlocks.length > 0 ? (
                <View style={styles.adBlocksGrid}>
                  {otherBlocks.map((block, idx) => (
                    <React.Fragment key={block.id}>
                      {idx === 3 && (
                        <AdBlockTile size={AD_BLOCK_SIZE} index={0} />
                      )}
                      <Pressable
                        style={({ pressed }) => [
                          styles.adBlockCard,
                          pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
                        ]}
                        onPress={() => openPostPreview(block, otherProfile.display_name)}
                        testID={`ad-block-${block.id}`}
                      >
                        {getBlockImageUri(block.headerImageUrl) ? (
                          <Image
                            source={{ uri: getBlockImageUri(block.headerImageUrl) }}
                            style={styles.adBlockImage}
                            contentFit="cover"
                            recyclingKey={block.id}
                          />
                        ) : (
                          <View style={[styles.adBlockImage, styles.adBlockImagePlaceholder]}>
                            <ImageIcon size={20} color="#AEAEB2" />
                          </View>
                        )}
                      </Pressable>
                    </React.Fragment>
                  ))}
                  {otherBlocks.length > 0 && otherBlocks.length <= 3 && (
                    <AdBlockTile size={AD_BLOCK_SIZE} index={2} />
                  )}
                </View>
              ) : (
                <View style={styles.emptyPostsContainer}>
                  <View style={styles.emptyPostsIcon}>
                    <ImageIcon size={26} color="#8E8E93" />
                  </View>
                  <Text style={styles.emptyPostsText}>No photos yet</Text>
                </View>
              )
            )}
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>

        <PostPreviewDrawer
          visible={previewVisible}
          post={previewPost}
          onClose={closePreview}
        />
      </View>
    );
  }

  if (!myProfile) {
    return (
      <View style={styles.emptyContainer}>
        <Stack.Screen options={profileHeaderOptions} />
        <Text style={styles.emptyText}>Set up your profile</Text>
        <Pressable
          style={styles.createBtn}
          onPress={() => router.push('/edit-profile')}
        >
          <Text style={styles.createBtnText}>Create Profile</Text>
        </Pressable>
        <Pressable
          style={styles.signOutBtn}
          onPress={handleSignOut}
          testID="sign-out-button-noprofile"
        >
          <DoorOpen size={18} color="#FF3B30" strokeWidth={1.8} />
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </Pressable>
      </View>
    );
  }

  const catColor = CategoryColors[myProfile.style_tag] ?? '#9CA3AF';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'My Profile',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => router.push('/edit-profile')}
                style={({ pressed }) => [
                  styles.editHeaderBtn,
                  pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] },
                ]}
                testID="profile-edit-btn"
              >
                <View style={styles.editIconWrap}>
                  <SquarePen size={15} color="#FFFFFF" strokeWidth={2} />
                </View>
              </Pressable>
              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [
                  styles.editHeaderBtn,
                  pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] },
                ]}
                testID="profile-signout-btn"
              >
                <View style={styles.logoutIconWrap}>
                  <DoorOpen size={15} color="#FFFFFF" strokeWidth={2} />
                </View>
              </Pressable>
            </View>
          ),
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={[styles.profileHeader, { opacity: fadeAnim }]}>
          {myProfile.avatar_url ? (
            <Image
              source={{ uri: myProfile.avatar_url }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: catColor + '20' }]}>
              <Text style={[styles.avatarInitial, { color: catColor }]}>
                {(myProfile.display_name ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.nameRow}>
            <Text style={styles.name}>{myProfile.display_name}</Text>
            {hasVerifiedBusiness && (
              <BadgeCheck size={18} color="#2563EB" />
            )}
          </View>
          <View style={[styles.styleTag, { backgroundColor: catColor + '14' }]}>
            <CategoryIcon category={myProfile.style_tag} size={14} color={catColor} />
            <Text style={[styles.styleTagText, { color: catColor }]}>
              {CategoryLabels[myProfile.style_tag] ?? myProfile.style_tag}
            </Text>
          </View>
          {myProfile.bio ? (
            <Text style={styles.bio}>{myProfile.bio}</Text>
          ) : null}
          <Pressable
            style={({ pressed }) => [
              styles.editBtn,
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => router.push('/edit-profile')}
          >
            <View style={styles.editBtnIcon}>
              <SquarePen size={12} color="#FFFFFF" strokeWidth={2.2} />
            </View>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </Pressable>
        </Animated.View>

        <Animated.View style={[styles.statsContainer, { opacity: fadeAnim }]}>
          <View style={styles.statsInner}>
            <View style={styles.statBlock}>
              <Text style={styles.statBlockValue}>{userBlocks.length}</Text>
              <Text style={styles.statBlockLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statBlockValue}>{followedCount}</Text>
              <Text style={styles.statBlockLabel}>Following</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statBlockValue}>{totalSavedCount + scanCount}</Text>
              <Text style={styles.statBlockLabel}>Saved</Text>
            </View>
          </View>
        </Animated.View>

        <AdMobBanner />

        <Animated.View style={[styles.photosSection, { opacity: fadeAnim }]}>
          <View style={styles.photosSectionHeaderRow}>
            <Pressable
              onPress={togglePhotos}
              style={({ pressed }) => [
                styles.photosSectionHeader,
                { flex: 1 },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.photoTabActive}>
                <Grid3X3 size={15} color="#1A1A1A" />
                <Text style={styles.photoTabTextActive}>Photos</Text>
                {userBlocks.length > 0 && (
                  <View style={styles.photosCountBadge}>
                    <Text style={styles.photosCountText}>{userBlocks.length}</Text>
                  </View>
                )}
              </View>
              <Animated.View style={{ transform: [{ rotate: photosRotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
                <ChevronDown size={18} color="#86868B" strokeWidth={2.2} />
              </Animated.View>
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: '/create-block', params: { userId: profileUserId } })}
              style={({ pressed }) => [
                styles.addBlockChip,
                pressed && { opacity: 0.7 },
              ]}
              testID="add-block-btn"
            >
              <Plus size={14} color="#FFFFFF" />
              <Text style={styles.addBlockChipText}>Add</Text>
            </Pressable>
          </View>

          {photosExpanded && (
            blocksLoading ? (
              <View style={styles.emptyPostsContainer}>
                <ActivityIndicator size="small" color="#8E8E93" />
              </View>
            ) : userBlocks.length > 0 ? (
              <View style={styles.adBlocksGrid}>
                {userBlocks.map((block, idx) => (
                  <React.Fragment key={block.id}>
                    {idx === 3 && (
                      <AdBlockTile size={AD_BLOCK_SIZE} index={0} />
                    )}
                    <Pressable
                      style={({ pressed }) => [
                        styles.adBlockCard,
                        pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
                      ]}
                      onPress={() => openPostPreview(block, myProfile.display_name || '')}
                      onLongPress={() => handleDeleteBlock(block.id)}
                      testID={`ad-block-${block.id}`}
                    >
                      {getBlockImageUri(block.headerImageUrl) ? (
                        <Image
                          source={{ uri: getBlockImageUri(block.headerImageUrl) }}
                          style={styles.adBlockImage}
                          contentFit="cover"
                          recyclingKey={block.id}
                        />
                      ) : (
                        <View style={[styles.adBlockImage, styles.adBlockImagePlaceholder]}>
                          <ImageIcon size={20} color="#AEAEB2" />
                        </View>
                      )}
                    </Pressable>
                  </React.Fragment>
                ))}
                {userBlocks.length > 0 && userBlocks.length <= 3 && (
                  <AdBlockTile size={AD_BLOCK_SIZE} index={1} />
                )}
              </View>
            ) : (
              <View style={styles.adBlocksEmpty}>
                <View style={styles.adBlocksEmptyIcon}>
                  <Layers size={24} color="#8E8E93" />
                </View>
                <Text style={styles.adBlocksEmptyTitle}>No photos yet</Text>
                <Text style={styles.adBlocksEmptySub}>
                  Tap + to share photos on your profile
                </Text>
              </View>
            )
          )}
        </Animated.View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <PostPreviewDrawer
        visible={previewVisible}
        post={previewPost}
        onClose={closePreview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#555558',
    fontWeight: '600' as const,
  },
  createBtn: {
    backgroundColor: '#1B5E3B',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 22,
    shadowColor: '#1B5E3B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 4,
    marginBottom: 14,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F0F0F2',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#DDDDE2',
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '800' as const,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  name: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#111113',
    letterSpacing: -0.5,
  },
  styleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  styleTagText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  bio: {
    fontSize: 14,
    color: '#555558',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#111113',
    marginTop: 4,
    shadowColor: '#111113',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.20,
    shadowRadius: 8,
    elevation: 4,
  },
  editBtnIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  editHeaderBtn: {
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  editIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.destructive,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 0,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 5,
  },
  statsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statBlockValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#111113',
    letterSpacing: -0.6,
  },
  statBlockLabel: {
    fontSize: 10,
    color: '#86868B',
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
    backgroundColor: '#DDDDE2',
  },
  photosSection: {
    marginBottom: 12,
  },
  photosSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDDDE2',
  },
  photosSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoTabActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoTabTextActive: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#111113',
  },
  photosCountBadge: {
    backgroundColor: '#F0F0F2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center' as const,
  },
  photosCountText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#86868B',
  },
  addBlockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#1B5E3B',
    shadowColor: '#1B5E3B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  addBlockChipText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  adBlocksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AD_BLOCK_GAP,
  },
  adBlockCard: {
    width: AD_BLOCK_SIZE,
    aspectRatio: 1,
    overflow: 'hidden',
    backgroundColor: '#EAEAEF',
    borderRadius: 4,
  },
  adBlockImage: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#E5E5EA',
  },
  adBlockImagePlaceholder: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  adBlocksEmpty: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    gap: 6,
    borderWidth: 0,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  adBlocksEmptyIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F0F0F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  adBlocksEmptyTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#111113',
  },
  adBlocksEmptySub: {
    fontSize: 13,
    color: '#86868B',
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyPostsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 6,
  },
  emptyPostsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F0F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPostsText: {
    fontSize: 14,
    color: '#86868B',
    fontWeight: '600' as const,
  },
  loadingHint: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500' as const,
    marginTop: 8,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: '#FFF0F0',
  },
  signOutBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FF3B30',
  },
});
