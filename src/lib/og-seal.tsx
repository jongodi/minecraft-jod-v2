// JOÐ's seal on the link cards, drawn as the page draws it (Bits.tsx, Seal):
// the Ð in the slab raised out of red wax, on the 16-unit grid at a whole
// multiple of it. The card renderer reads no CSS, so the wax's colours are
// written out here from the mixes the page makes (badlands.css, .b-seal).
import { SEAL_DISC, SEAL_LIGHT, SEAL_WAX } from '@/components/badlands/Bits';

const WAX = { body: '#8F3D2E', deep: '#743327', light: '#AA6D5B', eth: '#CFB09A', shadow: '#4C241C' };

/** The seal, `unit` card pixels to one of its sixteen; 6 (96 px) at the
    least, where the Ð still reads as Ð in a preview shown at half size. */
export function CardSeal({ unit = 6, style }: { unit?: number; style?: Record<string, string | number> }) {
  const size = unit * 16;
  return (
    <div style={{ position: 'absolute', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" style={{ position: 'absolute', left: 0, top: 0 }}>
        <path d={SEAL_WAX} fill={WAX.body} />
        <path d={SEAL_DISC} fill={WAX.deep} />
        <path d={SEAL_LIGHT} fill={WAX.light} />
      </svg>
      {/* the Ð at the page's proportion to the wax, nudged half a unit right and up off the disc's centre, as the page sets it */}
      <div style={{ display: 'flex', fontFamily: 'Alfa Slab One', fontSize: Math.round(size * 0.54), lineHeight: 1, color: WAX.eth, textShadow: `0 ${unit / 3}px 0 ${WAX.shadow}`, marginLeft: unit / 3, marginTop: -unit / 3 }}>Ð</div>
    </div>
  );
}
