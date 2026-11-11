/* Links in a note: an address written on a sign or in an answer is a link,
   not letters to copy off the screen by hand. Pure, so what counts as an
   address and how it is shown are tested without a browser. */

export interface NoteLink {
  /** where it leads, exactly as written */
  href: string;
  /** what the sign shows: the address without its scheme, cut short */
  label: string;
  /** the site's own: opened in the same tab, as a path */
  own: string | null;
}

/* only http and https, only at the start of a word; what follows runs to the next space */
const URL = /(^|[\s(„"'«])(https?:\/\/[^\s<>"„“”]+)/g;
/* what ends a sentence, not an address: "…á kortinu: https://jodcraft.world/kort." */
const TRAILING = /[.,;:!?)\]}'"“”»]+$/;
const OWN_HOSTS = new Set(['jodcraft.world', 'www.jodcraft.world']);
/** the longest an address is shown at: a sign on a phone holds about thirty letters a line */
export const LABEL_MAX = 38;

/** How an address reads on a sign: no scheme, no "www.", no bare trailing
    slash, and past the limit its end cut off with an ellipsis. The whole
    address is still where the link leads. */
export function linkLabel(href: string): string {
  const bare = href.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
  return bare.length > LABEL_MAX ? `${bare.slice(0, LABEL_MAX - 1)}…` : bare;
}

function linkOf(raw: string): NoteLink | null {
  let url: URL_;
  try { url = new globalThis.URL(raw); } catch { return null; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  /* an address with a name and password in it is not shown as a harmless host */
  if (url.username || url.password || !url.hostname.includes('.')) return null;
  const own = OWN_HOSTS.has(url.hostname.toLowerCase()) ? `${url.pathname}${url.search}${url.hash}` : null;
  return { href: raw, label: linkLabel(raw), own };
}
type URL_ = InstanceType<typeof globalThis.URL>;

/** A text cut at its addresses: plain runs and a link for each, in order.
    Punctuation that closes the sentence stays with the words. */
export function splitLinks(text: string): Array<string | NoteLink> {
  const parts: Array<string | NoteLink> = [];
  let at = 0;
  for (const m of text.matchAll(URL)) {
    const start = (m.index ?? 0) + m[1].length;
    const raw = m[2].replace(TRAILING, '');
    const link = linkOf(raw);
    if (!link) continue;
    if (start > at) parts.push(text.slice(at, start));
    parts.push(link);
    at = start + raw.length;
  }
  if (at < text.length) parts.push(text.slice(at));
  return parts;
}
