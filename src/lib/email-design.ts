// How a letter looks: two dresses for the same words (src/lib/email-copy.ts).
//
//   Sólsetur   the site at sunset: sky and mesa in the picture, the words on
//              parchment, nailed up like everything pinned on the site
//   Varðeldur  the site at night: stars and a campfire in the picture, the
//              words light on warm dark wood
//
// The picture at the top (/api/mail-art) carries the letter's title in the
// site's own fonts, so it reads the same in every mail app. The words under
// it ask for the same fonts (served from /email-fonts); Apple Mail and some
// others show them, Gmail and Outlook fall back to the faces named after.
// Mail apps read only the simplest HTML: tables, inline styles, no scripts.
import { BANNERS, type Letter, type MailKind } from '@/lib/email-copy';

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
const DESIGN_VERSION = 1;

/* The site's tokens (src/app/tokens.css); mail apps read no CSS variables. */
const STRATA = ['#A15325', '#BA8523', '#D1B2A1', '#8F3D2E', '#4D3323'];

interface Palette {
  page: string; card: string; ink: string; soft: string; faint: string; rule: string;
  ticket: string; ticketEdge: string; link: string; quoteEdge: string;
  /** the nail the paper hangs by; none on the campfire's wood */
  nail: string | null;
  button: string; buttonInk: string; buttonEdge: string;
  scheme: 'light' | 'dark';
}

const PALETTES: Record<Theme, Palette> = {
  sunset: {
    page: '#15100D', card: '#E8DCC4', ink: '#1E1611', soft: '#5A4634', faint: '#6E5A45', rule: '#C9B89A',
    ticket: '#DCCDB0', ticketEdge: '#A15325', link: '#A3620F', quoteEdge: '#C9801F', nail: '#4D3323',
    button: '#F2A63B', buttonInk: '#1E1611', buttonEdge: '#9A5F14', scheme: 'light',
  },
  campfire: {
    page: '#0B0910', card: '#1E1611', ink: '#E8DCC4', soft: '#D1B2A1', faint: '#A08C78', rule: '#3A2B21',
    ticket: '#2A1F18', ticketEdge: '#E0602A', link: '#F2A63B', quoteEdge: '#E0602A', nail: null,
    button: '#F2A63B', buttonInk: '#1E1611', buttonEdge: '#9A5F14', scheme: 'dark',
  },
};

/* The heading asks for bold: the slab face has one weight and is never
   thickened (font-synthesis: none), while a stand-in such as Georgia comes
   out bold instead of thin. */
