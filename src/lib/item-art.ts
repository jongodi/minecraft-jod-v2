/* The items' pictures (src/lib/reactions.ts), drawn on the game's
   sixteen-pixel grid. This is the one source of the icons the site shows:
   src/app/items.css is drawn from it (src/lib/__tests__/reactions.test.ts
   holds the two together, and `npx vitest run -u reactions` draws the sheet
   again after a change), so the art never reaches the browser as script. */
import { ITEMS, type ItemId } from '@/lib/reactions';

/* The palette. One letter a colour; a dot is nothing. */
const PALETTE: Record<string, string> = {
  o: '#1E1611',                                                   // the outline, the site's ink
  w: '#F2EEE3', W: '#D2CABA', r: '#C23A2E', s: '#C68A4C', S: '#8E5A2C', // cake: icing, berries, sponge
  c: '#7DEBE0', C: '#2FB3A8', d: '#17716A', '+': '#F2FFFD',       // diamond, and its glint
  h: '#D7302B', H: '#8C1A15', p: '#F5A29C',                       // heart and petals
  g: '#5E9A32', G: '#2E5A17', k: '#2A1A10',                       // stem, leaves; the dark of eyes and seeds
  i: '#DCD8D0', I: '#A7A39B', j: '#6E6A63', t: '#8A5D33', T: '#4D3323', // pickaxe: iron, handle
  m: '#C98C47', M: '#93602C', x: '#3B2416',                       // cookie and its chips
  e: '#62BE4C', E: '#3E8F2F', f: '#2A6B22',                       // creeper
  b: '#E8E3D2', B: '#BEB8A4', n: '#8C8676',                       // skull
};

/* Two faces drawn eight by eight, the way the game draws a head, and shown
   at the others' size: each pixel twice in each direction. */
const twice = (rows: string[]) => rows.flatMap(r => { const w = r.replace(/./g, c => c + c); return [w, w]; });

export const ART: Record<ItemId, readonly string[]> = {
  cake: [
    '................',
    '................',
    '................',
    '....oooooooo....',
    '..oowwwwwwwwoo..',
    '.owwrwwwwwwrwwo.',
    '.owwwwwwrwwwwwo.',
    '.owrwwwwwwwwrwo.',
    '.oWwwwwwwwwwwWo.',
    '.osWWwwWWWwwWso.',
    '.ossSWWssSWWsso.',
    '.osssssssssssso.',
    '.oSssssssssssSo.',
    '.oSSSssssssSSSo.',
    '..oooooooooooo..',
    '................',
  ],
  diamond: [
    '................',
    '................',
    '....oooooooo....',
    '...o+ccccccCo...',
    '..o+cccccccCCo..',
    '.o+ccccccccCCCo.',
    '.oooooooooooooo.',
    '.occccccCCCCddo.',
    '..occcccCCCddo..',
    '...occccCCddo...',
    '....occcCCdo....',
    '.....occCdo.....',
    '......ocdo......',
    '.......oo.......',
    '................',
    '................',
  ],
  heart: [
    '................',
    '................',
    '..oooo....oooo..',
    '.ohhhho..ohhhho.',
    'ohppphhoohhhhhho',
    'ohpphhhhhhhhhhho',
    'ohphhhhhhhhhhHho',
    'ohhhhhhhhhhhhHho',
    '.ohhhhhhhhhhHHo.',
    '..ohhhhhhhhHHo..',
    '...ohhhhhhHHo...',
    '....ohhhhHHo....',
    '.....ohhHHo.....',
    '......ohHo......',
    '.......oo.......',
    '................',
  ],
  poppy: [
    '................',
    '.....oooooo.....',
    '....ohhhhhho....',
    '...ohhHhhHhho...',
    '...ohhhkkhhho...',
    '...ohHhkkhHho...',
    '....ohhhhhho....',
    '.....oohhoo.....',
    '.......og.......',
    '...oo..og.......',
    '..ogGo.og..oo...',
    '..oggGoogoogGo..',
    '...oggGggogGo...',
    '....ooggggoo....',
    '.......og.......',
    '.......oo.......',
  ],
  pickaxe: [
    '................',
    '...ooooooo......',
    '..oiiiiiiioo....',
    '..oIIIIIIIiio...',
    '...ooooooIIio...',
    '........otIjjo..',
    '.......otToIjo..',
    '......otTo.oIjo.',
    '.....otTo..oIjo.',
    '....otTo....ojo.',
    '...otTo.....oo..',
    '..otTo..........',
    '.otTo...........',
    '.oTo............',
    '..o.............',
    '................',
  ],
  cookie: [
    '................',
    '.....oooooo.....',
    '...oommmmmmoo...',
    '..ommmxmmmmmmo..',
    '..ommmmmmmxmmo..',
    '.ommxmmmmmmmmMo.',
    '.ommmmmmxmmmmMo.',
    '.ommmmmmmmmmMMo.',
    '.omxmmmmmmmxMMo.',
    '.ommmmmxmmmMMMo.',
    '..ommmmmmmMMMo..',
    '..oMmxmmmMMMMo..',
    '...ooMMMMMMoo...',
    '.....oooooo.....',
    '................',
    '................',
  ],
  creeper: twice([
    'eEeeefee',
    'eeEeeeEe',
    'ekkeEkke',
    'ekkeekkE',
    'eEekkeee',
    'eekkkkEe',
    'fekkkkee',
    'eekeekeE',
  ]),
  skull: twice([
    'bBbbbbBb',
    'bbbbBbbb',
    'bbbbbbbb',
    'bkkbbkkb',
    'bkkbbkkb',
    'bbbnnbbb',
    'bkbkkbkb',
    'Bbbbbbbn',
  ]),
};

