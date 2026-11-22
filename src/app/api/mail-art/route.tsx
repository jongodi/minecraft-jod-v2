import type { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';
import { BANNERS, BRAND, MAIL_KINDS, VERSES, type MailKind } from '@/lib/email-copy';
import { ART, ICON_SIZE, VERSE_ART, artHeading, figuresOf, isTheme, type Theme } from '@/lib/email-design';
import { iconSvg, isMailIcon } from '@/lib/mail-icons';
import { MOON_COLUMNS, MOON_CRATERS } from '@/lib/moon';
import { CLOUDS } from '@/components/badlands/Bits';
import { bodyFallback, bodyUrl } from '@/components/badlands/data';
import { C, cardFonts } from '@/lib/og-card';

/* The pictures in a letter (src/lib/email-design.ts), drawn in the site's own
   faces so they look the same in every mail app, Gmail included.

     ?t=&k=        the picture at the top: ?t=sunset or campfire, ?k= the
                   letter, ?h= the letter's own heading with ?s= the site's
                   signature on it, ?f= the crew standing in it (Minecraft
                   names, the crew's only) and ?m= the moon's phase over the fire
     ?d=verse      the letter's verse cut on a sign (?t=, ?k=)
     ?d=icon&i=    one of the welcome's small pictures (src/lib/mail-icons.ts)

   A heading is only drawn when the signature holds, so nobody can have the
   site draw a picture saying anything it did not write; without one (or with
   a stale one) the picture says the letter's title from BANNERS in
   email-copy.ts. ?v= changes with the words and the drawing, so a mail app
   fetches the new picture once they do, and otherwise keeps it.

   Drawn at twice the size it is shown, for sharp phone screens. */

const W = ART.width * 2, H = ART.height * 2;
const IMMUTABLE = 'public, max-age=31536000, s-maxage=31536000, immutable';
/* a picture whose crew could not be fetched is drawn again before long, so the skins come in */
const SHORT = 'public, max-age=600, s-maxage=600';

type Rect = readonly [number, number, number, number, string];
const rects = (list: readonly Rect[], opacity?: number) => list.map(([x, y, w, h, fill], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={fill} opacity={opacity} />);

/** A pixel disc: rows `step` high, each as wide as the circle there, so its edge steps like the game's sun. */
function disc(cx: number, cy: number, r: number, step: number): string {
  let d = '';
  for (let y = -r; y < r; y += step) {
    const mid = y + step / 2;
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - mid * mid)) / step) * step;
    if (half > 0) d += `M${cx - half} ${cy + y}h${half * 2}v${step}h${-half * 2}z`;
  }
  return d;
}

/** The mark: the badlands' bands with the J cut out of them. */
const Mark = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" shapeRendering="crispEdges">
    <rect x="0" y="0" width="32" height="3" fill={C.white} /><rect x="0" y="3" width="32" height="5" fill={C.yellow} /><rect x="0" y="8" width="32" height="8" fill={C.orange} /><rect x="0" y="16" width="32" height="6" fill={C.red} /><rect x="0" y="22" width="32" height="10" fill={C.brown} />
    <rect x="10" y="6" width="14" height="4" fill={C.paper} /><rect x="16" y="10" width="4" height="12" fill={C.paper} /><rect x="8" y="16" width="4" height="6" fill={C.paper} /><rect x="8" y="22" width="12" height="4" fill={C.paper} />
  </svg>
);

/** How big a heading can be drawn in `width`: on one line while that keeps
    it at a good size, else over two (three at most for the longest names),
    never smaller than 44. Alfa Slab One's letters run about 0.58 of their
    size; a guess a little short only means a line wraps. */
function headingSize(text: string, width: number): number {
  const one = width / (0.58 * text.length);
  if (one >= 56) return Math.min(86, Math.floor(one));
  return Math.max(44, Math.min(66, Math.floor((2 * width) / (0.64 * text.length))));
}

/** The words over the picture: the mark and name, the tag, and the heading
    (or, without one, the letter's title). `room` is how wide the heading may
    run before the sun, the fire or the crew. */
