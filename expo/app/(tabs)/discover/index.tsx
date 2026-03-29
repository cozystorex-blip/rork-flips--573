import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  User,
  Settings,
  HelpCircle,
  Headphones,
  Share2,
  ChevronRight,
  LogOut,
  ShoppingBag,
  TrendingDown,
  Store,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useScanHistory } from '@/contexts/ScanHistoryContext';
import { useSavedItems } from '@/contexts/SavedItemsContext';
import { useExpenses } from '@/contexts/ExpenseContext';

const ACCOUNT_ITEMS = [
  { key: 'history', label: 'Purchase History', icon: ShoppingBag, route: null },
  { key: 'alerts', label: 'Price Drop Alerts', icon: TrendingDown, route: null },
  { key: 'stores', label: 'Favorite Stores', icon: Store, route: null },
  { key: 'settings', label: 'Settings', icon: Settings, route: '/edit-profile' },
] as const;

const MORE_ITEMS = [
  { key: 'how', label: 'How Flip Works', icon: HelpCircle },
  { key: 'support', label: 'Support', icon: Headphones },
  { key: 'share', label: 'Share Flip App', icon: Share2 },
] as const;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { entries: scanEntries } = useScanHistory();
  const { savedDeals } = useSavedItems();
  const { expenses } = useExpenses();

  const totalSaved = useMemo(() => {
    let total = 0;
    savedDeals.forEach(d => {
      if (d.savingsAmount) total += d.savingsAmount;
    });
    return total;
  }, [savedDeals]);

  const itemsScanned = scanEntries.length;
  const receiptsCount = expenses.filter(e => e.amount > 0).length;

  const memberSince = useMemo(() => {
    if (!profile?.created_at) return '';
    const d = new Date(profile.created_at);
    return `Member since ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  }, [profile?.created_at]);

  const handleSignOut = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void signOut();
  }, [signOut]);

  const handleMenuPress = useCallback((route: string | null) => {
    void Haptics.selectionAsync();
    if (route) {
      router.push(route as '/edit-profile');
    }
  }, [router]);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.profileHeader}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatarWrap}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatar}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <User size={36} color="#16A34A" strokeWidth={1.5} />
                </View>
              )}
            </View>
            <Pressable
              onPress={() => handleMenuPress('/edit-profile')}
              style={styles.settingsBtn}
              hitSlop={8}
            >
              <Settings size={20} color="#8E8E93" strokeWidth={1.5} />
            </Pressable>
          </View>

          <Text style={styles.profileName}>
            {profile?.display_name || 'Set up your profile'}
          </Text>
          {memberSince ? (
            <Text style={styles.memberSince}>{memberSince}</Text>
          ) : null}
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Saved</Text>
            <Text style={styles.statValue}>${totalSaved > 0 ? totalSaved.toFixed(0) : '0'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Items Scanned</Text>
            <Text style={styles.statValue}>{itemsScanned}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Receipts</Text>
            <Text style={styles.statValue}>{receiptsCount}</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Account</Text>
          <View style={styles.menuCard}>
            {ACCOUNT_ITEMS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => handleMenuPress(item.route)}
                  style={({ pressed }) => [
                    styles.menuRow,
                    pressed && styles.menuRowPressed,
                    idx < ACCOUNT_ITEMS.length - 1 && styles.menuRowBorder,
                  ]}
                >
                  <Icon size={18} color="#1C1C1E" strokeWidth={1.5} />
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <ChevronRight size={16} color="#C7C7CC" strokeWidth={1.5} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>More</Text>
          <View style={styles.menuCard}>
            {MORE_ITEMS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => { void Haptics.selectionAsync(); }}
                  style={({ pressed }) => [
                    styles.menuRow,
                    pressed && styles.menuRowPressed,
                    idx < MORE_ITEMS.length - 1 && styles.menuRowBorder,
                  ]}
                >
                  <Icon size={18} color="#1C1C1E" strokeWidth={1.5} />
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <ChevronRight size={16} color="#C7C7CC" strokeWidth={1.5} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.7 }]}
        >
          <LogOut size={16} color="#FF3B30" strokeWidth={1.8} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scroll: {
    paddingHorizontal: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#F0FDF4',
    borderWidth: 3,
    borderColor: '#16A34A',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    textAlign: 'center' as const,
  },
  memberSince: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 4,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#16A34A',
    borderRadius: 14,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  menuSection: {
    marginBottom: 20,
  },
  menuSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8E8E93',
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuRowPressed: {
    backgroundColor: '#F2F2F7',
  },
  menuRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#1C1C1E',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FF3B30',
  },
});
