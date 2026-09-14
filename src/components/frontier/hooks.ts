'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PlayerStat, StatsResponse } from '@/app/api/stats/route';
import type { StatusResponse } from '@/app/api/server-status/route';

export interface ServerState {
  online:    boolean | null;   // null while the first ping is in flight
  players:   number;
  max:       number;
  list:      string[];
  checkedAt: number | null;
}

/** Live server ping, refreshed every minute. */
export function useServerStatus(): ServerState {
  const [state, setState] = useState<ServerState>({ online: null, players: 0, max: 20, list: [], checkedAt: null });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res  = await fetch('/api/server-status');
        const data = (res.ok ? await res.json() : null) as StatusResponse | null;
        if (!alive) return;
        if (!data) { setState(s => ({ ...s, online: false, checkedAt: Date.now() })); return; }
        setState({
          online:    data.online ?? false,
          players:   data.players?.online ?? 0,
          max:       data.players?.max ?? 20,
          list:      (data.players?.list ?? []).map(p => p.name),
          checkedAt: Date.now(),
        });
      } catch {
        if (alive) setState(s => ({ ...s, online: false, checkedAt: Date.now() }));
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return state;
}

export interface StatsState { players: PlayerStat[]; source: StatsResponse['source'] | null; cachedAt: string | null }

export function useStats(): StatsState {
  const [state, setState] = useState<StatsState>({ players: [], source: null, cachedAt: null });
  useEffect(() => {
    fetch('/api/stats')
      .then(r => (r.ok ? r.json() : null))
      .then((data: StatsResponse | null) => {
        if (data?.players) setState({ players: data.players, source: data.source, cachedAt: data.cachedAt });
      })
      .catch(() => {});
  }, []);
  return state;
}

/** Copy a string; `copied` flips back after two seconds. */
export function useCopy(text: string): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return [copied, copy];
}

/** Adds `.is-in` to every `.f-reveal` once it scrolls into view. */
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.f-reveal:not(.is-in)');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('is-in')); return; }
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Which of the given section ids is closest to the top of the viewport. */
export function useScrollSpy(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const onScroll = () => {
      const marker = window.innerHeight * 0.4;
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= marker) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join('|')]);
  return active;
}

/** Seconds since a timestamp, re-rendered every few seconds. */
export function useAgo(ts: number | null): string {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, []);
  if (!ts) return '';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)} min ago`;
}
