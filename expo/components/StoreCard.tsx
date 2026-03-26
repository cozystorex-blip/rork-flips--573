import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Navigation, Eye, DollarSign } from 'lucide-react-native';
import { StoreData, CategoryLabels } from '@/types';
import Colors, { CategoryColors } from '@/constants/colors';
import CategoryIcon from '@/components/CategoryIcon';

interface StoreCardProps {
  store: StoreData;
  onDirections?: () => void;
  onViewLists?: () => void;
}

export default function StoreCard({ store, onDirections, onViewLists }: StoreCardProps) {
  const catColor = CategoryColors[store.category];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: catColor + '18' }]}>
          <CategoryIcon category={store.category} size={20} color={catColor} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{store.name}</Text>
          <View style={styles.tagRow}>
            <View style={[styles.tag, { backgroundColor: catColor + '18' }]}>
              <Text style={[styles.tagText, { color: catColor }]}>
                {CategoryLabels[store.category]}
              </Text>
            </View>
            <Text style={styles.lastLog}>{store.lastLogTime}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <DollarSign size={13} color={Colors.textSecondary} />
          <Text style={styles.statValue}>${store.avgSpend.toFixed(0)}</Text>
          <Text style={styles.statLabel}>avg</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Eye size={13} color={Colors.textSecondary} />
          <Text style={styles.statValue}>{store.totalLogs}</Text>
          <Text style={styles.statLabel}>logs</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: catColor }]}
          onPress={onViewLists}
        >
          <Eye size={14} color="#fff" />
          <Text style={styles.actionTextWhite}>Public Lists</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, styles.actionBtnOutline]}
          onPress={onDirections}
        >
          <Navigation size={14} color={Colors.text} />
          <Text style={styles.actionTextDark}>Directions</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    ...Colors.cardShadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  lastLog: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#3A3A3C',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnOutline: {
    backgroundColor: '#2A2A2A',
  },
  actionTextWhite: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },
  actionTextDark: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },

});
