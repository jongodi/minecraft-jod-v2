'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlayerStat, StatsResponse } from '@/app/api/stats/route';
import type { StatusResponse } from '@/app/api/server-status/route';

const STATUS_POLL_MS = 60_000;
const COPIED_MS = 2400;

export interface ServerState {
  online:    boolean | null;   // null while the first ping is in flight
  players:   number;
  max:       number;
  list:      string[];
  version:   string | null;
  checkedAt: number | null;
}

const OFFLINE = (s: ServerState): ServerState => ({ ...s, online: false, checkedAt: Date.now() });

/** Live server ping, refreshed every minute. */
export function useServerStatus(): ServerState {
  const [state, setState] = useState<ServerState>({ online: null, players: 0, max: 20, list: [], version: null, checkedAt: null });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res  = await fetch('/api/server-status');
        const data = (res.ok ? await res.json() : null) as StatusResponse | null;
        if (!alive) return;
        if (!data) { setState(OFFLINE); return; }
        setState({
          online:    data.online ?? false,
          players:   data.players?.online ?? 0,
          max:       data.players?.max ?? 20,
          list:      (data.players?.list ?? []).map(p => p.name),
          version:   data.version ?? null,
          checkedAt: Date.now(),
        });
      } catch {
        if (alive) setState(OFFLINE);
      }
    };
    load();
    const id = setInterval(load, STATUS_POLL_MS);
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

/** Copy a string with the Clipboard API, or a hidden textarea where that is missing.
    `copied` flips back after a couple of seconds. */
export function useCopy(text: string): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const copy = useCallback(() => {
    const done = () => {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPIED_MS);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, () => { legacyCopy(text); done(); });
    } else {
      legacyCopy(text);
      done();
    }
  }, [text]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [copied, copy];
}

function legacyCopy(text: string) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch { /* nothing else to try */ }
  document.body.removeChild(ta);
}

/** Which of the given section ids is closest above the marker line.

    The section tops are measured once and re-measured only when the page
    resizes, so a scroll frame reads `scrollY` and nothing else. Measuring
    inside the scroll handler instead would force a layout per section per
    frame, and the sections do not move while you scroll. */
export function useScrollSpy(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join('|');
  useEffect(() => {
    const list = key.split('|');
    let tops: Array<{ id: string; top: number }> = [];
    let raf = 0;

    const measure = () => {
      const y = window.scrollY;
      tops = list
        .map(id => { const el = document.getElementById(id); return el ? { id, top: el.getBoundingClientRect().top + y } : null; })
        .filter((v): v is { id: string; top: number } => v !== null);
    };
    const pick = () => {
      raf = 0;
      const marker = window.scrollY + window.innerHeight * 0.4;
      let current: string | null = null;
      for (const s of tops) if (s.top <= marker) current = s.id;
      setActive(prev => (prev === current ? prev : current));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(pick); };
    const remeasure = () => { measure(); onScroll(); };

    measure();
    pick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', remeasure, { passive: true });
    /* Sections grow as photos arrive and as folded sections open. */
    const ro = new ResizeObserver(remeasure);
    ro.observe(document.documentElement);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', remeasure);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [key]);
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
  if (s < 10) return 'rétt í þessu';
  if (s < 60) return `fyrir ${s} sek.`;
  return `fyrir ${Math.floor(s / 60)} mín.`;
}

/** True once the element has been near the viewport; used to start effects lazily. */
export function useNearViewport<T extends Element>(margin = '200px'): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setNear(true); return; }
    const obs = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setNear(true); obs.disconnect(); }
    }, { rootMargin: margin });
    obs.observe(el);
    return () => obs.disconnect();
  }, [margin]);
  return [ref, near];
}

/** Whether a media query matches; false during SSR and on the first paint. */
export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** Whether the visitor asked for reduced motion; false during SSR. */
export function useReducedMotionPref(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduce;
}

