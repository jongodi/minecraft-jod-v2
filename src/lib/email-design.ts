// How a letter looks: two dresses for the same words (src/lib/email-copy.ts).
//
//   Sólsetur   the site at sunset: sky and mesa in the picture, the words on
//              parchment, a card framed like everything pinned on the site
//   Varðeldur  the site at night: stars, tonight's moon and a campfire in the
//              picture, the words light on warm dark wood
//
// Everything that carries the look is drawn as a picture by /api/mail-art, in
// the site's own faces, so it reads the same in every mail app, Gmail
// included: the picture at the top, with the letter's heading ("Söðlaðu
// hestinn, Jóna") and the crew it is about standing in it in their own
// skins; the verse, cut on a sign as the game's signs hold four lines; and
// the welcome's small pictures. The heading's address is signed, so the site
// only ever draws words it wrote itself. The words between ask for the
// site's fonts (served from /email-fonts); Apple Mail and some others show
// them, while Gmail and Outlook show none, so the stand-ins are chosen to
// keep the look: Verdana, the screen face nearest the pixel letters, and
// bold capitals for the labels, times and buttons.
//
// Mail apps read only the simplest HTML: tables, inline styles, no scripts.
// Gmail keeps a <style> only if it can read every rule in it, so what it
// cannot read (the fonts, Apple's detectors) sits in a block of its own and
// the phone's rules in another; and it folds away the end of a letter that
// matches one before it in a thread, so the foot carries a postmark of its
// own minute.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { BANNERS, BRAND, SERVER, VERSES, type Letter, type MailKind } from '@/lib/email-copy';
import { isCrewUsername, canonicalUsername } from '@/lib/crew-types';
import type { MailIcon } from '@/lib/mail-icons';
import { moonPhase } from '@/lib/moon';

export type Theme = 'sunset' | 'campfire';
export const THEMES: Theme[] = ['sunset', 'campfire'];
export const THEME_NAMES: Record<Theme, string> = { sunset: 'Sólsetur', campfire: 'Varðeldur' };

/** The look each letter has until another is chosen in the admin panel:
    the day's letters at sunset, the evening's by the fire. */
export const DEFAULT_THEMES: Record<MailKind, Theme> = {
  welcome: 'sunset', signin: 'sunset', lit: 'sunset', chosen: 'sunset', soon: 'campfire', out: 'campfire', mention: 'campfire',
};

export const isTheme = (v: unknown): v is Theme => v === 'sunset' || v === 'campfire';

/** Bump to make mail apps fetch every picture afresh after the drawing changes. */
const DRAW_VERSION = 6;
/** What a heading's signature is made with. Changing it costs every letter
    already sent its heading (the picture falls back to the plain title), so
    it is kept apart from the drawing's version. */
const SIGN_VERSION = 4;

/** The picture's size as shown; it is drawn at twice this. */
export const ART = { width: 600, height: 210 };
/** How wide a letter's card is as shown. The picture is drawn on ART's
    grid and shown this wide, so it keeps its shape. */
export const CARD = 680;
/** The verse's sign as shown, drawn at twice this. */
export const VERSE_ART = { width: 460, height: 172 };
/** The sign as a short letter shows it, beside its words: narrower, the verse cut smaller. */
export const VERSE_SIDE = { width: 276, height: 168 };
/** A small picture beside the welcome's list, as shown. */
export const ICON_SIZE = 32;

/* The site's tokens (src/app/tokens.css); mail apps read no CSS variables. */
const STRATA = ['#A15325', '#BA8523', '#D1B2A1', '#8F3D2E', '#4D3323'];

interface Palette {
  /** the card, its thin frame, and the dark bar at its foot (and behind the picture while it loads) */
  card: string; frame: string; bar: string;
  ink: string; soft: string; faint: string; rule: string;
  ticket: string; ticketEdge: string; link: string; quoteEdge: string;
  button: string; buttonInk: string; buttonEdge: string; buttonLight: string; outline: string;
  /** the numbers beside the steps */
  badge: string; badgeInk: string;
  /** the bar's words */
  barInk: string; barFaint: string;
  scheme: 'light' | 'dark';
}

