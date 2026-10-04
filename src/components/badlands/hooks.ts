'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { PlayerStat, StatsResponse, WeekStats } from '@/app/api/stats/route';
import type { StatusResponse } from '@/lib/server-status';
import { NO_STATUS, STARTING_MS, isChanging, toServerState, type ServerState } from '@/lib/server-state';
import { toast } from './Toast';

export type { ServerState } from '@/lib/server-state';

const STATUS_POLL_MS = 60_000;
/* while the server is on its way up or down, the page asks more often */
const CHANGING_POLL_MS = 15_000;
/* a page drawn with the server's own answer asks again soon, since that answer may be a minute old */
const SEEDED_POLL_MS = 10_000;
const COPIED_MS = 2400;

/* ─── the server's status ──────────────────────────────────────────
   One answer shared by everything that asks (the hero's lantern, the
   world's HUD, the crew's room, the fires), refreshed every minute while
   the page is looked at, every quarter of one while the server is on its
   way up or down, and at once after the site itself asked for a start. */
let statusValue: ServerState = NO_STATUS;
let statusInFlight: Promise<void> | null = null;
/* a start asked for from the site: the server counts as on its way up until the status says, a few minutes at most */
let startingUntil = 0;
let pollTimer: ReturnType<typeof setTimeout> | undefined;
let polling = 0;   // how many are listening
const statusListeners = new Set<() => void>();
const notifyStatus = () => statusListeners.forEach(l => l());
const subscribeStatus = (l: () => void) => { statusListeners.add(l); return () => { statusListeners.delete(l); }; };

const unreachable = (): ServerState => ({ ...statusValue, online: false, life: 'unknown', checkedAt: Date.now() });

async function loadStatus(): Promise<void> {
  let next: ServerState;
  try {
    const res  = await fetch('/api/server-status');
    const data = (res.ok ? await res.json() : null) as StatusResponse | null;
    next = data ? toServerState(data) : unreachable();
  } catch {
    next = unreachable();
  }
  /* the site asked for a start a moment ago: an answer from before it does not put the lantern out again */
  if (startingUntil && Date.now() < startingUntil && (next.life === 'off' || next.life === 'unknown')) next = { ...next, life: 'starting' };
  else if (next.life !== 'starting') startingUntil = 0;
  statusValue = next;
  notifyStatus();
}

function schedulePoll(): void {
  clearTimeout(pollTimer);
  if (!polling) return;
  pollTimer = setTimeout(() => {
    /* a tab in the background does not ask; it asks once when it is looked at again */
    if (document.hidden) schedulePoll(); else refreshStatus();
  }, isChanging(statusValue.life) ? CHANGING_POLL_MS : STATUS_POLL_MS);
}

/** Asks the server's status now; one request at a time. */
export function refreshStatus(): Promise<void> {
  if (!statusInFlight) statusInFlight = loadStatus().finally(() => { statusInFlight = null; schedulePoll(); });
  return statusInFlight;
}

/** The site just asked Exaroton to start the server: the lantern kindles at
    once, and the status is asked again in a moment and often until it is up. */
export function expectStarting(): void {
  startingUntil = Date.now() + STARTING_MS;
  if (statusValue.life !== 'on') { statusValue = { ...statusValue, online: false, life: 'starting' }; notifyStatus(); }
  schedulePoll();
  setTimeout(refreshStatus, 3000);
}

/** The status the server drew the page with becomes the store's first value
    in the browser, so the first client render matches the markup and nothing
    moves when the store takes over. Does nothing once the store has an answer
    of its own, and nothing on the server, where a module lives across requests. */
export function seedStatus(initial: ServerState): void {
  if (typeof window === 'undefined') return;
  if (statusValue.checkedAt === null) statusValue = initial;
}

/** Live server ping, shared and refreshed while the page is looked at.
    `initial` is the server's own answer, drawn into the page (src/lib/home-data.ts). */
