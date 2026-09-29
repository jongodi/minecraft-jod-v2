import { ImageResponse } from 'next/og';
import { sharedPlace } from '@/lib/place-share';
import { printDataUrl } from '@/lib/crew-og';
import { C, CARD, STRATA, cardFonts } from '@/lib/og-card';

export const alt = 'Póstkort af stað í Minecraft-heimi JOÐ';
export const size = CARD;
export const contentType = 'image/png';
export const revalidate = 300;

/* A place's link card: its photo full bleed, the evening's strata along the
   foot, and a postcard on the paper of the site with the name, what it is
   and who built it. A place without a photo lies over the map's still. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const [shared, fonts] = await Promise.all([sharedPlace((await params).id), cardFonts()]);
  const backdrop = await printDataUrl(shared?.photo?.filename ?? '/map-poster.webp');
  const name = shared?.title ?? 'Staður fannst ekki';
  const sub = shared ? shared.description.split(' · byggt af ')[0] : '';
  const builders = shared?.place.builders ?? [];
  const long = name.length > 18;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: C.night, fontFamily: 'Alfa Slab One' }}>
        {backdrop && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backdrop} alt="" width={1200} height={630} style={{ position: 'absolute', left: 0, top: 0, width: 1200, height: 630, objectFit: 'cover', opacity: shared?.photo ? 1 : 0.7 }} />
        )}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1200, height: 630, display: 'flex', background: 'linear-gradient(180deg, rgba(21,16,13,0) 35%, rgba(21,16,13,0.7) 100%)' }} />

        {/* where it is from */}
        <div style={{ position: 'absolute', right: 48, top: 44, display: 'flex', padding: '10px 16px', background: C.paper, border: `4px solid ${C.brown}`, fontFamily: 'Silkscreen', fontSize: 22, color: C.ink }}>jodcraft.world</div>

        {/* the postcard */}
        <div style={{ position: 'absolute', left: 56, bottom: 74, maxWidth: 820, display: 'flex', flexDirection: 'column', padding: '26px 34px 30px', background: C.paper, border: `4px solid ${C.brown}` }}>
          <div style={{ display: 'flex', fontFamily: 'Silkscreen', fontSize: 20, letterSpacing: 2, color: C.inkFaint }}>PÓSTKORT FRÁ JOÐ</div>
          <div style={{ display: 'flex', fontSize: long ? 58 : 76, lineHeight: 1.05, color: C.ink, marginTop: 8 }}>{name}</div>
          {sub && <div style={{ display: 'flex', fontFamily: 'Pixelify Sans', fontSize: 32, lineHeight: 1.3, color: C.inkSoft, marginTop: 10 }}>{sub}</div>}
          {builders.length > 0 && (
            <div style={{ display: 'flex', fontFamily: 'Silkscreen', fontSize: 20, letterSpacing: 1, color: C.red, marginTop: 14 }}>{`BYGGT AF ${builders.join(', ').toUpperCase()}`}</div>
          )}
        </div>

        {/* the strata along the foot */}
        <div style={{ position: 'absolute', left: 0, bottom: 0, width: 1200, display: 'flex', flexDirection: 'column' }}>
          {STRATA.map(c => <div key={c} style={{ display: 'flex', height: 8, background: c }} />)}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
