import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SERVER_IP } from '@/components/badlands/data';

export const alt = 'JOÐ, Minecraft-heimurinn okkar. play.jodcraft.world';
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

export default async function Image() {
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
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: `linear-gradient(180deg, ${C.skyTop} 0%, ${C.skyMid} 40%, ${C.skyLow} 75%, ${C.horizon} 100%)`, fontFamily: 'Alfa Slab One' }}>
        <div style={{ position: 'absolute', right: 180, top: 90, width: 72, height: 72, background: C.sun, display: 'flex' }} />
        {mesa('M0 200 V110 H90 V70 H160 V90 H260 V50 H340 V90 H520 V60 H640 V100 H800 V40 H900 V80 H1040 V110 H1200 V200 Z', C.red)}
        {mesa('M0 200 V150 H140 V120 H230 V150 H420 V110 H540 V150 H760 V130 H860 V150 H1000 V125 H1100 V150 H1200 V200 Z', C.orange)}
        {mesa('M0 200 V178 H300 V160 H420 V178 H700 V168 H820 V178 H1200 V200 Z', C.brown)}
        <div style={{ position: 'absolute', left: 80, top: 70, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <svg width="72" height="72" viewBox="0 0 32 32" shapeRendering="crispEdges">
              <rect x="0" y="0" width="32" height="3" fill={C.white} /><rect x="0" y="3" width="32" height="5" fill={C.yellow} /><rect x="0" y="8" width="32" height="8" fill={C.orange} /><rect x="0" y="16" width="32" height="6" fill={C.red} /><rect x="0" y="22" width="32" height="10" fill={C.brown} />
              <rect x="10" y="6" width="14" height="4" fill={C.paper} /><rect x="16" y="10" width="4" height="12" fill={C.paper} /><rect x="8" y="16" width="4" height="6" fill={C.paper} /><rect x="8" y="22" width="12" height="4" fill={C.paper} />
            </svg>
            <div style={{ fontSize: 44, color: C.paper, display: 'flex' }}>Minecraft-heimurinn okkar</div>
          </div>
          <div style={{ fontSize: 230, lineHeight: 0.9, color: C.paper, marginTop: 20, display: 'flex' }}>JOÐ</div>
          <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', padding: '14px 26px', border: `4px solid ${C.lantern}`, background: 'rgba(21, 16, 13, 0.55)', color: C.lantern, fontFamily: 'Silkscreen', fontSize: 40 }}>{SERVER_IP}</div>
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
