// How a letter looks: two dresses for the same words (src/lib/email-copy.ts).
//
//   Sólsetur   the site at sunset: sky and mesa in the picture, the words on
//              parchment, a card framed like everything pinned on the site
//   Varðeldur  the site at night: stars and a campfire in the picture, the
//              words light on warm dark wood
//
// The picture at the top (/api/mail-art) carries the letter's own heading
// ("Söðlaðu hestinn, Jóna") in the site's slab face, so the loudest words
// read the same in every mail app. Its address is signed, so the site only
// ever draws words it wrote itself. The words under it ask for the site's
// fonts (served from /email-fonts); Apple Mail and some others show them,
// while Gmail and Outlook show none, so the stand-ins are chosen to keep the
// look: Verdana, the screen face nearest the pixel letters, and bold capitals
// for the labels, times and buttons.
// Mail apps read only the simplest HTML: tables, inline styles, no scripts.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { BANNERS, BRAND, type Letter, type MailKind } from '@/lib/email-copy';

export type Theme = 'sunset' | 'campfire';
export const THEMES: Theme[] = ['sunset', 'campfire'];
export const THEME_NAMES: Record<Theme, string> = { sunset: 'Sólsetur', campfire: 'Varðeldur' };

/** The look each letter has until another is chosen in the admin panel:
    the day's letters at sunset, the evening's by the fire. */
export const DEFAULT_THEMES: Record<MailKind, Theme> = {
  signin: 'sunset', lit: 'sunset', chosen: 'sunset', soon: 'campfire', out: 'campfire',
};

export const isTheme = (v: unknown): v is Theme => v === 'sunset' || v === 'campfire';

/** Bump to make mail apps fetch every picture afresh after the drawing changes. */
const DESIGN_VERSION = 4;

/** The picture's size as shown; it is drawn at twice this. */
export const ART = { width: 600, height: 190 };

/* The site's tokens (src/app/tokens.css); mail apps read no CSS variables. */
const STRATA = ['#A15325', '#BA8523', '#D1B2A1', '#8F3D2E', '#4D3323'];

interface Palette {
  /** the card, its thin frame, and the dark bar at its foot (and behind the picture while it loads) */
  card: string; frame: string; bar: string;
  ink: string; soft: string; faint: string; rule: string;
  ticket: string; ticketEdge: string; link: string; quoteEdge: string;
  button: string; buttonInk: string; buttonEdge: string;
  scheme: 'light' | 'dark';
}

