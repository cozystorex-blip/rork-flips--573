import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfileBlock, BlockTagLeft } from '@/types';

interface SupabaseBlock {
  id: string;
  user_id: string;
  block_type: string;
  style_badge: string | null;
  show_new_badge: boolean;
  title: string;
  description: string;
  header_image_url: string;
  action_type: string;
  action_label: string;
  place_id: string | null;
  url: string | null;
  created_at: string;
}

function mapSupabaseToBlock(sb: SupabaseBlock): UserProfileBlock {
  const typeToTag: Record<string, BlockTagLeft> = {
    deal: 'DEAL', tip: 'TIP', store: 'STORE', list: 'LIST', recipe: 'RECIPE', bulk_purchase: 'BULK',
  };
  const badgeToTag: Record<string, BlockTagLeft> = {
    hot: 'HOT', new: 'NEW', trending: 'TRENDING', update: 'UPDATE',
  };
  const actionMap: Record<string, string> = {
    none: 'none', view_on_map: 'openMap', open_place_profile: 'openPlaceProfile', open_url: 'openUrl',
  };

  const tagLeft: BlockTagLeft = sb.style_badge
    ? (badgeToTag[sb.style_badge] ?? typeToTag[sb.block_type] ?? 'TIP')
    : (typeToTag[sb.block_type] ?? 'TIP');

  return {
    id: sb.id,
    userId: sb.user_id,
    title: sb.title,
    description: sb.description,
    headerImageUrl: sb.header_image_url,
    tagLeft,
    badgeRight: sb.show_new_badge ? 'NEW' : null,
    actionLabel: sb.action_label ?? 'Learn More',
    actionType: (actionMap[sb.action_type] ?? 'none') as UserProfileBlock['actionType'],
    placeId: sb.place_id ?? undefined,
    url: sb.url ?? undefined,
    createdAt: sb.created_at,
  };
}

