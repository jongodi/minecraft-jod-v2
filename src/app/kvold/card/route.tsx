import type { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';
import { sharedNight } from '@/lib/night-share';
import { C, CARD, STRATA, cardFonts } from '@/lib/og-card';

export const dynamic = 'force-dynamic';

/* The play night's link card: the fire, as big as the crowd coming, on the
   night, with when it is and how many are coming. A route of its own rather
   than an opengraph-image file, whose address never changes: chat apps keep a
   preview by its image's address, so /kvold asks for /kvold/card?v=<the
   night as it stands> (and /kvold/<id> adds &n=<id>) and a new fire, or a new
   answer, is a new picture. */
const FLAME: [number, number, number, number, string][] = [
  [7, 2, 2, 2, '#F4D394'], [6, 4, 4, 2, '#F4D394'], [5, 6, 6, 2, '#D8712F'], [4, 8, 8, 3, '#D8712F'], [6, 6, 2, 4, '#F4D394'],
];

export async function GET(req: NextRequest) {
  /* ?n=<id> is that night's card (/kvold/<id>); without it, or once it is gone, the next night's */
  const id = req.nextUrl.searchParams.get('n') ?? undefined;
  const [night, fonts] = await Promise.all([sharedNight(id).then(n => n ?? sharedNight()), cardFonts()]);
  const px = 14 + Math.min(8, night.count) * 2;   /* one fire pixel, in card pixels */
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: `linear-gradient(180deg, #1E1611 0%, ${C.night} 100%)`, fontFamily: 'Alfa Slab One' }}>
        {/* the fire */}
        <div style={{ position: 'absolute', right: 110, bottom: 60, width: 16 * px, height: 16 * px, display: 'flex' }}>
          {night.lit && FLAME.map(([x, y, w, h, c]) => <div key={`${x}-${y}`} style={{ position: 'absolute', left: x * px, top: y * px, width: w * px, height: h * px, background: c, display: 'flex' }} />)}
          {!night.lit && <div style={{ position: 'absolute', left: 5 * px, top: 10 * px, width: 2 * px, height: px, background: '#D8712F', display: 'flex' }} />}
          <div style={{ position: 'absolute', left: 2 * px, top: 11 * px, width: 12 * px, height: 2 * px, background: C.brown, display: 'flex' }} />
          <div style={{ position: 'absolute', left: 1 * px, top: 13 * px, width: 14 * px, height: px, background: C.brown, display: 'flex' }} />
        </div>
        <div style={{ position: 'absolute', left: 72, top: 70, width: 620, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontFamily: 'Silkscreen', fontSize: 24, letterSpacing: 3, color: C.lantern }}>JOÐ · SPILAKVÖLD</div>
          <div style={{ display: 'flex', fontSize: 76, lineHeight: 1.05, color: C.paper, marginTop: 16 }}>{night.title}</div>
          {night.note && <div style={{ display: 'flex', fontFamily: 'Pixelify Sans', fontSize: 36, color: C.paper, marginTop: 18 }}>{`„${night.note}“`}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 26, gap: 10 }}>
            {night.lines.map(l => <div key={l} style={{ display: 'flex', fontFamily: 'Silkscreen', fontSize: 30, color: C.white }}>{l}</div>)}
          </div>
        </div>
        <div style={{ position: 'absolute', left: 0, bottom: 0, width: 1200, display: 'flex', flexDirection: 'column' }}>
          {STRATA.map(c => <div key={c} style={{ display: 'flex', height: 8, background: c }} />)}
        </div>
      </div>
    ),
    {
      ...CARD, fonts,
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300' },
    },
  );
}
