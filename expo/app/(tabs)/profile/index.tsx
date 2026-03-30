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
import { Image } from 'expo-image';
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
  Camera,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useScanHistory } from '@/contexts/ScanHistoryContext';
import { useSavedItems } from '@/contexts/SavedItemsContext';

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

  const memberSince = useMemo(() => {
    if (profile?.created_at) {
      return new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return 'March 2024';
  }, [profile]);

  const displayName = profile?.display_name && profile.display_name !== 'User'
    ? profile.display_name
    : user?.email?.split('@')[0] || 'Flip User';

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
      <View style={styles.greenFull}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.topBarTitle}>Profile</Text>
          <Pressable
            style={styles.settingsBtn}
            hitSlop={8}
            onPress={() => { void Haptics.selectionAsync(); }}
          >
            <Settings size={20} color="#FFFFFF" strokeWidth={1.5} />
          </Pressable>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarOuter}>
            <View style={styles.avatar}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <Text style={styles.avatarInitial}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <Pressable
              style={styles.cameraBtn}
              hitSlop={6}
              onPress={() => { void Haptics.selectionAsync(); }}
            >
              <Camera size={14} color="#16A34A" strokeWidth={2} />
            </Pressable>
          </View>

          <Text style={styles.nameText}>{displayName}</Text>
          <Text style={styles.memberText}>Member since {memberSince}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statPillValue}>
                ${totalSavings > 0 ? totalSavings.toLocaleString() : '0'}
              </Text>
              <Text style={styles.statPillLabel}>Saved</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillValue}>{scanEntries.length}</Text>
              <Text style={styles.statPillLabel}>Scanned</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillValue}>{savedDeals.length}</Text>
              <Text style={styles.statPillLabel}>Deals</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
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
  greenFull: {
    backgroundColor: '#16A34A',
    paddingBottom: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarOuter: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3.5,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  nameText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  memberText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 3,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statPillValue: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  statPillLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
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