function Words({ kind, heading, tagColor, room, bottom }: { kind: MailKind; heading: string | null; tagColor: string; room: number; bottom: number }) {
  const { tag, title } = BANNERS[kind];
  const big = heading ?? title;
  const size = headingSize(big, room);
  return (
    <div style={{ position: 'absolute', left: 64, top: 40, width: Math.max(room, 760), maxHeight: bottom - 40, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <Mark size={52} />
        <div style={{ display: 'flex', fontSize: 46, color: C.paper, textShadow: '0 4px 0 rgba(21, 16, 13, 0.45)' }}>{BRAND}</div>
        <div style={{ display: 'flex', marginLeft: 8, padding: '7px 14px 6px', border: `3px solid ${tagColor}`, background: 'rgba(21, 16, 13, 0.62)', color: tagColor, fontFamily: 'Silkscreen', fontSize: 25, letterSpacing: 2 }}>{(heading ? title : tag).toUpperCase()}</div>
      </div>
      {/* two lines of a heading share its words evenly, so no word is left alone on the second */}
      <div style={{ display: 'flex', width: room, marginTop: 20, fontSize: size, lineHeight: 1.04, color: C.paper, textShadow: '0 6px 0 rgba(21, 16, 13, 0.5)', textWrap: 'balance' }}>{big}</div>
    </div>
  );
}

/* ─── the crew in it ──────────────────────────────────────────────────────── */

interface Figure { name: string; skin: string | null }

/** How wide each of the crew stands: one alone stands tall, a group of three
    or four by the fire smaller, so they fit round it. A whole number of
    pixels to each of the skin's, so the skin stays sharp. */
const figureWidth = (n: number, theme: Theme) => (n === 1 ? 96 : theme === 'campfire' && n > 2 ? 48 : 64);

/** A skin, front on, as a data URL, from either skin service; null when neither answers. */
async function skin(name: string, width: number): Promise<string | null> {
  for (const url of [bodyUrl(name, width), bodyFallback(name, width)]) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3500), next: { revalidate: 3600 } });
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok || !type.startsWith('image/')) continue;
      return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
    } catch { /* the next one, or none */ }
  }
  return null;
}

/* The figure as the game stands one, drawn when the skin services are out of
   reach: the same blocks, in the shade of whoever stands with the light behind them. */
const stranger = (dark: string, mid: string, eye: string): Rect[] => [[4, 0, 8, 8, dark], [4, 8, 8, 12, mid], [0, 8, 4, 12, dark], [12, 8, 4, 12, dark], [4, 20, 4, 12, dark], [8, 20, 4, 12, mid], [5, 3, 2, 1, eye], [9, 3, 2, 1, eye]];
/* against the sun, and lit from the fire's side */
const STRANGER = { sunset: stranger('#2A1F18', '#33261C', '#4D3A2C'), campfire: stranger('#4A3626', '#5A4230', '#8A6A4A') };

