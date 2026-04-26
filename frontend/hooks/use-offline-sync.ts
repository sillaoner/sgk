"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/services/api/client";
import { pendingQueueCount, processOfflineQueue } from "@/services/offline/queue";

export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const sync = async () => {
      if (!navigator.onLine || isSyncing) {
        return;
      }

      setIsSyncing(true);
      try {
        await processOfflineQueue((config) =>
          apiClient.request({
            ...config,
            headers: {
              ...(config.headers ?? {}),
              "X-Skip-Queue": "1"
            }
          })
        );
      } finally {
        setPendingCount(pendingQueueCount());
        setIsSyncing(false);
      }
    };

    setPendingCount(pendingQueueCount());

    const onOnline = () => {
      void sync();
    };

    window.addEventListener("online", onOnline);

    const interval = window.setInterval(() => {
      void sync();
      setPendingCount(pendingQueueCount());
    }, 15000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(interval);
    };
  }, [isSyncing]);

  return {
    pendingCount,
    isSyncing
  };
}
