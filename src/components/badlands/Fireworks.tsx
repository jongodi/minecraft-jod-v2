/* Flugeldar: the game's firework rockets over the campfire, on an evening
   everyone who said they would come has come to (fullHouseOf in signal.ts).
   A rocket in the game goes straight up on a short trail and bursts into a
   small ball of square sparks in one dye's colour, which hang a moment and
   sink as they go out. Three of them here, one after another and round
   again, each a trail and a ring of sparks moved in whole pixel steps
   (badlands.css). None of it is the lantern's amber, which is kept for what
   can be pressed. Drawn only while the fact is true, never under reduced
   motion, and held still with the fire when the footer is out of sight. */

const UNIT = 4;   // a spark's side and the grid its place is rounded to, in px
/* a ball as the game's small burst draws it: an outer ring and a few inside it */
const RING: readonly [number, number][] = [[44, 12], [24, 6]];
const SPARKS = RING.flatMap(([r, n], ring) => Array.from({ length: n }, (_, i) => {
  const a = ((i + ring / 2) / n) * Math.PI * 2;
  const on = (v: number) => Math.round(v / UNIT) * UNIT;
  return { dx: on(Math.cos(a) * r), dy: on(Math.sin(a) * r) };
}));

/* where each goes up, how high it bursts, in which colour, and when in the round */
const ROCKETS = [
  { x: '20%', h: '13rem', c: 'var(--sun)', at: 0 },
  { x: '80%', h: '10.5rem', c: 'var(--ember)', at: 1 },
  { x: '66%', h: '15rem', c: 'var(--tc-white)', at: 2 },
] as const;

export default function Fireworks() {
  return (
    <span className="b-fireworks" aria-hidden="true">
      {ROCKETS.map(r => (
        <span key={r.at} className="b-rocket" style={{ ['--x' as string]: r.x, ['--h' as string]: r.h, ['--c' as string]: r.c, ['--at' as string]: r.at }}>
          <span className="b-rocket__trail" />
          <span className="b-rocket__burst">
            {SPARKS.map((s, i) => <i key={i} style={{ ['--dx' as string]: `${s.dx}px`, ['--dy' as string]: `${s.dy}px` }} />)}
          </span>
        </span>
      ))}
    </span>
  );
}
