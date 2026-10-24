'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { comings, unread, type ChatLine } from '@/lib/chat';
import type { ChatResponse } from '@/app/api/chat/route';
import { plural } from '@/lib/format';
import { CREW } from './data';
import type { ServerState } from './hooks';
import { isLive, modalOpen, useMediaQuery } from './hooks';

/* When the chat was last read in this browser: the newest line it printed. */
const SEEN_KEY = 'jod-chat-seen-v1';
/* The game's own timing: a line holds for nine seconds and is gone by ten. */
const LINE_MS = 10_000;
/* lines that arrive together come in one after another, as messages do */
const STAGGER_MS = 350;
/* the first a beat after the world is reached, once its lights are coming on */
const FIRST_MS = 900;
/* the log keeps the fetched lines and what the page saw itself */
const LOG_KEEP = 20;

const keyOf = (l: ChatLine) => `${l.kind}|${l.name}|${l.at}|${'text' in l ? l.text : 'title' in l ? l.title : ''}`;
const prints = (n: number) => (n === 1 ? '[mynd]' : `[${n} myndir]`);

/* The sentence the game prints, in its Icelandic (Mojang's is_is.json):
   chat.type.text, chat.type.advancement.*, multiplayer.player.joined/left.
   A fire lit is the server's own news, said in the yellow it says those in. */
function Words({ line }: { line: ChatLine }) {
  switch (line.kind) {
    case 'say':
      return <>&lt;{line.name}&gt; {line.text}{line.prints > 0 && <> <span className="b-chat__item">{prints(line.prints)}</span></>}</>;
    case 'print':
      return <>&lt;{line.name}&gt; <span className="b-chat__item">{prints(line.prints)}</span>{line.caption && <> {line.caption}</>}</>;
    case 'advancement': {
      const verb = line.frame === 'challenge' ? 'hefur lokið við áskorunina' : line.frame === 'goal' ? 'hefur náð takmarkinu' : 'hefur áunnið sér';
      return <>{line.name} {verb} <span className={`b-chat__adv b-chat__adv--${line.frame}`}>[{line.title}]</span></>;
    }
    case 'fire':
      return <span className="b-chat__sys">{line.name} kveikti bál{line.note && <>: „{line.note}“</>}</span>;
    case 'joined':
      return <span className="b-chat__sys">{line.name} tengdist leiknum</span>;
    case 'left':
      return <span className="b-chat__sys">{line.name} hætti í leiknum</span>;
  }
}

/* `inMs` and `outMs` are set when the line is printed, as its animations'
   delays (badlands.css): from coming in to going, then the last second's fade */
interface Printed { line: ChatLine; key: string; inMs: number; outMs: number; until: number }

interface Props {
  /** the world has been reached and its lights are on, with nothing over it */
  active: boolean;
  /** something lies over the chat's corner (a postcard, the painted map, a room) */
  covered: boolean;
  server: ServerState;
  /** told when the chat is opened to read and closed again, so the world's lantern can step aside */
  onOpen?: (open: boolean) => void;
}

/** Spjallið: the game's chat in the corner of the world, over the places as
    it sits over the hotbar. When the world is reached it prints what
    happened on JOÐ since this browser last read it (src/lib/chat.ts), and
    while the page is open, who comes in and goes out; each line holds for
    ten seconds and goes, as the game's do. T, the game's chat key, opens it
    to read again, and so does the game's own note of lines held back. Every
    line leads to where it happened. */
