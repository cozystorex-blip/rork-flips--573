import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, isAuthenticated } = useAuth();
  const { profile } = useProfile();
  const { entries: scanEntries } = useScanHistory();
  const { savedDeals } = useSavedItems();
  const { expenses } = useExpenses();

  const totalSavings = useMemo(() => {
    let total = 0;
    savedDeals.forEach(d => {
      if (d.savingsAmount) total += d.savingsAmount;
    });
    return total;
  }, [savedDeals]);

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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profile?.avatar_url ? (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            ) : (
              <View style={styles.avatar}>
                <User size={32} color="#FFFFFF" strokeWidth={1.5} />
              </View>
            )}
            <Pressable
              style={styles.settingsBtn}
              hitSlop={8}
              onPress={() => { void Haptics.selectionAsync(); }}
            >
              <Settings size={18} color="#8E8E93" strokeWidth={1.5} />
            </Pressable>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.memberSince}>Member since {memberSince}</Text>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>${totalSavings > 0 ? totalSavings.toLocaleString() : '0'}</Text>
            <Text style={styles.statLabel}>Total Saved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{scanEntries.length}</Text>
            <Text style={styles.statLabel}>Items Scanned</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{receiptCount}</Text>
            <Text style={styles.statLabel}>Receipts</Text>
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
    paddingHorizontal: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: '100%',
    alignItems: 'center',
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  settingsBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
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
    elevation: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1C1C1E',
  },
  memberSince: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 4,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: 4,
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
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
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
