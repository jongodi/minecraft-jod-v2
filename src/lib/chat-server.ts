/* The chat's lines, gathered on the server from the walls, the
   advancements and the fires (src/app/api/chat/route.ts). */
import type { CrewProfile } from '@/lib/crew-types';
import { advancementOf, type CrewAdvancements } from '@/lib/advancements';
import type { Night } from '@/lib/play-night';
import { CHAT_DAYS, CHAT_KEEP, oneLine, type ChatLine } from '@/lib/chat';

/** The newest lines from the walls, the advancements and the fires, oldest
    first as the chat prints them: within the last CHAT_DAYS, CHAT_KEEP at most. */
export function chatLines({ walls, advancements, nights, places, now = Date.now() }: {
  walls: CrewProfile[];
  advancements: CrewAdvancements | null;
  nights: Night[];
  /** the places' names by id, for a picture that says nothing else */
  places?: Map<number, string>;
  now?: number;
}): ChatLine[] {
  const since = now - CHAT_DAYS * 86_400_000;
  const recent = (at: string) => { const t = Date.parse(at); return t >= since && t <= now; };
  const lines: ChatLine[] = [];

  for (const wall of walls) {
    for (const e of wall.entries) {
      if (!recent(e.createdAt)) continue;
      const href = `/crew/${wall.username}#${e.id}`;
      const text = oneLine(e.text);
      if (text) lines.push({ kind: 'say', at: e.createdAt, name: wall.username, text, prints: e.photos.length, href });
      else if (e.photos.length > 0) {
        const caption = e.photos.map(p => p.caption.trim()).find(Boolean)
          ?? (e.placeId !== null ? places?.get(e.placeId) ?? null : null);
        lines.push({ kind: 'print', at: e.createdAt, name: wall.username, caption: caption ? oneLine(caption, 60) : null, prints: e.photos.length, href });
      }
    }
  }

  for (const [name, done] of Object.entries(advancements?.players ?? {})) {
    for (const [id, at] of Object.entries(done)) {
      const def = advancementOf(id);
      if (!def || !recent(at)) continue;
      lines.push({ kind: 'advancement', at, name, title: def.title, frame: def.frame, href: `/crew/${name}#afrek` });
    }
  }

  for (const n of nights) {
    if (n.cancelled || !recent(n.createdAt)) continue;
    lines.push({ kind: 'fire', at: n.createdAt, name: n.by, note: oneLine(n.note, 60), href: `/kvold/${n.id}#hopur` });
  }

  return lines
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .slice(-CHAT_KEEP);
}
