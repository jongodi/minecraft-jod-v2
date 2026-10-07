'use client';

import Link from 'next/link';
import PlayerHead from './PlayerHead';
import { Seal } from './Bits';
import Rail from './Rail';
import { STAT_TABS, isLowerBetter, type StatKey } from './data';
import type { StatsState } from './hooks';
import type { WeekPlayer } from '@/app/api/stats/route';
import { dayLabel, sinceAt } from './night';

const TOP = 3;

/* The charges that can be counted for a week, from the daily copies: a
   running total's rise between two days. The others are moments (time
   since a death, since a rest), the campfire's own, or already a tally. */
const WEEK_OF: Partial<Record<StatKey, keyof WeekPlayer>> = {
  playTimeHours: 'playTimeHours', mobKills: 'mobKills', deaths: 'deaths', travelCm: 'travelCm',
  damageRatio: 'damageRatio', raidWins: 'raidWins', recordsPlayed: 'recordsPlayed',
};

/** The wanted board: one poster per charge, the top three on each, on one
    rail across the room. Each is laid out the way a wanted poster is: the
    word itself across the top, the outlaw's face large in a frame, the name
    under it, the alias the charge earns them, the charge, and the bounty;
    second and third as two lines under the rule. Values are pixel type: they
    come straight from the server's stat files. */
export default function Wanted({ stats }: { stats: StatsState }) {
  /* written out in Icelandic (night.ts), not left to the browser's locale data, which falls back to English */
  const when = stats.cachedAt ? sinceAt(stats.cachedAt) : null;

  const posters = STAT_TABS.map(meta => {
    const low = isLowerBetter(meta.id);
    const rows = stats.players
      .map(p => ({ name: p.username, val: p[meta.id] ?? 0 }))
      .filter(r => r.val > 0)
      .sort((a, b) => (low ? a.val - b.val : b.val - a.val))
      .slice(0, TOP);
    /* the week's leader for the same charge, where the week can be counted */
    const key = WEEK_OF[meta.id];
    const week = key && stats.week
      ? stats.week.players.map(p => ({ name: p.username, val: p[key] as number })).filter(r => r.val > 0).sort((a, b) => b.val - a.val)[0] ?? null
      : null;
    return { meta, rows, week };
  }).filter(p => p.rows.length > 0);   /* a charge nobody has been caught for yet stays off the board */
  const span = stats.week ? `${dayLabel(stats.week.from)} til ${dayLabel(stats.week.to)}` : '';

  return (
    <div className="b-wanted">
      {/* the room's plank already says Eftirlýst; the board only says where its numbers came from */}
      {stats.source && posters.length > 0 && (
        <div className="b-head b-head--tight">
          <p className="b-note">
            {stats.source === 'live' ? `beint frá þjóninum${when ? `, sótt ${when}` : ''}` :
             stats.source === 'cached' ? `slökkt á þjóninum, síðast sótt ${when ?? 'við síðustu uppfærslu'}` :
             'engar tölur úr leiknum í augnablikinu; varðeldurinn telur samt'}
          </p>
        </div>
      )}

      {/* an empty board says nothing of its own: the room's one line under the
          portraits says why there are no numbers, beside why nobody is in */}
      {posters.length === 0 ? (
        stats.source === null && !stats.failed ? (
          /* while the numbers come: three blank posters on the rail, the shape
             first and the detail after, as the game draws a chunk */
          <div className="b-posters b-posters--blank" role="status" aria-label="sæki tölurnar">
            <div className="b-rail at-start at-end" aria-hidden="true">
              {[0, 1, 2].map(i => (
                <div key={i} className="b-hang">
                  <div className="b-paper b-paper--torn b-poster b-poster--blank">
                    <span className="b-paper__nail b-paper__nail--l" />
                    <span className="b-paper__nail b-paper__nail--r" />
                    <span className="b-poster__mast">Eftirlýst</span>
                    <span className="b-poster__lead"><span className="b-poster__img"><span className="b-poster__face" /></span><span className="b-poster__blank b-poster__blank--name" /></span>
                    <span className="b-poster__blank b-poster__blank--alias" />
                    <span className="b-poster__blank b-poster__blank--charge" />
                    <span className="b-poster__blank b-poster__blank--val" />
                    <Seal className="b-poster__seal" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null
      ) : (
        <Rail className="b-posters" label="Eftirlýsingar" prevLabel="Fyrri spjöld" nextLabel="Næstu spjöld" count={posters.length}>
          {posters.map(({ meta, rows: [first, ...rest], week }) => (
            <div key={meta.id} className="b-hang" data-rail-item={meta.id}>
            <div className="b-paper b-paper--torn b-poster">
              <span className="b-paper__nail b-paper__nail--l" aria-hidden="true" />
              <span className="b-paper__nail b-paper__nail--r" aria-hidden="true" />
              <span className="b-poster__mast">Eftirlýst</span>
              <Link href={`/crew/${first.name}`} className="b-poster__lead">
                <span className="b-poster__img"><PlayerHead name={first.name} size={96} /></span>
                <span className="b-poster__name">{first.name}</span>
              </Link>
              <span className="b-poster__alias">„{meta.nick}“</span>
              <span className="b-poster__charge">{meta.label}</span>
              <span className="b-poster__bounty"><span className="b-poster__reward">Verðlaun</span> <span className="b-poster__val">{meta.unit(first.val)}</span></span>
              {rest.length > 0 && (
                <>
                  <span className="b-poster__rule" aria-hidden="true" />
                  <ol className="b-poster__rest" start={2} aria-label={`${meta.label}, 2. og 3. sæti`}>
                    {rest.map((r, i) => (
                      <li key={r.name}>
                        <Link href={`/crew/${r.name}`} className="b-poster__row">
                          <span className="b-poster__rank">{i + 2}.</span>
                          <span className="b-poster__head"><PlayerHead name={r.name} size={32} /></span>
                          <span className="b-poster__who">{r.name}</span>
                          <span className="b-poster__num">{meta.unit(r.val)}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </>
              )}
              {/* the week's outlaw: whoever's number rose the most since the copy a week ago */}
              {week && (
                <>
                  <span className="b-poster__rule b-poster__rule--week" aria-hidden="true" />
                  <span className="b-poster__weekhead b-tip" data-tip={span} tabIndex={0}>Í vikunni</span>
                  <Link href={`/crew/${week.name}`} className="b-poster__row b-poster__row--week" aria-label={`Í vikunni, ${span}: ${week.name}, ${meta.unit(week.val)}`}>
                    <span className="b-poster__head"><PlayerHead name={week.name} size={32} /></span>
                    <span className="b-poster__who">{week.name}</span>
                    <span className="b-poster__num">{meta.unit(week.val)}</span>
                  </Link>
                </>
              )}
              {/* the board's authority: the seal at the poster's foot */}
              <Seal className="b-poster__seal" />
            </div>
            </div>
          ))}
        </Rail>
      )}
    </div>
  );
}
