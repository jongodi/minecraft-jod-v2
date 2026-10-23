/* What the crew give a sign: the game's own things, as reactions, counted
   like the lantern. Eight items, each with what giving it says; with the slot
   that opens the inventory they fill one hotbar of nine. Their pictures are
   drawn in src/lib/item-art.ts. No imports, so the helpers read the same on
   the server, in the browser and in a test. */

export const ITEMS = [
  { id: 'cake',     name: 'Kaka',              says: 'Til hamingju!' },
  { id: 'diamond',  name: 'Demantur',          says: 'Glæsilegt' },
  { id: 'heart',    name: 'Hjarta',            says: 'Elska þetta' },
  { id: 'poppy',    name: 'Valmúi',            says: 'Fallegt' },
  { id: 'pickaxe',  name: 'Haki',              says: 'Vel unnið' },
  { id: 'cookie',   name: 'Smákaka',           says: 'Takk fyrir' },
  { id: 'creeper',  name: 'Creeper',           says: 'Sssss!' },
  { id: 'skull',    name: 'Beinagrindarhaus',  says: 'Dó úr hlátri' },
] as const;

export type ItemId = typeof ITEMS[number]['id'];
export type Item = typeof ITEMS[number];

/** What has been given to a sign: each item given, in the order it was first
    given, and the heads of those who gave it. An item nobody has given is not in it. */
export type Reactions = Partial<Record<ItemId, string[]>>;

const BY_ID = new Map<string, Item>(ITEMS.map(i => [i.id, i]));
export const isItem = (v: unknown): v is ItemId => typeof v === 'string' && BY_ID.has(v);
export const itemOf = (id: ItemId): Item => BY_ID.get(id)!;

/* ─── who gave what ──────────────────────────────────────────────────────── */

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** The items given, in the order first given, each with its givers. */
export const given = (r: Reactions | undefined): { id: ItemId; who: string[] }[] =>
  Object.entries(r ?? {}).flatMap(([id, who]) => (isItem(id) && who && who.length ? [{ id, who }] : []));

export const giversOf = (r: Reactions | undefined, id: ItemId): string[] => r?.[id] ?? [];
export const gaveIt = (r: Reactions | undefined, id: ItemId, me: string | null | undefined) => !!me && giversOf(r, id).some(n => same(n, me));

/** The reactions with `me` having given an item or taken it back. An item
    first given goes after the others; one nobody gives any longer leaves. */
export function give(r: Reactions | undefined, id: ItemId, me: string, on: boolean): Reactions {
  const out: Reactions = {};
  let placed = false;
  for (const { id: k, who } of given(r)) {
    if (k !== id) { out[k] = who; continue; }
    placed = true;
    const rest = who.filter(n => !same(n, me));
    const next = on ? [...rest, me] : rest;
    if (next.length) out[k] = next;
  }
  if (!placed && on) out[id] = [me];
  return out;
}

/** The item's list taken from another copy of the reactions (what the server
    answered), the rest of `r` as it stands, so answers that come back in any
    order each settle only their own item. */
export function settle(r: Reactions | undefined, id: ItemId, from: Reactions): Reactions {
  const who = giversOf(from, id);
  const out: Reactions = {};
  let placed = false;
  for (const { id: k, who: w } of given(r)) {
    if (k !== id) out[k] = w;
    else { placed = true; if (who.length) out[k] = who; }
  }
  if (!placed && who.length) out[id] = who;
  return out;
}
