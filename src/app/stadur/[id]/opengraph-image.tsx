import { ImageResponse } from 'next/og';
import { sharedPlace } from '@/lib/place-share';
import { printDataUrl } from '@/lib/crew-og';
import { C, CARD, STRATA, cardFonts } from '@/lib/og-card';
import { onMap, type MapBounds } from '@/lib/base-links';
import { FLIGHT, cardShot, flightFrame, type CardShot } from '@/lib/map-flight';
import type { MapLocation } from '@/lib/map-types';
import viewerFiles from '@/lib/bluemap-viewer.json';
import { andList } from '@/lib/format';

export const alt = 'Póstkort af stað í Minecraft-heimi JOÐ';
export const size = CARD;
export const contentType = 'image/png';
export const revalidate = 300;

/* The main map's rendered edges, as map:brand wrote them */
const BOUNDS = (viewerFiles as { bounds?: MapBounds | null }).bounds ?? null;

/* What the card lays over the picture, in its pixels: the postcard at the
   foot on the left (as wide as a long name makes it) and the site's name at
   the top right. A lantern stands clear above the postcard, or beside it. */
const clear = (x: number, y: number) =>
  (y >= 120 && y <= 290 && x >= 70 && x <= CARD.width - 70) || (x >= 900 && x <= CARD.width - 60 && y >= 130 && y <= CARD.height - 70);

/** A place with no photo of its own, seen from the air: the still of the
    flight down that shows it nearest with its lantern clear of the postcard,
    for a place standing on the main map's ground; null for one elsewhere, or
    before a flight has been taken. */
function fromTheAir(place: MapLocation): CardShot | null {
  if (!FLIGHT || !place.world || (BOUNDS && !onMap(BOUNDS, place.world))) return null;
  /* its lantern stands in the middle of its block, a block up */
  return cardShot(FLIGHT.wide, [place.world.x + 0.5, place.world.y + 1, place.world.z + 0.5], CARD, clear);
}

/* A place's link card: its photo full bleed, the evening's strata along the
   foot, and a postcard on the paper of the site with the name, what it is
   and who built it. A place without a photo is seen from the air, on the
   still of the flight down that shows it best, its lantern lit where it
   stands, so the link says where in the world it is; one the flight never
   sees lies over the map's still. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const [shared, fonts] = await Promise.all([sharedPlace((await params).id), cardFonts()]);
  const air = shared && !shared.photo && FLIGHT ? fromTheAir(shared.place) : null;
  const backdrop = shared?.photo
    ? await printDataUrl(shared.photo.filename)
    : air && FLIGHT ? await printDataUrl(flightFrame(FLIGHT, 'wide', air.k), air.width) : await printDataUrl('/map-poster.webp');
  const name = shared?.title ?? 'Staður fannst ekki';
  const builders = shared?.place.builders ?? [];
  /* what it is; a place with neither a subtitle nor builders says where it is.
     Cut out of the description, a place with builders and no subtitle said
     "byggt af" twice. */
  const sub = shared ? shared.sub || (builders.length ? '' : shared.description) : '';
  const long = name.length > 18;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: C.night, fontFamily: 'Alfa Slab One' }}>
        {backdrop && (air ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backdrop} alt="" width={air.width} height={air.height} style={{ position: 'absolute', left: air.left, top: air.top, width: air.width, height: air.height }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backdrop} alt="" width={1200} height={630} style={{ position: 'absolute', left: 0, top: 0, width: 1200, height: 630, objectFit: 'cover', opacity: shared?.photo ? 1 : 0.7 }} />
        ))}
        {/* the place's lantern, lit where it stands, its foot on the spot, in a pool of its own light */}
        {backdrop && air && (
          <div style={{ position: 'absolute', left: air.x - 90, top: air.y - 117, width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(closest-side, rgba(242,166,59,0.5), rgba(242,166,59,0.16) 55%, rgba(242,166,59,0))' }}>
            <svg width="36" height="54" viewBox="0 0 12 18">
              <g fill={C.white}>
                <rect x="4" y="0" width="4" height="1" />
                <rect x="3" y="1" width="1" height="2" />
                <rect x="8" y="1" width="1" height="2" />
                <rect x="2" y="3" width="8" height="2" />
                <rect x="2" y="5" width="1" height="8" />
                <rect x="9" y="5" width="1" height="8" />
                <rect x="1" y="13" width="10" height="2" />
                <rect x="3" y="15" width="6" height="1" />
              </g>
              <rect x="3" y="5" width="6" height="8" fill={C.lantern} />
              <rect x="5" y="8" width="2" height="3" fill={C.paper} />
            </svg>
          </div>
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
            <div style={{ display: 'flex', fontFamily: 'Silkscreen', fontSize: 20, letterSpacing: 1, color: C.red, marginTop: 14 }}>{`BYGGT AF ${andList(builders).toUpperCase()}`}</div>
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
