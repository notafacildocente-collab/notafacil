/**
 * Cache en memoria para respuestas de API.
 * Evita llamadas repetidas a endpoints estables (materias, períodos, desempeños).
 */

interface CacheEntry {
  data: any;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

const TTL = {
  short: 30_000,    // 30 s — datos que cambian poco (desempeños, estudiantes)
  medium: 120_000,  // 2 min — períodos, materias
  long: 300_000,    // 5 min — config del colegio, cursos
};

export const apiCache = {
  get(key: string): any | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
    return entry.data;
  },

  set(key: string, data: any, ttl = TTL.short): void {
    cache.set(key, { data, expiresAt: Date.now() + ttl });
  },

  invalidate(prefix: string): void {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) cache.delete(key);
    }
  },

  clear(): void { cache.clear(); },

  TTL,
};

/** apiFetch con cache integrado */
export async function apiFetchCached(
  path: string,
  ttl = TTL.short,
  fetchFn: (path: string) => Promise<Response>,
): Promise<any> {
  const cached = apiCache.get(path);
  if (cached !== null) return cached;

  const res = await fetchFn(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  apiCache.set(path, data, ttl);
  return data;
}
