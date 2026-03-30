import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { UserPlus, UserCheck, ChevronLeft, Clock } from 'lucide-react-native';
import { useOnlinePeople } from '@/contexts/OnlinePeopleContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

function formatLastSeen(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function OtherProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userId } = useAuth();
  const { people, isConnected, connectToUser, disconnectFromUser } = useOnlinePeople();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const [connecting, setConnecting] = useState(false);

  const person = useMemo(() => people.find(p => p.id === id), [people, id]);
  const connected = isConnected(id ?? '');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 20,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handleConnect = useCallback(async () => {
    if (!id || !userId) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConnecting(true);
    try {
      if (connected) {
        Alert.alert('Disconnect', `Remove connection with ${person?.display_name ?? 'this user'}?`, [
          { text: 'Cancel', style: 'cancel', onPress: () => setConnecting(false) },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: async () => {
              try {
                await disconnectFromUser(id);
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (e) {
                console.log('[OtherProfile] Disconnect error:', e);
              } finally {
                setConnecting(false);
              }
            },
          },
        ]);
      } else {
        await connectToUser(id);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setConnecting(false);
      }
    } catch (e) {
      console.log('[OtherProfile] Connect error:', e);
      setConnecting(false);
    }
  }, [id, userId, connected, connectToUser, disconnectFromUser, person]);

  if (!person) {
    return (
      <View style={styles.emptyContainer}>
        <Stack.Screen
          options={{
            title: 'Profile',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: '#F2F2F7' },
            headerTintColor: '#1C1C1E',
            headerShadowVisible: false,
          }}
        />
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const initial = (person.display_name || '?').charAt(0).toUpperCase();
  const memberDate = person.created_at
    ? new Date(person.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
      >
        <View style={styles.greenHeader}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={12}
          >
            <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>

          <Animated.View
            style={[
              styles.profileCard,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.avatarSection}>
              {person.avatar_url ? (
                <Image
                  source={{ uri: person.avatar_url }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{initial}</Text>
                </View>
              )}
              {person.is_online && (
                <View style={styles.onlineBadge}>
                  <View style={styles.onlineDotInner} />
                  <Text style={styles.onlineText}>Online</Text>
                </View>
              )}
            </View>

            <Text style={styles.name}>{person.display_name}</Text>

            {person.bio ? (
              <Text style={styles.bio}>{person.bio}</Text>
            ) : null}

            {!person.is_online && person.last_seen && (
              <View style={styles.lastSeenRow}>
                <Clock size={12} color="rgba(255,255,255,0.55)" />
                <Text style={styles.lastSeenText}>
                  Last seen {formatLastSeen(person.last_seen)}
                </Text>
              </View>
            )}

            {memberDate ? (
              <Text style={styles.memberSince}>Member since {memberDate}</Text>
            ) : null}
          </Animated.View>
        </View>

        <View style={styles.whiteArea}>
          <Pressable
            onPress={() => { void handleConnect(); }}
            disabled={connecting}
            style={({ pressed }) => [
              styles.connectBtn,
              connected && styles.connectedBtn,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              connecting && { opacity: 0.6 },
            ]}
            testID="connect-btn"
          >
            {connecting ? (
              <ActivityIndicator size="small" color={connected ? '#16A34A' : '#FFFFFF'} />
            ) : connected ? (
              <>
                <UserCheck size={18} color="#16A34A" strokeWidth={2} />
                <Text style={styles.connectedBtnText}>Connected</Text>
              </>
            ) : (
              <>
                <UserPlus size={18} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.connectBtnText}>Connect</Text>
              </>
            )}
          </Pressable>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Style</Text>
              <View style={styles.stylePill}>
                <Text style={styles.styleText}>
                  {person.style_tag ? person.style_tag.charAt(0).toUpperCase() + person.style_tag.slice(1) : 'Budget'}
                </Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <View style={[styles.statusPill, person.is_online ? styles.statusOnline : styles.statusOffline]}>
                <View style={[styles.statusDot, { backgroundColor: person.is_online ? '#34C759' : '#C7C7CC' }]} />
                <Text style={[styles.statusText, { color: person.is_online ? '#16A34A' : '#8E8E93' }]}>
                  {person.is_online ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500' as const,
  },
  scrollContent: {
    flexGrow: 1,
  },
  greenHeader: {
    backgroundColor: '#16A34A',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileCard: {
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3.5,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(52,199,89,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  onlineDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  name: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  bio: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 8,
    paddingHorizontal: 20,
  },
  lastSeenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  lastSeenText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500' as const,
  },
  memberSince: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
    fontWeight: '500' as const,
  },
  whiteArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -14,
    paddingTop: 24,
    paddingHorizontal: 20,
    minHeight: 300,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    paddingVertical: 15,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  connectedBtn: {
    backgroundColor: '#E8F5E9',
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
  },
  connectBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  connectedBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#16A34A',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  stylePill: {
    backgroundColor: '#F0F0F2',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  styleText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#555558',
  },
  infoDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 18,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusOnline: {
    backgroundColor: '#E8F5E9',
  },
  statusOffline: {
    backgroundColor: '#F0F0F2',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
