'use client';

import { memo } from 'react';
import Link from 'next/link';
import PlayerHead from './PlayerHead';
import { Strata } from './Bits';
import Wanted from './Wanted';
import { CREW } from './data';
import type { ServerState, StatsState } from './hooks';

/** Night: the crew, one band. Portraits of the eight with a lantern behind the
    ones who are in, then the wanted board: five posters, the top three on each. */
function Crew({ server, stats }: { server: ServerState; stats: StatsState }) {
  const { online, players, list } = server;
  const lower = list.map(n => n.toLowerCase());
  const inside = CREW.filter(n => lower.includes(n.toLowerCase())).length;
  const guests = Math.max(0, players - inside);

  return (
    <section id="hopur" className="b-sec b-sec--dusk" aria-labelledby="hopur-title">
      <Strata />
      <div className="b-wrap">
        <div className="b-head">
          <div>
            <h2 id="hopur-title" className="b-title">Hópurinn</h2>
            <p className="b-lede">Átta vinir, einn heimur og ekkert verið að byrja upp á nýtt. Lukt logar á bak við þau sem eru inni.</p>
          </div>
          <p className="b-note" aria-live="polite">
            {online === null ? 'athuga hver er inni' :
             online ? (inside === 0 ? 'þjónninn er opinn en enginn kominn inn enn' : `${inside} úr hópnum inni núna${guests ? `, gestir: ${guests}` : ''}`) :
             'slökkt á þjóninum, allir í pásu'}
          </p>
        </div>

        <ul className="b-folk" aria-label="Hópurinn">
          {CREW.map(name => {
            const on = !!online && lower.includes(name.toLowerCase());
            return (
              <li key={name}>
                <Link href={`/crew/${name}`} className={`b-folk__item${on ? ' is-in' : ''}`}>
                  <span className="b-folk__frame">
                    <PlayerHead name={name} size={128} />
                    {on && <span className="b-folk__in">inni</span>}
                  </span>
                  <span className="b-folk__name">{name}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <Wanted stats={stats} />

        <div className="b-crew__foot">
          <Link href="/crew" className="b-btn b-btn--small">Síður hópsins og öll tölfræðin</Link>
        </div>
      </div>
    </section>
  );
}

export default memo(Crew);
