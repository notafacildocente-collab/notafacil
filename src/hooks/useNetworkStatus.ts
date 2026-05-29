import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { offlineQueue } from '../services/offlineQueue';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedCount, setLastSyncedCount] = useState(0);

  const refreshPending = useCallback(async () => {
    const n = await offlineQueue.count();
    setPendingCount(n);
  }, []);

  const syncNow = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const synced = await offlineQueue.sync();
      setLastSyncedCount(synced);
      await refreshPending();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPending]);

  useEffect(() => {
    refreshPending();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      if (online) {
        // Reconectó — sincronizar automáticamente
        offlineQueue.count().then(n => {
          if (n > 0) syncNow();
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return { isOnline, pendingCount, isSyncing, lastSyncedCount, syncNow, refreshPending };
}
