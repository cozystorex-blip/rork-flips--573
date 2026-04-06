import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchMyConnections,
  fetchUserProfiles,
  sendConnectionRequest,
  respondToRequest,
  removeConnection,
  searchUsers,
  ConnectionRecord,
  SearchedUser,
} from '@/services/connectionsService';

export interface ConnectionWithProfile {
  connection: ConnectionRecord;
  profile: SearchedUser;
}

export const [ConnectionsProvider, useConnections] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const [connectedUserIds, setConnectedUserIds] = useState<Set<string>>(new Set());

  const connectionsQuery = useQuery({
    queryKey: ['connections', userId],
    queryFn: async () => {
      if (!userId) return [] as ConnectionRecord[];
      console.log('[ConnectionsContext] Fetching connections for:', userId);
      return fetchMyConnections(userId);
    },
    enabled: !!userId,
    staleTime: 10000,
    refetchInterval: 15000,
  });

  const accepted = useMemo(() => {
    if (!connectionsQuery.data || !userId) return [] as ConnectionRecord[];
    return connectionsQuery.data.filter(c => c.status === 'accepted');
  }, [connectionsQuery.data, userId]);

  const pendingReceived = useMemo(() => {
    if (!connectionsQuery.data || !userId) return [] as ConnectionRecord[];
    return connectionsQuery.data.filter(c => c.status === 'pending' && c.receiver_id === userId);
  }, [connectionsQuery.data, userId]);

  const pendingSent = useMemo(() => {
    if (!connectionsQuery.data || !userId) return [] as ConnectionRecord[];
    return connectionsQuery.data.filter(c => c.status === 'pending' && c.requester_id === userId);
  }, [connectionsQuery.data, userId]);

  const friendIds = useMemo(() => {
    if (!userId) return [] as string[];
    return accepted.map(c => c.requester_id === userId ? c.receiver_id : c.requester_id);
  }, [accepted, userId]);

  useEffect(() => {
    setConnectedUserIds(new Set(friendIds));
  }, [friendIds]);

  const friendProfilesQuery = useQuery({
    queryKey: ['connection_profiles', friendIds],
    queryFn: async () => {
      if (friendIds.length === 0) return [] as SearchedUser[];
      console.log('[ConnectionsContext] Fetching friend profiles:', friendIds.length);
      return fetchUserProfiles(friendIds);
    },
    enabled: friendIds.length > 0,
    staleTime: 30000,
  });

  const pendingReceivedIds = useMemo(() => {
    if (!userId) return [] as string[];
    return pendingReceived.map(c => c.requester_id);
  }, [pendingReceived, userId]);

  const pendingProfilesQuery = useQuery({
    queryKey: ['pending_profiles', pendingReceivedIds],
    queryFn: async () => {
      if (pendingReceivedIds.length === 0) return [] as SearchedUser[];
      return fetchUserProfiles(pendingReceivedIds);
    },
    enabled: pendingReceivedIds.length > 0,
    staleTime: 30000,
  });

  const friends = useMemo((): ConnectionWithProfile[] => {
    const profiles = friendProfilesQuery.data ?? [];
    const profileMap = new Map(profiles.map(p => [p.id, p]));
    return accepted.map(c => {
      const otherId = c.requester_id === userId ? c.receiver_id : c.requester_id;
      const profile = profileMap.get(otherId) ?? {
        id: otherId,
        display_name: 'User',
        avatar_url: '',
        city: '',
      };
      return { connection: c, profile };
    });
  }, [accepted, friendProfilesQuery.data, userId]);

  const incomingRequests = useMemo((): ConnectionWithProfile[] => {
    const profiles = pendingProfilesQuery.data ?? [];
    const profileMap = new Map(profiles.map(p => [p.id, p]));
    return pendingReceived.map(c => {
      const profile = profileMap.get(c.requester_id) ?? {
        id: c.requester_id,
        display_name: 'User',
        avatar_url: '',
        city: '',
      };
      return { connection: c, profile };
    });
  }, [pendingReceived, pendingProfilesQuery.data]);

  const sendRequestMutation = useMutation({
    mutationFn: async (receiverId: string) => {
      if (!userId) throw new Error('Not signed in');
      console.log('[ConnectionsContext] Sending request to:', receiverId);
      return sendConnectionRequest(userId, receiverId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connections', userId] });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ connectionId, accept }: { connectionId: string; accept: boolean }) => {
      console.log('[ConnectionsContext] Responding to:', connectionId, accept ? 'ACCEPT' : 'DECLINE');
      return respondToRequest(connectionId, accept);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connections', userId] });
      void queryClient.invalidateQueries({ queryKey: ['connection_profiles'] });
      void queryClient.invalidateQueries({ queryKey: ['pending_profiles'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      console.log('[ConnectionsContext] Removing connection:', connectionId);
      return removeConnection(connectionId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connections', userId] });
      void queryClient.invalidateQueries({ queryKey: ['connection_profiles'] });
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      if (!userId) return [] as SearchedUser[];
      return searchUsers(query, userId);
    },
  });

  const isConnectedTo = useCallback((otherId: string): boolean => {
    return connectedUserIds.has(otherId);
  }, [connectedUserIds]);

  const getConnectionStatus = useCallback((otherId: string): 'none' | 'pending_sent' | 'pending_received' | 'accepted' => {
    if (!connectionsQuery.data || !userId) return 'none';
    for (const c of connectionsQuery.data) {
      const isMatch =
        (c.requester_id === userId && c.receiver_id === otherId) ||
        (c.requester_id === otherId && c.receiver_id === userId);
      if (!isMatch) continue;
      if (c.status === 'accepted') return 'accepted';
      if (c.status === 'pending' && c.requester_id === userId) return 'pending_sent';
      if (c.status === 'pending' && c.receiver_id === userId) return 'pending_received';
    }
    return 'none';
  }, [connectionsQuery.data, userId]);

  return useMemo(() => ({
    friends,
    friendIds,
    incomingRequests,
    pendingSent,
    connectedUserIds,
    isConnectedTo,
    getConnectionStatus,
    sendRequest: sendRequestMutation.mutateAsync,
    isSendingRequest: sendRequestMutation.isPending,
    respondToRequest: respondMutation.mutateAsync,
    isResponding: respondMutation.isPending,
    removeConnection: removeMutation.mutateAsync,
    isRemoving: removeMutation.isPending,
    searchUsers: searchMutation.mutateAsync,
    searchResults: searchMutation.data ?? [],
    isSearching: searchMutation.isPending,
    isLoading: connectionsQuery.isLoading,
    requestCount: incomingRequests.length,
    refetch: connectionsQuery.refetch,
  }), [
    friends, friendIds, incomingRequests, pendingSent, connectedUserIds,
    isConnectedTo, getConnectionStatus,
    sendRequestMutation.mutateAsync, sendRequestMutation.isPending,
    respondMutation.mutateAsync, respondMutation.isPending,
    removeMutation.mutateAsync, removeMutation.isPending,
    searchMutation.mutateAsync, searchMutation.data, searchMutation.isPending,
    connectionsQuery.isLoading, connectionsQuery.refetch,
  ]);
});
