'use client';

import { useEffect } from 'react';
import { setStatus } from '@/lib/status/store';
import { lampFor, type ServerStatus } from '@/lib/status/types';

const INTERVAL_MS = 60_000;

const LAMP_HEX = { on: '#F4A6C1', dim: '#8A6A78', off: '#9A9184' } as const;

/** The favicon is the mark; its bar follows the server like everything else. */
function paintFavicon(status: ServerStatus): void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) return;
  const bar = LAMP_HEX[lampFor(status.state)];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#0F0E0C"/><path fill="#EFE9DC" d="M8.57 28V4H15.9Q18.76 4 20.4 5.27Q22.03 6.55 22.73 9.16Q23.43 11.78 23.43 15.93Q23.43 20.05 22.72 22.72Q22 25.38 20.33 26.69Q18.65 28 15.76 28ZM13.91 23.4H15.37Q16.1 23.4 16.63 23.13Q17.15 22.87 17.45 22.24Q17.74 21.62 17.88 20.57Q18.02 19.52 18.02 17.95V14.53Q18.02 12.93 17.88 11.81Q17.74 10.7 17.45 9.98Q17.15 9.27 16.63 8.94Q16.1 8.6 15.37 8.6H13.91Z"/><rect x="6" y="13.8" width="10" height="4.1" fill="${bar}"/></svg>`;
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

interface StatusPollerProps {
  initial: ServerStatus;
}

/**
 * Client component: polls the status route once a minute and whenever the
 * tab comes back, writes into the shared store. Renders nothing.
 */
export function StatusPoller({ initial }: StatusPollerProps) {
  useEffect(() => {
    paintFavicon(initial);
    let stopped = false;

    async function poll() {
      try {
        const res = await fetch('/api/status', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const next = (await res.json()) as ServerStatus;
        if (stopped) return;
        setStatus(next);
        paintFavicon(next);
      } catch {
        if (stopped) return;
        const next: ServerStatus = { state: 'unreachable', players: [], checkedAt: new Date().toISOString() };
        setStatus(next);
        paintFavicon(next);
      }
    }

    const id = setInterval(poll, INTERVAL_MS);
    const onVisible = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [initial]);

  return null;
}
