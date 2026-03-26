import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { UserProfileBlock } from '@/types';
import Colors from '@/constants/colors';

const DEFAULT_HEADER = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=300&fit=crop';

const TAG_COLORS: Record<string, string> = {
  TIP: '#3B82F6',
  HOT: '#EF4444',
  NEW: '#22C55E',
  TRENDING: '#F59E0B',
  UPDATE: '#8B5CF6',
  DEAL: '#F97316',
  STORE: '#06B6D4',
  LIST: '#6366F1',
  RECIPE: '#EC4899',
  BULK: '#A855F7',
};

interface ProfileBlockCardProps {
  block: UserProfileBlock;
  onEdit?: () => void;
  onDelete?: () => void;
  isOwner?: boolean;
}

export default React.memo(function ProfileBlockCard({ block, onEdit, onDelete, isOwner }: ProfileBlockCardProps) {
  const router = useRouter();
  const tagColor = TAG_COLORS[block.tagLeft] ?? '#6B7280';

  const handleAction = useCallback(() => {
    console.log('[ProfileBlockCard] Action tapped:', block.actionType, block.id);
    switch (block.actionType) {
      case 'openMap':
        if (block.latitude != null && block.longitude != null) {
          router.push({
            pathname: '/map-full',
            params: {
              focusLat: String(block.latitude),
              focusLng: String(block.longitude),
              focusName: block.title,
            },
          });
        }
        break;
      case 'openPlaceProfile':
        if (block.placeId) {
          router.push({ pathname: '/place-profile', params: { id: block.placeId } });
        }
        break;
      case 'openUrl':
        if (block.url) {
          void Linking.openURL(block.url);
        }
        break;
      default:
        break;
    }
  }, [block, router]);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={block.actionType !== 'none' ? handleAction : undefined}
      testID={`profile-block-${block.id}`}
    >
      <Image
        source={{ uri: block.headerImageUrl || DEFAULT_HEADER }}
        style={styles.headerImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={`block-${block.id}`}
      />

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{block.title}</Text>

        <View style={styles.tagsRow}>
          <View style={[styles.tagPill, { backgroundColor: tagColor + '18' }]}>
            <Text style={[styles.tagPillText, { color: tagColor }]}>{block.tagLeft}</Text>
          </View>
          {block.badgeRight === 'NEW' && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>

        {block.description ? (
          <Text style={styles.description} numberOfLines={3}>{block.description}</Text>
        ) : null}

        <View style={styles.bottomRow}>
          {block.actionType !== 'none' && block.actionLabel ? (
            <Pressable style={styles.actionLink} onPress={handleAction}>
              <Text style={styles.actionLinkText}>{block.actionLabel}</Text>
              <ChevronRight size={14} color="#2563EB" />
            </Pressable>
          ) : (
            <View />
          )}

          {isOwner && (
            <View style={styles.ownerActions}>
              {onEdit && (
                <Pressable onPress={onEdit} style={styles.ownerBtn} testID={`edit-block-${block.id}`}>
                  <Text style={styles.ownerBtnText}>Edit</Text>
                </Pressable>
              )}
              {onDelete && (
                <Pressable onPress={onDelete} style={styles.ownerBtn} testID={`delete-block-${block.id}`}>
                  <Text style={[styles.ownerBtnText, { color: Colors.destructive }]}>Delete</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 16,
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.985 }],
  },
  headerImage: {
    width: '100%',
    height: 170,
    backgroundColor: '#2A2A2A',
  },
  body: {
    padding: 16,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  newBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  actionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionLinkText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#2563EB',
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  ownerBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  ownerBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
});
