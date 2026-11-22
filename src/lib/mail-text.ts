// Words drawn as small pictures in a letter (src/lib/email-design.ts): the
// section titles and the times in the slab face and the small labels in the
// pixel capitals. Gmail and Outlook load no fonts, so these few words are
// drawn by /api/mail-art?d=text in the site's own faces, as the heading in
// the picture at the top is; the paragraphs, the buttons and the server's
// address stay words, to be read aloud, selected and copied.
//
// A picture must be given its size before it is drawn, so each letter's
// width is kept here, measured once off the fonts (in thousandths of the
// font's size). A guess a little wide only leaves air to the right.

export type DrawnStyle = 'title' | 'label' | 'item' | 'value' | 'struck';
export const DRAWN_STYLES: DrawnStyle[] = ['title', 'label', 'item', 'value', 'struck'];
export const isDrawnStyle = (v: unknown): v is DrawnStyle => typeof v === 'string' && (DRAWN_STYLES as string[]).includes(v);

/** The colour a drawn word takes from the letter's look. */
export type Tone = 'ink' | 'faint' | 'edge';
export const TONES: Tone[] = ['ink', 'faint', 'edge'];
export const isTone = (v: unknown): v is Tone => typeof v === 'string' && (TONES as string[]).includes(v);

interface Style {
  face: 'slab' | 'pixel';
  /** the size as shown, the air between letters, and the line's height */
  size: number; spacing: number; height: number;
  /** the pixel face has capitals only */
  upper: boolean;
  /** crossed out (a night called off) */
  strike?: boolean;
  /** the most letters in one picture: longer words are drawn as several, so a line breaks between them on a phone */
  chunk: number;
}

export const DRAWN: Record<DrawnStyle, Style> = {
  title:  { face: 'slab',  size: 20, spacing: 0, height: 28, upper: false, chunk: 22 },
  label:  { face: 'pixel', size: 12, spacing: 2, height: 16, upper: true,  chunk: 22 },
  item:   { face: 'pixel', size: 14, spacing: 1, height: 20, upper: true,  chunk: 20 },
  value:  { face: 'slab',  size: 19, spacing: 0, height: 26, upper: false, chunk: 18 },
  struck: { face: 'slab',  size: 19, spacing: 0, height: 26, upper: false, chunk: 18, strike: true },
};

/* widths in thousandths of the size: [width, the letters that wide] */
const SLAB: [number, string][] = [
  [250, "'·.:,;"], [300, ' '], [350, 'j!iíl"'], [390, '()f„“”-'], [425, '*IÍ/'], [455, 't'], [530, '=s1r'], [580, '–cz+'],
  [620, 'eé_ðaá'], [640, '3?Foyóýöx'], [665, '725vqþLgdpbJ'], [700, 'SkuúZ694hn8'], [740, 'EÉC0#P'], [785, 'ÞBYÝTUÚGV'],
  [810, 'OÓÖRXDAÁQ'], [840, 'Ð&KH'], [905, '%æ'], [956, 'Nw'], [1042, '→m'], [1150, 'ÆM@'], [1207, 'W'],
];
const PIXEL: [number, string][] = [
  [375, "!'.:IiÍí·"], [500, ' (),;'], [625, '1"-/=EFLTZefltzÉÞéþ„“”'],
  [750, '023456789&?ABCDGHJKOPQRSU_abcdghjkopqrsuÁÓÚÖáóúö–'], [875, '#%*+@MNVWXYmnvwxyÐÝÆðýæ'], [1000, '→'],
];
const table = (groups: [number, string][]) => new Map(groups.flatMap(([w, chars]) => [...chars].map(ch => [ch, w] as [string, number])));
const WIDTHS = { slab: table(SLAB), pixel: table(PIXEL) };

/** The words as they are drawn: the pixel face's in capitals. */
export const drawnText = (style: DrawnStyle, text: string) => (DRAWN[style].upper ? text.toLocaleUpperCase('is-IS') : text);

/** How wide the words are drawn, in the pixels they are shown at. */
export function drawnWidth(style: DrawnStyle, text: string): number {
  const s = DRAWN[style];
  const widths = WIDTHS[s.face];
  let w = 0;
  for (const ch of drawnText(style, text)) w += ((widths.get(ch) ?? 1000) / 1000) * s.size + s.spacing;
  /* a little air: the fonts' own pairs of letters sit a hair apart from the sum of them */
  return Math.ceil(w * 1.03) + 2;
}

/** The words in pieces no longer than the style's `chunk`, broken between
    words (and before "kl." in a time), each drawn as a picture of its own. */
export function drawnChunks(style: DrawnStyle, text: string): string[] {
  const max = DRAWN[style].chunk;
  const out: string[] = [];
  for (const word of text.trim().split(/\s+/)) {
    const last = out[out.length - 1];
    if (last !== undefined && word !== 'kl.' && `${last} ${word}`.length <= max) out[out.length - 1] = `${last} ${word}`;
    else out.push(word);
  }
  return out;
}
