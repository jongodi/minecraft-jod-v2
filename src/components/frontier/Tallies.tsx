'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import PlayerHead from './PlayerHead';
import { Arrow, Pin } from './Bits';
import { STAT_TABS, type StatKey } from './data';
import type { StatsState } from './hooks';
import { SPRING } from './motion';

const PLACE = ['1. sæti', '2. sæti', '3. sæti'];
const TILT  = [-2, 1.2, 2.2];
const TAGT  = [-3, 2, -1, 3, -2];

export default function Tallies({ stats }: { stats: StatsState }) {
  const [tab, setTab] = useState<StatKey>('playTimeHours');
  const meta = STAT_TABS.find(t => t.id === tab)!;
  const rows = [...stats.players].map(p => ({ name: p.username, val: p[tab] ?? 0 })).sort((a, b) => b.val - a.val);
  const top = rows.slice(0, 3);
  const rest = rows.slice(3);
  const when = stats.cachedAt ? new Date(stats.cachedAt).toLocaleString('is-IS', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <section id="tallies" className="j-sec j-board">
      <div className="j-wrap">
        <div className="j-board__head">
          <div>
            <div className="j-board__sign"><Pin style={{ left: '0.6rem' }} /><Pin style={{ right: '0.6rem' }} />Eftirlýst</div>
            <p className="j-note">tölur beint úr leiknum. Þrjú efstu á spjöldunum, hin í bókinni</p>
          </div>
          <p className="j-note">veldu flokk <Arrow /></p>
        </div>

        <div className="j-tags" role="tablist" aria-label="Tölfræðiflokkur">
          {STAT_TABS.map((t, i) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={`j-tag${tab === t.id ? ' is-active' : ''}`} style={{ '--r': `${TAGT[i]}deg` } as CSSProperties} onClick={() => setTab(t.id)}>
              <Pin />{t.label}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="j-empty">{stats.source === null ? 'sæki tölurnar…' : 'engar tölur enn; þær birtast þegar þjónninn hefur verið í gangi'}</p>
        ) : (
          <LayoutGroup>
            <div className="j-posters">
              {top.map((r, i) => (
                <motion.div key={r.name} layout layoutId={`rank-${r.name}`} transition={SPRING} className="j-poster__slot">
                  <Link href={`/crew/${r.name}`} className="j-poster" style={{ '--r': `${TILT[i]}deg` } as CSSProperties}>
                    <span className="j-nail" aria-hidden="true" />
                    <div className="j-poster__wanted">Eftirlýst</div>
                    <div className="j-poster__place">{PLACE[i]} · {meta.label}</div>
                    <div className="j-poster__img"><PlayerHead name={r.name} size={128} /></div>
                    <div className="j-poster__name">{r.name}</div>
                    <div className="j-poster__reward">Verðlaun</div>
                    <div className="j-poster__val">{meta.unit(r.val)}</div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {rest.length > 0 && (
              <div className="j-ledger">
                <p className="j-ledger__title">hin í bókinni: {meta.label.toLowerCase()}</p>
                {rest.map((r, i) => (
                  <motion.div key={r.name} layout layoutId={`rank-${r.name}`} transition={SPRING}>
                    <Link href={`/crew/${r.name}`} className="j-ledger__row">
                      <span className="j-ledger__rank">{i + 4}.</span>
                      <span className="j-ledger__head"><PlayerHead name={r.name} size={64} /></span>
                      <span className="j-ledger__name">{r.name}</span>
                      <span className="j-ledger__val">{meta.unit(r.val)}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </LayoutGroup>
        )}

        {stats.source && (
          <p className="j-foot-note" style={{ textAlign: 'center' }}>
            {stats.source === 'live' ? `beint frá þjóninum${when ? `, sótt ${when}` : ''}` :
             stats.source === 'cached' ? `slökkt á þjóninum, síðast sótt: ${when ?? 'síðasta uppfærslu'}` :
             'tölur eru ekki tiltækar í augnablikinu'}
          </p>
        )}
      </div>
    </section>
  );
}