/** One of the crew standing, `width` wide and twice as tall, the nametag the game floats over them. */
function Standing({ figure, x, foot, width, tagLift = 0, theme }: { figure: Figure; x: number; foot: number; width: number; tagLift?: number; theme: Theme }) {
  const height = width * 2;
  const tag = Math.round(width * 0.3) + 4;
  return (
    <div style={{ position: 'absolute', left: x - 70, top: foot - height - tag - 26 - tagLift, width: width + 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', padding: '3px 10px 5px', marginBottom: 10 + tagLift, background: 'rgba(0, 0, 0, 0.52)', color: '#FFFFFF', fontFamily: 'Pixelify Sans', fontSize: tag, lineHeight: 1.1 }}>{figure.name}</div>
      {figure.skin
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={figure.skin} width={width} height={height} alt="" />
        : <svg width={width} height={height} viewBox="0 0 16 32" shapeRendering="crispEdges">{rects(STRANGER[theme])}</svg>}
    </div>
  );
}

/* ─── at sunset ───────────────────────────────────────────────────────────── */

/* the sky in bands, as the game's sky steps at dusk: [height, colour] from the top */
const DUSK: [number, string][] = [
  [52, '#2B1220'], [44, '#3B1A20'], [40, '#55202A'], [38, '#722B2C'], [36, '#8F3D2E'],
  [34, '#AE4F2C'], [34, '#CB662E'], [34, '#DE8236'], [36, '#E9A042'], [72, '#EFBB57'],
];
const bands = (list: [number, string][]) => {
  let y = 0;
  return list.map(([h, fill]) => { const r = <rect key={y} x={0} y={y} width={W} height={h} fill={fill} />; y += h; return r; });
};
/* the near mesa, whose face shows the badlands' bands, and its plateau the crew stand on */
const PLATEAU = 322;
const NEAR_MESA = `M0 ${H} V352 H110 V336 H250 V352 H470 V344 H560 V360 H770 V${PLATEAU} H1190 V346 H${W} V${H} Z`;
const FAR_MESA = `M0 ${H} V318 H70 V300 H160 V318 H300 V292 H390 V310 H470 V326 H640 V304 H720 V290 H800 V306 H880 V322 H${W} V${H} Z`;
/* a saguaro, on a 12 by 16 grid, and a dead bush, as the badlands grow them */
const CACTUS: Rect[] = [[4, 0, 4, 16, '#3F6B2A'], [0, 4, 2, 6, '#3F6B2A'], [2, 8, 2, 2, '#3F6B2A'], [10, 2, 2, 6, '#3F6B2A'], [8, 6, 2, 2, '#3F6B2A'], [5, 1, 1, 14, '#2E4F1E'], [7, 3, 1, 11, '#5A8A3A']];
const BUSH: Rect[] = [[3, 4, 1, 4, '#6B4A2E'], [1, 2, 1, 3, '#6B4A2E'], [2, 4, 1, 1, '#6B4A2E'], [5, 1, 1, 4, '#6B4A2E'], [4, 4, 1, 1, '#6B4A2E'], [0, 1, 1, 1, '#6B4A2E'], [6, 0, 1, 1, '#6B4A2E']];
/* the armadillo the site's own ground has (Mesa.tsx), side on */
const ARMADILLO: Rect[] = [
  [5, 0, 6, 1, '#C48B79'], [3, 1, 10, 1, '#C48B79'], [2, 2, 12, 2, '#C48B79'], [2, 4, 11, 1, '#C48B79'],
  [6, 1, 1, 1, '#8B5148'], [9, 1, 1, 1, '#8B5148'], [5, 2, 1, 3, '#8B5148'], [8, 2, 1, 3, '#8B5148'], [11, 2, 1, 3, '#8B5148'],
  [0, 3, 2, 2, '#D29A86'], [1, 2, 1, 1, '#8B5148'], [0, 3, 1, 1, '#2A1A14'], [3, 5, 9, 1, '#E2B4A0'], [13, 4, 1, 1, '#8B5148'],
  [4, 6, 1, 2, '#8B5148'], [10, 6, 1, 2, '#8B5148'],
];
const at = (list: readonly Rect[], x: number, y: number, s: number): Rect[] => list.map(([a, b, w, h, f]) => [x + a * s, y + b * s, w * s, h * s, f]);
/* the game's flat clouds (Bits.tsx), drawn at a cell each */
const cloud = (shape: keyof typeof CLOUDS, x: number, y: number, cell: number, body: string, under: string): Rect[] =>
  CLOUDS[shape].rows.map(([cx, cy, w], i, all) => [x + cx * cell, y + cy * cell, w * cell, cell, i === all.length - 1 ? under : body]);

function Sunset({ kind, heading, crew }: { kind: MailKind; heading: string | null; crew: Figure[] }) {
  const one = crew.length === 1;
  const width = figureWidth(crew.length, 'sunset');
  const gap = 92;
  /* the crew stand on the plateau, the sun behind them, a nametag's breadth clear of the edge */
  const start = one ? 966 : 1140 - width - (crew.length - 1) * gap;
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', fontFamily: 'Alfa Slab One' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" style={{ position: 'absolute', left: 0, top: 0 }}>
        {bands(DUSK)}
        {rects([...cloud('b', 930, 34, 10, '#3B1A20', '#722B2C'), ...cloud('d', 760, 112, 8, '#55202A', '#8F3D2E')], 0.9)}
        <path d={disc(1010, 300, 132, 12)} fill="#F4D394" opacity={0.1} />
        <path d={disc(1010, 300, 98, 10)} fill="#F4D394" opacity={0.2} />
        <path d={disc(1010, 300, 66, 8)} fill="#F7DE9F" />
        {rects([[944, 312, 132, 6, '#EFBB57'], [952, 326, 116, 8, '#EFBB57']], 0.75)}
        {rects([[880, 196, 8, 4, '#55202A'], [888, 200, 8, 4, '#55202A'], [896, 196, 8, 4, '#55202A'], [916, 178, 6, 3, '#55202A'], [922, 181, 6, 3, '#55202A'], [928, 178, 6, 3, '#55202A']])}
        <path d={FAR_MESA} fill="#7A3A34" />
        <defs><clipPath id="mesa"><path d={NEAR_MESA} /></clipPath></defs>
        <g clipPath="url(#mesa)">
          {[C.white, C.orange, C.yellow, C.white, C.red, C.orange, C.brown, C.red, C.yellow, C.brown, C.red, C.brown].map((fill, i) => <rect key={i} x={0} y={PLATEAU + i * 7} width={W} height={7} fill={fill} />)}
        </g>
        <rect x={0} y={392} width={W} height={H - 392} fill="#4D3323" />
        <rect x={0} y={392} width={W} height={4} fill="#6B4A2E" />
        {rects([...at(CACTUS, 70, 344, 3), ...at(CACTUS, 640, 356, 2.5), ...at(BUSH, 420, 380, 3), ...at(BUSH, 1120, 380, 3), ...at(ARMADILLO, 500, 372, 3)])}
      </svg>
      {crew.map((f, i) => <Standing key={f.name} figure={f} x={start + i * gap} foot={PLATEAU} width={width} tagLift={!one && i % 2 ? 30 : 0} theme="sunset" />)}
      <Words kind={kind} heading={heading} tagColor={C.lantern} room={crew.length ? Math.min(760, start - 124) : 820} bottom={300} />
    </div>
  );
}

/* ─── by the fire ─────────────────────────────────────────────────────────── */

const NIGHT: [number, string][] = [[70, '#07060B'], [60, '#0A0810'], [56, '#0E0B12'], [52, '#120E12'], [50, '#16110F'], [48, '#1B1410'], [84, '#21180F']];
/* stars: x, y, size; the larger twinkle as a cross */
const STARS: [number, number, number][] = [
  [610, 40, 6], [680, 92, 4], [742, 30, 6], [810, 120, 4], [868, 58, 4], [930, 26, 4], [1052, 44, 4], [1110, 112, 4], [1150, 30, 6],
  [560, 130, 4], [520, 60, 4], [470, 24, 6], [640, 170, 4], [770, 190, 4], [1170, 180, 4], [420, 150, 4], [990, 200, 4], [330, 210, 4], [1080, 230, 4],
];
const twinkle = ([x, y, s]: [number, number, number]): Rect[] => s > 4
  ? [[x, y, s, s, '#E8DCC4'], [x - s, y + s / 3, s, s / 3, '#A08C78'], [x + s, y + s / 3, s, s / 3, '#A08C78'], [x + s / 3, y - s, s / 3, s, '#A08C78'], [x + s / 3, y + s, s / 3, s, '#A08C78']]
  : [[x, y, s, s, '#A08C78']];
/* a spruce, on an 8 by 12 grid */
const SPRUCE: Rect[] = [[3, 0, 2, 2, '#0F0C0B'], [2, 2, 4, 2, '#0F0C0B'], [1, 4, 6, 2, '#0F0C0B'], [2, 6, 4, 1, '#0F0C0B'], [0, 7, 8, 3, '#0F0C0B'], [3, 10, 2, 2, '#0F0C0B']];
/* the fire, in its own pixels: [x, y, w, h, colour] */
const FLAME: Rect[] = [
  [7, 0, 1, 1, '#F7DE9F'], [6, 1, 3, 2, '#F4D394'], [5, 3, 5, 2, '#F4D394'], [4, 5, 7, 2, '#F2A63B'], [3, 7, 9, 3, '#D8712F'],
  [6, 4, 3, 4, '#F7DE9F'], [4, 8, 2, 2, '#E0602A'], [10, 8, 2, 2, '#E0602A'], [9, 2, 1, 1, '#F2A63B'], [2, 4, 1, 1, '#F2A63B'],
];
const EMBERS: Rect[] = [[5, 9, 1, 1, '#E0602A'], [8, 9, 2, 1, '#D8712F'], [10, 8, 1, 1, '#8F3D2E'], [7, 8, 1, 1, '#E0602A']];
const SMOKE: Rect[] = [[7, 6, 1, 1, '#5F5A55'], [8, 4, 1, 1, '#4A4540'], [7, 2, 1, 1, '#3A3632'], [8, 0, 1, 1, '#2E2A27']];
const LOGS: Rect[] = [[2, 10, 11, 2, '#6B4A2E'], [1, 12, 13, 1, '#4D3323'], [3, 10, 2, 2, '#8A5D33'], [10, 10, 2, 2, '#8A5D33'], [0, 13, 15, 1, '#5F5A55'], [0, 12, 1, 1, '#8A8580'], [14, 12, 1, 1, '#8A8580']];
const SPARKS: Rect[] = [[-1, -3, 1, 1, '#F2A63B'], [11, -5, 1, 1, '#F4D394'], [3, -7, 1, 1, '#E0602A'], [9, -10, 1, 1, '#F2A63B']];

/** The game's square moon in tonight's phase (src/lib/moon.ts), `cell` pixels a square. */
function moonRects(phase: number, x: number, y: number, cell: number): Rect[] {
  const columns = MOON_COLUMNS[phase] ?? MOON_COLUMNS[4];
  const lit = (cx: number, cy: number) => (columns[cx - 1] ?? []).some(([a, b]) => cy >= a && cy <= b);
  const out: Rect[] = [[x + cell, y + cell, cell * 10, cell * 10, '#1F1B24']];
  columns.forEach((runs, i) => runs.forEach(([a, b]) => out.push([x + (i + 1) * cell, y + a * cell, cell, (b - a + 1) * cell, '#EDE8D2'])));
  for (const [cx, cy, w, h] of MOON_CRATERS) {
    let all = true;
    for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) if (!lit(cx + dx, cy + dy)) all = false;
    if (all) out.push([x + cx * cell, y + cy * cell, w * cell, h * cell, '#C9C2A8']);
  }
  return out;
}

