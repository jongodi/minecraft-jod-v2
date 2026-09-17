/* The badlands silhouettes behind the hero: three mesa layers and the ground.
   Each layer is a stepped outline built from plateaus so the edge reads as
   terracotta blocks. Depth (parallax) and colour by hour come from CSS. */

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

const FAR_D = outline(FAR);
const MID_D = outline(MID);
const NEAR_D = outline(NEAR);

/* Strata bands through the nearest mesa, clipped to its outline. */
const BANDS = [[H - 30, 3, 'var(--tc-red)'], [H - 22, 2, 'var(--tc-yellow)'], [H - 15, 4, 'var(--tc-orange)'], [H - 8, 2, 'var(--tc-white)']] as const;

function Layer({ d, mod, children }: { d: string; mod: string; children?: React.ReactNode }) {
  return (
    <div className={`b-mesa__layer b-mesa__layer--${mod}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <path d={d} fill="currentColor" />
        {children}
      </svg>
    </div>
  );
}

/** The same far ridge, low and dark, for the foot of the page: the evening
    opened over these mesas, and the campfire burns in front of them once they
    are out of the light. Squashed to the band's height on purpose, so a whole
    horizon fits in three centimetres of page. */
export function Ridge() {
  return (
    <div className="b-ridge" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <path d={FAR_D} fill="currentColor" />
      </svg>
    </div>
  );
}

export default function Mesa() {
  return (
    <div className="b-mesa" aria-hidden="true">
      <Layer d={FAR_D} mod="far" />
      <Layer d={MID_D} mod="mid" />
      <Layer d={NEAR_D} mod="near">
        <defs><clipPath id="b-mesa-near"><path d={NEAR_D} /></clipPath></defs>
        <g className="b-mesa__band" clipPath="url(#b-mesa-near)">
          {BANDS.map(([y, h, fill]) => <rect key={y} x="0" y={y} width={W} height={h} fill={fill} />)}
        </g>
      </Layer>
      <Layer d={`M0 ${H - 4} H${W} V${H} H0 Z`} mod="ground" />
    </div>
  );
}
