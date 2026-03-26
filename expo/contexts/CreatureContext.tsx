import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import type { Creature, UserStats, DailyChallenge } from '@/types/creature';
import { MOCK_CREATURES, MOCK_USER_STATS, MOCK_DAILY_CHALLENGES } from '@/mocks/creatures';

const STORAGE_KEYS = {
  creatures: 'creature_scan_collection',
  stats: 'creature_scan_stats',
  challenges: 'creature_scan_challenges',
};

export const [CreatureProvider, useCreatures] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [stats, setStats] = useState<UserStats>(MOCK_USER_STATS);
  const [challenges, setChallenges] = useState<DailyChallenge[]>(MOCK_DAILY_CHALLENGES);

  const creaturesQuery = useQuery({
    queryKey: ['creatures'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.creatures);
      if (stored) {
        return JSON.parse(stored) as Creature[];
      }
      await AsyncStorage.setItem(STORAGE_KEYS.creatures, JSON.stringify(MOCK_CREATURES));
      return MOCK_CREATURES;
    },
  });

  const statsQuery = useQuery({
    queryKey: ['userStats'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.stats);
      if (stored) {
        return JSON.parse(stored) as UserStats;
      }
      await AsyncStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(MOCK_USER_STATS));
      return MOCK_USER_STATS;
    },
  });

  const challengesQuery = useQuery({
    queryKey: ['dailyChallenges'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.challenges);
      if (stored) {
        return JSON.parse(stored) as DailyChallenge[];
      }
      await AsyncStorage.setItem(STORAGE_KEYS.challenges, JSON.stringify(MOCK_DAILY_CHALLENGES));
      return MOCK_DAILY_CHALLENGES;
    },
  });

  useEffect(() => {
    if (creaturesQuery.data) setCreatures(creaturesQuery.data);
  }, [creaturesQuery.data]);

  useEffect(() => {
    if (statsQuery.data) setStats(statsQuery.data);
  }, [statsQuery.data]);

  useEffect(() => {
    if (challengesQuery.data) setChallenges(challengesQuery.data);
  }, [challengesQuery.data]);

  const syncCreatures = useMutation({
    mutationFn: async (updated: Creature[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.creatures, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['creatures'] });
    },
  });

  const syncStats = useMutation({
    mutationFn: async (updated: UserStats) => {
      await AsyncStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['userStats'] });
    },
  });

  const addCreature = useCallback((creature: Creature) => {
    setCreatures(prev => {
      const updated = [creature, ...prev];
      syncCreatures.mutate(updated);
      return updated;
    });

    setStats(prev => {
      const newXp = prev.xp + creature.xpReward;
      const leveledUp = newXp >= prev.xpToNextLevel;
      const newStats: UserStats = {
        ...prev,
        xp: leveledUp ? newXp - prev.xpToNextLevel : newXp,
        level: leveledUp ? prev.level + 1 : prev.level,
        xpToNextLevel: leveledUp ? Math.floor(prev.xpToNextLevel * 1.2) : prev.xpToNextLevel,
        totalScans: prev.totalScans + 1,
        uniqueCreatures: prev.uniqueCreatures + 1,
      };
      syncStats.mutate(newStats);
      return newStats;
    });
  }, [syncCreatures, syncStats]);

  const recentScans = useMemo(() => {
    return [...creatures].sort(
      (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
    ).slice(0, 5);
  }, [creatures]);

  const isLoading = creaturesQuery.isLoading || statsQuery.isLoading;

  return useMemo(() => ({
    creatures,
    stats,
    challenges,
    recentScans,
    addCreature,
    isLoading,
  }), [creatures, stats, challenges, recentScans, addCreature, isLoading]);
});
