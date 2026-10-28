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
/* a tab in the background asks seldom, so its lantern (tabLantern.ts) still lights when the server does */
const HIDDEN_POLL_MS = 3 * 60_000;
/* how long the browser waits on its own questions: the routes cap what they ask upstream, so a longer wait is a hung connection */
const STATUS_WAIT_MS = 12_000;
/* An answer that does not come (a phone back from its pocket before its
   network is, a hiccup upstream) is no news: the last real answer stands
   this long, asked again often, before the lantern says it lost touch. The
   lantern says how old the answer it shows is from two minutes on. */
const KEEP_ON_MISS_MS = 5 * 60_000;
const STATS_WAIT_MS = 25_000;
const COPIED_MS = 2400;

/* ─── the server's status ──────────────────────────────────────────
   One answer shared by everything that asks (the hero's lantern, the
   world's HUD, the crew's room, the fires, the tab), refreshed every minute
   while the page is looked at, every quarter of one while the server is on
   its way up or down, every few in a background tab, and at once after the
   site itself asked for a start. */
let statusValue: ServerState = NO_STATUS;
let statusInFlight: Promise<void> | null = null;
/* a start asked for from the site: the server counts as on its way up until the status says, a few minutes at most */
let startingUntil = 0;
let pollTimer: ReturnType<typeof setTimeout> | undefined;
let polling = 0;   // how many are listening
/* the last question went unanswered, and the answer before it was kept */
let missed = false;
const statusListeners = new Set<() => void>();
const notifyStatus = () => statusListeners.forEach(l => l());
const subscribeStatus = (l: () => void) => { statusListeners.add(l); return () => { statusListeners.delete(l); }; };

const unreachable = (): ServerState => ({ ...statusValue, online: false, life: 'unknown', checkedAt: Date.now() });

async function loadStatus(): Promise<void> {
  let next: ServerState;
  try {
    /* capped: the next question is only scheduled once this one ends, so a request that never answered stopped the lantern for good */
    const res  = await fetch('/api/server-status', { signal: AbortSignal.timeout(STATUS_WAIT_MS) });
    const data = (res.ok ? await res.json() : null) as StatusResponse | null;
    next = data ? toServerState(data) : unreachable();
  } catch {
    next = unreachable();
  }
  missed = next.life === 'unknown' && statusValue.life !== null && statusValue.life !== 'unknown' &&
    statusValue.checkedAt !== null && Date.now() - statusValue.checkedAt < KEEP_ON_MISS_MS;
  if (missed) return;
  /* the site asked for a start a moment ago: an answer from before it does not put the lantern out again */
  if (startingUntil && Date.now() < startingUntil && (next.life === 'off' || next.life === 'unknown')) next = { ...next, life: 'starting' };
  else if (next.life !== 'starting') startingUntil = 0;
  statusValue = next;
  notifyStatus();
}

function schedulePoll(): void {
  clearTimeout(pollTimer);
  if (!polling) return;
  /* A tab in the background asks every few minutes rather than every one,
     for the tab's own lantern; it asks at once when it is looked at again. */
  pollTimer = setTimeout(refreshStatus,
    document.hidden ? HIDDEN_POLL_MS : missed || isChanging(statusValue.life) ? CHANGING_POLL_MS : STATUS_POLL_MS);
}

/** Whether an answer can be where who comes and goes is counted from: a real
    answer, and a recent one. A failed question said everyone had left, and a
    page served from the cache carries an answer from long before the visit;
    either, as a starting point, made the next answer tell old comings and
    goings (or none) as news. */
export const isLive = (s: ServerState): boolean =>
  s.checkedAt !== null && s.online !== null && s.life !== 'unknown' && Date.now() - s.checkedAt <= STATUS_POLL_MS + STATUS_WAIT_MS;

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
    else if (initial && statusValue === initial) {
      clearTimeout(pollTimer);
      /* A page served from the cache can carry an answer from long before the
         visit, and the windows, the riders and the bar's count said a quiet
         server was full for ten seconds: an answer older than one poll is
         asked again at once, a fresh one soon after. */
      if (Date.now() - (initial.checkedAt ?? 0) > STATUS_POLL_MS) refreshStatus();
      else pollTimer = setTimeout(() => { if (document.hidden) schedulePoll(); else refreshStatus(); }, SEEDED_POLL_MS);
    }
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
    /* capped, so a hung answer says so on the board instead of "sæki tölurnar" for good */
    fetch('/api/stats', { signal: AbortSignal.timeout(STATS_WAIT_MS) })
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
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
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

