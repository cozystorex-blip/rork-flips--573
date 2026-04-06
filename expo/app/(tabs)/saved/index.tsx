import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Tag } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSavedItems, SavedDeal } from '@/contexts/SavedItemsContext';
import { useScreenWidth } from '@/hooks/useScreenWidth';


const GRID_GAP = 12;
const H_PAD = 16;

interface SavedItem {
  id: string;
  title: string;
  subtitle: string;
  price: string | null;
  imageUri: string | null;
  source: string;
  savedAt: string;
  badge: string | null;
  badgeColor: string;
  raw: SavedDeal;
}

export default function SavedScreen() {
  const router = useRouter();
  const screenWidth = useScreenWidth();
  const cardWidth = (screenWidth - H_PAD * 2 - GRID_GAP) / 2;
  const { savedDeals, unsaveDeal, isLoading: dealsLoading } = useSavedItems();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const savedItems = useMemo<SavedItem[]>(() => {
    return savedDeals.map((d) => ({
      id: d.id,
      title: d.title,
      subtitle: d.category || 'Deal',
      price: d.price != null ? `${d.price.toFixed(2)}` : null,
      imageUri: d.photoUrl,
      source: d.storeName,
      savedAt: d.savedAt,
      badge: d.savingsAmount ? `${Math.round((d.savingsAmount / (d.price ?? 1)) * 100)}% Off` : null,
      badgeColor: '#16A34A',
      raw: d,
    })).sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
  }, [savedDeals]);

  const handleCardPress = useCallback((item: SavedItem) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const deal = item.raw;
    router.push({
      pathname: '/post-detail',
      params: {
        dealId: deal.dealId,
        title: deal.title,
        storeName: deal.storeName,
        imageUrl: deal.photoUrl ?? '',
        category: deal.category ?? '',
        sourceType: deal.sourceType ?? '',
        price: deal.price != null ? String(deal.price) : '',
        originalPrice: deal.originalPrice != null ? String(deal.originalPrice) : '',
        savingsAmount: deal.savingsAmount != null ? String(deal.savingsAmount) : '',
      },
    });
  }, [router]);

  const handleLongPress = useCallback((item: SavedItem) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Remove Saved Item',
      `Remove "${item.title}" from your saved collection?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            unsaveDeal(item.raw.dealId);
          },
        },
      ]
    );
  }, [unsaveDeal]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void queryClient.invalidateQueries({ queryKey: ['saved_deals'] });
    setTimeout(() => setRefreshing(false), 800);
  }, [queryClient]);

  const isLoading = dealsLoading;

  return (
    <View style={styles.root}>


      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16A34A" />
        }
      >
        {isLoading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <View>
            <View style={styles.grid}>
              {savedItems.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleCardPress(item)}
                  onLongPress={() => handleLongPress(item)}
                  delayLongPress={400}
                  style={({ pressed }) => [
                    styles.gridCard,
                    { width: cardWidth },
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                  testID={`saved-card-${item.id}`}
                >
                  <View style={[styles.gridImageWrap, { width: cardWidth }]}>
                    {item.imageUri ? (
                      <Image
                        source={{ uri: item.imageUri }}
                        style={[styles.gridImage, { width: cardWidth, height: cardWidth * 0.75 }]}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        recyclingKey={`saved-${item.id}`}
                      />
                    ) : (
                      <View style={[styles.gridImagePlaceholder, { width: cardWidth, height: cardWidth * 0.75 }]}>
                        <Tag size={28} color="#C7C7CC" strokeWidth={1.5} />
                      </View>
                    )}
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={styles.cardMetaRow}>
                      <Text style={styles.cardSubtitle} numberOfLines={1}>{item.source}</Text>
                      {item.price ? <Text style={styles.cardPrice}>{item.price}</Text> : null}
                    </View>
                    {item.badge ? (
                      <View style={[styles.cardBadge, { backgroundColor: `${item.badgeColor}14` }]}>
                        <Text style={[styles.cardBadgeText, { color: item.badgeColor }]}>{item.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },

  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridCard: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    overflow: 'hidden',
  },
  gridImageWrap: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  gridImage: {
    backgroundColor: '#F2F2F7',
  },
  gridImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  cardInfo: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSubtitle: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#8E8E93',
    flex: 1,
    marginRight: 4,
  },
  cardPrice: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#16A34A',
  },
  cardBadge: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
});