const PALETTES: Record<Theme, Palette> = {
  sunset: {
    card: '#E8DCC4', frame: '#4D3323', bar: '#15100D', ink: '#1E1611', soft: '#5A4634', faint: '#6E5A45', rule: '#C9B89A',
    ticket: '#DCCDB0', ticketEdge: '#A15325', link: '#9A520C', quoteEdge: '#C9801F',
    button: '#F2A63B', buttonInk: '#1E1611', buttonEdge: '#9A5F14', buttonLight: '#F8CB7E', outline: '#1E1611',
    badge: '#4D3323', badgeInk: '#F2E6CE', barInk: '#F2A63B', barFaint: '#A08C78', scheme: 'light',
  },
  campfire: {
    card: '#1E1611', frame: '#0B0910', bar: '#0B0910', ink: '#E8DCC4', soft: '#D1B2A1', faint: '#A08C78', rule: '#3A2B21',
    ticket: '#2A1F18', ticketEdge: '#E0602A', link: '#F2A63B', quoteEdge: '#E0602A',
    button: '#F2A63B', buttonInk: '#1E1611', buttonEdge: '#9A5F14', buttonLight: '#F8CB7E', outline: '#0B0910',
    badge: '#F2A63B', badgeInk: '#1E1611', barInk: '#F2A63B', barFaint: '#8A7764', scheme: 'dark',
  },
};

/* Headings, labels, times and buttons ask for bold: the site's faces have
   one weight and are never thickened (font-synthesis: none), while a
   stand-in such as Verdana comes out bold, which is what keeps the pixel
   letters' weight where they are missing. */
const FONT = {
  display: `'Alfa Slab One',Rockwell,'Rockwell Extra Bold','Roboto Slab',Georgia,serif`,
  text:    `'Pixelify Sans',Verdana,Geneva,Tahoma,sans-serif`,
  label:   `Silkscreen,Verdana,Geneva,Tahoma,sans-serif`,
  book:    `Georgia,'Times New Roman',serif`,
};
const BOLD = 'font-weight:700;font-synthesis:none';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* The server's address, kept from being made a link of: Gmail turns a bare
   address into one, blue and underlined, and this one opens no page. A dot
   in a span of its own breaks what it looks for, and copies as it reads. */
const SERVER_HTML = esc(SERVER).replace(/\./g, '<span style="color:inherit">.</span>');
/** Text as HTML, the server's address in it kept from being made a link of. */
const words = (s: string) => esc(s).split(esc(SERVER)).join(SERVER_HTML);

/** A short stable hash, so a picture's address changes whenever its words or drawing do. */
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/* The key a picture's heading is signed with: a secret the site already
   keeps, so there is nothing new to set up. Changing it only costs old
   letters their heading; their picture falls back to the plain one. */
const artKey = () => process.env.MAIL_ART_SECRET || process.env.CRON_SECRET || '';
const sign = (theme: Theme, kind: MailKind, heading: string) =>
  createHmac('sha256', artKey()).update(`mail-art|${SIGN_VERSION}|${theme}|${kind}|${heading}`).digest('base64url').slice(0, 22);

/** The crew a picture may stand up: members of the crew, as the list spells them, none twice. */
export function figuresOf(v: readonly string[] | string | null | undefined): string[] {
  const list = typeof v === 'string' ? v.split(',') : v ?? [];
  return [...new Set(list.filter(isCrewUsername).map(canonicalUsername))].slice(0, 4);
}

export interface ArtExtras {
  /** the crew standing in the picture, by their Minecraft names */
  figures?: readonly string[];
  /** the moon's phase over the fire, 0 (new) to 7 */
  moon?: number;
}

/** Where a letter's picture is drawn. With a heading (and a key to sign it
    with), the picture carries the heading; otherwise the letter's title.
    The crew in it and the moon need no signature: the picture only ever
    stands up members of the crew, and there are only eight moons. */
