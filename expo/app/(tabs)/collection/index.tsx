import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useCreatures } from '@/contexts/CreatureContext';
import { RARITY_CONFIG, CATEGORY_INFO } from '@/mocks/creatures';
import type { Rarity, Creature } from '@/types/creature';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2;

const RARITY_FILTERS: { key: Rarity | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'common', label: 'Common' },
  { key: 'uncommon', label: 'Uncommon' },
  { key: 'rare', label: 'Rare' },
  { key: 'epic', label: 'Epic' },
  { key: 'legendary', label: 'Legendary' },
  { key: 'mythic', label: 'Mythic' },
];

export default function CollectionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { creatures } = useCreatures();
  const [selectedRarity, setSelectedRarity] = useState<Rarity | 'all'>('all');

  const filtered = useMemo(() => {
    if (selectedRarity === 'all') return creatures;
    return creatures.filter(c => c.rarity === selectedRarity);
  }, [creatures, selectedRarity]);

  const handleFilterPress = useCallback((key: Rarity | 'all') => {
    void Haptics.selectionAsync();
    setSelectedRarity(key);
  }, []);

  const handleCreaturePress = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/creature-detail', params: { id } });
  }, [router]);

  const renderCreature = useCallback(({ item }: { item: Creature }) => {
    const rarityInfo = RARITY_CONFIG[item.rarity];
    const catInfo = CATEGORY_INFO[item.category];
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
        onPress={() => handleCreaturePress(item.id)}
        testID={`collection-card-${item.id}`}
      >
        <Image source={{ uri: item.imageUrl }} style={styles.cardImage} contentFit="cover" />
        <View style={[styles.rarityStripe, { backgroundColor: rarityInfo?.color ?? '#90A4AE' }]} />
        <View style={styles.cardContent}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardSciName} numberOfLines={1}>{item.scientificName}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardEmoji}>{catInfo?.emoji ?? '🐾'}</Text>
            <View style={[styles.cardRarityDot, { backgroundColor: rarityInfo?.color ?? '#90A4AE' }]} />
            <Text style={[styles.cardRarityLabel, { color: rarityInfo?.color ?? '#90A4AE' }]}>
              {rarityInfo?.label ?? 'Common'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }, [handleCreaturePress]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Bestiary</Text>
        <Text style={styles.count}>{creatures.length} creatures</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {RARITY_FILTERS.map(f => {
          const isActive = selectedRarity === f.key;
          const rarityColor = f.key !== 'all' ? RARITY_CONFIG[f.key]?.color : Colors.accent;
          return (
            <Pressable
              key={f.key}
              style={[
                styles.filterChip,
                isActive && { backgroundColor: (rarityColor ?? Colors.accent) + '20', borderColor: (rarityColor ?? Colors.accent) + '50' },
              ]}
              onPress={() => handleFilterPress(f.key)}
            >
              {f.key !== 'all' && (
                <View style={[styles.filterDot, { backgroundColor: rarityColor ?? Colors.accent }]} />
              )}
              <Text style={[styles.filterText, isActive && { color: rarityColor ?? Colors.accent, fontWeight: '700' as const }]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📦</Text>
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptySubtext}>Scan creatures to fill your bestiary!</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderCreature}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  count: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  filterScroll: {
    maxHeight: 44,
    marginBottom: 8,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  grid: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  gridRow: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.darkCard,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardImage: {
    width: '100%',
    height: CARD_WIDTH * 0.75,
    backgroundColor: Colors.darkCardAlt,
  },
  rarityStripe: {
    height: 3,
    width: '100%',
  },
  cardContent: {
    padding: 12,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  cardSciName: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    fontStyle: 'italic' as const,
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardEmoji: {
    fontSize: 14,
  },
  cardRarityDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  cardRarityLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
  },
});
