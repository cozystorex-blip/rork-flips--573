import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Settings,
  ShoppingBag,
  Bell,
  Heart,
  CircleHelp,
  Headphones,
  Share2,
  LogOut,
  ChevronRight,
  User,
  TrendingUp,
  BarChart3,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useScanHistory } from '@/contexts/ScanHistoryContext';
import { useSavedItems } from '@/contexts/SavedItemsContext';
import { useExpenses } from '@/contexts/ExpenseContext';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  color?: string;
  showChevron?: boolean;
}

function MenuItem({ icon, label, onPress, color, showChevron = true }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
    >
      <View style={styles.menuItemLeft}>
        {icon}
        <Text style={[styles.menuItemLabel, color ? { color } : undefined]}>{label}</Text>
      </View>
      {showChevron && <ChevronRight size={16} color="#C7C7CC" strokeWidth={1.5} />}
    </Pressable>
  );
}

interface MiniBarChartProps {
  data: number[];
  color: string;
  height?: number;
}

function MiniBarChart({ data, color, height = 48 }: MiniBarChartProps) {
  const maxVal = Math.max(...data, 1);
  const barAnims = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = barAnims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 500 + i * 80,
        delay: 200 + i * 60,
        useNativeDriver: false,
      })
    );
    Animated.stagger(40, animations).start();
  }, [barAnims]);

  return (
    <View style={[styles.chartContainer, { height }]}>
      {data.map((val, i) => {
        const ratio = val / maxVal;
        const barHeight = barAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [2, Math.max(ratio * height, 2)],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.chartBar,
              {
                height: barHeight,
                backgroundColor: val > 0 ? color : '#E5E5EA',
                opacity: val > 0 ? 0.4 + ratio * 0.6 : 0.3,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function getWeeklyData(expenses: Array<{ createdAt: string; amount: number }>): number[] {
  const now = new Date();
  const result: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);
    const dayTotal = expenses
      .filter(e => {
        const d = new Date(e.createdAt);
        return d >= day && d < nextDay;
      })
      .reduce((s, e) => s + e.amount, 0);
    result.push(dayTotal);
  }
  return result;
}

function getWeeklyScanData(entries: Array<{ scannedAt: string }>): number[] {
  const now = new Date();
  const result: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);
    const dayCount = entries.filter(e => {
      const d = new Date(e.scannedAt);
      return d >= day && d < nextDay;
    }).length;
    result.push(dayCount);
  }
  return result;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDayLabels(): string[] {
  const now = new Date();
  const labels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    labels.push(DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]);
  }
  return labels;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, isAuthenticated } = useAuth();
  const { profile } = useProfile();
  const { entries: scanEntries, allEntries } = useScanHistory();
  const { savedDeals } = useSavedItems();
  const { expenses } = useExpenses();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const totalSavings = useMemo(() => {
    let total = 0;
    savedDeals.forEach(d => {
      if (d.savingsAmount) total += d.savingsAmount;
    });
    return total;
  }, [savedDeals]);

  const totalSpent = useMemo(() => {
    return expenses.reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const memberSince = useMemo(() => {
    if (profile?.created_at) {
      return new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return 'March 2024';
  }, [profile]);

  const displayName = profile?.display_name && profile.display_name !== 'User'
    ? profile.display_name
    : user?.email?.split('@')[0] || 'Flip User';

  const receiptCount = expenses.filter(e => e.amount > 0).length;

  const weeklySpendData = useMemo(() => getWeeklyData(expenses), [expenses]);
  const weeklyScanData = useMemo(() => getWeeklyScanData(allEntries ?? scanEntries), [allEntries, scanEntries]);
  const dayLabels = useMemo(() => getDayLabels(), []);

  const handleSignOut = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => { void signOut(); },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.heroBackground, { paddingTop: insets.top + 12 }]}>
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1 }} />
          <Pressable
            style={styles.settingsBtn}
            hitSlop={8}
            onPress={() => { void Haptics.selectionAsync(); }}
          >
            <Settings size={20} color="#FFFFFF" strokeWidth={1.5} />
          </Pressable>
        </View>

        <View style={styles.heroProfile}>
          <View style={styles.avatar}>
            {profile?.avatar_url ? (
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            ) : (
              <User size={34} color="#FFFFFF" strokeWidth={1.5} />
            )}
          </View>
          <Text style={styles.heroName}>{displayName}</Text>
          <Text style={styles.heroMember}>Member since {memberSince}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>
              ${totalSavings > 0 ? totalSavings.toLocaleString() : '0'}
            </Text>
            <Text style={styles.statLabel}>Total Saved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{scanEntries.length}</Text>
            <Text style={styles.statLabel}>Items Scanned</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{receiptCount}</Text>
            <Text style={styles.statLabel}>Receipts</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.graphCard}>
            <View style={styles.graphHeader}>
              <View style={styles.graphHeaderLeft}>
                <View style={[styles.graphIconBg, { backgroundColor: '#FEF2F2' }]}>
                  <TrendingUp size={16} color="#DC2626" strokeWidth={2} />
                </View>
                <View>
                  <Text style={styles.graphTitle}>Total Spent</Text>
                  <Text style={styles.graphSubtitle}>Last 7 days</Text>
                </View>
              </View>
              <Text style={styles.graphAmount}>${totalSpent.toFixed(2)}</Text>
            </View>
            <MiniBarChart data={weeklySpendData} color="#DC2626" height={52} />
            <View style={styles.chartLabelsRow}>
              {dayLabels.map((label, i) => (
                <Text key={i} style={styles.chartDayLabel}>{label}</Text>
              ))}
            </View>
          </View>

          <View style={styles.graphCard}>
            <View style={styles.graphHeader}>
              <View style={styles.graphHeaderLeft}>
                <View style={[styles.graphIconBg, { backgroundColor: '#EFF6FF' }]}>
                  <BarChart3 size={16} color="#2563EB" strokeWidth={2} />
                </View>
                <View>
                  <Text style={styles.graphTitle}>Items Scanned</Text>
                  <Text style={styles.graphSubtitle}>Last 7 days</Text>
                </View>
              </View>
              <Text style={styles.graphAmount}>{scanEntries.length}</Text>
            </View>
            <MiniBarChart data={weeklyScanData} color="#2563EB" height={52} />
            <View style={styles.chartLabelsRow}>
              {dayLabels.map((label, i) => (
                <Text key={i} style={styles.chartDayLabel}>{label}</Text>
              ))}
            </View>
          </View>

          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>Account</Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon={<ShoppingBag size={18} color="#1C1C1E" strokeWidth={1.5} />}
                label="Purchase History"
                onPress={() => { void Haptics.selectionAsync(); }}
              />
              <View style={styles.menuDivider} />
              <MenuItem
                icon={<Bell size={18} color="#1C1C1E" strokeWidth={1.5} />}
                label="Price Drop Alerts"
                onPress={() => { void Haptics.selectionAsync(); }}
              />
              <View style={styles.menuDivider} />
              <MenuItem
                icon={<Heart size={18} color="#1C1C1E" strokeWidth={1.5} />}
                label="Favorite Stores"
                onPress={() => { void Haptics.selectionAsync(); }}
              />
              <View style={styles.menuDivider} />
              <MenuItem
                icon={<Settings size={18} color="#1C1C1E" strokeWidth={1.5} />}
                label="Settings"
                onPress={() => { void Haptics.selectionAsync(); }}
              />
            </View>
          </View>

          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>More</Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon={<CircleHelp size={18} color="#1C1C1E" strokeWidth={1.5} />}
                label="How Flip Works"
                onPress={() => { void Haptics.selectionAsync(); }}
              />
              <View style={styles.menuDivider} />
              <MenuItem
                icon={<Headphones size={18} color="#1C1C1E" strokeWidth={1.5} />}
                label="Support"
                onPress={() => { void Haptics.selectionAsync(); }}
              />
              <View style={styles.menuDivider} />
              <MenuItem
                icon={<Share2 size={18} color="#1C1C1E" strokeWidth={1.5} />}
                label="Share Flip App"
                onPress={() => { void Haptics.selectionAsync(); }}
              />
            </View>
          </View>

          {isAuthenticated && (
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.7 }]}
            >
              <LogOut size={16} color="#EF4444" strokeWidth={1.8} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          )}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  heroBackground: {
    backgroundColor: '#16A34A',
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroProfile: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroMember: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 3,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  graphCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  graphHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  graphHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  graphIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  graphTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  graphSubtitle: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 1,
  },
  graphAmount: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    paddingHorizontal: 2,
  },
  chartBar: {
    flex: 1,
    borderRadius: 4,
    minHeight: 2,
  },
  chartLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 6,
  },
  chartDayLabel: {
    flex: 1,
    textAlign: 'center' as const,
    fontSize: 10,
    fontWeight: '500' as const,
    color: '#AEAEB2',
  },
  menuSection: {
    marginBottom: 20,
  },
  menuSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8E8E93',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemPressed: {
    backgroundColor: '#F8F8FA',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: '#1C1C1E',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginLeft: 48,
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
    fontWeight: '500' as const,
    color: '#EF4444',
  },
});