export function useServerStatus(initial?: ServerState): ServerState {
  const state = useSyncExternalStore(subscribeStatus, () => statusValue, () => initial ?? NO_STATUS);
  useEffect(() => {
    polling++;
    if (statusValue.checkedAt === null) refreshStatus();
    else if (initial && statusValue === initial) { clearTimeout(pollTimer); pollTimer = setTimeout(refreshStatus, SEEDED_POLL_MS); }
    else schedulePoll();
    const onShow = () => { if (!document.hidden) refreshStatus(); };
    document.addEventListener('visibilitychange', onShow);
    return () => {
      polling--;
      if (!polling) clearTimeout(pollTimer);
      document.removeEventListener('visibilitychange', onShow);
    };
  // the seed is the page's first value only; a later prop never restarts the poll
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}

/** `source` is null while the first answer is in flight; `failed` says the
    answer never came, so the board can say so instead of waiting forever. */
export interface StatsState { players: PlayerStat[]; source: StatsResponse['source'] | null; cachedAt: string | null; week: WeekStats | null; failed: boolean }

export function useStats(): StatsState {
  const [state, setState] = useState<StatsState>({ players: [], source: null, cachedAt: null, week: null, failed: false });
  useEffect(() => {
    let alive = true;
    fetch('/api/stats')
      .then(r => (r.ok ? r.json() : null))
      .then((data: StatsResponse | null) => {
        if (!alive) return;
        if (data && Array.isArray(data.players)) setState({ players: data.players, source: data.source, cachedAt: data.cachedAt, week: data.week ?? null, failed: false });
        else setState(s => ({ ...s, failed: true }));
      })
      .catch(() => { if (alive) setState(s => ({ ...s, failed: true })); });
    return () => { alive = false; };
  }, []);
  return state;
}

/* ─── holding the page still ───────────────────────────────────────
   The album, the lightbox over it and the duel each stop the page from
   scrolling behind them, and they can be open at once. Counted, so the
   lightbox closing does not hand the page its scroll back while the album
   it opened from is still up. */
let scrollLocks = 0;
export function useScrollLock(active = true): void {
  useEffect(() => {
    if (!active) return;
    if (scrollLocks++ === 0) document.body.style.overflow = 'hidden';
    return () => { if (--scrollLocks === 0) document.body.style.overflow = ''; };
  }, [active]);
}

/** Copy a string with the Clipboard API, or a hidden textarea where that is
    missing. The toast says it was done (src/components/badlands/Toast.tsx),
    unless the caller says so itself (`toast: false`, the hero's stamp);
    `copied` flips back after a couple of seconds either way. */
export function useCopy(text: string, { toast: withToast = true }: { toast?: boolean } = {}): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const copy = useCallback(() => {
    const done = () => {
      setCopied(true);
      if (withToast) toast('Afritað', text);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPIED_MS);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, () => { legacyCopy(text); done(); });
    } else {
      legacyCopy(text);
      done();
    }
  }, [text, withToast]);
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

/** Whether the device has room for the effects (the dust and the embers,
    the cursor's light), and the browser an idle moment to start them in.
    Not for a device that asked for less data, or has little memory or few
    cores; never before the first paint has settled. False on the server. */
export function useEffectsAllowed(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    if (nav.connection?.saveData || (nav.deviceMemory ?? 8) < 4 || (nav.hardwareConcurrency ?? 8) < 4) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) { const id = w.requestIdleCallback(() => setOk(true), { timeout: 3000 }); return () => w.cancelIdleCallback?.(id); }
    const t = setTimeout(() => setOk(true), 1500);
    return () => clearTimeout(t);
  }, []);
  return ok;
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


/* ─── who is signed in ─────────────────────────────────────────────────────
   One answer shared by every component that asks (the bar, the wall, the
   duel), fetched once and refreshed after a sign-in or sign-out. */
type Me = string | null | undefined;   // undefined while the first answer is in flight
let meValue: Me = undefined;
let meHasPassword = false;
let meInFlight: Promise<void> | null = null;
const meListeners = new Set<() => void>();
const notifyMe = () => meListeners.forEach(l => l());

