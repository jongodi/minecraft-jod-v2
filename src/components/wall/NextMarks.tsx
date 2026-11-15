import { MARKS, nextMark, type MilestoneKind } from '@/lib/milestone-marks';
import { formatNumber } from '@/lib/format';

/* Næstu áfangar: the round numbers a member is on the way to, under the
   charges on their poster. The board tells a mark the day it is passed
   (src/lib/milestones.ts); the poster says which are coming and how far off
   they are, from the same numbers the lines above it are printed from. The
   two nearest, by how much of the way from the mark before is still ahead:
   a mark nearly reached is what is worth saying, on one's own wall and on a
   friend's alike. Printed as the charges are, a line, dots and a number. */

export interface Coming { what: MilestoneKind; mark: number; left: number; ahead: number }

/** The marks ahead, the nearest first. `ahead` is the share of the way from the mark before that is left. */
export function comingMarks(stats: { playTimeTicks?: number; playTimeHours?: number; deaths?: number; mobKills?: number; travelCm?: number }, most = 2): Coming[] {
  const hours = stats.playTimeTicks ? stats.playTimeTicks / 72_000 : stats.playTimeHours ?? 0;
  const values: Record<MilestoneKind, number> = { hours, deaths: stats.deaths ?? 0, mobs: stats.mobKills ?? 0, km: (stats.travelCm ?? 0) / 100_000 };
  return (Object.keys(MARKS) as MilestoneKind[])
    .flatMap(what => {
      const next = nextMark(what, values[what]);
      /* nothing counted yet is no way begun */
      if (!next || values[what] <= 0) return [];
      return [{ what, mark: next.mark, left: next.left, ahead: next.left / (next.mark - next.from) }];
    })
    .sort((a, b) => a.ahead - b.ahead)
    .slice(0, most);
}

/** What is coming, and what is left to it, in the poster's words. */
export function comingWords({ what, mark, left }: Coming): { goal: string; left: string } {
  const n = formatNumber(mark);
  /* what is left, rounded up: 1 until the mark is passed, never 0 */
  const whole = formatNumber(Math.max(1, Math.ceil(left)));
  switch (what) {
    case 'hours':  return { goal: `${n} klst. í heiminum`, left: `${whole} klst.` };
    case 'deaths': return { goal: `${n}. dauðsfallið`, left: whole };
    case 'mobs':   return { goal: `${n} verur felldar`, left: whole };
    case 'km':     return { goal: `${n} km á eigin fótum`, left: `${whole} km` };
  }
}

export default function NextMarks({ stats }: { stats: Parameters<typeof comingMarks>[0] }) {
  const coming = comingMarks(stats);
  if (coming.length === 0) return null;
  return (
    <section className="w-next" aria-label="Næstu áfangar">
      {/* the column says once what its numbers are: said on every line, "eftir" wrapped the longer marks onto two */}
      <p className="w-adv__head"><span className="b-paper__kicker">Næstu áfangar</span><span className="w-adv__count">eftir</span></p>
      <dl className="w-next__list">
        {coming.map(c => {
          const w = comingWords(c);
          return (
            <div key={c.what} className="b-stat">
              <dt className="b-stat__k">{w.goal}</dt>
              <dd className="b-stat__v">{w.left}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
