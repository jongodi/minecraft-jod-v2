import Link from 'next/link';
import PlayerHead from './PlayerHead';
import { Lantern } from './Bits';

/* The badlands silhouettes behind the hero: three mesa layers and the ground.
   Each layer is a stepped outline built from plateaus so the edge reads as
   terracotta blocks, banded with the strata. Depth (parallax) and the hour
   come from CSS: each layer is its rock drawn once, in its sunset colours,
   with the night laid over it as a second drawing of the same outline whose
   opacity rises with the evening. So a scroll frame moves the layer and
   fades its night, both on the compositor, and repaints nothing: animating
   the rock's own fill repainted every layer, its bands and its haze on every
   frame. Scroll-driven animations where the browser has them, --evening set
   by a script where it does not. */

const W = 480;
const H = 120;

/** [width, height] plateaus, left to right. Heights are measured up from the base. */
type Plateau = readonly [number, number];

const FAR: Plateau[]  = [[30, 40], [12, 52], [40, 60], [10, 46], [26, 40], [30, 30], [24, 44], [14, 56], [42, 66], [12, 50], [28, 38], [40, 34], [12, 48], [36, 58], [20, 44], [30, 36], [24, 42], [30, 30], [20, 40]];
const MID: Plateau[]  = [[24, 22], [10, 34], [36, 44], [12, 30], [30, 24], [40, 18], [12, 30], [44, 52], [14, 40], [34, 26], [30, 20], [10, 30], [38, 42], [12, 32], [26, 22], [36, 16], [22, 28], [30, 24], [20, 18]];
const NEAR: Plateau[] = [[40, 10], [14, 20], [50, 30], [12, 22], [44, 12], [30, 8], [16, 18], [60, 34], [14, 24], [40, 14], [50, 8], [20, 16], [46, 26], [12, 18], [32, 10]];

function outline(plateaus: Plateau[]): string {
  let x = 0;
  let d = `M0 ${H}`;
  for (const [w, h] of plateaus) {
    d += ` V${H - h} H${x + w}`;
    x += w;
  }
  d += ` V${H} Z`;
  return d;
}

/** Each plateau's top edge: [x, y, width], for the snow that lies on it. */
function tops(plateaus: Plateau[]): [number, number, number][] {
  let x = 0;
  return plateaus.map(([w, h]) => { const t: [number, number, number] = [x, H - h, w]; x += w; return t; });
}

/* Snow on every plateau: two rows of white, a pixel of it spilling over each edge. */
function Snow({ plateaus }: { plateaus: Plateau[] }) {
  return (
    <g className="b-mesa__snow">
      {tops(plateaus).map(([x, y, w]) => <rect key={x} x={x} y={y} width={w} height="2" />)}
    </g>
  );
}

/* Jack-o'-lanterns on the widest plateaus of the nearest ridge, lit from
   inside: the pumpkin is rock-side, and the night falls on it; its face is
   drawn over the night, so it burns brighter as the evening goes on. */
const LANTERN_ON = [2, 7, 12];
const pumpkinSpots = () => tops(NEAR).filter((_, i) => LANTERN_ON.includes(i)).map(([x, y, w]) => [Math.round(x + w / 2 - 4), y - 7] as const);
function Pumpkins() {
  return (
    <g className="b-mesa__pumpkins">
      {pumpkinSpots().map(([px, py]) => (
        <g key={px}>
          <rect x={px + 3} y={py - 2} width="2" height="2" fill="var(--online)" />
          <rect x={px + 1} y={py} width="6" height="7" fill="var(--tc-orange)" />
          <rect x={px} y={py + 1} width="8" height="5" fill="var(--tc-orange)" />
        </g>
      ))}
    </g>
  );
}
function PumpkinFaces() {
  return (
    <g className="b-mesa__lit">
      {pumpkinSpots().map(([px, py]) => (
        <g key={px}>
          <rect x={px + 2} y={py + 2} width="1" height="1" />
          <rect x={px + 5} y={py + 2} width="1" height="1" />
          <rect x={px + 2} y={py + 4} width="4" height="1" />
          <rect x={px + 3} y={py + 5} width="2" height="1" />
        </g>
      ))}
    </g>
  );
}

const FAR_D = outline(FAR);
const MID_D = outline(MID);
const NEAR_D = outline(NEAR);

/* The terracotta strata, as the biome lays them: bands of the five clays
   through every ridge, each clipped to its own outline. [y, height, colour].
   The near ridge carries them thick and full; the middle one thinner; the
   far one faint (a third of their colour), so they never take the edge off
   the name's letters standing in front of it. */
type Band = readonly [number, number, string];
const NEAR_BANDS: Band[] = [[H - 31, 4, 'var(--tc-red)'], [H - 24, 3, 'var(--tc-yellow)'], [H - 17, 5, 'var(--tc-orange)'], [H - 8, 3, 'var(--tc-white)']];
const MID_BANDS: Band[]  = [[H - 44, 2, 'var(--tc-yellow)'], [H - 36, 3, 'var(--tc-red)'], [H - 27, 2, 'var(--tc-white)'], [H - 19, 3, 'var(--tc-brown)'], [H - 10, 2, 'var(--tc-yellow)']];
const FAR_BANDS: Band[]  = [[H - 58, 2, 'var(--tc-white)'], [H - 50, 3, 'var(--tc-yellow)'], [H - 41, 2, 'var(--tc-orange)']];

