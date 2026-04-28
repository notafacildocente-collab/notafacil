/**
 * Sync Service
 * Maneja sincronización offline-first
 */

import { store } from '../store/redux';
import { removeFromQueue, setStatus as setStatusAction } from '../store/slices/syncSlice';

type SyncStatusListener = (status: 'synced' | 'pending' | 'error') => void;

const statusListeners: Set<SyncStatusListener> = new Set();

/**
 * Servicio de Sincronización
 */
export const syncService = {
  /**
   * Iniciar sincronización background
   */
  async startBackgroundSync(): Promise<void> {
    try {
      console.log('Starting background sync...');
      // TODO: Implementar lógica de sync
    } catch (error) {
      console.error('Background sync error:', error);
    }
  },

  /**
   * Sincronizar data ahora
   */
  async sync(): Promise<void> {
    try {
      dispatchSetStatus('pending');
      console.log('Syncing data...');

      const state = store.getState();
      const queue = state.sync.queue;

      if (queue.length === 0) {
        dispatchSetStatus('synced');
        return;
      }

      // TODO: Enviar cada item de la cola al servidor
      // Por cada item exitoso: dispatch(removeFromQueue(item.id))

      dispatchSetStatus('synced');
      notifyListeners('synced');
    } catch (error) {
      console.error('Sync error:', error);
      dispatchSetStatus('error');
      notifyListeners('error');
      throw error;
    }
  },

  /**
   * Listener para cambios de status de sync
   */
  onSyncStatusChange(callback: SyncStatusListener): () => void {
    statusListeners.add(callback);

    // Retornar unsubscribe function
    return () => {
      statusListeners.delete(callback);
    };
  },

  /**
   * Obtener status actual de sincronización
   */
  getStatus(): 'synced' | 'pending' | 'error' {
    return store.getState().sync.status;
  },

  /**
   * Obtener items pendientes de sincronizar
   */
  getPendingItems() {
    return store.getState().sync.queue;
  },
};

/**
 * Notificar a todos los listeners del cambio de status
 */
function notifyListeners(status: 'synced' | 'pending' | 'error') {
  statusListeners.forEach((listener) => {
    try {
      listener(status);
    } catch (error) {
      console.error('Error notifying listener:', error);
    }
  });
}

/**
 * Función auxiliar para dispatch desde sync.ts
 */
function dispatchSetStatus(status: 'synced' | 'pending' | 'error') {
  store.dispatch(setStatusAction(status));
}