/** Seconds since a timestamp, re-rendered every few seconds. Empty until the
    page has hydrated: the server drew the page with its own clock, and the
    home page is a cached copy that can be served minutes after it was made,
    so the browser's first render would say a moment the markup never had.
    A stale answer then added a line the server had not drawn, and React
    threw the whole hero away and drew it again (error #418) on most first
    visits to a quiet site. */
export function useAgo(ts: number | null): string {
  const [ticks, tick] = useState(0);
  useEffect(() => {
    tick(1);
    const id = setInterval(() => tick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, []);
  if (!ts || ticks === 0) return '';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 10) return 'rétt í þessu';
  if (s < 60) return `fyrir ${s} sek.`;
  return `fyrir ${Math.floor(s / 60)} mín.`;
}

/** Whether the device has room for the effects: not one that asked for less
    data, or has little memory or few cores. */
function hasRoom(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return !(nav.connection?.saveData || (nav.deviceMemory ?? 8) < 4 || (nav.hardwareConcurrency ?? 8) < 4);
}

/** Whether the device has room for the effects, known as soon as the page
    runs: for what changes the page's length (the flight's runway, World.tsx),
    which must not wait for an idle moment and arrive under a visitor who has
    already scrolled. False on the server. */
export function useRoomForEffects(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => { setOk(hasRoom()); }, []);
  return ok;
}

/** Whether the device has room for the effects (the dust and the embers,
    the cursor's light), and the browser an idle moment to start them in.
    Not for a device that asked for less data, or has little memory or few
    cores; never before the first paint has settled. False on the server. */
