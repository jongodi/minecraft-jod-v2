import type { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';
import { BANNERS, MAIL_KINDS, type MailKind } from '@/lib/email-copy';
import { isTheme, type Theme } from '@/lib/email-design';
import { C, cardFonts } from '@/lib/og-card';

/* The picture at the top of a letter (src/lib/email-design.ts): ?t=sunset or
   campfire, ?k= the letter. Its words come from BANNERS in email-copy.ts, not
   from the address, so nobody can have the site draw a picture saying
   anything else; ?v= only changes with them, so a mail app fetches the new
   picture once they do, and otherwise keeps it for good.

   Drawn at twice the size it is shown (600 × 200), for sharp phone screens. */

const W = 1200, H = 400;
const SKY = { top: '#3B1A20', mid: '#8F3D2E', low: '#D8712F', horizon: '#E9B24A', sun: '#F4D394' };

/** The mark: the badlands' bands with the J cut out of them. */
const Mark = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" shapeRendering="crispEdges">
    <rect x="0" y="0" width="32" height="3" fill={C.white} /><rect x="0" y="3" width="32" height="5" fill={C.yellow} /><rect x="0" y="8" width="32" height="8" fill={C.orange} /><rect x="0" y="16" width="32" height="6" fill={C.red} /><rect x="0" y="22" width="32" height="10" fill={C.brown} />
    <rect x="10" y="6" width="14" height="4" fill={C.paper} /><rect x="16" y="10" width="4" height="12" fill={C.paper} /><rect x="8" y="16" width="4" height="6" fill={C.paper} /><rect x="8" y="22" width="12" height="4" fill={C.paper} />
  </svg>
);

/** The words over the picture: the mark and name, the tag, the title. */
function Words({ kind, tagColor }: { kind: MailKind; tagColor: string }) {
  const { tag, title } = BANNERS[kind];
  return (
    <div style={{ position: 'absolute', left: 64, top: 50, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <Mark size={52} />
        <div style={{ display: 'flex', fontSize: 46, color: C.paper }}>JOÐ</div>
        <div style={{ display: 'flex', marginLeft: 10, padding: '6px 14px', border: `3px solid ${tagColor}`, background: 'rgba(21, 16, 13, 0.55)', color: tagColor, fontFamily: 'Silkscreen', fontSize: 22, letterSpacing: 2 }}>{tag.toUpperCase()}</div>
      </div>
      <div style={{ display: 'flex', marginTop: 26, fontSize: 82, lineHeight: 1, color: C.paper, textShadow: '0 5px 0 rgba(21, 16, 13, 0.45)' }}>{title}</div>
    </div>
  );
}

const shape = (d: string, fill: string, h = 170) => (
  <svg width={W} height={h} viewBox={`0 0 ${W} ${h}`} style={{ position: 'absolute', left: 0, bottom: 0 }}>
    <path d={d} fill={fill} shapeRendering="crispEdges" />
  </svg>
);

function Sunset({ kind }: { kind: MailKind }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: `linear-gradient(180deg, ${SKY.top} 0%, ${SKY.mid} 42%, ${SKY.low} 76%, ${SKY.horizon} 100%)`, fontFamily: 'Alfa Slab One' }}>
      <div style={{ position: 'absolute', right: 94, top: 160, width: 96, height: 96, background: 'rgba(244, 211, 148, 0.25)', display: 'flex' }} />
      <div style={{ position: 'absolute', right: 110, top: 176, width: 64, height: 64, background: SKY.sun, display: 'flex' }} />
      {shape('M0 170 V96 H90 V62 H160 V80 H260 V44 H340 V80 H520 V96 H640 V70 H800 V36 H900 V70 H1040 V90 H1200 V170 Z', C.red)}
      {shape('M0 170 V132 H140 V106 H230 V132 H420 V98 H540 V132 H760 V116 H860 V132 H1000 V110 H1100 V132 H1200 V170 Z', C.orange)}
      {shape('M0 170 V156 H300 V142 H420 V156 H700 V148 H820 V156 H1200 V170 Z', C.brown)}
      <Words kind={kind} tagColor={C.lantern} />
    </div>
  );
}

