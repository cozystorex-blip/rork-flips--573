import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Search,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  X,
  Users,
  Trash2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useConnections, ConnectionWithProfile } from '@/contexts/ConnectionsContext';
import { SearchedUser } from '@/services/connectionsService';

export default function ConnectionsScreen() {
  const insets = useSafeAreaInsets();
  const {
    friends,
    incomingRequests,
    sendRequest,
    isSendingRequest,
    respondToRequest,
    isResponding,
    removeConnection,
    isRemoving,
    searchUsers,
    searchResults,
    isSearching,
    getConnectionStatus,
  } = useConnections();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (text.trim().length < 2) return;

    searchTimeoutRef.current = setTimeout(() => {
      console.log('[Connections] Searching for:', text);
      void searchUsers(text);
    }, 400);
  }, [searchUsers]);

  const handleSendRequest = useCallback(async (receiverId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await sendRequest(receiverId);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Request Sent', 'Connection request sent successfully.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send request';
      Alert.alert('Error', msg);
    }
  }, [sendRequest]);

  const handleRespond = useCallback(async (connectionId: string, accept: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await respondToRequest({ connectionId, accept });
      void Haptics.notificationAsync(
        accept ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to respond';
      Alert.alert('Error', msg);
    }
  }, [respondToRequest]);

  const handleRemove = useCallback((connectionId: string, name: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Remove Connection',
      `Remove ${name} from your connections?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeConnection(connectionId);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              Alert.alert('Error', 'Failed to remove connection.');
            }
          },
        },
      ]
    );
  }, [removeConnection]);

  const renderSearchResult = useCallback(({ item }: { item: SearchedUser }) => {
    const status = getConnectionStatus(item.id);
    return (
      <View style={styles.userCard}>
        <View style={styles.userCardLeft}>
          <View style={styles.userAvatar}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.userAvatarImg} contentFit="cover" />
            ) : (
              <Text style={styles.userAvatarInitial}>{(item.display_name || 'U').charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{item.display_name || 'User'}</Text>
            {item.city ? <Text style={styles.userCity} numberOfLines={1}>{item.city}</Text> : null}
          </View>
        </View>
        {status === 'accepted' ? (
          <View style={styles.connectedBadge}>
            <UserCheck size={14} color="#16A34A" strokeWidth={2.5} />
            <Text style={styles.connectedText}>Connected</Text>
          </View>
        ) : status === 'pending_sent' ? (
          <View style={styles.pendingBadge}>
            <Clock size={14} color="#F59E0B" strokeWidth={2} />
            <Text style={styles.pendingText}>Pending</Text>
          </View>
        ) : (
          <Pressable
            onPress={() => handleSendRequest(item.id)}
            disabled={isSendingRequest}
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }]}
            testID={`add-user-${item.id}`}
          >
            {isSendingRequest ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <UserPlus size={14} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.addBtnText}>Add</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    );
  }, [getConnectionStatus, handleSendRequest, isSendingRequest]);

  const renderRequest = useCallback((item: ConnectionWithProfile) => {
    return (
      <View style={styles.requestCard}>
        <View style={styles.userCardLeft}>
          <View style={styles.userAvatar}>
            {item.profile.avatar_url ? (
              <Image source={{ uri: item.profile.avatar_url }} style={styles.userAvatarImg} contentFit="cover" />
            ) : (
              <Text style={styles.userAvatarInitial}>{(item.profile.display_name || 'U').charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{item.profile.display_name || 'User'}</Text>
            <Text style={styles.userSubtext}>wants to connect</Text>
          </View>
        </View>
        <View style={styles.requestActions}>
          <Pressable
            onPress={() => handleRespond(item.connection.id, true)}
            disabled={isResponding}
            style={({ pressed }) => [styles.acceptBtn, pressed && { opacity: 0.7 }]}
          >
            <UserCheck size={16} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
          <Pressable
            onPress={() => handleRespond(item.connection.id, false)}
            disabled={isResponding}
            style={({ pressed }) => [styles.declineBtn, pressed && { opacity: 0.7 }]}
          >
            <UserX size={16} color="#FF3B30" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
    );
  }, [handleRespond, isResponding]);

  const renderFriend = useCallback((item: ConnectionWithProfile) => {
    return (
      <View style={styles.userCard}>
        <View style={styles.userCardLeft}>
          <View style={styles.userAvatar}>
            {item.profile.avatar_url ? (
              <Image source={{ uri: item.profile.avatar_url }} style={styles.userAvatarImg} contentFit="cover" />
            ) : (
              <Text style={styles.userAvatarInitial}>{(item.profile.display_name || 'U').charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{item.profile.display_name || 'User'}</Text>
            {item.profile.city ? <Text style={styles.userCity} numberOfLines={1}>{item.profile.city}</Text> : null}
          </View>
        </View>
        <Pressable
          onPress={() => handleRemove(item.connection.id, item.profile.display_name || 'User')}
          disabled={isRemoving}
          style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.6 }]}
        >
          <Trash2 size={16} color="#FF3B30" strokeWidth={2} />
        </Pressable>
      </View>
    );
  }, [handleRemove, isRemoving]);

  if (isSearchMode) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              setIsSearchMode(false);
              setSearchQuery('');
            }}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            hitSlop={12}
          >
            <ArrowLeft size={22} color="#1C1C1E" strokeWidth={2} />
          </Pressable>
          <Text style={styles.headerTitle}>Find People</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.searchBar}>
          <Search size={18} color="#8E8E93" strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="search"
            testID="search-users-input"
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => { setSearchQuery(''); }} hitSlop={8}>
              <X size={16} color="#8E8E93" strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>

        {isSearching ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color="#16A34A" />
            <Text style={styles.stateText}>Searching...</Text>
          </View>
        ) : searchQuery.trim().length < 2 ? (
          <View style={styles.centerState}>
            <Search size={48} color="#D1D1D6" strokeWidth={1.5} />
            <Text style={styles.stateTitle}>Find People</Text>
            <Text style={styles.stateText}>Search by name to find and connect</Text>
          </View>
        ) : searchResults.length === 0 ? (
          <View style={styles.centerState}>
            <Users size={48} color="#D1D1D6" strokeWidth={1.5} />
            <Text style={styles.stateTitle}>No Results</Text>
            <Text style={styles.stateText}>No users found for "{searchQuery}"</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={renderSearchResult}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={{ height: insets.bottom + 16 }} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          hitSlop={12}
        >
          <ArrowLeft size={22} color="#1C1C1E" strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>My Connections</Text>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsSearchMode(true);
          }}
          style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <UserPlus size={20} color="#16A34A" strokeWidth={2.2} />
        </Pressable>
      </View>

      <FlatList
        data={[...incomingRequests, ...friends]}
        keyExtractor={(item) => item.connection.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          (incomingRequests.length === 0 && friends.length === 0) && styles.emptyListContent,
        ]}
        ListEmptyComponent={
          <View style={styles.centerState}>
            <Users size={48} color="#D1D1D6" strokeWidth={1.5} />
            <Text style={styles.stateTitle}>No Connections Yet</Text>
            <Text style={styles.stateText}>Tap the + button to search and connect with people</Text>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsSearchMode(true);
              }}
              style={({ pressed }) => [styles.findPeopleBtn, pressed && { opacity: 0.8 }]}
            >
              <Search size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.findPeopleBtnText}>Find People</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item, index }) => {
          const isRequest = index < incomingRequests.length;
          if (isRequest) {
            return (
              <View>
                {index === 0 ? (
                  <Text style={styles.sectionLabel}>Pending Requests</Text>
                ) : null}
                {renderRequest(item)}
              </View>
            );
          }
          return (
            <View>
              {index === incomingRequests.length ? (
                <Text style={[styles.sectionLabel, incomingRequests.length > 0 && { marginTop: 16 }]}>
                  Friends · {friends.length}
                </Text>
              ) : null}
              {renderFriend(item)}
            </View>
          );
        }}
        ListFooterComponent={<View style={{ height: insets.bottom + 16 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#1C1C1E',
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 8,
  },
  emptyListContent: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#8E8E93',
    letterSpacing: -0.1,
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase' as const,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1C1C1E',
    marginTop: 16,
    letterSpacing: -0.3,
  },
  stateText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  userCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  userAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  userAvatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  userAvatarInitial: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#16A34A',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  userCity: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#8E8E93',
    marginTop: 2,
  },
  userSubtext: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#F59E0B',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#16A34A',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  connectedText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#16A34A',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#F59E0B',
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  acceptBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  findPeopleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 20,
  },
  findPeopleBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
