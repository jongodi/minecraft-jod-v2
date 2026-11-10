'use client';

import { useEffect } from 'react';
import { useCrewSession } from './hooks';
import { toast } from './Toast';
import { markerKey, toShow, type OwnAdvancement } from './ownAdvancements';

/* one question a visit, however many pages are opened in it */
let asked: string | null = null;
/* a toast shows 2.6 s (Toast.tsx); the next comes as it leaves */
const BETWEEN_MS = 3000;

/** Afrek unnið: a member who earned advancements in the game since this
    device last showed them any is told so in the game's own way when they
    open the site signed in, by the toast the site already drops from under
    the bar, one after another: "Afrek unnið!" and the advancement's name
    (ownAdvancements.ts has the rule, /api/crew/me/afrek the list). Draws
    nothing itself. A browser that keeps nothing (private mode) is never told,
    rather than told the same on every page. */
export default function AdvancementToasts() {
  const { me } = useCrewSession();
  useEffect(() => {
    if (!me || asked === me) return;
    asked = me;
    let marker: string | null;
    try { marker = localStorage.getItem(markerKey(me)); } catch { return; }
    fetch('/api/crew/me/afrek', { cache: 'no-store', signal: AbortSignal.timeout(15_000) })
      .then(r => (r.ok ? r.json() : null))
      .then((d: { list?: OwnAdvancement[] } | null) => {
        if (!d?.list) return;
        const shown = toShow(d.list, marker, new Date().toISOString());
        /* remembered before the first is shown: a page left mid-queue does not start the queue over on the next */
        try { localStorage.setItem(markerKey(me), shown.marker); } catch { return; }
        shown.toasts.forEach((t, i) => setTimeout(() => toast(t.title, t.data), 1200 + i * BETWEEN_MS));
      })
      .catch(() => { asked = null; /* asked again on the next page */ });
    /* the queue is not cut short when the bar is drawn again; only a page left takes it along */
  }, [me]);
  return null;
}
