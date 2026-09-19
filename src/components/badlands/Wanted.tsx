'use client';

import Link from 'next/link';
import PlayerHead from './PlayerHead';
import Rail from './Rail';
import { STAT_TABS } from './data';
import type { StatsState } from './hooks';

const TOP = 3;

/** The wanted board: one poster per charge, the top three on each, on one
    rail across the room. The poster names the outlaw first, the charge under
    it; the leader with head, name and value in full, second and third as two
    lines under the rule. Values are pixel type: they come straight from the
    server's stat files. */
export default function Wanted({ stats }: { stats: StatsState }) {
  const when = stats.cachedAt ? new Date(stats.cachedAt).toLocaleString('is-IS', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
  const any = stats.players.length > 0;

  const posters = STAT_TABS.map(meta => {
    const rows = stats.players
      .map(p => ({ name: p.username, val: p[meta.id] ?? 0 }))
      .filter(r => r.val > 0)
      .sort((a, b) => b.val - a.val)
      .slice(0, TOP);
    return { meta, rows };
  }).filter(p => p.rows.length > 0);   /* a charge nobody has been caught for yet stays off the board */

  return (
    <div className="b-wanted">
      <div className="b-head b-head--tight">
        <div>
          <h3 className="b-wanted__title">Eftirlýst</h3>
          <p className="b-note">Þrjú efstu í hverjum flokki, beint úr leiknum.</p>
        </div>
        {stats.source && any && (
          <p className="b-note">
            {stats.source === 'live' ? `beint frá þjóninum${when ? `, sótt ${when}` : ''}` :
             stats.source === 'cached' ? `slökkt á þjóninum, síðast sótt ${when ?? 'við síðustu uppfærslu'}` :
             'tölur eru ekki tiltækar í augnablikinu'}
          </p>
        )}
      </div>

      {!any ? (
        <p className="b-empty">{stats.source === null ? 'sæki tölurnar' : 'engar tölur enn; þær birtast þegar þjónninn hefur verið í gangi'}</p>
      ) : (
        <Rail className="b-posters" label="Eftirlýsingar" prevLabel="Fyrri spjöld" nextLabel="Næstu spjöld" count={posters.length}>
          {posters.map(({ meta, rows: [first, ...rest] }) => (
            <div key={meta.id} className="b-paper b-paper--torn b-poster" data-rail-item={meta.id}>
              <span className="b-paper__nail b-paper__nail--l" aria-hidden="true" />
              <span className="b-paper__nail b-paper__nail--r" aria-hidden="true" />
              <span className="b-poster__kicker">Eftirlýst</span>
              <span className="b-poster__stat">{meta.nick}</span>
              <span className="b-poster__charge">{meta.label}</span>
              <Link href={`/crew/${first.name}`} className="b-poster__lead">
                <span className="b-poster__img"><PlayerHead name={first.name} size={96} /></span>
                <span className="b-poster__name">{first.name}</span>
                <span className="b-poster__val">{meta.unit(first.val)}</span>
              </Link>
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
            </div>
          ))}
        </Rail>
      )}
    </div>
  );
}
