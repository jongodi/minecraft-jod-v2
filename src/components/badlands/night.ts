'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { PlayNightResponse } from '@/app/api/playnight/route';

/* The play night as the page holds it: one answer shared by the hero's line
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
    else if (value === undefined) value = { night: null, me: null };
  } catch {
    if (value === undefined) value = { night: null, me: null };
  }
  notify();
}
const refresh = () => { if (!inFlight) inFlight = load().finally(() => { inFlight = null; }); return inFlight; };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function usePlayNight() {
  const state = useSyncExternalStore(subscribe, () => value, () => undefined);
  useEffect(() => {
    if (value === undefined) refresh();
    const id = setInterval(() => { if (!document.hidden) refresh(); }, 60_000);
    return () => clearInterval(id);
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
const MONTHS = ['jan.', 'feb.', 'mar.', 'apr.', 'maí', 'jún.', 'júl.', 'ágú.', 'sep.', 'okt.', 'nóv.', 'des.'];
const cap = (s: string) => s.charAt(0).toLocaleUpperCase('is-IS') + s.slice(1);
const clock = (d: Date) => `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
const dayNumber = (d: Date) => Math.floor(d.getTime() / 86_400_000);

/** "í kvöld kl. 20:00", "á morgun kl. 20:00", "föstudag 3. okt. kl. 20:00" */
export function whenAt(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const days = dayNumber(d) - dayNumber(now);
  const time = `kl. ${clock(d)}`;
  if (days === 0) return `${d.getUTCHours() >= 17 ? 'í kvöld' : 'í dag'} ${time}`;
  if (days === 1) return `á morgun ${time}`;
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]} ${time}`;
}
export const WhenAt = (iso: string, now?: Date) => cap(whenAt(iso, now));

/** "Föstudagur 3. okt." */
export function dayOf(iso: string): string {
  const d = new Date(iso);
  return `${cap(DAYS_NOM[d.getUTCDay()])} ${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]}`;
}

/** The days a new fire can be lit for: today and the next thirteen. */
export function dayChoices(now = new Date()): { value: string; label: string }[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now.getTime() + i * 86_400_000);
    const value = d.toISOString().slice(0, 10);
    const label = i === 0 ? 'Í dag' : i === 1 ? 'Á morgun' : `${cap(DAYS[d.getUTCDay()])} ${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]}`;
    return { value, label };
  });
}

/** Every half hour from ten in the morning to half past eleven at night. */
export const TIME_CHOICES = Array.from({ length: 28 }, (_, i) => {
  const h = 10 + Math.floor(i / 2);
  return `${String(h).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
});
