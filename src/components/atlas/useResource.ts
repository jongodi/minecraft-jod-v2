'use client';

import { useCallback, useEffect, useState } from 'react';

/** Abort on navigation; an unavailable service never becomes invented data. */
export function useResource<T>(url: string, interval?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    let active = true;
    let pending = false;
    let controller: AbortController;
    const load = async () => {
      if (pending) return;
      pending = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);
      try {
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Request failed');
        const next: T = await response.json();
        if (active) { setData(next); setError(false); }
      } catch {
        if (active) setError(true);
      } finally {
        clearTimeout(timeout);
        pending = false;
        if (active) setLoading(false);
      }
    };
    setLoading(true);
    void load();
    const timer = interval ? setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, interval) : undefined;
    return () => { active = false; controller?.abort(); clearInterval(timer); };
  }, [url, interval, revision]);

  return { data, error, loading, retry };
}