const GROUND = 384;
const FIRE_X = 800, FIRE_PX = 10;

function Campfire({ kind, heading, crew, moon }: { kind: MailKind; heading: string | null; crew: Figure[]; moon: number }) {
  const out = kind === 'out';
  const one = crew.length === 1;
  const width = figureWidth(crew.length, 'campfire');
  /* by the fire: one on its left, more on both sides of it, two and two */
  const spots = one ? [680] : crew.length === 2 ? [700, 1000] : [680, 1006, 756, 1082];
  const lit = !out && moon > 0;
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', fontFamily: 'Alfa Slab One' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" style={{ position: 'absolute', left: 0, top: 0 }}>
        {bands(NIGHT)}
        {rects(STARS.flatMap(twinkle))}
        {lit && <rect x={1050} y={36} width={112} height={112} fill="#EDE8D2" opacity={0.06} />}
        {rects(moonRects(moon, 1058, 44, 8))}
        <path d={`M0 ${H} V300 H90 V284 H200 V298 H330 V272 H430 V292 H600 V306 H760 V286 H880 V300 H1000 V290 H1120 V304 H${W} V${H} Z`} fill="#17120F" />
        {rects([...at(SPRUCE, 40, 236, 8), ...at(SPRUCE, 120, 252, 6), ...at(SPRUCE, 360, 214, 8), ...at(SPRUCE, 560, 246, 6), ...at(SPRUCE, 1090, 226, 8), ...at(SPRUCE, 1170, 250, 6)])}
        <rect x={0} y={340} width={W} height={H - 340} fill="#241913" />
        <rect x={0} y={GROUND} width={W} height={H - GROUND} fill="#1E1611" />
      </svg>
      {!out && <div style={{ position: 'absolute', left: FIRE_X - 210, top: 90, width: 580, height: 520, display: 'flex', backgroundImage: 'radial-gradient(circle, rgba(242, 166, 59, 0.40) 0%, rgba(224, 96, 42, 0.16) 36%, rgba(21, 16, 13, 0) 66%)' }} />}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" style={{ position: 'absolute', left: 0, top: 0 }}>
        {rects(at([...(out ? [...EMBERS, ...SMOKE] : [...FLAME, ...SPARKS]), ...LOGS], FIRE_X, GROUND - 14 * FIRE_PX + 4, FIRE_PX))}
      </svg>
      {crew.map((f, i) => <Standing key={f.name} figure={f} x={spots[i]} foot={GROUND + 4} width={width} tagLift={i >= 2 ? 30 : 0} theme="campfire" />)}
      <Words kind={kind} heading={heading} tagColor={out ? '#A08C78' : C.lantern} room={crew.length ? 560 : 740} bottom={280} />
    </div>
  );
}

