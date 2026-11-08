/* The world's chat on a long night (Chat.tsx): when it asks again what was
   said, and how a new answer joins what the page already holds. Kept apart
   from the component so the timing can be tested without a browser. */
import type { ChatLine } from '@/lib/chat';

/** One line's identity across answers: who, what and when. */
export const keyOf = (l: ChatLine) => `${l.kind}|${l.name}|${l.at}|${'text' in l ? l.text : 'title' in l ? l.title : ''}`;

/* On a play night the page waits in a tab for hours, and a picture pinned
   at 21:40 was never printed by a chat that asked only once. Five minutes is
   long enough that the question costs next to nothing and short enough that
   a line comes while it is news. The answer it gets is at most a minute and
   a half old (CHAT_CACHE, below), so a line is printed by the next question,
   or by the one after it when it was said just before that one: within six
   and a half minutes. */
export const AGAIN_MS = 5 * 60_000;

/* How long the chat's answer is shared at the CDN, and how long past that a
   stale copy may still be handed out while a fresh one is fetched. */
export const CHAT_FRESH_S = 60;
export const CHAT_STALE_S = 30;
/** The chat's Cache-Control (src/app/api/chat/route.ts): one answer a minute
    for the whole crew, and the stale window ended well before the next
    question. Ten minutes of it answered every question five minutes on with
    the copy the question before had set off, a whole beat late, from the
    CDN and from the browser's own cache alike. */
export const CHAT_CACHE = `public, max-age=0, s-maxage=${CHAT_FRESH_S}, stale-while-revalidate=${CHAT_STALE_S}`;

export interface Asking {
  now: number;
  /** when the chat last asked, or null before its first question has gone out */
  last: number | null;
  /** the tab is out of sight now */
  hidden: boolean;
  /** when the tab went out of sight, for a tab that has just been looked at again */
  hiddenAt?: number | null;
}

/** Whether to ask again now. Never while the tab is hidden, and never
    before the first question (asked once the page is idle) has gone out.
    `shown`: the tab was looked at again, which is worth a question only
    after five minutes or more away. `tick`: the world is in view, and five
    minutes have passed since the last question. */
export function askAgain(why: 'shown' | 'tick', s: Asking): boolean {
  if (s.hidden || s.last === null) return false;
  if (why === 'shown') return s.hiddenAt != null && s.now - s.hiddenAt >= AGAIN_MS;
  return s.now - s.last >= AGAIN_MS;
}

/** The log with an answer's lines in it: a line already held is not held
    twice, and the whole stays in the order things were said, so a line said
    at 21:40 and fetched at 21:45 stands before a friend who came in at 21:42.
    The newest `keep` are kept. An answer with nothing new gives back the
    log itself, so the page has nothing to draw again. */
export function merged(log: ChatLine[], lines: ChatLine[], keep: number): ChatLine[] {
  const held = new Set(log.map(keyOf));
  const fresh = lines.filter(l => { const k = keyOf(l); if (held.has(k)) return false; held.add(k); return true; });
  if (!fresh.length) return log;
  /* a stable sort, so lines of the same moment keep the order they came in */
  return [...log, ...fresh]
    .map((l, i) => ({ l, i, t: Date.parse(l.at) || 0 }))
    .sort((a, b) => a.t - b.t || a.i - b.i)
    .map(x => x.l)
    .slice(-keep);
}
