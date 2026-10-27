'use client';

/* What is new on the board for the one looking, shared by the door's count
   in the bar (on every page) and the board itself. The board's stamps (when,
   and by whom) are asked for once the page is idle and again every few
   minutes while it is looked at; when the visitor last looked is the
   member's own mark on the server, so it is the same on their phone and
   their computer, or a visitor's in their browser. Opening the board moves
   the mark up to the newest thing it shows. */
import { useEffect, useSyncExternalStore } from 'react';
import { countNew, type BoardBrief, type BoardStamp } from '@/lib/board-types';
import { useCrewSession } from '@/components/badlands/hooks';

const LOCAL_KEY = 'jod-board-seen-v1';
const REFRESH_MS = 5 * 60_000;
const WAIT_MS = 15_000;

interface State {
  stamps: BoardStamp[] | null;
  /** when this visitor last looked; undefined until known */
  seen: string | null | undefined;
  /** whose mark `seen` is: a member's name, null for a visitor's own browser */
  whose: string | null | undefined;
}

let state: State = { stamps: null, seen: undefined, whose: undefined };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => { state = { ...state, ...next }; listeners.forEach(l => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

const readLocal = (): string | null => { try { return localStorage.getItem(LOCAL_KEY); } catch { return null; } };
const writeLocal = (at: string) => { try { localStorage.setItem(LOCAL_KEY, at); } catch { /* this visit only */ } };

let stampsInFlight: Promise<void> | null = null;
function loadStamps(): Promise<void> {
  stampsInFlight ??= fetch('/api/board?brief=1', { signal: AbortSignal.timeout(WAIT_MS) })
    .then(r => (r.ok ? r.json() : null))
    .then((d: BoardBrief | null) => { if (d && Array.isArray(d.stamps)) set({ stamps: d.stamps }); })
    .catch(() => { /* no count is a quiet door, not an error */ })
    .finally(() => { stampsInFlight = null; });
  return stampsInFlight;
}

/** The board itself answers with every item: its stamps are the store's too. */
export function takeStamps(stamps: BoardStamp[]): void { set({ stamps }); }

async function loadSeen(me: string | null): Promise<void> {
  if (!me) { set({ seen: readLocal(), whose: null }); return; }
  try {
    const res = await fetch('/api/board/seen', { cache: 'no-store', signal: AbortSignal.timeout(WAIT_MS) });
    const d = res.ok ? await res.json() as { seen: string | null; member: boolean } : null;
    /* a member's mark, or their browser's while the store does not answer */
    set({ seen: d?.member ? d.seen ?? readLocal() : readLocal(), whose: me });
  } catch {
    set({ seen: readLocal(), whose: me });
  }
}

/** The board was looked at up to `at` (the newest thing it showed). */
export function markSeen(at: string | null, me: string | null | undefined): void {
  if (!at) return;
  if (state.seen && Date.parse(state.seen) >= Date.parse(at)) return;
  set({ seen: at });
  writeLocal(at);
  if (me) fetch('/api/board/seen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ at }) }).catch(() => {});
}

/** When this visitor had last looked, as it stood before this look: for the board's own "new" tags. */
export const seenNow = () => state.seen;

/** How many things on the board are new to the one looking; null until it is known. */
export function useBoardNews(): { count: number | null; seen: string | null | undefined } {
  const s = useSyncExternalStore(subscribe, () => state, () => state);
  const { me } = useCrewSession();
  /* the stamps once the page is idle, and again every few minutes while it is looked at */
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (!state.stamps) loadStamps();
      timer = setInterval(() => { if (!document.hidden) loadStamps(); }, REFRESH_MS);
    };
    if (w.requestIdleCallback) { const id = w.requestIdleCallback(start, { timeout: 4000 }); return () => { w.cancelIdleCallback?.(id); clearInterval(timer); }; }
    const t = setTimeout(start, 2000);
    return () => { clearTimeout(t); clearInterval(timer); };
  }, []);
  /* the mark: asked again whenever who is looking changes (a sign-in, a sign-out) */
  useEffect(() => {
    if (me === undefined || state.whose === me) return;
    loadSeen(me);
  }, [me]);
  const known = s.stamps !== null && s.seen !== undefined && s.whose === me;
  return { count: known ? countNew(s.stamps!, s.seen!, me) : null, seen: s.seen };
}
