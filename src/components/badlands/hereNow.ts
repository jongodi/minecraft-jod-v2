/* Hver er hvar: which of the crew stand at which of the places. The land
   already shows the heads where people stand, but most visitors read the
   world by its rail of eleven names, and after "is the server on" the next
   question is where everyone is: answered here in the names of the crew's
   own builds, on the place's chip and its postcard (World.tsx). */
import { andList } from '@/lib/format';

/* How near a place a player stands to be at it, in blocks along the ground:
   a build and its own grounds, give or take. A guess until the editor gives
   each place a size of its own. */
export const HERE_REACH = 48;

/** Who of the crew stands at each place, by place id. Each player is put at
    the nearest place within `reach` blocks, measured along the ground with
    the height left out, so nobody is at two places at once; at a place the
    names keep the order the players came in. Only players and places on the
    same map belong together: the caller hands in those on the main map's
    rendered ground, since someone at another base stands at coordinates
    that can fall near a place here. */
export function crewAtPlaces(
  players: readonly { name: string; x: number; z: number }[],
  places: readonly { id: number; world: { x: number; z: number } }[],
  reach = HERE_REACH,
): Map<number, string[]> {
  const at = new Map<number, string[]>();
  for (const p of players) {
    let best: number | null = null;
    let bestD = Infinity;
    for (const l of places) {
      const d = Math.hypot(p.x - l.world.x, p.z - l.world.z);
      if (d <= reach && d < bestD) { best = l.id; bestD = d; }
    }
    if (best !== null) at.set(best, [...(at.get(best) ?? []), p.name]);
  }
  return at;
}

/** Who is at a place, said: "joenana er hérna", "joenana og stebbias eru
    hérna", "joenana, stebbias og eikibleiki eru hérna"; `where` is the word
    for here ("hér núna" on the rail, read with the place's name). */
export function hereLine(names: readonly string[], where = 'hérna'): string {
  if (names.length === 0) return '';
  return `${andList(names)} ${names.length === 1 ? 'er' : 'eru'} ${where}`;
}
