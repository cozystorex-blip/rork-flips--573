import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,

} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { X, MapPin, Clock, Zap, Info, Lightbulb } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useCreatures } from '@/contexts/CreatureContext';
import { RARITY_CONFIG, CATEGORY_INFO } from '@/mocks/creatures';

export default function CreatureDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { creatures } = useCreatures();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const creature = useMemo(() => creatures.find(c => c.id === id), [creatures, id]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  if (!creature) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Creature not found</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const rarityInfo = RARITY_CONFIG[creature.rarity];
  const catInfo = CATEGORY_INFO[creature.category];
  const scannedDate = new Date(creature.scannedAt);
  const timeStr = scannedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Image source={{ uri: creature.imageUrl }} style={styles.heroImage} contentFit="cover" />
        <View style={[styles.closeRow, { top: insets.top + 10 }]}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <X size={20} color={Colors.textPrimary} strokeWidth={2} />
          </Pressable>
        </View>

        <View style={[styles.rarityBanner, { backgroundColor: rarityInfo?.color ?? '#90A4AE' }]}>
          <Text style={styles.rarityBannerText}>{rarityInfo?.label ?? 'Common'}</Text>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.nameSection}>
            <Text style={styles.creatureName}>{creature.name}</Text>
            <Text style={styles.sciName}>{creature.scientificName}</Text>
            <View style={styles.catBadge}>
              <Text style={styles.catEmoji}>{catInfo?.emoji ?? '🐾'}</Text>
              <Text style={styles.catLabel}>{catInfo?.label ?? creature.category}</Text>
            </View>
          </View>

          <View style={styles.xpCard}>
            <Zap size={18} color={Colors.accent} strokeWidth={2} />
            <Text style={styles.xpValue}>+{creature.xpReward} XP</Text>
            <Text style={styles.xpLabel}>earned from this scan</Text>
          </View>

          <View style={styles.metaRow}>
            {creature.location && (
              <View style={styles.metaItem}>
                <MapPin size={14} color={Colors.textSecondary} strokeWidth={2} />
                <Text style={styles.metaText}>{creature.location}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Clock size={14} color={Colors.textSecondary} strokeWidth={2} />
              <Text style={styles.metaText}>{timeStr}</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Info size={16} color={Colors.cyan} strokeWidth={2} />
              <Text style={styles.infoTitle}>About</Text>
            </View>
            <Text style={styles.infoText}>{creature.description}</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <MapPin size={16} color={Colors.accent} strokeWidth={2} />
              <Text style={styles.infoTitle}>Habitat</Text>
            </View>
            <Text style={styles.infoText}>{creature.habitat}</Text>
          </View>

          <View style={[styles.infoCard, styles.funFactCard]}>
            <View style={styles.infoHeader}>
              <Lightbulb size={16} color={Colors.gold} strokeWidth={2} />
              <Text style={[styles.infoTitle, { color: Colors.gold }]}>Fun Fact</Text>
            </View>
            <Text style={styles.infoText}>{creature.funFact}</Text>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  content: {
    flex: 1,
  },
  heroImage: {
    width: '100%',
    height: 280,
    backgroundColor: Colors.darkCard,
  },
  closeRow: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rarityBanner: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  rarityBannerText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: Colors.dark,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  nameSection: {
    marginBottom: 16,
  },
  creatureName: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  sciName: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    fontStyle: 'italic' as const,
    marginBottom: 10,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.darkCard,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catEmoji: {
    fontSize: 16,
  },
  catLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  xpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.accentGlow,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.2)',
    marginBottom: 16,
  },
  xpValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.accent,
  },
  xpLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  infoCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  funFactCard: {
    borderColor: 'rgba(255,213,79,0.2)',
    backgroundColor: 'rgba(255,213,79,0.05)',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  notFoundText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  backBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.dark,
  },
});