/* ─── the verse on its sign ───────────────────────────────────────────────── */

const SIGN_W = VERSE_ART.width * 2, SIGN_H = VERSE_ART.height * 2;
/* the game's woods for it: oak by day, dark oak by the fire with the words in glow ink */
const WOOD = {
  sunset:   { face: ['#B8945F', '#AF8A55'], light: '#C9A56E', grain: '#9A7646', seam: '#7A5A35', edge: '#4D3323', ink: '#2A1A10', glow: '' },
  campfire: { face: ['#4E3826', '#473221'], light: '#5C4430', grain: '#3A2819', seam: '#2C1E13', edge: '#120C08', ink: '#F7DE9F', glow: '0 0 14px rgba(242, 166, 59, 0.75)' },
} as const;

function Sign({ theme, lines }: { theme: Theme; lines: string[] }) {
  const w = WOOD[theme];
  const x = 16, y = 12, bw = SIGN_W - 44, bh = SIGN_H - 36, e = 8;
  const planks = 4, ph = (bh - 2 * e) / planks;
  const wood: Rect[] = [];
  for (let i = 0; i < planks; i++) {
    const top = y + e + i * ph;
    wood.push([x + e, top, bw - 2 * e, ph, w.face[i % 2]], [x + e, top, bw - 2 * e, 4, w.light]);
    if (i > 0) wood.push([x + e, top - 2, bw - 2 * e, 4, w.seam]);
    /* the grain: a few dashes on each plank, the same on every sign, along
       its upper and lower edge so none runs through the words like a line struck out */
    for (let k = 0; k < 6; k++) {
      const gx = x + e + 24 + ((i * 173 + k * 151) % (bw - 2 * e - 140));
      wood.push([gx, top + (k % 2 ? ph - 11 : 8), 40 + ((i + k) % 3) * 24, 3, w.grain]);
    }
  }
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative' }}>
      <svg width={SIGN_W} height={SIGN_H} viewBox={`0 0 ${SIGN_W} ${SIGN_H}`} shapeRendering="crispEdges" style={{ position: 'absolute', left: 0, top: 0 }}>
        <rect x={x + 12} y={y + 12} width={bw} height={bh} fill="#000000" opacity={0.22} />
        <rect x={x} y={y} width={bw} height={bh} fill={w.edge} />
        {rects(wood)}
      </svg>
      {/* a line on each plank, as the game writes a sign */}
      <div style={{ position: 'absolute', left: x + e, top: y + e, width: bw - 2 * e, height: bh - 2 * e, display: 'flex', flexDirection: 'column', fontFamily: 'Pixelify Sans', fontSize: 38, color: w.ink, ...(w.glow ? { textShadow: w.glow } : {}) }}>
        {lines.slice(0, planks).map((l, i) => <div key={i} style={{ display: 'flex', height: ph, alignItems: 'center', justifyContent: 'center', paddingBottom: 4 }}>{l}</div>)}
      </div>
    </div>
  );
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const fonts = await cardFonts();

  if (q.get('d') === 'icon') {
    const icon = q.get('i');
    if (!isMailIcon(icon)) return new Response('Not found', { status: 404 });
    const size = ICON_SIZE * 2;
    return new ImageResponse(
      // eslint-disable-next-line @next/next/no-img-element
      <div style={{ width: '100%', height: '100%', display: 'flex' }}><img src={`data:image/svg+xml;base64,${Buffer.from(iconSvg(icon)).toString('base64')}`} width={size} height={size} alt="" /></div>,
      { width: size, height: size, fonts, headers: { 'Cache-Control': IMMUTABLE } },
    );
  }

  const t = q.get('t');
  const k = q.get('k') as MailKind | null;
  if (!isTheme(t) || !k || !MAIL_KINDS.includes(k)) return new Response('Not found', { status: 404 });
  const theme: Theme = t;

  if (q.get('d') === 'verse') {
    return new ImageResponse(<Sign theme={theme} lines={VERSES[k]} />, { width: SIGN_W, height: SIGN_H, fonts, headers: { 'Cache-Control': IMMUTABLE } });
  }

  /* a heading the site did not sign is never drawn; the picture says the title instead */
  const heading = artHeading(theme, k, q.get('h'), q.get('s'));
  const names = k === 'out' ? [] : figuresOf(q.get('f'));
  const width = figureWidth(names.length, theme);
  const crew: Figure[] = await Promise.all(names.map(async name => ({ name, skin: await skin(name, width) })));
  const moon = /^[0-7]$/.test(q.get('m') ?? '') ? Number(q.get('m')) : 4;
  return new ImageResponse(
    theme === 'sunset' ? <Sunset kind={k} heading={heading} crew={crew} /> : <Campfire kind={k} heading={heading} crew={crew} moon={moon} />,
    { width: W, height: H, fonts, headers: { 'Cache-Control': crew.every(f => f.skin) ? IMMUTABLE : SHORT } },
  );
}