const PALETTES: Record<Theme, Palette> = {
  sunset: {
    card: '#E8DCC4', frame: '#4D3323', bar: '#15100D', ink: '#1E1611', soft: '#5A4634', faint: '#6E5A45', rule: '#C9B89A',
    ticket: '#DCCDB0', ticketEdge: '#A15325', link: '#A3620F', quoteEdge: '#C9801F',
    button: '#F2A63B', buttonInk: '#1E1611', buttonEdge: '#9A5F14', scheme: 'light',
  },
  campfire: {
    card: '#1E1611', frame: '#0B0910', bar: '#0B0910', ink: '#E8DCC4', soft: '#D1B2A1', faint: '#A08C78', rule: '#3A2B21',
    ticket: '#2A1F18', ticketEdge: '#E0602A', link: '#F2A63B', quoteEdge: '#E0602A',
    button: '#F2A63B', buttonInk: '#1E1611', buttonEdge: '#9A5F14', scheme: 'dark',
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
};
const BOLD = 'font-weight:700;font-synthesis:none';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A short stable hash, so a picture's address changes whenever its words or drawing do. */
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/* The key a picture's heading is signed with: a secret the site already
   keeps, so there is nothing new to set up. Changing it only costs old
   letters their heading; their picture falls back to the plain one. */
const artKey = () => process.env.MAIL_ART_SECRET || process.env.CRON_SECRET || process.env.ADMIN_TOKEN || '';
const sign = (theme: Theme, kind: MailKind, heading: string) =>
  createHmac('sha256', artKey()).update(`mail-art|${DESIGN_VERSION}|${theme}|${kind}|${heading}`).digest('base64url').slice(0, 22);

/** Where a letter's picture is drawn. With a heading (and a key to sign it
    with), the picture carries the heading; otherwise the letter's title. */
export function artUrl(assets: string, theme: Theme, kind: MailKind, heading?: string): string {
  const base = `${assets}/api/mail-art?t=${theme}&k=${kind}&v=${hash(`${DESIGN_VERSION}|${theme}|${BANNERS[kind].tag}|${BANNERS[kind].title}`)}`;
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

export interface Rendered { subject: string; html: string; text: string }

/** The letter in its dress. `assets` is the site address the picture and fonts
    are fetched from; `webFonts: false` leaves the fonts out, as Gmail does. */
export function renderLetter(letter: Letter, theme: Theme, assets: string, { webFonts = true }: { webFonts?: boolean } = {}): Rendered {
  const c = PALETTES[theme];
  /* the heading is drawn in the picture when it can be signed; otherwise it is written on the paper */
  const art = artUrl(assets, theme, letter.kind, letter.heading);
  const headingInArt = art.includes('&h=');
  const strata = (h: number) => STRATA.map(s => `<tr><td height="${h}" style="height:${h}px;line-height:${h}px;font-size:0;background:${s}">&nbsp;</td></tr>`).join('');

  const p = (s: string) => `<p style="margin:0 0 14px;font-family:${FONT.text};font-size:15px;line-height:1.55;color:${c.ink}">${esc(s)}</p>`;

  const heading = headingInArt ? '' :
    `<h1 class="jod-h1" style="margin:0 0 18px;font-family:${FONT.display};${BOLD};font-size:30px;line-height:1.15;color:${c.ink}">${esc(letter.heading)}</h1>`;

  const quote = letter.quote
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px"><tr><td style="border-left:4px solid ${c.quoteEdge};padding:1px 0 1px 12px;font-family:${FONT.text};font-size:18px;line-height:1.4;color:${c.ink}">„${esc(letter.quote)}“</td></tr></table>`
    : '';

  const ticket = letter.when?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:${c.ticket};border:2px dashed ${c.ticketEdge}">
<tr><td style="padding:11px 16px 3px;font-family:${FONT.label};${BOLD};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${c.faint}">${letter.struck ? 'Aflýst' : letter.when.length > 1 ? 'Tímarnir' : 'Hvenær'}</td></tr>
${letter.when.map(w => `<tr><td class="jod-when" style="padding:3px 16px;font-family:${FONT.label};${BOLD};font-size:15px;letter-spacing:1px;text-transform:uppercase;color:${c.ink}${letter.struck ? ';text-decoration:line-through' : ''}">${esc(w)}</td></tr>`).join('')}
<tr><td height="9" style="height:9px;line-height:9px;font-size:0">&nbsp;</td></tr>
</table>`
    : '';

  /* the button, with any smaller links beside it (under it on a phone) */
  const links = (letter.links ?? []).map(l =>
    `<a href="${esc(l.url)}" style="font-family:${FONT.label};${BOLD};font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${c.link}">${esc(l.label)}&nbsp;→</a>`).join('<br>');
  const actions = letter.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 4px"><tr>
<td bgcolor="${c.button}" style="background:${c.button};border:2px solid ${c.buttonEdge};border-bottom-width:5px">
<a href="${esc(letter.button.url)}" style="display:inline-block;padding:13px 24px;font-family:${FONT.label};${BOLD};font-size:14px;letter-spacing:2px;text-transform:uppercase;color:${c.buttonInk};text-decoration:none">${esc(letter.button.label)}</a>
</td>
${links ? `<td class="jod-stack" style="padding:0 0 0 20px;vertical-align:middle">${links}</td>` : ''}
</tr></table>`
    : links ? `<p style="margin:0">${links}</p>` : '';

  /* the verse in a printed book's italic, the same in every mail app */
  const verse = letter.verse?.length
    ? `<p style="margin:18px 0 6px;padding-left:14px;border-left:2px dotted ${c.rule};font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:15px;line-height:1.55;color:${c.soft}">${letter.verse.map(esc).join('<br>')}</p>`
    : '';

  const small = `font-family:${FONT.text};font-size:12px;line-height:1.5;color:${c.faint}`;
  const foot = letter.foot.map(f => `<p style="margin:0 0 6px;${small}">${esc(f)}</p>`).join('')
    + (letter.button ? `<p style="margin:0 0 6px;${small};word-break:break-all">Virkar hnappurinn ekki? Opnaðu <a href="${esc(letter.button.url)}" style="color:${c.faint}">${esc(letter.button.url)}</a></p>` : '')
    + (letter.footLink ? `<p style="margin:0;${small}"><a href="${esc(letter.footLink.url)}" style="color:${c.link}">${esc(letter.footLink.label)}</a></p>` : '');

  const html = `<!doctype html>
<html lang="is" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="${c.scheme} only">
<meta name="supported-color-schemes" content="${c.scheme} only">
<title>${esc(letter.subject)}</title>
<style>
${webFonts ? `@font-face{font-family:'Alfa Slab One';font-style:normal;font-weight:400;src:url(${assets}/email-fonts/alfa-slab-one.woff2) format('woff2')}
@font-face{font-family:'Pixelify Sans';font-style:normal;font-weight:400;src:url(${assets}/email-fonts/pixelify-sans.woff2) format('woff2')}
@font-face{font-family:'Silkscreen';font-style:normal;font-weight:400;src:url(${assets}/email-fonts/silkscreen.woff2) format('woff2')}
` : ''}:root{color-scheme:${c.scheme} only}
body{margin:0;padding:0}
body,table,td,p,a,h1{font-variant-ligatures:none;font-feature-settings:"liga" 0,"clig" 0}
a{text-decoration-thickness:2px;text-underline-offset:3px}
@media (max-width:620px){.jod-pad{padding-left:20px!important;padding-right:20px!important}.jod-h1{font-size:26px!important}.jod-when{font-size:13px!important;letter-spacing:0!important;padding-left:12px!important;padding-right:12px!important}.jod-stack{display:block!important;padding:14px 0 0!important}}
</style>
</head>
<body style="margin:0;padding:0">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(letter.preheader)}${'&#847;&zwnj;&nbsp;'.repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:12px 6px">
<table role="presentation" width="${ART.width}" cellpadding="0" cellspacing="0" bgcolor="${c.card}" style="width:100%;max-width:${ART.width}px;background:${c.card};border:1px solid ${c.frame}">
<tr><td style="background:${c.bar}"><a href="${esc(assets)}" style="text-decoration:none"><img src="${esc(art)}" width="${ART.width}" height="${ART.height}" alt="${esc(headingInArt ? letter.heading : `${BRAND} · ${BANNERS[letter.kind].title}`)}" style="display:block;width:100%;max-width:${ART.width}px;height:auto;border:0;background:${c.bar};font-family:${FONT.display};${BOLD};font-size:24px;line-height:1.3;text-align:center;color:#E8DCC4"></a></td></tr>
${strata(3)}
<tr><td class="jod-pad" bgcolor="${c.card}" style="background:${c.card};padding:24px 40px 10px">
${heading}${quote}${ticket}${letter.lines.map(p).join('\n')}${actions}${verse}
</td></tr>
<tr><td class="jod-pad" bgcolor="${c.card}" style="background:${c.card};padding:8px 40px 20px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:2px dashed ${c.rule};padding-top:12px">${foot}</td></tr></table>
</td></tr>
${strata(2)}
<tr><td align="center" bgcolor="${c.bar}" style="background:${c.bar};padding:11px 20px;font-family:${FONT.label};${BOLD};font-size:11px;letter-spacing:2px">
<a href="${esc(assets)}" style="color:#F2A63B;text-decoration:none">${BRAND} · play.jodcraft.world</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    letter.heading.toUpperCase(),
    '',
    ...(letter.quote ? [`„${letter.quote}“`, ''] : []),
    ...(letter.when?.length ? [...letter.when.map(w => `${letter.struck ? '(aflýst) ' : ''}${w}`), ''] : []),
    ...letter.lines.flatMap(l => [l, '']),
    ...(letter.button ? [`${letter.button.label}: ${letter.button.url}`, ''] : []),
    ...(letter.links ?? []).flatMap(l => [`${l.label}: ${l.url}`, '']),
    ...(letter.verse?.length ? [...letter.verse, ''] : []),
    '--',
    ...letter.foot,
    ...(letter.footLink ? [`${letter.footLink.label}: ${letter.footLink.url}`] : []),
    '',
    `${BRAND} · play.jodcraft.world`,
  ].join('\n').trim() + '\n';

  return { subject: letter.subject, html, text };
}