/* stars: x, y, size, from a fixed list so every picture is the same */
const STARS: [number, number, number][] = [
  [610, 40, 6], [680, 92, 4], [742, 30, 6], [810, 120, 4], [868, 58, 6], [930, 26, 4], [990, 96, 6], [1052, 44, 4], [1110, 112, 4], [1150, 30, 6],
  [560, 130, 4], [520, 60, 4], [470, 24, 6], [640, 160, 4], [770, 180, 4], [1170, 170, 4], [420, 150, 4], [1000, 190, 4],
];
/* the fire, in pixels of 16: [x, y, w, h, colour] */
const FLAME: [number, number, number, number, string][] = [
  [7, 1, 2, 2, '#F4D394'], [6, 3, 4, 2, '#F4D394'], [5, 5, 6, 2, '#F2A63B'], [4, 7, 8, 3, '#D8712F'], [6, 6, 3, 3, '#F4D394'],
];
const EMBERS: [number, number, number, number, string][] = [
  [5, 9, 1, 1, '#E0602A'], [8, 9, 2, 1, '#D8712F'], [10, 8, 1, 1, '#8F3D2E'], [7, 4, 1, 1, '#6E5A45'], [8, 2, 1, 1, '#5A4634'], [6, 0, 1, 1, '#4D3323'],
];

function Campfire({ kind }: { kind: MailKind }) {
  const px = 16;
  const out = kind === 'out';
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: 'linear-gradient(180deg, #0B0910 0%, #15100D 62%, #241913 100%)', fontFamily: 'Alfa Slab One' }}>
      {STARS.map(([x, y, s]) => <div key={`${x}-${y}`} style={{ position: 'absolute', left: x, top: y, width: s, height: s, background: s > 4 ? '#E8DCC4' : '#A08C78', display: 'flex' }} />)}
      {!out && <div style={{ position: 'absolute', right: 30, bottom: -60, width: 460, height: 460, display: 'flex', backgroundImage: 'radial-gradient(circle, rgba(242, 166, 59, 0.38) 0%, rgba(224, 96, 42, 0.16) 38%, rgba(21, 16, 13, 0) 68%)' }} />}
      {shape('M0 170 V110 H120 V84 H210 V104 H330 V70 H430 V100 H600 V120 H760 V92 H860 V112 H1000 V96 H1120 V118 H1200 V170 Z', '#30231B')}
      {shape('M0 170 V142 H1200 V170 Z', '#1E1611')}
      <div style={{ position: 'absolute', right: 132, bottom: 18, width: 16 * px, height: 14 * px, display: 'flex' }}>
        {(out ? EMBERS : FLAME).map(([x, y, w, h, c]) => <div key={`${x}-${y}`} style={{ position: 'absolute', left: x * px, top: y * px, width: w * px, height: h * px, background: c, display: 'flex' }} />)}
        <div style={{ position: 'absolute', left: 2 * px, top: 10 * px, width: 12 * px, height: 2 * px, background: C.brown, display: 'flex' }} />
        <div style={{ position: 'absolute', left: 1 * px, top: 12 * px, width: 14 * px, height: px, background: '#3A2618', display: 'flex' }} />
      </div>
      <Words kind={kind} tagColor={out ? '#A08C78' : C.lantern} />
    </div>
  );
}

export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get('t');
  const k = req.nextUrl.searchParams.get('k') as MailKind | null;
  if (!isTheme(t) || !k || !MAIL_KINDS.includes(k)) return new Response('Not found', { status: 404 });
  const theme: Theme = t;
  return new ImageResponse(
    theme === 'sunset' ? <Sunset kind={k} /> : <Campfire kind={k} />,
    {
      width: W, height: H, fonts: await cardFonts(),
      headers: { 'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable' },
    },
  );
}
