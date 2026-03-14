import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import {
  UtensilsCrossed,
  ShoppingCart,
  Car,
  Zap,
  ShoppingBag,
  Home,
  Tv,
  MoreHorizontal,
  Trash2,
} from 'lucide-react-native';
import { Alert } from 'react-native';
import { Expense, ExpenseCategoryLabels, ExpenseCategoryType } from '@/types';
import Colors, { ExpenseCategoryColors } from '@/constants/colors';
import { getProductImageUrl } from '@/constants/productImages';
import * as Haptics from 'expo-haptics';

interface ExpenseCardProps {
  expense: Expense;
  onDelete?: (id: string) => void;
}

const iconMap: Record<ExpenseCategoryType, React.ComponentType<{ size: number; color: string }>> = {
  food: UtensilsCrossed,
  grocery: ShoppingCart,
  transport: Car,
  utility_bills: Zap,
  shopping: ShoppingBag,
  home: Home,
  subscriptions: Tv,
  other: MoreHorizontal,
};

function timeAgoLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default React.memo(function ExpenseCard({ expense, onDelete }: ExpenseCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const catColor = ExpenseCategoryColors[expense.category];
  const IconComponent = iconMap[expense.category];

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [scaleAnim]);

  const handleDelete = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${expense.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(expense.id),
        },
      ]
    );
  }, [onDelete, expense.id, expense.title]);

  const productImageUrl = getProductImageUrl(expense.title, expense.category);

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
        testID={`expense-card-${expense.id}`}
      >
        <View style={styles.thumbWrap}>
          <ExpoImage
            source={{ uri: productImageUrl }}
            style={styles.thumbImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={`expense-${expense.id}`}
          />
          <View style={[styles.thumbBadge, { backgroundColor: catColor }]}>
            <IconComponent size={10} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{expense.title}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.categoryTag, { backgroundColor: catColor + '10' }]}>
              <Text style={[styles.categoryText, { color: catColor }]}>
                {ExpenseCategoryLabels[expense.category]}
              </Text>
            </View>
            <Text style={styles.timeText}>{timeAgoLabel(expense.createdAt)}</Text>
          </View>
          {expense.notes ? (
            <Text style={styles.notes} numberOfLines={1}>{expense.notes}</Text>
          ) : null}
        </View>

        <View style={styles.rightSection}>
          <Text style={styles.amount}>-${expense.amount.toFixed(2)}</Text>
          {onDelete && (
            <Pressable onPress={handleDelete} style={styles.deleteBtn} hitSlop={8}>
              <Trash2 size={14} color={Colors.destructive} />
            </Pressable>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  thumbWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    overflow: 'hidden' as const,
    marginRight: 12,
    position: 'relative' as const,
    backgroundColor: '#F2F2F7',
  },
  thumbImage: {
    width: 46,
    height: 46,
    borderRadius: 12,
  },
  thumbBadge: {
    position: 'absolute' as const,
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 6,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  timeText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '400' as const,
  },
  notes: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 3,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 6,
    marginLeft: 8,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.4,
  },
  deleteBtn: {
    padding: 4,
  },
});