function Chat({ active, covered, server, onOpen }: Props) {
  const [log, setLog] = useState<ChatLine[]>([]);
  const [shown, setShown] = useState<Printed[]>([]);
  const [open, setOpen] = useState(false);
  /* lines already printed, or read on an earlier visit */
  const done = useRef(new Set<string>());
  const phone = useMediaQuery('(max-width: 899px)');
  const most = phone ? 3 : 4;

  /* What happened lately, asked for once the page is idle. What this browser
     has read before goes into the log without being printed again. */
  useEffect(() => {
    let gone = false;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const load = async () => {
      try {
        const res = await fetch('/api/chat', { signal: AbortSignal.timeout(15_000) });
        if (!res.ok || gone) return;
        const { lines } = (await res.json()) as ChatResponse;
        let seen: string | null = null;
        try { seen = localStorage.getItem(SEEN_KEY); } catch { /* no storage: everything recent is new */ }
        const fresh = new Set(unread(lines, seen).map(keyOf));
        lines.forEach(l => { if (!fresh.has(keyOf(l))) done.current.add(keyOf(l)); });
        if (!gone) setLog(cur => [...lines, ...cur].slice(-LOG_KEEP));
      } catch { /* no chat is a quiet world, not an error */ }
    };
    if (w.requestIdleCallback) { const id = w.requestIdleCallback(load, { timeout: 4000 }); return () => { gone = true; w.cancelIdleCallback?.(id); }; }
    const t = setTimeout(load, 2000);
    return () => { gone = true; clearTimeout(t); };
  }, []);

  /* Who comes in and goes out while the page is open: the crew in the
     status's player list, compared answer to answer. The first live answer
     is where the page starts, not news; one that never came, or a cached
     page's from long before, is neither (isLive). */
  const before = useRef<string[] | null>(null);
  useEffect(() => {
    if (!isLive(server) || server.checkedAt === null) return;
    const lower = server.online ? server.list.map(n => n.toLowerCase()) : [];
    const now = CREW.filter(n => lower.includes(n.toLowerCase()));
    if (before.current !== null) {
      const news = comings(before.current, now, new Date(server.checkedAt).toISOString());
      if (news.length) setLog(cur => [...cur, ...news].slice(-LOG_KEEP));
    }
    before.current = now;
  }, [server]);

  /* In the world, whatever has not been printed is printed, one line after
     another, and the newest of it is remembered as read. */
  useEffect(() => {
    if (!active || covered) return;
    const fresh = log.filter(l => !done.current.has(keyOf(l)));
    if (!fresh.length) return;
    const now = Date.now();
    fresh.forEach(l => done.current.add(keyOf(l)));
    setShown(cur => [...cur, ...fresh.map((line, i) => {
      const inMs = FIRST_MS + i * STAGGER_MS;
      return { line, key: keyOf(line), inMs, outMs: inMs + LINE_MS - 1000, until: now + inMs + LINE_MS };
    })]);
    const newest = fresh.filter(l => l.kind !== 'joined' && l.kind !== 'left').map(l => l.at).sort().at(-1);
    if (newest) {
      try { if ((localStorage.getItem(SEEN_KEY) ?? '') < newest) localStorage.setItem(SEEN_KEY, newest); } catch { /* read for this visit only */ }
    }
  }, [active, covered, log]);

  /* a line goes when its ten seconds are up */
  useEffect(() => {
    if (!shown.length) return;
    const next = Math.min(...shown.map(s => s.until));
    const t = setTimeout(() => setShown(cur => cur.filter(s => s.until > Date.now())), Math.max(0, next - Date.now()) + 20);
    return () => clearTimeout(t);
  }, [shown]);
  useEffect(() => { onOpen?.(open); }, [open, onOpen]);
  /* covered, the corner is cleared: what was printed has been seen */
  useEffect(() => { if (covered) { setShown([]); setOpen(false); } }, [covered]);

  /* T opens the chat, as in the game, from anywhere on the page: the world is
     brought into view, where the chat is. Not while a field is being typed
     in, under a dialog, in a room, or with a modifier. */
  const toggle = useCallback(() => setOpen(v => !v), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      const at = e.target instanceof HTMLElement ? e.target : null;
      if (at && (at.isContentEditable || at.closest('input, textarea, select'))) return;
      if (modalOpen()) return;
      /* one Escape closes one layer: an open chat, and nothing under it */
      if (e.key === 'Escape' && open) { e.preventDefault(); e.stopImmediatePropagation(); setOpen(false); return; }
      if (e.key.toLowerCase() !== 't' || e.shiftKey || covered) return;
      e.preventDefault();
      if (!open) {
        const world = document.getElementById('heimur');
        const top = world?.getBoundingClientRect().top ?? 0;
        if (world && Math.abs(top) > 8) world.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
      toggle();
    };
    /* in the capture phase, so an Escape that closes the chat reaches no other layer */
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, covered, toggle]);

  const lines: Printed[] = open ? log.map(line => ({ line, key: keyOf(line), inMs: 0, outMs: 0, until: Infinity })) : shown;
  const held = open ? 0 : Math.max(0, lines.length - most);
  const visible = open ? lines : lines.slice(-most);
  if (!visible.length && !open) return null;

  return (
    <div className={`b-chat${open ? ' is-open' : ''}`} role="log" aria-label="Spjall">
      {held > 0 && (
        <button type="button" className="b-chat__line b-chat__queue" onClick={() => setOpen(true)}>
          [+{held} {plural(held, 'lína', 'línur')} í bið]
        </button>
      )}
      {open && !log.length && <p className="b-chat__line b-chat__empty">Ekkert sagt í heiminum síðustu vikurnar.</p>}
      {visible.map(s => (
        <Link key={s.key} href={s.line.href} className="b-chat__line"
          style={open ? undefined : { animationDelay: `${s.inMs}ms, ${s.outMs}ms` }}>
          <Words line={s.line} />
        </Link>
      ))}
      {open && <button type="button" className="b-btn b-btn--small b-btn--ghost b-chat__close" onClick={() => setOpen(false)}>Loka spjallinu</button>}
    </div>
  );
}

export default memo(Chat);
