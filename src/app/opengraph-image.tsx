import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CREW, SERVER_IP, SITE_NAME } from '@/components/badlands/data';
import { getStatus } from '@/lib/server-status';
import { seasonAt } from '@/lib/season';
import { MOON_COLUMNS, moonPhase } from '@/lib/moon';

/* Drawn afresh every minute: the card a pasted link shows wears tonight, the
   lantern lit with who is in or dark with when it last burned, the season's
   sky and tonight's moon, so a link in a chat says whether the server is on. */
export const revalidate = 60;

export const alt = `${SITE_NAME} · Minecraft-heimurinn okkar. ${SERVER_IP}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/* The link preview: sunset over the mesa, the mark, the name and the
   address. Same tokens as tokens.css; Satori cannot read CSS variables. */
const C = {
  skyTop: '#3B1A20', skyMid: '#8F3D2E', skyLow: '#D8712F', horizon: '#E9B24A',
  paper: '#E8DCC4', brown: '#4D3323', red: '#8F3D2E', orange: '#A15325', yellow: '#BA8523', white: '#D1B2A1',
  lantern: '#F2A63B', night: '#15100D', sun: '#F4D394',
};
const FONT_DIR = join(process.cwd(), 'node_modules/@fontsource');
/* The name's cut (badlands.css, .b-hero__mark): three pixels a band at this size.
   Drawn as copies of the name set lower and lower behind it, which is what a
   sharp text-shadow is: the Satori in Next 16 draws only the last shadow of a list. */
const STRATA_CUT = [...[C.white, C.yellow, C.orange, C.red, C.brown].map((c, i) => ({ y: (i + 1) * 3, c })), { y: 21, c: 'rgba(21, 16, 13, 0.35)' }];
const NAME = { fontSize: 230, lineHeight: 0.9, display: 'flex' } as const;

/** What the lantern says tonight: the word, the line under it and whether it burns. */
async function tonight(): Promise<{ word: string; row: string; lit: boolean }> {
  try {
    const s = await getStatus({ live: false });
    const crew = new Set(CREW.map(n => n.toLowerCase()));
    const inside = (s.players?.list ?? []).map(p => p.name).filter(n => crew.has(n.toLowerCase()));
    if (s.online) return { word: 'Kveikt á þjóninum', row: inside.length ? `${inside.length} inni: ${inside.join(', ')}` : 'enginn inni enn, en það er opið', lit: true };
    const last = s.lastOnline ? new Date(s.lastOnline.at) : null;
    const months = ['jan.', 'feb.', 'mar.', 'apr.', 'maí', 'jún.', 'júl.', 'ágú.', 'sep.', 'okt.', 'nóv.', 'des.'];
    return { word: 'Slökkt á þjóninum', row: last ? `síðast kveikt ${last.getUTCDate()}. ${months[last.getUTCMonth()]}` : 'enginn inni', lit: false };
  } catch {
    return { word: 'Minecraft-heimurinn okkar', row: 'átta vinir, einn heimur', lit: false };
  }
}

export default async function Image() {
  const now = new Date();
  const season = seasonAt(now);
  const phase = moonPhase(now);
  const lamp = await tonight();
  /* Hrekkjavaka's sunset leans purple, as the hero's does */
  const sky = season.halloween
    ? 'linear-gradient(180deg, #1E0F24 0%, #4A1C2E 40%, #8F3D2E 75%, #BA8523 100%)'
    : `linear-gradient(180deg, ${C.skyTop} 0%, ${C.skyMid} 40%, ${C.skyLow} 75%, ${C.horizon} 100%)`;
  const [display, data] = await Promise.all([
    readFile(join(FONT_DIR, 'alfa-slab-one/files/alfa-slab-one-latin-400-normal.woff')),
    readFile(join(FONT_DIR, 'silkscreen/files/silkscreen-latin-400-normal.woff')),
  ]);
  const mesa = (points: string, fill: string) => (
    <svg width="1200" height="200" viewBox="0 0 1200 200" style={{ position: 'absolute', left: 0, bottom: 0 }}>
      <path d={points} fill={fill} shapeRendering="crispEdges" />
    </svg>
  );
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: sky, fontFamily: 'Alfa Slab One' }}>
        {/* tonight's moon, the game's square one in its phase (src/lib/moon.ts), high on the left */}
        <div style={{ position: 'absolute', left: 1112, top: 36, width: 60, height: 60, display: 'flex' }}>
          {MOON_COLUMNS[phase].flatMap((col, x) => col.map(([a, b]) => (
            <div key={`${x}-${a}`} style={{ position: 'absolute', left: x * 6, top: (a - 1) * 6, width: 6, height: (b - a + 1) * 6, background: C.paper, display: 'flex' }} />
          )))}
        </div>
        {/* the sun low over the mesas, as the hero holds it: the last light, clear of the name */}
        <div style={{ position: 'absolute', right: 150, top: 290, width: 72, height: 72, background: C.sun, display: 'flex' }} />
        {mesa('M0 200 V110 H90 V70 H160 V90 H260 V50 H340 V90 H520 V60 H640 V100 H800 V40 H900 V80 H1040 V110 H1200 V200 Z', C.red)}
        {mesa('M0 200 V150 H140 V120 H230 V150 H420 V110 H540 V150 H760 V130 H860 V150 H1000 V125 H1100 V150 H1200 V200 Z', C.orange)}
        {mesa('M0 200 V178 H300 V160 H420 V178 H700 V168 H820 V178 H1200 V200 Z', C.brown)}
        <div style={{ position: 'absolute', left: 80, top: 70, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <svg width="72" height="72" viewBox="0 0 32 32" shapeRendering="crispEdges">
              <rect x="0" y="0" width="32" height="3" fill={C.white} /><rect x="0" y="3" width="32" height="5" fill={C.yellow} /><rect x="0" y="8" width="32" height="8" fill={C.orange} /><rect x="0" y="16" width="32" height="6" fill={C.red} /><rect x="0" y="22" width="32" height="10" fill={C.brown} />
              <rect x="10" y="6" width="14" height="4" fill={C.paper} /><rect x="16" y="10" width="4" height="12" fill={C.paper} /><rect x="8" y="16" width="4" height="6" fill={C.paper} /><rect x="8" y="22" width="12" height="4" fill={C.paper} />
            </svg>
            <div style={{ fontSize: 44, color: C.paper, display: 'flex' }}>{SITE_NAME} · Minecraft-heimurinn okkar</div>
          </div>
          {/* cut from the strata, as the hero sets it: the five clays under every edge that faces down */}
          <div style={{ marginTop: 20, display: 'flex', position: 'relative' }}>
            {[...STRATA_CUT].reverse().map(({ y, c }) => <div key={y} style={{ ...NAME, position: 'absolute', left: 0, top: y, color: c }}>JOÐ</div>)}
            <div style={{ ...NAME, color: C.paper }}>JOÐ</div>
          </div>
          <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 26px', border: `4px solid ${C.lantern}`, background: 'rgba(21, 16, 13, 0.55)', color: C.lantern, fontFamily: 'Silkscreen', fontSize: 40 }}>{SERVER_IP}</div>
            {/* the hero's lantern plate: lit or dark, with its line */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 22px', background: 'rgba(21, 16, 13, 0.55)' }}>
              <svg width="36" height="54" viewBox="0 0 12 18" shapeRendering="crispEdges">
                <g fill={lamp.lit ? C.white : '#6B5A4E'}>
                  <rect x="4" y="0" width="4" height="1" /><rect x="3" y="1" width="1" height="2" /><rect x="8" y="1" width="1" height="2" /><rect x="2" y="3" width="8" height="2" /><rect x="2" y="5" width="1" height="8" /><rect x="9" y="5" width="1" height="8" /><rect x="1" y="13" width="10" height="2" /><rect x="3" y="15" width="6" height="1" />
                </g>
                <rect x="3" y="5" width="6" height="8" fill={lamp.lit ? C.lantern : '#2A1A14'} />
                {lamp.lit && <rect x="5" y="8" width="2" height="3" fill={C.paper} />}
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontFamily: 'Silkscreen', fontSize: 26, color: lamp.lit ? '#80E020' : C.white, display: 'flex' }}>{lamp.word}</div>
                <div style={{ fontFamily: 'Silkscreen', fontSize: 20, color: C.white, display: 'flex' }}>{lamp.row}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Alfa Slab One', data: display, weight: 400, style: 'normal' },
        { name: 'Silkscreen', data: data, weight: 400, style: 'normal' },
      ],
    },
  );
}
