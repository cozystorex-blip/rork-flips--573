import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Animated,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Settings,
  LogOut,
  Camera,
  Heart,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useScanHistory } from '@/contexts/ScanHistoryContext';
import { useSavedItems } from '@/contexts/SavedItemsContext';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
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

  const memberSince = useMemo(() => {
    if (profile?.created_at) {
      return new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return 'March 2024';
  }, [profile]);

  const displayName = profile?.display_name && profile.display_name !== 'User'
    ? profile.display_name
    : user?.email?.split('@')[0] || 'Flip User';

  const totalSaved = scanEntries.length + savedDeals.length;

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

  const menuItems = useMemo(() => [
    {
      id: 'saved',
      label: 'Saved Items',
      icon: Heart,
      detail: `${totalSaved}`,
      onPress: () => {
        void Haptics.selectionAsync();
        router.push('/(tabs)/saved');
      },
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      detail: null,
      onPress: () => {
        void Haptics.selectionAsync();
      },
    },
  ], [totalSaved, router]);

  return (
    <View style={styles.root}>
      <View style={[styles.greenHeader, { paddingTop: insets.top + 12 }]}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Profile</Text>
          <Pressable
            style={styles.settingsBtn}
            hitSlop={8}
            onPress={() => { void Haptics.selectionAsync(); }}
          >
            <Settings size={20} color="#FFFFFF" strokeWidth={1.5} />
          </Pressable>
        </View>

        <View style={styles.profileIdentity}>
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
              <Camera size={13} color="#16A34A" strokeWidth={2} />
            </Pressable>
          </View>

          <Text style={styles.nameText}>{displayName}</Text>
          <Text style={styles.memberText}>Member since {memberSince}</Text>
          {user?.email && (
            <Text style={styles.emailText}>{user.email}</Text>
          )}
        </View>
      </View>

      <Animated.View style={[styles.contentSheet, { opacity: fadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetContent}
        >
          <View style={styles.menuGroup}>
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Pressable
                  key={item.id}
                  onPress={item.onPress}
                  style={({ pressed }) => [
                    styles.menuRow,
                    index < menuItems.length - 1 && styles.menuRowBorder,
                    pressed && { backgroundColor: '#F8F8FA' },
                  ]}
                >
                  <View style={styles.menuIconWrap}>
                    <Icon size={18} color="#16A34A" strokeWidth={1.6} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <View style={styles.menuRight}>
                    {item.detail && (
                      <Text style={styles.menuDetail}>{item.detail}</Text>
                    )}
                    <ChevronRight size={16} color="#C7C7CC" strokeWidth={1.5} />
                  </View>
                </Pressable>
              );
            })}
          </View>

          {isAuthenticated && (
            <View style={styles.menuGroup}>
              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [
                  styles.menuRow,
                  pressed && { backgroundColor: '#FEF2F2' },
                ]}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: '#FEF2F2' }]}>
                  <LogOut size={18} color="#EF4444" strokeWidth={1.6} />
                </View>
                <Text style={[styles.menuLabel, { color: '#EF4444' }]}>Sign Out</Text>
                <View style={styles.menuRight}>
                  <ChevronRight size={16} color="#C7C7CC" strokeWidth={1.5} />
                </View>
              </Pressable>
            </View>
          )}

          <Text style={styles.versionText}>Flip v1.10.13.2</Text>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  greenHeader: {
    backgroundColor: '#16A34A',
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIdentity: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarOuter: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.45)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  nameText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  memberText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 3,
  },
  emailText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 4,
  },
  contentSheet: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    marginTop: -16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sheetContent: {
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
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
  menuRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#1C1C1E',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuDetail: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#8E8E93',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#AEAEB2',
    marginTop: 8,
  },
});