export const [BlocksProvider, useBlocks] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const [blocks, setBlocks] = useState<UserProfileBlock[]>([]);
  const [localBlocks, setLocalBlocks] = useState<UserProfileBlock[]>([]);
  const localLoaded = useRef(false);

  useEffect(() => {
    if (!userId || localLoaded.current) return;
    localLoaded.current = true;
    void AsyncStorage.getItem(`blocks_local_${userId}`).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as UserProfileBlock[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log('[BlocksContext] Loaded local blocks:', parsed.length);
            setLocalBlocks(parsed);
          }
        } catch {
          console.log('[BlocksContext] Failed to parse local blocks');
        }
      }
    });
  }, [userId]);

  const blocksQuery = useQuery({
    queryKey: ['profile_blocks', userId],
    queryFn: async () => {
      if (!userId) return [];
      if (!isSupabaseConfigured) {
        console.log('[BlocksContext] Supabase not configured, using local blocks only');
        return [];
      }
      console.log('[BlocksContext] Fetching blocks from Supabase for:', userId);
      try {
        const { data, error } = await supabase
          .from('blocks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.log('[BlocksContext] Fetch error:', error.message);
          return [];
        }
        console.log('[BlocksContext] Blocks loaded:', data?.length ?? 0);
        return (data as SupabaseBlock[]).map(mapSupabaseToBlock);
      } catch (e) {
        console.log('[BlocksContext] Fetch threw:', e);
        return [];
      }
    },
    enabled: !!userId,
    retry: 1,
  });

  useEffect(() => {
    const supabaseBlocks = blocksQuery.data ?? [];
    const supabaseIds = new Set(supabaseBlocks.map((b) => b.id));
    const uniqueLocal = localBlocks.filter((b) => !supabaseIds.has(b.id));
    const merged = [...supabaseBlocks, ...uniqueLocal].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setBlocks(merged);
  }, [blocksQuery.data, localBlocks]);

  const addBlockMutation = useMutation({
    mutationFn: async (block: {
      title: string;
      description: string;
      headerImageUrl: string;
      blockType: string;
      styleBadge: string | null;
      showNewBadge: boolean;
      actionType: string;
      actionLabel: string;
      placeId?: string;
      url?: string;
    }) => {
      if (!userId) throw new Error('Not authenticated');
      const actionMap: Record<string, string> = {
        none: 'none', openMap: 'view_on_map', openPlaceProfile: 'open_place_profile', openUrl: 'open_url',
      };
      console.log('[BlocksContext] Adding block:', block.title);

      try {
        const { data, error } = await supabase
          .from('blocks')
          .insert({
            user_id: userId,
            title: block.title,
            description: block.description,
            header_image_url: block.headerImageUrl,
            block_type: block.blockType,
            style_badge: block.styleBadge,
            show_new_badge: block.showNewBadge,
            action_type: actionMap[block.actionType] ?? 'none',
            action_label: block.actionLabel,
            place_id: block.placeId ?? null,
            url: block.url ?? null,
          })
          .select()
          .single();

        if (error) {
          console.log('[BlocksContext] Supabase add error:', error.message);
          throw error;
        }
        console.log('[BlocksContext] Block added to Supabase:', data.id);
        return mapSupabaseToBlock(data as SupabaseBlock);
      } catch (supaErr) {
        console.log('[BlocksContext] Supabase insert failed, saving locally:', supaErr);
        const localBlock: UserProfileBlock = {
          id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId,
          title: block.title,
          description: block.description,
          headerImageUrl: block.headerImageUrl,
          tagLeft: 'TIP',
          badgeRight: null,
          actionLabel: '',
          actionType: 'none',
          placeId: block.placeId,
          url: block.url,
          createdAt: new Date().toISOString(),
        };
        const updatedLocal = [localBlock, ...localBlocks];
        setLocalBlocks(updatedLocal);
        try {
          await AsyncStorage.setItem(`blocks_local_${userId}`, JSON.stringify(updatedLocal));
          console.log('[BlocksContext] Block saved locally');
        } catch (storageErr) {
          console.log('[BlocksContext] Local storage save failed:', storageErr);
        }
        return localBlock;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile_blocks', userId] });
    },
  });

  const updateBlockMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      if (!userId) throw new Error('Not authenticated');
      const actionMap: Record<string, string> = {
        none: 'none', openMap: 'view_on_map', openPlaceProfile: 'open_place_profile', openUrl: 'open_url',
      };
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.headerImageUrl !== undefined) dbUpdates.header_image_url = updates.headerImageUrl;
      if (updates.blockType !== undefined) dbUpdates.block_type = updates.blockType;
      if (updates.styleBadge !== undefined) dbUpdates.style_badge = updates.styleBadge;
      if (updates.showNewBadge !== undefined) dbUpdates.show_new_badge = updates.showNewBadge;
      if (updates.actionType !== undefined) dbUpdates.action_type = actionMap[updates.actionType as string] ?? 'none';
      if (updates.actionLabel !== undefined) dbUpdates.action_label = updates.actionLabel;
      if (updates.placeId !== undefined) dbUpdates.place_id = updates.placeId;
      if (updates.url !== undefined) dbUpdates.url = updates.url;

      console.log('[BlocksContext] Updating block:', id);
      const { error } = await supabase
        .from('blocks')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.log('[BlocksContext] Update error:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile_blocks', userId] });
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('Not authenticated');
      console.log('[BlocksContext] Deleting block:', id);
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.log('[BlocksContext] Delete error:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile_blocks', userId] });
    },
  });

  const { mutateAsync: addBlockAsync } = addBlockMutation;
  const { mutateAsync: updateBlockAsync } = updateBlockMutation;
  const { mutateAsync: deleteBlockAsync } = deleteBlockMutation;

  const addBlock = useCallback(
    async (block: Parameters<typeof addBlockAsync>[0]) => {
      const newBlock = await addBlockAsync(block);
      return newBlock;
    },
    [addBlockAsync]
  );

  const updateBlock = useCallback(
    async (id: string, updates: Record<string, unknown>) => {
      await updateBlockAsync({ id, updates });
    },
    [updateBlockAsync]
  );

  const deleteBlock = useCallback(
    async (id: string) => {
      setBlocks((prev) => prev.filter((b) => b.id !== id));
      if (id.startsWith('local_')) {
        const updatedLocal = localBlocks.filter((b) => b.id !== id);
        setLocalBlocks(updatedLocal);
        if (userId) {
          await AsyncStorage.setItem(`blocks_local_${userId}`, JSON.stringify(updatedLocal));
        }
      } else {
        await deleteBlockAsync(id);
      }
    },
    [deleteBlockAsync, localBlocks, userId]
  );

  return useMemo(() => ({
    blocks,
    addBlock,
    updateBlock,
    deleteBlock,
    isLoading: blocksQuery.isLoading,
  }), [blocks, addBlock, updateBlock, deleteBlock, blocksQuery.isLoading]);
});

export function useUserBlocks(userId: string) {
  const { blocks } = useBlocks();
  return useMemo(
    () =>
      blocks
        .filter((b) => b.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [blocks, userId]
  );
}

export function useLatestBlock(userId: string) {
  const userBlocks = useUserBlocks(userId);
  return userBlocks.length > 0 ? userBlocks[0] : null;
}