export function useEffectsAllowed(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (!hasRoom()) return;
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
/* the first answer came with the page rather than from asking; it is checked once, quietly */
let meSeeded = false;
let meInFlight: Promise<void> | null = null;
/* every question is numbered and only the latest one's answer counts, so a
   check sent before a sign-in or a sign-out never undoes it when it lands */
let meAsked = 0;
const meListeners = new Set<() => void>();
const notifyMe = () => meListeners.forEach(l => l());

/* `quiet` is the check of an answer the page came with: if that check never
   comes back, the answer stands, rather than signing a member out of their
   own wall over a dropped request. */
async function fetchMe(quiet = false): Promise<void> {
  const asked = ++meAsked;
  try {
    /* capped: everyone asking shares this one question, and one that never answered left the whole page not knowing who was in */
    const res = await fetch('/api/crew/me', { cache: 'no-store', signal: AbortSignal.timeout(STATUS_WAIT_MS) });
    if (!res.ok) throw new Error(`crew/me ${res.status}`);
    const data = await res.json() as { username: string | null; hasPassword?: boolean };
    if (asked !== meAsked) return;
    meValue = data.username ?? null;
    meHasPassword = !!data.hasPassword;
  } catch {
    if (quiet || asked !== meAsked) return;
    meValue = null;
    meHasPassword = false;
  }
  notifyMe();
}
/* Everyone asking as the page opens shares one question; a sign-in asks
   afresh (`fresh`), since a question already out was sent before its cookie. */
function askMe(quiet: boolean, fresh = false): Promise<void> {
  if (meInFlight && !fresh) return meInFlight;
  const asking: Promise<void> = fetchMe(quiet).finally(() => { if (meInFlight === asking) meInFlight = null; });
  meInFlight = asking;
  return asking;
}
const refreshMe = () => askMe(false, true);
const subscribeMe = (l: () => void) => { meListeners.add(l); return () => { meListeners.delete(l); }; };

/** Who the server found signed in when it drew the page. */
export interface CrewSessionSeed { me: string | null; hasPassword: boolean }

/** The session the server read for the page it drew becomes the store's
    first value in the browser, as the status does (seedStatus), so a
    member's own wall is drawn with its pin slot, its banner and its reply
    lines in place instead of growing them a moment in. Pass the same seed to
    useCrewSession so the server's markup and the first client render agree.
    Does nothing once the store has an answer of its own, and nothing on the
    server, where a module lives across requests. */
export function seedSession(seed: CrewSessionSeed): void {
  if (typeof window === 'undefined' || meValue !== undefined) return;
  meValue = seed.me;
  meHasPassword = seed.hasPassword;
  meSeeded = true;
}

/** The signed-in member's username, null when nobody is, undefined until
    known; and whether they have chosen a password of their own yet. `seed`
    is what the server drew the page with (seedSession). */
export function useCrewSession(seed?: CrewSessionSeed): { me: Me; hasPassword: boolean; refresh: () => Promise<void>; signOut: () => Promise<void> } {
  const me = useSyncExternalStore(subscribeMe, () => meValue, () => seed?.me);
  const hasPassword = useSyncExternalStore(subscribeMe, () => meHasPassword, () => seed?.hasPassword ?? false);
  useEffect(() => {
    if (meValue === undefined) askMe(false);
    /* the browser still asks once, which puts right a session the server could not read */
    else if (meSeeded) { meSeeded = false; askMe(true); }
  }, []);
  const signOut = useCallback(async () => {
    await fetch('/api/crew/auth', { method: 'DELETE' }).catch(() => {});
    meAsked++;
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
  /* focus on the dialog itself (where it opens) or on its words is no stop in
     the round: Shift+Tab from there went out to the page behind */
  if (!box.contains(at) || !items.includes(at as HTMLElement)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
  else if (e.shiftKey && at === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
}

/** Focus goes back to `to`, or, where that is gone (a sign-in or a sign-out
    swaps the very button that opened the dialog for others), to the page's
    own heading, so the keyboard carries on from the page and not from its top. */
export function landFocus(to: HTMLElement | null): void {
  if (to?.isConnected) { to.focus({ preventScroll: true }); return; }
  const heading = document.querySelector<HTMLElement>('main h1');
  if (!heading) return;
  if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
}

/** A dialog takes the keyboard with it: focus moves to `ref` when it opens
    (unless a field inside already took it with autoFocus), Tab goes round
    inside it, and focus goes back to whatever opened it when it closes, so a
    keyboard user is never left tabbing through the page hidden behind it. */
export function useDialogFocus<T extends HTMLElement>(ref: React.RefObject<T | null>): void {
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
      if (!box.isConnected) landFocus(opener);
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
/* ─── Back closes what is open over the page ─────────────────────────────
   A layer over the page (a picture held up, the album, the duel, a wall's
   dialog) takes one history entry while it is open, marked with its own id
   in the entry's state, as the rooms and the whole-screen map take theirs:
   the phone's back gesture then closes it instead of leaving the page. A
   layer closed by its own button takes its entry back. The step back is put
   off a moment, so React's second run of an effect in development (close
   and open again at once) keeps the entry rather than closing the layer. */
let layerSeq = 0;
const layersOf = (state: unknown): string[] => (state as { jodLayers?: string[] } | null)?.jodLayers ?? [];
const topLayer = () => { const all = layersOf(window.history.state); return all[all.length - 1]; };

export function useBackCloses(open: boolean, close: () => void): void {
  const closeNow = useRef(close);
  closeNow.current = close;
  const id = useRef<string | null>(null);
  const stepBack = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!open) return;
    if (stepBack.current !== undefined) { clearTimeout(stepBack.current); stepBack.current = undefined; }
    else {
      id.current = `l${++layerSeq}`;
      window.history.pushState({ ...window.history.state, jodLayers: [...layersOf(window.history.state), id.current] }, '');
    }
    const mine = id.current!;
    let popped = false;
    const onPop = () => { if (!layersOf(window.history.state).includes(mine)) { popped = true; closeNow.current(); } };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (popped || topLayer() !== mine) return;
      stepBack.current = setTimeout(() => {
        stepBack.current = undefined;
        if (topLayer() === mine) window.history.back();
      }, 0);
    };
  }, [open]);
}

/** A dialog is open over the page (the duel, the album, a picture). Escape
    and the number keys are its own then: one press closes one layer. */
export const modalOpen = () => document.querySelector('[aria-modal="true"]') !== null;

/** Brings the world into view: landed, where the camera's flight down runs
    (the world's scroll-margin-top in badlands.css). Smooth unless the visitor
    asked for less motion, asked of the browser at the moment of scrolling. */
export function showWorld(smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches): void {
  document.getElementById('heimur')?.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
}

export function useInert<T extends HTMLElement>(inert: boolean): React.RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current as (T & { inert: boolean }) | null;
    if (el) el.inert = inert;
  }, [inert]);
  return ref;
}

/* Next keeps a page as the server first drew it and shows it again on Back
   and Forward, asking nothing anew. Each drawing of a page that is drawn per
   request carries an id; one already mounted once in this tab is that kept
   drawing, and what it shows is as old as the visit it came from. */
const mountedDrawings = new Set<string>();

/** Whether this drawing was mounted before in this tab: Back brought it from Next's keep, not the server. */
export function useRestored(drawn: string | undefined): boolean {
  const [restored] = useState(() => !!drawn && mountedDrawings.has(drawn));
  useEffect(() => { if (drawn) mountedDrawings.add(drawn); }, [drawn]);
  return restored;
}

/** False on the server and for the first client render, true after mount.
    Dates and ages are formatted by the browser's own locale data, which the
    server's may not match, so they are drawn only once the page is mounted. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}
