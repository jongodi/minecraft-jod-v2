import Link from 'next/link';
import PlayerHead from './PlayerHead';

/* The badlands silhouettes behind the hero: three mesa layers and the ground.
   Each layer is a stepped outline built from plateaus so the edge reads as
   terracotta blocks. Depth (parallax) and colour by hour come from CSS:
   scroll-driven animations on the layer and its rock where the browser has
   them, --evening on the layer where a script drives the hour instead. */

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

/* Jack-o'-lanterns on the widest plateaus of the nearest ridge, lit from inside. */
const LANTERN_ON = [2, 7, 12];
function Pumpkins() {
  return (
    <g className="b-mesa__pumpkins">
      {tops(NEAR).filter((_, i) => LANTERN_ON.includes(i)).map(([x, y, w]) => {
        const px = Math.round(x + w / 2 - 4);
        const py = y - 7;
        return (
          <g key={x}>
            <rect x={px + 3} y={py - 2} width="2" height="2" fill="var(--online)" />
            <rect x={px + 1} y={py} width="6" height="7" fill="var(--tc-orange)" />
            <rect x={px} y={py + 1} width="8" height="5" fill="var(--tc-orange)" />
            <rect x={px + 2} y={py + 2} width="1" height="1" className="b-mesa__lit" />
            <rect x={px + 5} y={py + 2} width="1" height="1" className="b-mesa__lit" />
            <rect x={px + 2} y={py + 4} width="4" height="1" className="b-mesa__lit" />
            <rect x={px + 3} y={py + 5} width="2" height="1" className="b-mesa__lit" />
          </g>
        );
      })}
    </g>
  );
}

const FAR_D = outline(FAR);
const MID_D = outline(MID);
const NEAR_D = outline(NEAR);

/* Strata bands through the nearest mesa, clipped to its outline. */
const BANDS = [[H - 30, 3, 'var(--tc-red)'], [H - 22, 2, 'var(--tc-yellow)'], [H - 15, 4, 'var(--tc-orange)'], [H - 8, 2, 'var(--tc-white)']] as const;

function Layer({ d, mod, children, after }: { d: string; mod: string; children?: React.ReactNode; after?: React.ReactNode }) {
  return (
    <div className={`b-mesa__layer b-mesa__layer--${mod}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        {/* the rock: coloured by the layer (the fallbacks) or by its own scroll-driven fill (badlands.css) */}
        <path className="b-mesa__rock" d={d} fill="currentColor" />
        {children}
      </svg>
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

/* How many heads a plateau holds before the rest are a count beside them. */
const HEADS_SHOWN = 4;

/** The crew who are in, standing on a plateau of the nearest ridge as their
    heads, the way a head block stands on the ground: beside the name on a
    wide screen, at its feet on a phone (badlands.css places the group on a
    plateau by its coordinates in the ridge's own drawing). Each is a way to
    that member's wall. Inside the near layer, so they move with it. */
function Heads({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  const shown = names.slice(0, HEADS_SHOWN);
  const more = names.length - shown.length;
  return (
    <div className="b-mesa__heads">
      {shown.map(n => (
        <Link key={n} href={`/crew/${n}`} className="b-mesa__head b-tip" data-tip={`${n} er inni`} aria-label={`${n} er inni. Veggurinn`}>
          <PlayerHead name={n} size={24} alt="" />
        </Link>
      ))}
      {more > 0 && <span className="b-mesa__more">+{more}</span>}
    </div>
  );
}

/** The mesas; in winter with snow on them, at Hrekkjavaka with jack-o'-lanterns
    (src/lib/season.ts); with the heads of whoever is in on the nearest ridge. */
export default function Mesa({ snow = false, halloween = false, heads = [] }: { snow?: boolean; halloween?: boolean; heads?: string[] }) {
  return (
    <div className="b-mesa">
      <Layer d={FAR_D} mod="far">{snow && <Snow plateaus={FAR} />}</Layer>
      <Layer d={MID_D} mod="mid">{snow && <Snow plateaus={MID} />}</Layer>
      <Layer d={NEAR_D} mod="near" after={<Heads names={heads} />}>
        <defs><clipPath id="b-mesa-near"><path d={NEAR_D} /></clipPath></defs>
        <g className="b-mesa__band" clipPath="url(#b-mesa-near)">
          {BANDS.map(([y, h, fill]) => <rect key={y} x="0" y={y} width={W} height={h} fill={fill} />)}
        </g>
        {snow && <Snow plateaus={NEAR} />}
        {halloween && <Pumpkins />}
      </Layer>
      <Layer d={`M0 ${H - 4} H${W} V${H} H0 Z`} mod="ground" />
    </div>
  );
}