export function artUrl(assets: string, theme: Theme, kind: MailKind, heading?: string, { figures, moon }: ArtExtras = {}): string {
  const who = figuresOf(figures);
  const m = theme === 'campfire' && Number.isInteger(moon) && moon! >= 0 && moon! <= 7 ? moon! : null;
  const extra = `${who.length ? `&f=${who.join(',')}` : ''}${m !== null ? `&m=${m}` : ''}`;
  const base = `${assets}/api/mail-art?t=${theme}&k=${kind}&v=${hash(`${DRAW_VERSION}|${theme}|${BANNERS[kind].tag}|${BANNERS[kind].title}`)}${extra}`;
  if (!heading || !artKey()) return base;
  return `${base}&h=${Buffer.from(heading, 'utf8').toString('base64url')}&s=${sign(theme, kind, heading)}`;
}

/** The heading a picture's address carries, if the site signed it; null for none, or for one it did not. */
export function artHeading(theme: Theme, kind: MailKind, h: string | null, s: string | null): string | null {
  if (!h || !s || !artKey()) return null;
  let heading: string;
  try { heading = Buffer.from(h, 'base64url').toString('utf8'); } catch { return null; }
  const want = Buffer.from(sign(theme, kind, heading)), got = Buffer.from(s);
  return heading.length <= 120 && want.length === got.length && timingSafeEqual(want, got) ? heading : null;
}

/** Where a letter's verse is drawn on its sign: the verse is the site's own (VERSES), so nothing is signed. */
export const verseUrl = (assets: string, theme: Theme, kind: MailKind, side = false) =>
  `${assets}/api/mail-art?d=verse&t=${theme}&k=${kind}${side ? '&n=1' : ''}&v=${hash(`${DRAW_VERSION}|${theme}|${VERSES[kind].join('|')}`)}`;

/** Where one of the welcome's small pictures is drawn. */
export const iconUrl = (assets: string, icon: MailIcon) => `${assets}/api/mail-art?d=icon&i=${icon}&v=${DRAW_VERSION}`;

