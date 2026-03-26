import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Flame, Trophy, Zap, ChevronRight, Target, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useCreatures } from '@/contexts/CreatureContext';
import { RARITY_CONFIG, CATEGORY_INFO } from '@/mocks/creatures';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { stats, recentScans, challenges, creatures } = useCreatures();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const xpProgress = useMemo(() => {
    return stats.xpToNextLevel > 0 ? stats.xp / stats.xpToNextLevel : 0;
  }, [stats.xp, stats.xpToNextLevel]);

  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    creatures.forEach(c => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4);
  }, [creatures]);

  const handleCreaturePress = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/creature-detail', params: { id } });
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.title}>Creature Scout</Text>
        </View>
        <View style={styles.streakBadge}>
          <Flame size={16} color={Colors.orange} strokeWidth={2.2} />
          <Text style={styles.streakText}>{stats.currentStreak}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.levelCard}>
            <View style={styles.levelRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelNumber}>{stats.level}</Text>
              </View>
              <View style={styles.levelInfo}>
                <Text style={styles.levelLabel}>Level {stats.level} Explorer</Text>
                <Text style={styles.xpLabel}>{stats.xp} / {stats.xpToNextLevel} XP</Text>
              </View>
              <View style={styles.levelStatsRow}>
                <View style={styles.miniStat}>
                  <Target size={12} color={Colors.accent} strokeWidth={2} />
                  <Text style={styles.miniStatValue}>{stats.totalScans}</Text>
                </View>
                <View style={styles.miniStat}>
                  <Star size={12} color={Colors.gold} strokeWidth={2} />
                  <Text style={styles.miniStatValue}>{stats.uniqueCreatures}</Text>
                </View>
              </View>
            </View>
            <View style={styles.xpBarBg}>
              <Animated.View style={[styles.xpBarFill, { width: `${Math.min(xpProgress * 100, 100)}%` }]} />
              <View style={[styles.xpBarShine, { width: `${Math.min(xpProgress * 100, 100)}%` }]} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Daily Challenges</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.challengeRow}>
            {challenges.map(challenge => (
              <View
                key={challenge.id}
                style={[styles.challengeCard, challenge.completed && styles.challengeCardDone]}
              >
                <View style={[styles.challengeIcon, challenge.completed && styles.challengeIconDone]}>
                  {challenge.completed ? (
                    <Trophy size={18} color={Colors.gold} strokeWidth={2} />
                  ) : (
                    <Zap size={18} color={Colors.accent} strokeWidth={2} />
                  )}
                </View>
                <Text style={styles.challengeTitle} numberOfLines={1}>{challenge.title}</Text>
                <Text style={styles.challengeDesc} numberOfLines={2}>{challenge.description}</Text>
                <View style={styles.challengeProgressBg}>
                  <View
                    style={[
                      styles.challengeProgressFill,
                      { width: `${Math.min((challenge.current / challenge.target) * 100, 100)}%` },
                      challenge.completed && styles.challengeProgressDone,
                    ]}
                  />
                </View>
                <Text style={styles.challengeXp}>+{challenge.xpReward} XP</Text>
              </View>
            ))}
          </ScrollView>

          {categoryStats.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Top Categories</Text>
              <View style={styles.categoryGrid}>
                {categoryStats.map(([cat, count]) => {
                  const info = CATEGORY_INFO[cat];
                  return (
                    <View key={cat} style={styles.categoryCard}>
                      <Text style={styles.categoryEmoji}>{info?.emoji ?? '🐾'}</Text>
                      <Text style={styles.categoryLabel}>{info?.label ?? cat}</Text>
                      <Text style={styles.categoryCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Scans</Text>
            {recentScans.length > 0 && (
              <Text style={styles.seeAll}>See all</Text>
            )}
          </View>

          {recentScans.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>No scans yet</Text>
              <Text style={styles.emptySubtext}>Point your camera at any animal to start your collection!</Text>
            </View>
          ) : (
            recentScans.map(creature => {
              const rarityInfo = RARITY_CONFIG[creature.rarity];
              return (
                <Pressable
                  key={creature.id}
                  style={({ pressed }) => [styles.creatureCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
                  onPress={() => handleCreaturePress(creature.id)}
                  testID={`creature-card-${creature.id}`}
                >
                  <Image source={{ uri: creature.imageUrl }} style={styles.creatureImage} contentFit="cover" />
                  <View style={styles.creatureInfo}>
                    <View style={styles.creatureTopRow}>
                      <Text style={styles.creatureName} numberOfLines={1}>{creature.name}</Text>
                      <View style={[styles.rarityPill, { backgroundColor: rarityInfo?.bgColor ?? 'rgba(144,164,174,0.15)' }]}>
                        <Text style={[styles.rarityText, { color: rarityInfo?.color ?? '#90A4AE' }]}>
                          {rarityInfo?.label ?? 'Common'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.creatureSciName}>{creature.scientificName}</Text>
                    <View style={styles.creatureMetaRow}>
                      <Text style={styles.creatureXp}>+{creature.xpReward} XP</Text>
                      {creature.location && (
                        <Text style={styles.creatureLocation}>{creature.location}</Text>
                      )}
                    </View>
                  </View>
                  <ChevronRight size={16} color={Colors.textTertiary} strokeWidth={2} />
                </Pressable>
              );
            })
          )}

          <View style={{ height: 32 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,152,0,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.2)',
  },
  streakText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.orange,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  levelCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  levelBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.accentGlow,
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  levelNumber: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.accent,
  },
  levelInfo: {
    flex: 1,
  },
  levelLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  xpLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  levelStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.darkCardAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  miniStatValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  xpBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.xpBarBg,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.xpBar,
  },
  xpBarShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
  challengeRow: {
    gap: 12,
    paddingBottom: 4,
    marginBottom: 20,
  },
  challengeCard: {
    width: SCREEN_WIDTH * 0.4,
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  challengeCardDone: {
    borderColor: 'rgba(255,213,79,0.3)',
    backgroundColor: 'rgba(255,213,79,0.05)',
  },
  challengeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  challengeIconDone: {
    backgroundColor: 'rgba(255,213,79,0.15)',
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  challengeDesc: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginBottom: 10,
    lineHeight: 15,
  },
  challengeProgressBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.darkCardAlt,
    marginBottom: 8,
    overflow: 'hidden',
  },
  challengeProgressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  challengeProgressDone: {
    backgroundColor: Colors.gold,
  },
  challengeXp: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.accent,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - 42 - 10) / 2,
    backgroundColor: Colors.darkCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.accent,
  },
  emptyCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 20,
    paddingVertical: 48,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 18,
  },
  creatureCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  creatureImage: {
    width: 52,
    height: 52,
    borderRadius: 14,
    marginRight: 12,
    backgroundColor: Colors.darkCardAlt,
  },
  creatureInfo: {
    flex: 1,
  },
  creatureTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  creatureName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  rarityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  creatureSciName: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    fontStyle: 'italic' as const,
    marginBottom: 4,
  },
  creatureMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  creatureXp: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.accent,
  },
  creatureLocation: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
});
