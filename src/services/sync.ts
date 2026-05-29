import { offlineQueue } from './offlineQueue';

export const syncService = {
  async startBackgroundSync(): Promise<void> {
    try {
      const n = await offlineQueue.count();
      if (n > 0) await offlineQueue.sync();
    } catch { /* silent */ }
  },

  async sync(): Promise<number> {
    return await offlineQueue.sync();
  },

  getPendingCount(): Promise<number> {
    return offlineQueue.count();
  },
};