const FONT = {
  display: `'Alfa Slab One',Rockwell,'Rockwell Extra Bold','Roboto Slab',Georgia,serif`,
  text:    `'Pixelify Sans','Trebuchet MS',Verdana,sans-serif`,
  label:   `Silkscreen,'Courier New',Courier,monospace`,
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A short stable hash, so a picture's address changes whenever its words or drawing do. */
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Where a letter's picture is drawn. */
export const artUrl = (assets: string, theme: Theme, kind: MailKind) =>
  `${assets}/api/mail-art?t=${theme}&k=${kind}&v=${hash(`${DESIGN_VERSION}|${theme}|${BANNERS[kind].tag}|${BANNERS[kind].title}`)}`;

export interface Rendered { subject: string; html: string; text: string }

/** The letter in its dress. `assets` is the site address the picture and fonts
    are fetched from; `webFonts: false` leaves the fonts out, as Gmail does. */
export function renderLetter(letter: Letter, theme: Theme, assets: string, { webFonts = true }: { webFonts?: boolean } = {}): Rendered {
  const c = PALETTES[theme];
  const banner = BANNERS[letter.kind];
  const strata = (h: number) => STRATA.map(s => `<tr><td height="${h}" style="height:${h}px;line-height:${h}px;font-size:0;background:${s}">&nbsp;</td></tr>`).join('');

  const p = (s: string) => `<p style="margin:0 0 16px;font-family:${FONT.text};font-size:17px;line-height:1.55;color:${c.ink}">${esc(s)}</p>`;

  const quote = letter.quote
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px"><tr><td style="border-left:4px solid ${c.quoteEdge};padding:2px 0 2px 14px;font-family:${FONT.text};font-size:20px;line-height:1.4;color:${c.ink}">„${esc(letter.quote)}“</td></tr></table>`
    : '';

  const ticket = letter.when?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;background:${c.ticket};border:2px dashed ${c.ticketEdge}">
<tr><td style="padding:14px 18px 4px;font-family:${FONT.label};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${c.faint}">${letter.struck ? 'Aflýst' : letter.when.length > 1 ? 'Tímarnir' : 'Hvenær'}</td></tr>
${letter.when.map(w => `<tr><td class="jod-when" style="padding:4px 18px;font-family:${FONT.label};font-size:16px;letter-spacing:1px;color:${c.ink}${letter.struck ? ';text-decoration:line-through' : ''}">${esc(w)}</td></tr>`).join('')}
<tr><td height="10" style="height:10px;line-height:10px;font-size:0">&nbsp;</td></tr>
</table>`
    : '';

  const button = letter.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 14px"><tr>
<td bgcolor="${c.button}" style="background:${c.button};border:2px solid ${c.buttonEdge};border-bottom-width:5px">
<a href="${esc(letter.button.url)}" style="display:inline-block;padding:14px 26px;font-family:${FONT.label};font-size:15px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${c.buttonInk};text-decoration:none">${esc(letter.button.label)}</a>
</td></tr></table>
<p style="margin:0 0 18px;font-family:${FONT.text};font-size:12px;line-height:1.5;color:${c.faint};word-break:break-all">eða opnaðu: <a href="${esc(letter.button.url)}" style="color:${c.faint}">${esc(letter.button.url)}</a></p>`
    : '';

  const links = (letter.links ?? []).map(l =>
    `<p style="margin:0 0 12px;font-family:${FONT.label};font-size:13px;letter-spacing:1px;text-transform:uppercase"><a href="${esc(l.url)}" style="color:${c.link}">${esc(l.label)} →</a></p>`).join('');

  const foot = letter.foot.map(f => `<p style="margin:0 0 8px;font-family:${FONT.text};font-size:13px;line-height:1.5;color:${c.faint}">${esc(f)}</p>`).join('')
    + (letter.footLink ? `<p style="margin:0 0 8px;font-family:${FONT.text};font-size:13px;line-height:1.5"><a href="${esc(letter.footLink.url)}" style="color:${c.link}">${esc(letter.footLink.label)}</a></p>` : '');

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
body{margin:0;padding:0;background:${c.page}}
body,table,td,p,a,h1{font-variant-ligatures:none;font-feature-settings:"liga" 0,"clig" 0}
a{text-decoration-thickness:2px;text-underline-offset:3px}
@media (max-width:620px){.jod-pad{padding-left:22px!important;padding-right:22px!important}.jod-h1{font-size:27px!important}.jod-when{font-size:13px!important;letter-spacing:0!important;padding-left:14px!important;padding-right:14px!important}}
</style>
</head>
<body style="margin:0;padding:0;background:${c.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${c.page}">${esc(letter.preheader)}${'&#847;&zwnj;&nbsp;'.repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${c.page}" style="background:${c.page}">
<tr><td align="center" style="padding:28px 10px 36px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
<tr><td style="background:${c.page}"><a href="${esc(assets)}" style="text-decoration:none"><img src="${esc(artUrl(assets, theme, letter.kind))}" width="600" height="200" alt="JOÐ · ${esc(banner.title)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;background:${c.card};font-family:${FONT.display};font-size:28px;line-height:200px;text-align:center;color:${c.ink}"></a></td></tr>
${strata(4)}
<tr><td class="jod-pad" bgcolor="${c.card}" style="background:${c.card};padding:30px 44px 6px">
${c.nail ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 20px"><div style="width:10px;height:10px;line-height:10px;font-size:0;background:${c.nail}">&nbsp;</div></td></tr></table>` : ''}
<h1 class="jod-h1" style="margin:0 0 22px;font-family:${FONT.display};font-weight:700;font-synthesis:none;font-size:32px;line-height:1.15;color:${c.ink}">${esc(letter.heading)}</h1>
${quote}
${ticket}
${letter.lines.map(p).join('\n')}
${button}
${links}
</td></tr>
<tr><td class="jod-pad" bgcolor="${c.card}" style="background:${c.card};padding:6px 44px 26px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:2px dashed ${c.rule};padding-top:16px">${foot}</td></tr></table>
</td></tr>
${strata(3)}
<tr><td align="center" style="padding:20px 0 0;font-family:${FONT.label};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#A08C78">
<a href="${esc(assets)}" style="color:#A08C78;text-decoration:none">JOÐ · play.jodcraft.world</a>
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
    '--',
    ...letter.foot,
    ...(letter.footLink ? [`${letter.footLink.label}: ${letter.footLink.url}`] : []),
    '',
    'JOÐ · play.jodcraft.world',
  ].join('\n').trim() + '\n';

  return { subject: letter.subject, html, text };
}