async function fetchMe(): Promise<void> {
  try {
    const res = await fetch('/api/crew/me', { cache: 'no-store' });
    const data = (res.ok ? await res.json() : null) as { username: string | null; hasPassword?: boolean } | null;
    meValue = data?.username ?? null;
    meHasPassword = !!data?.hasPassword;
  } catch {
    meValue = null;
    meHasPassword = false;
  }
  notifyMe();
}
function refreshMe(): Promise<void> {
  if (!meInFlight) meInFlight = fetchMe().finally(() => { meInFlight = null; });
  return meInFlight;
}
const subscribeMe = (l: () => void) => { meListeners.add(l); return () => { meListeners.delete(l); }; };

/** The signed-in member's username, null when nobody is, undefined until
    known; and whether they have chosen a password of their own yet. */
export function useCrewSession(): { me: Me; hasPassword: boolean; refresh: () => Promise<void>; signOut: () => Promise<void> } {
  const me = useSyncExternalStore(subscribeMe, () => meValue, () => undefined);
  const hasPassword = useSyncExternalStore(subscribeMe, () => meHasPassword, () => false);
  useEffect(() => { if (meValue === undefined) refreshMe(); }, []);
  const signOut = useCallback(async () => {
    await fetch('/api/crew/auth', { method: 'DELETE' }).catch(() => {});
    meValue = null;
    meHasPassword = false;
    notifyMe();
  }, []);
  return { me, hasPassword, refresh: refreshMe, signOut };
}

/* The dialogs open right now, innermost last: only that one keeps Tab. */
const traps: HTMLElement[] = [];
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function keepTab(e: KeyboardEvent) {
  const box = traps[traps.length - 1];
  if (e.key !== 'Tab' || !box) return;
  const items = Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => !el.closest('[inert]') && el.getClientRects().length > 0);
  const at = document.activeElement;
  const first = items[0];
  const last = items[items.length - 1];
  if (!first) { e.preventDefault(); return; }
  if (!box.contains(at)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
  else if (e.shiftKey && at === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
}

/** A dialog takes the keyboard with it: focus moves to `ref` when it opens
    (unless a field inside already took it with autoFocus), Tab goes round
    inside it, and focus goes back to whatever opened it when it closes, so a
    keyboard user is never left tabbing through the page hidden behind it. */
export function useDialogFocus<T extends HTMLElement>(ref: React.RefObject<T>): void {
  /* read while rendering: by the time an effect runs, a field inside with
     autoFocus has taken focus and would be remembered as the opener */
  const [opener] = useState(() => (typeof document === 'undefined' ? null : document.activeElement as HTMLElement | null));
  useEffect(() => {
    const el = ref.current;
    const box = el?.closest<HTMLElement>('[role="dialog"]') ?? el;
    if (!box) return;
    if (!box.contains(document.activeElement)) el?.focus({ preventScroll: true });
    traps.push(box);
    if (traps.length === 1) document.addEventListener('keydown', keepTab);
    return () => {
      traps.splice(traps.indexOf(box), 1);
      if (traps.length === 0) document.removeEventListener('keydown', keepTab);
      /* only once the dialog has really gone: React's strict mode runs this
         with the dialog still standing, and the field inside keeps its focus */
      if (!box.isConnected && opener?.isConnected) opener.focus({ preventScroll: true });
    };
  // once, on open and close
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** A backdrop that closes on a click that both began and ended on it. A drag
    that starts inside the box (selecting text in a field, throwing a photo)
    and is let go over the backdrop is not a click outside, though the browser
    sends the backdrop a click for it. Spread the result onto the backdrop. */
export function useBackdropClose(onClose: () => void): { onPointerDown: (e: React.PointerEvent) => void; onClick: (e: React.MouseEvent) => void } {
  const began = useRef(false);
  return {
    onPointerDown: e => { began.current = e.target === e.currentTarget; },
    onClick: e => { if (began.current && e.target === e.currentTarget) onClose(); began.current = false; },
  };
}

/** `inert` on an element, set as a property. React 18 has no attribute for it
    and warns about the empty string the attribute form needs. */
export function useInert<T extends HTMLElement>(inert: boolean): React.RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current as (T & { inert: boolean }) | null;
    if (el) el.inert = inert;
  }, [inert]);
  return ref;
}

/** False on the server and for the first client render, true after mount.
    Dates and ages are formatted by the browser's own locale data, which the
    server's may not match, so they are drawn only once the page is mounted. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}
