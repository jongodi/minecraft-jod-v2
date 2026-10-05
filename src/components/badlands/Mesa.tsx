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

function Layer({ d, mod, children }: { d: string; mod: string; children?: React.ReactNode }) {
  return (
    <div className={`b-mesa__layer b-mesa__layer--${mod}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        {/* the rock: coloured by the layer (the fallbacks) or by its own scroll-driven fill (badlands.css) */}
        <path className="b-mesa__rock" d={d} fill="currentColor" />
        {children}
      </svg>
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

/** The mesas; in winter with snow on them, at Hrekkjavaka with jack-o'-lanterns (src/lib/season.ts). */
export default function Mesa({ snow = false, halloween = false }: { snow?: boolean; halloween?: boolean }) {
  return (
    <div className="b-mesa" aria-hidden="true">
      <Layer d={FAR_D} mod="far">{snow && <Snow plateaus={FAR} />}</Layer>
      <Layer d={MID_D} mod="mid">{snow && <Snow plateaus={MID} />}</Layer>
      <Layer d={NEAR_D} mod="near">
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

/* The near ridge running on over the top of the world: [width, depth] steps
   across 480 units, depth measured down from the top of a 32-unit band. Low
   (three units) under the world's title on the left and its tools on the
   right, so it never crosses them; it rises only in the middle, where the
   frame's top is open sky, to a block-stepped peak. */
const VALLEY: Plateau[] = [[192, 3], [19, 10], [19, 18], [24, 26], [15, 32], [14, 20], [24, 8], [173, 3]];
function valleyOutline(steps: Plateau[], drop = 0): string {
  let x = 0;
  let d = 'M0 0';
  for (const [w, h] of steps) { d += ` V${h + drop} H${x + w}`; x += w; }
  return `${d} V0 Z`;
}
const VALLEY_D = valleyOutline(VALLEY);
const VALLEY_RIM_D = valleyOutline(VALLEY, 1);
const VALLEY_SHADOW_D = valleyOutline(VALLEY, 2);

/** The badlands carried down over the top of the world's frame: the same
    dark ground the hero ends on, stepping down into the map, so the page's
    one big turn, from the sunset to the world, happens in the land instead of
    at a ruled line. Its stepped edge is drawn the way the hero's ridges are lit:
    a pixel of the rock's own brown along it, catching the town's light, and a
    pixel of shadow under that, parting it from the map's night sky. */
export function ValleyRidge() {
  return (
    <div className="b-valley" aria-hidden="true">
      <svg viewBox="0 0 480 34" preserveAspectRatio="none">
        <path d={VALLEY_SHADOW_D} fill="var(--night)" opacity="0.6" />
        <path d={VALLEY_RIM_D} fill="var(--tc-brown)" />
        <path d={VALLEY_D} fill="currentColor" />
      </svg>
    </div>
  );
}

