/* The game's chat, as the world shows it: what happened on JOÐ lately, each
   line in the sentence the game itself would print. What the crew pinned is
   said in their own name (`<stebbias> …`), an advancement in the game's own
   words and colour, and a fire lit in the yellow the server speaks in. The
   page adds who comes in and goes out while it is open (Chat.tsx). The
   lines themselves are gathered on the server (chat-server.ts); this half
   is the browser's too. */
import type { Frame } from '@/lib/advancements';

export type ChatLine =
  /** a note pinned to a wall, in its writer's name; `prints` is how many pictures came with it */
  | { kind: 'say'; at: string; name: string; text: string; prints: number; href: string }
  /** pictures pinned without a word: what they show, if anything says so */
  | { kind: 'print'; at: string; name: string; caption: string | null; prints: number; href: string }
  | { kind: 'advancement'; at: string; name: string; title: string; frame: Frame; href: string }
  /** a play night lit; `note` is what the evening is for */
  | { kind: 'fire'; at: string; name: string; note: string; href: string }
  /** said by the page itself, while it is open */
  | { kind: 'joined' | 'left'; at: string; name: string; href: string };

/** How far back the chat reaches, and how many lines it keeps. */
export const CHAT_DAYS = 21;
export const CHAT_KEEP = 12;
/* a line of chat is one line: a long note is cut at a word */
export const SAY_MAX = 90;

/** A note as one line of chat: its first line, cut at a word if long. */
export function oneLine(text: string, max = SAY_MAX): string {
  const first = text.trim().split(/\r?\n/)[0].trim();
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,.;:!?]+$/, '')}…`;
}

/** What has happened since the chat was last read: everything newer than
    `seen`. On a first visit (nothing seen) the newest few, so the world is
    seen to be lived in. */
export function unread(lines: ChatLine[], seen: string | null, first = 3): ChatLine[] {
  if (!seen) return lines.slice(-first);
  const t = Date.parse(seen);
  return Number.isNaN(t) ? lines.slice(-first) : lines.filter(l => Date.parse(l.at) > t);
}

/** Who came in and who went out between two answers of the status, as the
    game says it, in the order the crew list gives. */
export function comings(before: string[], after: string[], at: string): ChatLine[] {
  const was = new Set(before.map(n => n.toLowerCase()));
  const is  = new Set(after.map(n => n.toLowerCase()));
  return [
    ...before.filter(n => !is.has(n.toLowerCase())).map(name => ({ kind: 'left' as const, at, name, href: `/crew/${name}` })),
    ...after.filter(n => !was.has(n.toLowerCase())).map(name => ({ kind: 'joined' as const, at, name, href: `/crew/${name}` })),
  ];
}
