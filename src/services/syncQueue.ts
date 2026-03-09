import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import type { FoodLog } from '../types/user';
import { captureError, logEvent } from './telemetry';
import { insertFoodLogRemote } from './userData';

type SyncTaskType = 'food_log_insert';

type SyncTask = {
  id: string;
  type: SyncTaskType;
  userId: string;
  createdAt: string;
  tries: number;
  payload: any;
};

const QUEUE_KEY = '@nutrimatch_sync_queue';

function scopedQueueKey(userId: string) {
  return `${QUEUE_KEY}:${userId}`;
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function isDuplicateKeyError(err: any) {
  const code = String((err as any)?.code || '').toLowerCase();
  const msg = String((err as any)?.message || '').toLowerCase();
  return code === '23505' || msg.includes('duplicate key');
}

async function loadQueue(userId: string): Promise<SyncTask[]> {
  const raw = await AsyncStorage.getItem(scopedQueueKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveQueue(userId: string, tasks: SyncTask[]) {
  await AsyncStorage.setItem(scopedQueueKey(userId), JSON.stringify(tasks));
}

export async function enqueueFoodLogForSync(params: { userId: string; log: FoodLog }) {
  const { userId, log } = params;
  const tasks = await loadQueue(userId);
  const exists = tasks.some((t) => t.type === 'food_log_insert' && t.payload?.id === log.id);
  if (exists) return;

  tasks.push({
    id: makeId(),
    type: 'food_log_insert',
    userId,
    createdAt: new Date().toISOString(),
    tries: 0,
    payload: log,
  });

  await saveQueue(userId, tasks);
  logEvent('sync_queue_enqueued', { type: 'food_log_insert' });
}

let processing = false;

export async function processSyncQueue(userId: string) {
  if (!userId) return;
  if (processing) return;
  processing = true;

  try {
    let tasks = await loadQueue(userId);
    if (tasks.length === 0) return;

    const remaining: SyncTask[] = [];

    for (const task of tasks) {
      if (task.type === 'food_log_insert') {
        try {
          const log = task.payload as FoodLog;
          await insertFoodLogRemote({
            id: log.id,
            userId,
            imageUri: log.imageUri,
            analysis: log.analysis,
            mealType: log.mealType,
            timestamp: log.timestamp,
          } as any);
          continue; // success -> drop
        } catch (e) {
          if (isDuplicateKeyError(e)) {
            continue; // already synced
          }
          const tries = (task.tries || 0) + 1;
          remaining.push({ ...task, tries });
          captureError(e, { taskType: task.type, tries });
        }
      } else {
        remaining.push(task);
      }
    }

    await saveQueue(userId, remaining);
    if (remaining.length === 0) logEvent('sync_queue_drained');
  } finally {
    processing = false;
  }
}

let netUnsub: null | (() => void) = null;

export function startSyncQueueListener(getUserId: () => Promise<string | null>) {
  if (netUnsub) return;

  netUnsub = NetInfo.addEventListener((state) => {
    const isOffline = state.isConnected === false || state.isInternetReachable === false;
    if (isOffline) return;
    void (async () => {
      const userId = await getUserId().catch(() => null);
      if (userId) await processSyncQueue(userId);
    })();
  });
}

export function stopSyncQueueListener() {
  try {
    netUnsub?.();
  } catch {
    // ignore
  }
  netUnsub = null;
}
