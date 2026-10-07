'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { PlayNightResponse } from '@/app/api/playnight/route';
import { MONTHS } from '@/lib/format';

/* The play nights as the page holds them: one answer shared by the hero's line
   and the crew's room, asked for when the page opens and every minute while
   it is in view, and replaced by whatever an action answers. */

type State = PlayNightResponse | undefined;   // undefined until the first answer
let value: State = undefined;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

async function load(): Promise<void> {
  try {
    const res = await fetch('/api/playnight', { cache: 'no-store' });
    if (res.ok) value = await res.json() as PlayNightResponse;
    else if (value === undefined) value = { nights: [], me: null, max: 5 };
  } catch {
    if (value === undefined) value = { nights: [], me: null, max: 5 };
  }
  notify();
}
const refresh = () => { if (!inFlight) inFlight = load().finally(() => { inFlight = null; }); return inFlight; };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/* One poll for the whole page, however many read it (the hero's line, and
   the crew's room once it has been opened): every minute while the tab is
   in view, and at once when it comes back into view. */
let readers = 0;
let poll: ReturnType<typeof setInterval> | undefined;
const onShown = () => { if (!document.hidden) refresh(); };
function startPolling() {
  if (readers++ > 0) return;
  poll = setInterval(onShown, 60_000);
  document.addEventListener('visibilitychange', onShown);
}
function stopPolling() {
  if (--readers > 0) return;
  clearInterval(poll);
  document.removeEventListener('visibilitychange', onShown);
}

/** The nights the server drew the page with become the store's first value
    in the browser (see seedStatus in hooks.ts). Nothing on the server. */
export function seedNights(initial: PlayNightResponse): void {
  if (typeof window === 'undefined') return;
  if (value === undefined) value = initial;
}

export function usePlayNight(initial?: PlayNightResponse) {
  const state = useSyncExternalStore(subscribe, () => value, () => initial);
  useEffect(() => {
    /* the page's own answer is drawn for everyone and names nobody, so the
       browser asks once for its own, which knows who is signed in */
    if (value === undefined || value.me === null) refresh();
    startPolling();
    return stopPolling;
  }, []);
  /** Posts an action; the answer is the night as it now stands, or an Icelandic error. */
  const act = useCallback(async (body: Record<string, unknown>): Promise<string | null> => {
    try {
      const res = await fetch('/api/playnight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => null) as (PlayNightResponse & { error?: string }) | null;
      if (!res.ok) return data?.error ?? `Villa ${res.status}`;
      if (data) { value = data; notify(); }
      return null;
    } catch {
      return 'Villa í nettengingu';
    }
  }, []);
  return { state, act, refresh };
}

/* ─── times, in Icelandic, in Iceland (which keeps UTC all year) ─────────
   Written out rather than left to the browser's locale data, which falls
   back to English wherever it carries no Icelandic. */

const DAYS = ['sunnudag', 'mánudag', 'þriðjudag', 'miðvikudag', 'fimmtudag', 'föstudag', 'laugardag'];
const DAYS_NOM = ['sunnudagur', 'mánudagur', 'þriðjudagur', 'miðvikudagur', 'fimmtudagur', 'föstudagur', 'laugardagur'];
const cap = (s: string) => s.charAt(0).toLocaleUpperCase('is-IS') + s.slice(1);
const clock = (d: Date) => `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
const dayNumber = (d: Date) => Math.floor(d.getTime() / 86_400_000);
/** the year, for a day far enough off that its month could be read as this year's */
const yearOf = (d: Date, days: number, now: Date) => (d.getUTCFullYear() !== now.getUTCFullYear() && days > 90 ? ` ${d.getUTCFullYear()}` : '');

/** "í kvöld kl. 20:00", "á morgun kl. 20:00", "föstudag 3. okt. kl. 20:00" */
export function whenAt(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const days = dayNumber(d) - dayNumber(now);
  const time = `kl. ${clock(d)}`;
  if (days === 0) return `${d.getUTCHours() >= 17 ? 'í kvöld' : 'í dag'} ${time}`;
  if (days === 1) return `á morgun ${time}`;
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]}${yearOf(d, days, now)} ${time}`;
}
export const WhenAt = (iso: string, now?: Date) => cap(whenAt(iso, now));

/** A moment gone by: "í dag kl. 21:40", "í gær kl. 21:40", "föstudag 26. sep. kl. 21:40" */
export function sinceAt(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const days = dayNumber(now) - dayNumber(d);
  const time = `kl. ${clock(d)}`;
  if (days <= 0) return `í dag ${time}`;
  if (days === 1) return `í gær ${time}`;
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]}${yearOf(d, days, now)} ${time}`;
}

/** How long until a moment under a day off: "eftir 40 mín.", "eftir 2 klst. 14 mín.", "eftir 5 klst."; nothing further off or gone by. */
export function untilAt(iso: string, now = Date.now()): string {
  const left = new Date(iso).getTime() - now;
  if (left <= 0 || left >= 24 * 3600_000) return '';
  const mins = Math.round(left / 60_000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `eftir ${Math.max(1, m)} mín.`;
  if (h >= 5 || m === 0) return `eftir ${h} klst.`;
  return `eftir ${h} klst. ${m} mín.`;
}

/** "Föstudagur 3. okt." */
export function dayOf(iso: string): string {
  const d = new Date(iso);
  return `${cap(DAYS_NOM[d.getUTCDay()])} ${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]}`;
}

/* ─── the calendar a fire is lit from ────────────────────────────────── */

export const MONTHS_FULL = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
/** Iceland's week starts on a Monday */
export const WEEKDAYS_SHORT = ['M', 'Þ', 'M', 'F', 'F', 'L', 'S'];
/** a day as the form holds it, "2026-12-18", and as a number of days since 1970 */
export const dayValue = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);
export const dayNum = (value: string) => dayNumber(new Date(`${value}T00:00:00Z`));

/** "Í dag", "Á morgun", "Föstudag 18. des.", "Laugardag 2. okt. 2027" */
export function dayLabel(value: string, now = new Date()): string {
  const d = new Date(`${value}T12:00:00Z`);
  const days = dayNumber(d) - dayNumber(now);
  if (days === 0) return 'Í dag';
  if (days === 1) return 'Á morgun';
  return `${cap(DAYS[d.getUTCDay()])} ${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]}${yearOf(d, days, now)}`;
}

/** "föstudagur 18. desember 2026", for a screen reader */
export function dayLong(value: string): string {
  const d = new Date(`${value}T12:00:00Z`);
  return `${DAYS_NOM[d.getUTCDay()]} ${d.getUTCDate()}. ${MONTHS_FULL[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** The last day a fire can be lit for: a year from today (the server allows a day more). */
export const LAST_DAY_AHEAD = 365;
/** a time must be at least a quarter of an hour off */
export const SOON_MS = 15 * 60_000;
export const isLate = (day: string, time: string, now = Date.now()) => Date.parse(`${day}T${time}:00Z`) < now + SOON_MS;

/** Every half hour from ten in the morning to half past eleven at night. */
export const TIME_CHOICES = Array.from({ length: 28 }, (_, i) => {
  const h = 10 + Math.floor(i / 2);
  return `${String(h).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
});