function Bands({ id, d, bands, faint = false }: { id: string; d: string; bands: Band[]; faint?: boolean }) {
  return (
    <>
      <defs><clipPath id={id}><path d={d} /></clipPath></defs>
      <g className="b-mesa__band" clipPath={`url(#${id})`} fillOpacity={faint ? 0.34 : undefined}>
        {bands.map(([y, h, fill]) => <rect key={y} x="0" y={y} width={W} height={h} fill={fill} />)}
      </g>
    </>
  );
}

/* The haze at the foot of the far ridge: the horizon's gold between it and
   the eye, in two steps, thicker the lower and further it is (a pixel
   artist's banding rather than a gradient). A drawing of its own over the
   rock, clipped to the ridge, so it can go with the afterglow (it is the same
   light) by one opacity. */
function Haze() {
  return (
    <svg className="b-mesa__haze" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs><clipPath id="b-mesa-far-haze"><path d={FAR_D} /></clipPath></defs>
      <g clipPath="url(#b-mesa-far-haze)">
        <rect x="0" y={H - 40} width={W} height="10" fillOpacity="0.16" />
        <rect x="0" y={H - 30} width={W} height="30" fillOpacity="0.36" />
      </g>
    </svg>
  );
}

/** One ridge: its rock and strata in the sunset's colours, drawn once; what
    sits over the rock and fades on its own (the far ridge's haze); the night
    falling on it, the same outline in the dark, faded in with the evening;
    then what lights itself and so stays bright over the night (the
    jack-o'-lanterns' faces), and what stands on it (the crew). */
function Layer({ d, mod, children, haze, lit, after }: { d: string; mod: string; children?: React.ReactNode; haze?: React.ReactNode; lit?: React.ReactNode; after?: React.ReactNode }) {
  const box = `0 0 ${W} ${H}`;
  return (
    <div className={`b-mesa__layer b-mesa__layer--${mod}`}>
      <svg viewBox={box} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <path className="b-mesa__rock" d={d} fill="currentColor" />
        {children}
      </svg>
      {haze}
      <svg className="b-mesa__shade" viewBox={box} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <path d={d} />
      </svg>
      {lit && <svg className="b-mesa__over" viewBox={box} preserveAspectRatio="xMidYMax slice" aria-hidden="true">{lit}</svg>}
      {after}
    </div>
  );
}

/** The same far ridge, low and dark, for the foot of the page: the evening
    opened over these mesas, and the campfire burns in front of them once they
    are out of the light. Squashed to the band's height on purpose, so a whole
    horizon fits in three centimetres of page. */
export function Ridge({ snow = false }: { snow?: boolean }) {
  return (
    <div className="b-ridge" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <path d={FAR_D} fill="currentColor" />
        {snow && <Snow plateaus={FAR} />}
      </svg>
    </div>
  );
}

/* How many of the crew a plateau holds before the rest are a count beside
   them: three beside the name on a wide screen; two on a phone, where the
   plateau stands in front of the name's feet and a third figure covered the
   O's window (the third is hidden there by badlands.css). */
const RIDERS_SHOWN = 3;
const RIDERS_ON_PHONE = 2;

/** The crew who are in, standing on a plateau of the nearest ridge as
    themselves: the whole skin at the land's own scale, each with a lit
    lantern in hand, side by side against the sunset (beside the name on a
    wide screen, at its feet on a phone; badlands.css places the group on a
    plateau by its coordinates in the ridge's own drawing). A wanted poster's
    Western, and the game's own figure. Each is a way to that member's wall,
    so the lantern's amber is the site's own sign for "press". Inside the near
    layer, so they move with it. A skin the services can't give falls back to
    the drawn stand-in (PlayerHead). */
function Riders({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  const shown = names.slice(0, RIDERS_SHOWN);
  const more = names.length - shown.length;
  return (
    <div className="b-mesa__riders">
      {shown.map(n => (
        <Link key={n} href={`/crew/${n}`} className="b-mesa__rider b-tip" data-tip={`${n} er inni`} aria-label={`${n} er inni. Veggurinn`}>
          <PlayerHead name={n} size={32} full alt="" />
          <Lantern lit className="b-mesa__held" />
        </Link>
      ))}
      {more > 0 && <span className="b-mesa__more b-mesa__more--wide">+{more}</span>}
      {names.length > RIDERS_ON_PHONE && <span className="b-mesa__more b-mesa__more--phone">+{names.length - RIDERS_ON_PHONE}</span>}
    </div>
  );
}

/** The mesas; in winter with snow on them, at Hrekkjavaka with jack-o'-lanterns
    (src/lib/season.ts); with the heads of whoever is in on the nearest ridge. */
export default function Mesa({ snow = false, halloween = false, heads = [] }: { snow?: boolean; halloween?: boolean; heads?: string[] }) {
  return (
    <div className="b-mesa">
      <Layer d={FAR_D} mod="far" haze={<Haze />}>
        <Bands id="b-mesa-far-bands" d={FAR_D} bands={FAR_BANDS} faint />
        {snow && <Snow plateaus={FAR} />}
      </Layer>
      <Layer d={MID_D} mod="mid">
        <Bands id="b-mesa-mid" d={MID_D} bands={MID_BANDS} />
        {snow && <Snow plateaus={MID} />}
      </Layer>
      <Layer d={NEAR_D} mod="near" lit={halloween ? <PumpkinFaces /> : undefined} after={<Riders names={heads} />}>
        <Bands id="b-mesa-near" d={NEAR_D} bands={NEAR_BANDS} />
        {snow && <Snow plateaus={NEAR} />}
        {halloween && <Pumpkins />}
      </Layer>
      <Layer d={`M0 ${H - 4} H${W} V${H} H0 Z`} mod="ground" />
    </div>
  );
}
