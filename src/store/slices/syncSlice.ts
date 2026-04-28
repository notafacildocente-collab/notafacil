/**
 * Redux Slice para cola de sincronización
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SyncQueueItem {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  entidad: string;
  payload: any;
  retries: number;
  createdAt: Date;
  lastError?: string;
}

interface SyncState {
  queue: SyncQueueItem[];
  isSyncing: boolean;
  status: 'synced' | 'pending' | 'error';
}

const initialState: SyncState = {
  queue: [],
  isSyncing: false,
  status: 'synced',
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    addToQueue: (state, action: PayloadAction<Omit<SyncQueueItem, 'id' | 'retries' | 'createdAt'>>) => {
      const item: SyncQueueItem = {
        ...action.payload,
        id: `sync-${Date.now()}`,
        retries: 0,
        createdAt: new Date(),
      };
      state.queue.push(item);
      state.status = 'pending';
    },
    removeFromQueue: (state, action: PayloadAction<string>) => {
      state.queue = state.queue.filter((item) => item.id !== action.payload);
      if (state.queue.length === 0) {
        state.status = 'synced';
      }
    },
    setSyncing: (state, action: PayloadAction<boolean>) => {
      state.isSyncing = action.payload;
    },
    setStatus: (state, action: PayloadAction<'synced' | 'pending' | 'error'>) => {
      state.status = action.payload;
    },
    clearQueue: (state) => {
      state.queue = [];
      state.status = 'synced';
    },
  },
});

export const { addToQueue, removeFromQueue, setSyncing, setStatus, clearQueue } = syncSlice.actions;
export default syncSlice;