/** When a letter was stamped, as the foot says it: "19. nóvember 2026 kl. 16:05" (Iceland keeps UTC). */
export function postmark(now: number): string {
  const d = new Date(now);
  const date = d.toLocaleDateString('is-IS', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return `${date} kl. ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export interface Rendered { subject: string; html: string; text: string }

export interface RenderOptions {
  /** false leaves the site's fonts out, as Gmail does */
  webFonts?: boolean;
  /** when the letter is written: its postmark, and the moon over the fire */
  now?: number;
}

/** The letter in its dress. `assets` is the site address the pictures and
    fonts are fetched from and the foot's links lead to. */
export function renderLetter(letter: Letter, theme: Theme, assets: string, { webFonts = true, now = Date.now() }: RenderOptions = {}): Rendered {
  const c = PALETTES[theme];
  const width = CARD;
  const artHeight = Math.round(width * ART.height / ART.width);
  /** Parts side by side, each `w` wide, that fall under one another where
      there is no room: boxes on a line, which every mail app can lay out,
      with no rule a phone must read (where it reads the phone's rules, each
      takes the whole line). No space between them, or it would show. */
  const cols = (cells: string[], w: number | number[]) =>
    `<div style="font-size:0;line-height:0;text-align:left">${cells.map((cell, i) => `<div class="jod-col" style="display:inline-block;width:100%;max-width:${typeof w === 'number' ? w : w[i]}px;vertical-align:top">${cell}</div>`).join('')}</div>`;
  /* the heading is drawn in the picture when it can be signed; otherwise it is written on the paper */
  const art = artUrl(assets, theme, letter.kind, letter.heading, { figures: letter.figures, moon: moonPhase(new Date(now)) });
  const headingInArt = art.includes('&h=');
  const strata = (h: number) => STRATA.map(s => `<tr><td height="${h}" bgcolor="${s}" style="height:${h}px;line-height:${h}px;font-size:0;background:${s}">&nbsp;</td></tr>`).join('');
  /* the badlands' bands stood on end, as a ticket's stub */
  const stub = STRATA.map(s => `<td width="5" bgcolor="${s}" style="width:5px;background:${s};font-size:0;line-height:0">&nbsp;</td>`).join('');

  const label = (s: string, color = c.faint, extra = '') =>
    `<p style="margin:0 0 10px;font-family:${FONT.label};${BOLD};font-size:11px;line-height:1.3;letter-spacing:2px;text-transform:uppercase;color:${color}${extra}">${esc(s)}</p>`;
  const p = (s: string) => `<p style="margin:0 0 14px;font-family:${FONT.text};font-size:15px;line-height:1.6;color:${c.ink}">${words(s)}</p>`;

  /* a section's title (the steps, the list): the slab face in the ink, so the letter's parts are found at a glance */
  const title = (s: string) =>
    `<h2 style="margin:0 0 14px;font-family:${FONT.display};${BOLD};font-size:19px;line-height:1.25;color:${c.ink}">${esc(s)}</h2>`;

  const heading = headingInArt ? '' :
    `<h1 class="jod-h1" style="margin:0 0 18px;font-family:${FONT.display};${BOLD};font-size:30px;line-height:1.15;color:${c.ink}">${esc(letter.heading)}</h1>`;

  const lead = letter.lead
    ? `<p class="jod-lead" style="margin:0 0 16px;font-family:${FONT.text};font-size:18px;line-height:1.5;color:${c.ink}">${words(letter.lead)}</p>`
    : '';

  const quote = letter.quote
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px"><tr><td style="border-left:4px solid ${c.quoteEdge};padding:2px 0 2px 14px;font-family:${FONT.text};font-size:19px;line-height:1.4;color:${c.ink}">„${esc(letter.quote)}“</td></tr></table>`
    : '';

  /** a ticket: the strata for a stub, a dashed tear, and its lines */
  const ticket = (inner: string) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${c.ticket}" style="margin:2px 0 18px;background:${c.ticket};border:2px solid ${c.ticketEdge}">
<tr>${stub}<td style="padding:12px 18px 10px;border-left:2px dashed ${c.ticketEdge}">${inner}</td></tr>
</table>`;

  const when = letter.when?.length
    ? ticket(`${label(letter.struck ? 'Aflýst' : letter.when.length > 1 ? 'Tímarnir' : 'Hvenær', letter.struck ? c.ticketEdge : c.faint, ';margin-bottom:6px')}
${letter.when.map(w => `<p class="jod-when" style="margin:0 0 4px;font-family:${FONT.label};${BOLD};font-size:16px;line-height:1.35;letter-spacing:1px;text-transform:uppercase;color:${c.ink}${letter.struck ? ';text-decoration:line-through' : ''}">${esc(w)}</p>`).join('\n')}`)
    : '';

  /* the address and the version side by side on the ticket */
  const facts = letter.facts?.length
    ? ticket(cols(letter.facts.map((f, i) =>
        `${label(f.label, c.faint, ';margin-bottom:4px')}<p class="jod-fact" style="margin:0 0 6px;padding-right:14px;font-family:${FONT.label};${BOLD};font-size:${i === 0 ? 20 : 15}px;line-height:26px;letter-spacing:1px;color:${c.ink}">${words(f.value)}</p>`), 262))
    : '';

  /* the steps across the card, a number and a title over each one's words */
  const steps = letter.steps
    ? `${title(letter.steps.title)}
${cols(letter.steps.list.map((s, i) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td width="42" valign="top" style="width:42px;padding:0 0 8px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="30" height="30" align="center" valign="middle" bgcolor="${c.badge}" style="width:30px;height:30px;background:${c.badge};border:2px solid ${c.outline};font-family:${FONT.label};${BOLD};font-size:14px;line-height:30px;color:${c.badgeInk}">${i + 1}</td></tr></table>
</td>
<td valign="middle" style="padding:0 14px 8px 0"><p style="margin:0;font-family:${FONT.text};${BOLD};font-size:15px;line-height:1.3;color:${c.ink}">${esc(s.title)}</p></td>
</tr>
<tr><td colspan="2" style="padding:0 18px 14px 0"><p style="margin:0;font-family:${FONT.text};font-size:14px;line-height:1.5;color:${c.soft}">${words(s.text)}</p></td></tr>
</table>`), 199)}`
    : '';

  /* the list, two across */
  const items = letter.items
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${c.ticket}" style="margin:18px 0 8px;background:${c.ticket};border-top:4px solid ${c.ticketEdge}">
<tr><td class="jod-box" style="padding:18px 8px 4px 22px">
${title(letter.items.title)}
${cols(letter.items.list.map(it => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="46" valign="top" style="width:46px;padding:2px 0 14px"><img src="${esc(iconUrl(assets, it.icon))}" width="${ICON_SIZE}" height="${ICON_SIZE}" alt="" style="display:block;width:${ICON_SIZE}px;height:${ICON_SIZE}px;border:0"></td>
<td valign="top" style="padding:0 16px 14px 0">
<p style="margin:0 0 2px;font-family:${FONT.label};${BOLD};font-size:13px;line-height:1.4;letter-spacing:1px;text-transform:uppercase;color:${c.ink}">${esc(it.title)}</p>
<p style="margin:0;font-family:${FONT.text};font-size:14px;line-height:1.5;color:${c.soft}">${words(it.text)}</p>
</td>
</tr></table>`), 282)}
</td></tr>
</table>`
    : '';

  const smallLink = (l: { label: string; url: string }) =>
    `<a href="${esc(l.url)}" style="font-family:${FONT.label};${BOLD};font-size:12px;letter-spacing:1px;text-transform:uppercase;white-space:nowrap;color:${c.link};text-decoration:underline">${esc(l.label)}&nbsp;→</a>`;
  /* the game's own button: a light edge above and to the left, a heavy one under it, the ink around it */
  const button = (b: { label: string; url: string }, wide = false) =>
    `<table role="presentation" cellpadding="0" cellspacing="0"${wide ? ' width="100%"' : ''} style="margin:8px 0 10px;${wide ? 'max-width:400px;' : ''}border:2px solid ${c.outline}"><tr>
<td bgcolor="${c.button}" align="center" style="background:${c.button};border-top:2px solid ${c.buttonLight};border-left:2px solid ${c.buttonLight};border-right:2px solid ${c.buttonEdge};border-bottom:5px solid ${c.buttonEdge}">
<a href="${esc(b.url)}" style="display:${wide ? 'block' : 'inline-block'};padding:13px 26px;font-family:${FONT.label};${BOLD};font-size:14px;line-height:1.2;letter-spacing:2px;text-transform:uppercase;text-align:center;color:${c.buttonInk};text-decoration:none">${esc(b.label).replace(/ kl\. /g, ' kl.&nbsp;')}</a>
</td></tr></table>`;

  /* answers straight from the letter: a button each, one under another, all as wide */
  const loud = (letter.answers ?? []).filter(a => !a.quiet);
  const answers = loud.map(a => button(a, true)).join('\n');

  /* the button, and in one row under it every smaller link: a quiet answer ("Kemst ekki") first */
  const links = [...(letter.answers ?? []).filter(a => a.quiet), ...(letter.links ?? [])].map(smallLink).join(`<span style="color:${c.rule}">&nbsp;&nbsp;·&nbsp;&nbsp;</span>`);
  const actions = `${letter.button ? button(letter.button) : ''}${links ? `<p style="margin:${letter.button || loud.length ? 6 : 0}px 0 8px;font-size:12px;line-height:2">${links}</p>` : ''}`;

  /* the verse, cut on a sign; where pictures are not shown, its words in a printed book's italic.
     A short letter stands its sign beside its words, so the whole letter is about a screen;
     a long one (the Borgarabréf) hangs it under them, full size. */
  const sideVerse = !!letter.verse?.length && !letter.steps && !letter.items;
  const sign = sideVerse ? VERSE_SIDE : VERSE_ART;
  const signImg = letter.verse?.length
    ? `<img src="${esc(verseUrl(assets, theme, letter.kind, sideVerse))}" width="${sign.width}" height="${sign.height}" alt="${esc(letter.verse.join(' / '))}" style="display:block;margin:0 auto;width:100%;max-width:${sign.width}px;height:auto;border:0;font-family:${FONT.book};font-style:italic;font-size:15px;line-height:1.55;text-align:center;color:${c.soft}">`
    : '';
  const verse = letter.verse?.length && !sideVerse
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 4px"><tr><td align="center">
${letter.verseIntro ? label(letter.verseIntro, c.faint, ';text-align:center;margin-bottom:12px') : ''}${signImg}
</td></tr></table>`
    : '';

  const small = `font-family:${FONT.text};font-size:12px;line-height:1.55;color:${c.faint}`;
  const foot = letter.foot.map(f => `<p style="margin:0 0 7px;${small}">${words(f)}</p>`).join('')
    + (letter.button ? `<p style="margin:0 0 7px;${small};word-break:break-all">Virkar hnappurinn ekki? Opnaðu <a href="${esc(letter.button.url)}" style="color:${c.faint}">${esc(letter.button.url)}</a></p>` : '')
    + (letter.footLink ? `<p style="margin:0;${small}"><a href="${esc(letter.footLink.url)}" style="color:${c.link}">${esc(letter.footLink.label)}</a></p>` : '');

  /* the site's three doors, as the bar on every page has them */
  const doors = [
    { label: 'Heimurinn', url: `${assets}/#heimur` },
    { label: 'Taflan',    url: `${assets}/taflan` },
    { label: 'Eftirlýst', url: `${assets}/crew` },
  ].map(d => `<a href="${esc(d.url)}" style="color:${c.barInk};text-decoration:none">${esc(d.label)}</a>`).join(`<span style="color:${c.barFaint}">&nbsp;&nbsp;·&nbsp;&nbsp;</span>`);
  const stamped = postmark(now);

  const html = `<!doctype html>
<html lang="is" dir="ltr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
<meta name="color-scheme" content="${c.scheme} only">
<meta name="supported-color-schemes" content="${c.scheme} only">
<title>${esc(letter.subject)}</title>
<style>
${webFonts ? `@font-face{font-family:'Alfa Slab One';font-style:normal;font-weight:400;src:url(${assets}/email-fonts/alfa-slab-one.woff2) format('woff2')}
@font-face{font-family:'Pixelify Sans';font-style:normal;font-weight:400;src:url(${assets}/email-fonts/pixelify-sans.woff2) format('woff2')}
@font-face{font-family:'Silkscreen';font-style:normal;font-weight:400;src:url(${assets}/email-fonts/silkscreen.woff2) format('woff2')}
` : ''}:root{color-scheme:${c.scheme} only}
a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important;font-size:inherit!important;font-family:inherit!important;font-weight:inherit!important;line-height:inherit!important}
</style>
<style>
body{margin:0;padding:0;word-spacing:normal;-webkit-text-size-adjust:100%;text-size-adjust:100%}
body,table,td,p,a,h1{font-variant-ligatures:none;font-feature-settings:"liga" 0,"clig" 0}
table,td{border-collapse:collapse}
a{text-decoration-thickness:2px;text-underline-offset:3px}
@media (max-width:700px){.jod-col{max-width:100%!important}.jod-sign{padding-left:0!important}.jod-pad{padding-left:22px!important;padding-right:22px!important}.jod-box{padding-left:16px!important;padding-right:16px!important}.jod-h1{font-size:26px!important}.jod-lead{font-size:17px!important}.jod-when{font-size:14px!important;letter-spacing:0!important}.jod-fact{letter-spacing:0!important}}
</style>
</head>
<body style="margin:0;padding:0;word-spacing:normal">
<div role="article" aria-roledescription="email" aria-label="${esc(letter.subject)}" lang="is" dir="ltr">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${esc(letter.preheader)}${'&#847;&zwnj;&nbsp;'.repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:14px 6px">
<table role="presentation" width="${width}" cellpadding="0" cellspacing="0" bgcolor="${c.card}" style="width:100%;max-width:${width}px;background:${c.card};border:1px solid ${c.frame}">
<tr><td bgcolor="${c.bar}" style="background:${c.bar}"><a href="${esc(assets)}" style="text-decoration:none"><img src="${esc(art)}" width="${width}" height="${artHeight}" alt="${esc(headingInArt ? letter.heading : `${BRAND} · ${BANNERS[letter.kind].title}`)}" style="display:block;width:100%;max-width:${width}px;height:auto;border:0;background:${c.bar};font-family:${FONT.display};${BOLD};font-size:24px;line-height:1.3;text-align:center;color:#E8DCC4"></a></td></tr>
${strata(3)}
<tr><td class="jod-pad" bgcolor="${c.card}" style="background:${c.card};padding:24px 40px 10px">
${heading}${lead}${quote}${when}${sideVerse
  ? cols([`<div style="padding:0 0 6px">${letter.lines.map(p).join('\n')}${answers}${actions}</div>`, `<div class="jod-sign" style="padding:4px 0 10px 20px">${signImg}</div>`], [CARD - 82 - VERSE_SIDE.width - 20, VERSE_SIDE.width + 20])
  : `${letter.lines.map(p).join('\n')}${facts}${steps}${answers}${actions}${items}${verse}`}
</td></tr>
<tr><td class="jod-pad" bgcolor="${c.card}" style="background:${c.card};padding:10px 40px 22px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:2px dashed ${c.rule};padding-top:14px">${foot}</td></tr></table>
</td></tr>
${strata(2)}
<tr><td align="center" bgcolor="${c.bar}" style="background:${c.bar};padding:16px 20px 14px;font-size:0;line-height:0;text-align:center">
<div style="display:inline-block;vertical-align:middle;padding:0 18px 6px"><table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
<td valign="middle" style="padding:0 10px 0 0"><a href="${esc(assets)}"><img src="${esc(`${assets}/icon-192.png`)}" width="24" height="24" alt="" style="display:block;width:24px;height:24px;border:0"></a></td>
<td valign="middle" style="font-family:${FONT.display};${BOLD};font-size:17px;line-height:24px;color:#E8DCC4"><a href="${esc(assets)}" style="color:#E8DCC4;text-decoration:none">${BRAND}</a></td>
</tr></table></div><div style="display:inline-block;vertical-align:middle;padding:0 18px 6px"><p style="margin:0;font-family:${FONT.label};${BOLD};font-size:11px;line-height:24px;letter-spacing:2px;text-transform:uppercase">${doors}</p></div>
<p style="margin:4px 0 0;font-family:${FONT.text};font-size:11px;line-height:1.5;color:${c.barFaint}">Stimplað í JOÐ ${esc(stamped)} · ${SERVER_HTML}</p>
</td></tr>
</table>
</td></tr>
</table>
</div>
</body>
</html>`;

  const text = [
    letter.heading.toUpperCase(),
    '',
    ...(letter.lead ? [letter.lead, ''] : []),
    ...(letter.quote ? [`„${letter.quote}“`, ''] : []),
    ...(letter.when?.length ? [...letter.when.map(w => `${letter.struck ? '(aflýst) ' : ''}${w}`), ''] : []),
    ...letter.lines.flatMap(l => [l, '']),
    ...(letter.facts ?? []).flatMap(f => [`${f.label}: ${f.value}`]),
    ...(letter.facts?.length ? [''] : []),
    ...(letter.steps ? [letter.steps.title.toUpperCase(), ...letter.steps.list.flatMap((s, i) => [`${i + 1}. ${s.title}`, `   ${s.text}`]), ''] : []),
    ...(letter.answers ?? []).flatMap(a => [`${a.label}: ${a.url}`, '']),
    ...(letter.button ? [`${letter.button.label}: ${letter.button.url}`, ''] : []),
    ...(letter.links ?? []).flatMap(l => [`${l.label}: ${l.url}`, '']),
    ...(letter.items ? [letter.items.title.toUpperCase(), ...letter.items.list.flatMap(it => [`* ${it.title}: ${it.text}`]), ''] : []),
    ...(letter.verse?.length ? [...(letter.verseIntro ? [`${letter.verseIntro}:`, ''] : []), ...letter.verse, ''] : []),
    '--',
    ...letter.foot,
    ...(letter.footLink ? [`${letter.footLink.label}: ${letter.footLink.url}`] : []),
    '',
    `${BRAND} · ${SERVER}`,
  ].join('\n').trim() + '\n';

  return { subject: letter.subject, html, text };
}
