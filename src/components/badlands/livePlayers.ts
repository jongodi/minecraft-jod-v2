'use client';

import { useEffect, useState } from 'react';

/** A member in the overworld, where they stand. */
export interface LivePlayer { name: string; x: number; y: number; z: number }

/* BlueMap's own list of who is on and where (players.json), through the
   site's route, which the CDN shares for two seconds: every open page in a
   region costs exaroton one call. Asked every five seconds while the world is
   in view, never while the tab is hidden. */
const EVERY = 5000;
const URL = '/bluemap/maps/world/live/players.json';

interface BlueMapPlayer { name?: string; foreign?: boolean; position?: { x?: number; y?: number; z?: number } }

/** The crew in the overworld and where they stand, while `active`; empty when
    the server is stopped or BlueMap does not answer. Only the crew, by the
    names the roster spells them with, and only a change makes a new list. */
export function useLivePlayers(active: boolean, crew: readonly string[]): LivePlayer[] {
  const [players, setPlayers] = useState<LivePlayer[]>([]);

  useEffect(() => {
    if (!active) return;
    const names = new Map(crew.map(n => [n.toLowerCase(), n]));
    let timer = 0;
    let gone = false;
    let last = '';
    const ask = async () => {
      if (document.hidden) { timer = window.setTimeout(ask, EVERY); return; }
      try {
        const r = await fetch(URL, { cache: 'no-store' });
        const body = r.ok ? await r.json() as { players?: BlueMapPlayer[] } : { players: [] };
        const list = (body.players ?? []).flatMap((p): LivePlayer[] => {
          const name = names.get(String(p.name ?? '').toLowerCase());
          const at = p.position;
          if (!name || p.foreign || !at || ![at.x, at.y, at.z].every(Number.isFinite)) return [];
          return [{ name, x: Math.round(at.x!), y: Math.round(at.y!), z: Math.round(at.z!) }];
        }).sort((a, b) => a.name.localeCompare(b.name));
        const key = JSON.stringify(list);
        if (!gone && key !== last) { last = key; setPlayers(list); }
      } catch { /* the last list stands until the next answer */ }
      if (!gone) timer = window.setTimeout(ask, EVERY);
    };
    ask();
    return () => { gone = true; clearTimeout(timer); };
  }, [active, crew]);

  return active ? players : [];
}