/* ─── the icons ──────────────────────────────────────────────────────────── */

/** An item drawn as SVG: one path a colour, each run of pixels on a row a
    rectangle of it, carried down while the rows under it repeat the run, so
    an icon is a dozen elements and a small file however many pixels. */
export function itemSvg(id: ItemId): string {
  const rects: { ch: string; x: number; y: number; w: number; h: number }[] = [];
  let above: typeof rects = [];
  ART[id].forEach((row, y) => {
    const here: typeof rects = [];
    for (let x = 0; x < row.length;) {
      const ch = row[x];
      let w = 1;
      while (row[x + w] === ch) w += 1;
      if (PALETTE[ch]) {
        const r = above.find(a => a.ch === ch && a.x === x && a.w === w);
        if (r) r.h += 1;
        else rects.push({ ch, x, y, w, h: 1 });
        here.push(r ?? rects[rects.length - 1]);
      }
      x += w;
    }
    above = here;
  });
  const paths = new Map<string, string>();
  for (const { ch, x, y, w, h } of rects) paths.set(ch, `${paths.get(ch) ?? ''}M${x} ${y}h${w}v${h}H${x}z`);
  const body = Array.from(paths, ([ch, d]) => `<path fill='${PALETTE[ch]}' d='${d}'/>`).join('');
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'>${body}</svg>`;
}

/** The icon as a CSS url(), encoded the way the site's other drawn tiles are. */
export const itemUrl = (id: ItemId) => `url("data:image/svg+xml,${itemSvg(id).replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23')}")`;

/** The sheet of icons, src/app/items.css: each item's picture on its class. */
export function itemsCss(): string {
  const head = [
    '/* The items the crew give a sign (src/lib/reactions.ts), one class each.',
    '   Drawn from the art in src/lib/item-art.ts by its test: change the art,',
    '   then `npx vitest run -u reactions` draws this sheet again. */',
  ].join('\n');
  return `${head}\n${ITEMS.map(i => `.w-item--${i.id} { background-image: ${itemUrl(i.id)}; }`).join('\n')}\n`;
}
