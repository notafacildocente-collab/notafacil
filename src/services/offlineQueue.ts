/**
 * Offline Queue Service
 * Guarda operaciones pendientes en AsyncStorage y las sincroniza al reconectarse
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from './api';

const QUEUE_KEY = 'offline_queue_v1';

export interface PendingOp {
  id: string;
  tipo: 'NOTA' | 'ASISTENCIA';
  method: 'PUT' | 'POST' | 'PATCH';
  url: string;
  body: any;
  timestamp: number;
}

export const offlineQueue = {
  async getAll(): Promise<PendingOp[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async add(op: Omit<PendingOp, 'id' | 'timestamp'>): Promise<void> {
    const queue = await this.getAll();
    // Si ya hay una op pendiente para la misma URL, reemplaza (evita duplicados)
    const idx = queue.findIndex(q => q.url === op.url && q.tipo === op.tipo);
    const newOp: PendingOp = { ...op, id: `${Date.now()}-${Math.random()}`, timestamp: Date.now() };
    if (idx >= 0) queue[idx] = newOp;
    else queue.push(newOp);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  async remove(id: string): Promise<void> {
    const queue = await this.getAll();
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.filter(q => q.id !== id)));
  },

  async count(): Promise<number> {
    return (await this.getAll()).length;
  },

  /** Intenta sincronizar toda la cola. Devuelve cantidad de ops exitosas. */
  async sync(): Promise<number> {
    const queue = await this.getAll();
    if (queue.length === 0) return 0;

    let ok = 0;
    for (const op of queue) {
      try {
        const res = await apiFetch(op.url, {
          method: op.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op.body),
        });
        if (res.ok || res.status === 404) {
          // 404 = el recurso ya no existe, igual lo eliminamos de la cola
          await this.remove(op.id);
          ok++;
        }
      } catch {
        // Sin internet aún — detener y reintentar después
        break;
      }
    }
    return ok;
  },
};
