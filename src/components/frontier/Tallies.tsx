'use client';

import { useState } from 'react';
import Link from 'next/link';
import PlayerHead from './PlayerHead';
import SectionHead from './SectionHead';
import { TornEdge } from './Ornaments';
import { STAT_TABS, type StatKey } from './data';
import type { StatsState } from './hooks';

const PLACE = ['First', 'Second', 'Third'];

export default function Tallies({ stats }: { stats: StatsState }) {
  const [tab, setTab] = useState<StatKey>('playTimeHours');

  const meta = STAT_TABS.find(t => t.id === tab)!;
  const rows = [...stats.players]
    .map(p => ({ name: p.username, val: p[tab] ?? 0 }))
    .sort((a, b) => b.val - a.val);
  const top  = rows.slice(0, 3);
  const rest = rows.slice(3);

  const when = stats.cachedAt
    ? new Date(stats.cachedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <section id="tallies" className="f-band f-band--paper">
      <TornEdge side="top" />
      <div className="f-wrap f-band__inner">
        <SectionHead
          kicker="Chapter V · Tallies"
          title="The wanted board"
          lede="Read straight from the world's stats files. The three biggest tallies get a poster; everyone else goes in the ledger."
        />

        <div className="f-tabs" role="tablist" aria-label="Statistic">
          {STAT_TABS.map(t => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={`f-tab${tab === t.id ? ' is-active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="f-empty">{stats.source === null ? 'Fetching the tallies…' : 'No tallies yet. They come in once the server has been up.'}</p>
        ) : (
          <>
            <div className="f-wanted">
              {top.map((r, i) => (
                <Link key={r.name} href={`/crew/${r.name}`} className="f-poster-card">
                  <div className="f-poster-card__wanted">Wanted</div>
                  <div className="f-poster-card__rank">{PLACE[i]} · {meta.label}</div>
                  <div className="f-poster-card__img"><PlayerHead name={r.name} size={128} /></div>
                  <div className="f-poster-card__name">{r.name}</div>
                  <div className="f-poster-card__reward">Reward</div>
                  <div className="f-poster-card__val">{meta.unit(r.val)}</div>
                </Link>
              ))}
            </div>

            {rest.length > 0 && (
              <ol className="f-lrows" style={{ maxWidth: '46rem', marginInline: 'auto' }}>
                {rest.map((r, i) => (
                  <li key={r.name}>
                    <Link href={`/crew/${r.name}`} className="f-lrow">
                      <span className="f-lrow__rank">{i + 4}</span>
                      <span className="f-lrow__head"><PlayerHead name={r.name} size={64} /></span>
                      <span className="f-lrow__name">{r.name}</span>
                      <span className="f-lrow__val">{meta.unit(r.val)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}

        {stats.source && (
          <p className="f-note">
            {stats.source === 'live' ? `Live from the server${when ? `, read ${when}` : ''}.` :
             stats.source === 'cached' ? `The server is down; these are from ${when ?? 'the last read'}.` :
             'Stats are not available right now.'}
          </p>
        )}
      </div>
      <TornEdge side="bottom" />
    </section>
  );
}
