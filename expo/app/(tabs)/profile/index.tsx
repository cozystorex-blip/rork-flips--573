import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Trophy,
  Flame,
  Target,
  Star,

} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useCreatures } from '@/contexts/CreatureContext';
import { CATEGORY_INFO, RARITY_CONFIG } from '@/mocks/creatures';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { stats, creatures } = useCreatures();

  const xpProgress = useMemo(() => {
    return stats.xpToNextLevel > 0 ? stats.xp / stats.xpToNextLevel : 0;
  }, [stats.xp, stats.xpToNextLevel]);

  const rarityBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    creatures.forEach(c => {
      counts[c.rarity] = (counts[c.rarity] || 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [creatures]);

  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    creatures.forEach(c => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [creatures]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Explorer Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>🐾</Text>
            </View>
          </View>
          <Text style={styles.levelTitle}>Level {stats.level} Explorer</Text>
          <View style={styles.xpRow}>
            <View style={styles.xpBarBg}>
              <View style={[styles.xpBarFill, { width: `${Math.min(xpProgress * 100, 100)}%` }]} />
            </View>
            <Text style={styles.xpText}>{stats.xp}/{stats.xpToNextLevel}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(0,230,118,0.12)' }]}>
              <Target size={20} color={Colors.accent} strokeWidth={2} />
            </View>
            <Text style={styles.statValue}>{stats.totalScans}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255,213,79,0.12)' }]}>
              <Star size={20} color={Colors.gold} strokeWidth={2} />
            </View>
            <Text style={styles.statValue}>{stats.uniqueCreatures}</Text>
            <Text style={styles.statLabel}>Unique Species</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255,152,0,0.12)' }]}>
              <Flame size={20} color={Colors.orange} strokeWidth={2} />
            </View>
            <Text style={styles.statValue}>{stats.currentStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(66,165,245,0.12)' }]}>
              <Trophy size={20} color={Colors.cyan} strokeWidth={2} />
            </View>
            <Text style={styles.statValue}>{stats.longestStreak}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
        </View>

        {rarityBreakdown.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Rarity Breakdown</Text>
            <View style={styles.breakdownCard}>
              {rarityBreakdown.map(([rarity, count]) => {
                const info = RARITY_CONFIG[rarity];
                const pct = creatures.length > 0 ? (count / creatures.length) * 100 : 0;
                return (
                  <View key={rarity} style={styles.breakdownRow}>
                    <View style={[styles.breakdownDot, { backgroundColor: info?.color ?? '#90A4AE' }]} />
                    <Text style={styles.breakdownLabel}>{info?.label ?? rarity}</Text>
                    <View style={styles.breakdownBarBg}>
                      <View style={[styles.breakdownBarFill, { width: `${pct}%`, backgroundColor: info?.color ?? '#90A4AE' }]} />
                    </View>
                    <Text style={styles.breakdownCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {categoryBreakdown.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Species Categories</Text>
            <View style={styles.breakdownCard}>
              {categoryBreakdown.map(([cat, count]) => {
                const info = CATEGORY_INFO[cat];
                const pct = creatures.length > 0 ? (count / creatures.length) * 100 : 0;
                return (
                  <View key={cat} style={styles.breakdownRow}>
                    <Text style={styles.breakdownEmoji}>{info?.emoji ?? '🐾'}</Text>
                    <Text style={styles.breakdownLabel}>{info?.label ?? cat}</Text>
                    <View style={styles.breakdownBarBg}>
                      <View style={[styles.breakdownBarFill, { width: `${pct}%`, backgroundColor: info?.color ?? Colors.accent }]} />
                    </View>
                    <Text style={styles.breakdownCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
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
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 36,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '80%',
  },
  xpBarBg: {
    flex: 1,
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
  xpText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  breakdownCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
    marginBottom: 24,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownEmoji: {
    fontSize: 16,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    width: 80,
  },
  breakdownBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.darkCardAlt,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: 6,
    borderRadius: 3,
  },
  breakdownCount: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    width: 30,
    textAlign: 'right' as const,
  },
});
