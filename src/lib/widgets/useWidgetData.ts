"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_REFRESH_MS = 5 * 60 * 1000;
// A widget just added client-side takes a moment to reach disk (autosave is
// debounced) before /api/widgets/[id]/data can find it — retry quickly a
// few times rather than showing "not found" for a widget the user just added.
const NOT_FOUND_RETRY_MS = 800;
const MAX_NOT_FOUND_RETRIES = 8;

export function useWidgetData<T>(widgetId: string, refreshMs: number = DEFAULT_REFRESH_MS) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notFoundRetries = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();

    function load() {
      fetch(`/api/widgets/${widgetId}/data`, { signal: controller.signal })
        .then(async (res) => {
          if (res.status === 404 && notFoundRetries.current < MAX_NOT_FOUND_RETRIES) {
            notFoundRetries.current += 1;
            retryTimer = setTimeout(load, NOT_FOUND_RETRY_MS);
            return null;
          }
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || "Failed to load widget data");
          return body as T;
        })
        .then((body) => {
          if (cancelled || body === null) return;
          notFoundRetries.current = 0;
          setData(body);
          setError(null);
        })
        .catch((err) => {
          if (!cancelled && err?.name !== "AbortError") setError(err.message || "Failed to load widget data");
        });
    }

    load();
    const interval = setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
      clearTimeout(retryTimer);
    };
  }, [widgetId, refreshMs]);

  return { data, error };
}
