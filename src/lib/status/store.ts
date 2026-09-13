'use client';

import { useSyncExternalStore } from 'react';
import type { ServerStatus } from './types';

/**
 * One status for the whole page. The server renders the first value; the
 * poller replaces it every minute and every subscriber (hero, header lamp,
 * footer lamp, favicon) follows. Only ever written from the browser.
 */
let current: ServerStatus | null = null;
const listeners = new Set<() => void>();

export function setStatus(next: ServerStatus): void {
  current = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStatus(initial: ServerStatus): ServerStatus {
  return useSyncExternalStore(
    subscribe,
    () => current ?? initial,
    () => initial,
  );
}
