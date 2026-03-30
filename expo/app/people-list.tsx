import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { UserMinus, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useConnections, type ConnectionUser } from '@/contexts/ConnectionsContext';

type ListType = 'followers' | 'following' | 'connections';

const TITLES: Record<ListType, string> = {
  followers: 'Followers',
  following: 'Following',
  connections: 'Connections',
};

export default function PeopleListScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const { followers, following, connections, unfollowUser } = useConnections();

  const listType = (type as ListType) || 'followers';
  const title = TITLES[listType] ?? 'People';

  const data = useMemo((): ConnectionUser[] => {
    switch (listType) {
      case 'followers': return followers;
      case 'following': return following;
      case 'connections': return connections;
      default: return [];
    }
  }, [listType, followers, following, connections]);

  const handleUnfollow = useCallback((userId: string, name: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    unfollowUser(userId);
    console.log('[PeopleList] Unfollowed:', name);
  }, [unfollowUser]);

  const handleTapUser = useCallback((userId: string) => {
    void Haptics.selectionAsync();
    router.push({ pathname: '/profile/[id]', params: { id: userId } });
  }, [router]);

  const renderItem = useCallback(({ item }: { item: ConnectionUser }) => (
    <Pressable
      onPress={() => handleTapUser(item.user_id)}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: '#F8F8FA' }]}
    >
      <View style={styles.rowLeft}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.rowAvatar} contentFit="cover" />
        ) : (
          <View style={styles.rowAvatarFallback}>
            <Text style={styles.rowInitial}>{(item.display_name || 'U').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.rowInfo}>
          <Text style={styles.rowName} numberOfLines={1}>{item.display_name || 'User'}</Text>
          {item.username ? (
            <Text style={styles.rowUsername} numberOfLines={1}>@{item.username}</Text>
          ) : null}
          {item.bio ? (
            <Text style={styles.rowBio} numberOfLines={1}>{item.bio}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.rowRight}>
        {listType === 'following' && (
          <Pressable
            onPress={() => handleUnfollow(item.user_id, item.display_name)}
            hitSlop={8}
            style={({ pressed }) => [styles.unfollowBtn, pressed && { opacity: 0.6 }]}
          >
            <UserMinus size={14} color="#8E8E93" />
          </Pressable>
        )}
        <ChevronRight size={16} color="#C7C7CC" />
      </View>
    </Pressable>
  ), [listType, handleTapUser, handleUnfollow]);

  const keyExtractor = useCallback((item: ConnectionUser) => item.user_id, []);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title,
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#1C1C1E',
          headerShadowVisible: false,
        }}
      />
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <Text style={styles.emptyTitle}>No {title.toLowerCase()} yet</Text>
            <Text style={styles.emptySub}>
              {listType === 'followers'
                ? 'When people follow you, they\u2019ll appear here.'
                : listType === 'following'
                  ? 'People you follow will appear here.'
                  : 'Mutual follows will appear here.'}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  rowAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F0F2',
  },
  rowAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F0F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowInitial: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#8E8E93',
  },
  rowInfo: {
    flex: 1,
    gap: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  rowUsername: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400' as const,
  },
  rowBio: {
    fontSize: 13,
    color: '#AEAEB2',
    fontWeight: '400' as const,
    marginTop: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unfollowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E8E8ED',
    marginLeft: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyInner: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1C1C1E',
  },
  emptySub: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
});
