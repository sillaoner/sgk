import { CACHE_PREFIX } from "@/lib/constants";

interface CacheRecord<T> {
  data: T;
  createdAt: number;
  ttlMs: number;
}

export function setCache<T>(key: string, data: T, ttlMs: number) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: CacheRecord<T> = {
    data,
    createdAt: Date.now(),
    ttlMs
  };

  localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(payload));
}

export function getCache<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
  if (!raw) {
    return null;
  }

  try {
    const record = JSON.parse(raw) as CacheRecord<T>;
    const isExpired = Date.now() > record.createdAt + record.ttlMs;
    if (isExpired) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return record.data;
  } catch {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    return null;
  }
}
