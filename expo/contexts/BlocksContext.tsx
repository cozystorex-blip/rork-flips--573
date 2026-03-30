import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfileBlock, BlockTagLeft } from '@/types';

export const [BlocksProvider, useBlocks] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const [blocks, setBlocks] = useState<UserProfileBlock[]>([]);

  const blocksQuery = useQuery({
    queryKey: ['profile_blocks', userId],
    queryFn: async (): Promise<UserProfileBlock[]> => {
      if (!userId) return [];
      console.log('[BlocksContext] Loading local blocks for:', userId);
      try {
        const raw = await AsyncStorage.getItem(`blocks_local_${userId}`);
        if (raw) {
          const parsed = JSON.parse(raw) as UserProfileBlock[];
          if (Array.isArray(parsed)) {
            console.log('[BlocksContext] Loaded local blocks:', parsed.length);
            return parsed.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          }
        }
      } catch (e) {
        console.log('[BlocksContext] Failed to load local blocks:', e);
      }
      return [];
    },
    enabled: !!userId,
    retry: 1,
  });

  useEffect(() => {
    if (blocksQuery.data) {
      setBlocks(blocksQuery.data);
    }
  }, [blocksQuery.data]);

  const saveBlocksLocally = useCallback(async (updatedBlocks: UserProfileBlock[]) => {
    if (!userId) return;
    try {
      await AsyncStorage.setItem(`blocks_local_${userId}`, JSON.stringify(updatedBlocks));
      console.log('[BlocksContext] Blocks saved locally:', updatedBlocks.length);
    } catch (e) {
      console.log('[BlocksContext] Local storage save failed:', e);
    }
  }, [userId]);

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

      const typeToTag: Record<string, BlockTagLeft> = {
        deal: 'DEAL', tip: 'TIP', store: 'STORE', list: 'LIST', recipe: 'RECIPE', bulk_purchase: 'BULK',
      };
      const badgeToTag: Record<string, BlockTagLeft> = {
        hot: 'HOT', new: 'NEW', trending: 'TRENDING', update: 'UPDATE',
      };

      const tagLeft: BlockTagLeft = block.styleBadge
        ? (badgeToTag[block.styleBadge] ?? typeToTag[block.blockType] ?? 'TIP')
        : (typeToTag[block.blockType] ?? 'TIP');

      const localBlock: UserProfileBlock = {
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId,
        title: block.title,
        description: block.description,
        headerImageUrl: block.headerImageUrl,
        tagLeft,
        badgeRight: block.showNewBadge ? 'NEW' : null,
        actionLabel: block.actionLabel || 'Learn More',
        actionType: (block.actionType ?? 'none') as UserProfileBlock['actionType'],
        placeId: block.placeId,
        url: block.url,
        createdAt: new Date().toISOString(),
      };

      console.log('[BlocksContext] Adding block locally:', localBlock.title);
      const updatedBlocks = [localBlock, ...blocks];
      setBlocks(updatedBlocks);
      await saveBlocksLocally(updatedBlocks);
      return localBlock;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile_blocks', userId] });
    },
  });

  const updateBlockMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      if (!userId) throw new Error('Not authenticated');
      console.log('[BlocksContext] Updating block locally:', id);
      const updatedBlocks = blocks.map((b) => {
        if (b.id !== id) return b;
        return {
          ...b,
          ...(updates.title !== undefined && { title: updates.title as string }),
          ...(updates.description !== undefined && { description: updates.description as string }),
          ...(updates.headerImageUrl !== undefined && { headerImageUrl: updates.headerImageUrl as string }),
          ...(updates.actionLabel !== undefined && { actionLabel: updates.actionLabel as string }),
          ...(updates.placeId !== undefined && { placeId: updates.placeId as string }),
          ...(updates.url !== undefined && { url: updates.url as string }),
        };
      });
      setBlocks(updatedBlocks);
      await saveBlocksLocally(updatedBlocks);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile_blocks', userId] });
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('Not authenticated');
      console.log('[BlocksContext] Deleting block locally:', id);
      const updatedBlocks = blocks.filter((b) => b.id !== id);
      setBlocks(updatedBlocks);
      await saveBlocksLocally(updatedBlocks);
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
      await deleteBlockAsync(id);
    },
    [deleteBlockAsync]
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
