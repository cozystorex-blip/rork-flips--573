import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useState } from 'react';

export const [OnlinePeopleProvider, useOnlinePeople] = createContextHook(() => {
  const [isUserOnline, setIsUserOnline] = useState(false);

  const goOnline = useCallback(async (): Promise<boolean> => {
    if (isUserOnline) {
      console.log('[OnlinePeople] Already online');
      return true;
    }
    console.log('[OnlinePeople] Going online NOW');
    setIsUserOnline(true);
    console.log('[OnlinePeople] Successfully went online');
    return true;
  }, [isUserOnline]);

  const goOffline = useCallback(() => {
    console.log('[OnlinePeople] Going offline');
    setIsUserOnline(false);
  }, []);

  return useMemo(() => ({
    goOnline,
    goOffline,
    isUserOnline,
  }), [goOnline, goOffline, isUserOnline]);
});
