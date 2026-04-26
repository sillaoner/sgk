import type { AxiosRequestConfig } from "axios";
import { OFFLINE_QUEUE_KEY } from "@/lib/constants";

export interface QueuedMutation {
  id: string;
  method: string;
  url: string;
  data?: unknown;
  params?: unknown;
  headers?: Record<string, string>;
  createdAt: number;
  retries: number;
}

function getQueue(): QueuedMutation[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as QueuedMutation[];
  } catch {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    return [];
  }
}

function saveQueue(queue: QueuedMutation[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueMutation(config: AxiosRequestConfig) {
  const queue = getQueue();

  queue.push({
    id: crypto.randomUUID(),
    method: config.method ?? "post",
    url: config.url ?? "",
    data: config.data,
    params: config.params,
    headers: config.headers as Record<string, string> | undefined,
    createdAt: Date.now(),
    retries: 0
  });

  saveQueue(queue);
}

export async function processOfflineQueue(
  send: (config: AxiosRequestConfig) => Promise<unknown>
): Promise<{ processed: number; failed: number }> {
  const queue = getQueue();
  if (!queue.length) {
    return { processed: 0, failed: 0 };
  }

  const remaining: QueuedMutation[] = [];
  let processed = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await send({
        method: item.method,
        url: item.url,
        data: item.data,
        params: item.params,
        headers: {
          ...item.headers,
          "X-Idempotency-Key": item.id
        }
      });
      processed += 1;
    } catch {
      failed += 1;
      remaining.push({ ...item, retries: item.retries + 1 });
    }
  }

  saveQueue(remaining);
  return { processed, failed };
}

export function pendingQueueCount(): number {
  return getQueue().length;
}
