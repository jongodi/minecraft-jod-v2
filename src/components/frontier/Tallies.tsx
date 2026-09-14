'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PlayerHead from './PlayerHead';
import SectionHead from './SectionHead';
import { STAT_TABS, type StatKey } from './data';
import type { StatsState } from './hooks';

export default function Tallies({ stats }: { stats: StatsState }) {
  const [tab, setTab] = useState<StatKey>('playTimeHours');
  const [shown, setShown] = useState(false);
  const board = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = board.current;
    if (!el || !('IntersectionObserver' in window)) { setShown(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); obs.disconnect(); } }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const meta = STAT_TABS.find(t => t.id === tab)!;
  const rows = [...stats.players]
    .map(p => ({ name: p.username, val: p[tab] ?? 0 }))
    .sort((a, b) => b.val - a.val);
  const top = rows[0]?.val || 1;

  const when = stats.cachedAt
    ? new Date(stats.cachedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <section id="tallies" className="f-section">
      <div className="f-wrap f-cols">
        <SectionHead
          kicker="Tallies"
          title="The leaderboard"
          lede="Read from the world's own stats files: hours played, mobs killed, deaths, items crafted and distance on foot."
        >
          {stats.source && (
            <p className="f-note">
              {stats.source === 'live' ? `Live from the server${when ? `, read ${when}` : ''}.` :
               stats.source === 'cached' ? `The server is down; these are from ${when ?? 'the last read'}.` :
               'Stats are not available right now.'}
            </p>
          )}
        </SectionHead>

        <div>
          <div className="f-tabs" role="tablist" aria-label="Statistic">
            {STAT_TABS.map(t => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={`f-tab${tab === t.id ? ' is-active' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          <div ref={board}>
            {rows.length === 0 ? (
              <p className="f-empty">{stats.source === null ? 'Fetching the tallies…' : 'No tallies yet. They come in once the server has been up.'}</p>
            ) : rows.map((r, i) => (
              <Link key={r.name} href={`/crew/${r.name}`} className={`f-row${i === 0 ? ' is-1' : ''}`}>
                <span className="f-row__rank">{i + 1}</span>
                <span className="f-row__head"><PlayerHead name={r.name} size={64} /></span>
                <span className="f-row__name">{r.name}</span>
                <span className="f-row__bar">
                  <span className="f-row__fill" style={{ transform: `scaleX(${shown ? r.val / top : 0})`, transitionDelay: `${i * 50}ms` }} />
                </span>
                <span className="f-row__val">{meta.unit(r.val)}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
