import { ApiResponse } from '@shared/index';

const API_BASE = '/api';

export class ApiError extends Error {
  code: string;
  details?: any;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export interface OfflineAction {
  id: string;
  url: string;
  method: string;
  body?: any;
  createdAt: string;
  statusText: string;
}

// Offline queue state
const OFFLINE_QUEUE_KEY = 'koradevs_offline_queue';

export function getOfflineQueue(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineAction[]) {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new Event('offline_queue_updated'));
  } catch (err) {
    console.warn('Erreur sauvegarde queue hors-ligne:', err);
  }
}

export function queueOfflineAction(url: string, method: string, body?: any) {
  const queue = getOfflineQueue();
  queue.push({
    id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    url,
    method,
    body,
    createdAt: new Date().toISOString(),
    statusText: 'En attente de synchronisation',
  });
  saveOfflineQueue(queue);
}

export async function processOfflineQueue(): Promise<number> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;

  let processedCount = 0;
  const remaining: OfflineAction[] = [];

  for (const item of queue) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: item.body ? JSON.stringify(item.body) : undefined,
      });
      if (res.ok) {
        processedCount++;
      } else {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }

  saveOfflineQueue(remaining);
  return processedCount;
}

// Single Typed API Client
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  if (!navigator.onLine && options.method && options.method !== 'GET') {
    queueOfflineAction(url, options.method, options.body ? JSON.parse(options.body as string) : undefined);
    throw new ApiError('OFFLINE', 'Action enregistrée hors-ligne (En attente de synchronisation)');
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const json: ApiResponse<T> = await res.json();

    if (!json.ok) {
      throw new ApiError(json.error.code, json.error.message, json.error.details);
    }

    return json.data;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;

    // Network offline error catch
    if (options.method && options.method !== 'GET') {
      queueOfflineAction(url, options.method, options.body ? JSON.parse(options.body as string) : undefined);
      throw new ApiError('OFFLINE', 'Connexion interrompue. Action mise en file (En attente de synchronisation)');
    }

    throw new ApiError('NETWORK_ERROR', err.message || 'Erreur réseau, vérifie ta connexion internet');
  }
}
