'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LayoutGroup, motion } from 'framer-motion';
import PlayerHead from './PlayerHead';
import { Strata } from './Bits';
import { STAT_TABS, type StatKey } from './data';
import type { StatsState } from './hooks';
import { SPRING } from './motion';

const PLACE = ['1. sæti', '2. sæti', '3. sæti'];

/** Night: the numbers from the game, posted on the board. Three notices for
    the top three, a ledger for the rest. Values are pixel type: they come
    straight from the server's stat files. */
export default function Tallies({ stats }: { stats: StatsState }) {
  const [tab, setTab] = useState<StatKey>('playTimeHours');
  const meta = STAT_TABS.find(t => t.id === tab)!;
  const rows = stats.players.map(p => ({ name: p.username, val: p[tab] ?? 0 })).sort((a, b) => b.val - a.val);
  const top = rows.slice(0, 3);
  const rest = rows.slice(3);
  const when = stats.cachedAt ? new Date(stats.cachedAt).toLocaleString('is-IS', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <section id="tallies" className="b-sec b-sec--dusk" aria-labelledby="tallies-title">
      <Strata />
      <div className="b-wrap">
        <div className="b-head">
          <div>
            <h2 id="tallies-title" className="b-title">Eftirlýst</h2>
            <p className="b-lede">Tölur beint úr leiknum. Þrjú efstu á spjöldunum, hin í bókinni.</p>
          </div>
        </div>

        <div className="b-tabs" role="tablist" aria-label="Tölfræðiflokkur">
          {STAT_TABS.map(t => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`b-tab${tab === t.id ? ' is-active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="b-empty">{stats.source === null ? 'sæki tölurnar' : 'engar tölur enn; þær birtast þegar þjónninn hefur verið í gangi'}</p>
        ) : (
          <LayoutGroup>
            <div className="b-posters">
              {top.map((r, i) => (
                <motion.div key={r.name} layout="position" layoutId={`rank-${r.name}`} transition={SPRING}>
                  <Link href={`/crew/${r.name}`} className="b-paper b-poster">
                    <span className="b-paper__nail" aria-hidden="true" />
                    <span className="b-paper__title">Eftirlýst</span>
                    <span className="b-poster__place">{PLACE[i]}, {meta.label}</span>
                    <span className="b-poster__img"><PlayerHead name={r.name} size={128} /></span>
                    <span className="b-poster__name">{r.name}</span>
                    <span className="b-poster__reward">Verðlaun</span>
                    <span className="b-poster__val">{meta.unit(r.val)}</span>
                  </Link>
                </motion.div>
              ))}
            </div>

            {rest.length > 0 && (
              <div className="b-paper b-ledger">
                <p className="b-ledger__title">hin í bókinni: {meta.label.toLowerCase()}</p>
                {rest.map((r, i) => (
                  <motion.div key={r.name} layout="position" layoutId={`rank-${r.name}`} transition={SPRING}>
                    <Link href={`/crew/${r.name}`} className="b-ledger__row">
                      <span className="b-ledger__rank">{i + 4}.</span>
                      <span className="b-ledger__head"><PlayerHead name={r.name} size={64} /></span>
                      <span className="b-ledger__name">{r.name}</span>
                      <span className="b-ledger__val">{meta.unit(r.val)}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </LayoutGroup>
        )}

        {stats.source && rows.length > 0 && (
          <p className="b-source">
            {stats.source === 'live' ? `beint frá þjóninum${when ? `, sótt ${when}` : ''}` :
             stats.source === 'cached' ? `slökkt á þjóninum, síðast sótt ${when ?? 'við síðustu uppfærslu'}` :
             'tölur eru ekki tiltækar í augnablikinu'}
          </p>
        )}
      </div>
    </section>
  );
}
