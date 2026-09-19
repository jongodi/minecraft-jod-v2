'use client';

import { memo } from 'react';
import Link from 'next/link';
import PlayerHead from './PlayerHead';
import Wanted from './Wanted';
import { CREW } from './data';
import { useStats, type ServerState } from './hooks';

/** The crew's room, opened over the world. Portraits of the eight with a
    lantern behind the ones who are in, then the wanted board on one rail.
    The stats are fetched when the room is first opened, not with the page. */
function Crew({ server }: { server: ServerState }) {
  const stats = useStats();
  const { online, players, list } = server;
  const lower = list.map(n => n.toLowerCase());
  const inside = CREW.filter(n => lower.includes(n.toLowerCase())).length;
  const guests = Math.max(0, players - inside);

  return (
    <div className="b-wrap b-crew">
      <div className="b-crew__row">
        <ul className="b-folk" aria-label="Hópurinn">
          {CREW.map(name => {
            const on = !!online && lower.includes(name.toLowerCase());
            return (
              <li key={name}>
                <Link href={`/crew/${name}`} className={`b-folk__item${on ? ' is-in' : ''}`}>
                  <span className="b-folk__frame">
                    <PlayerHead name={name} size={96} />
                    {on && <span className="b-folk__in">inni</span>}
                  </span>
                  <span className="b-folk__name">{name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="b-note b-crew__who" aria-live="polite">
          {online === null ? 'athuga hver er inni' :
           online ? (inside === 0 ? 'þjónninn er opinn en enginn kominn inn enn' : `${inside} úr hópnum inni núna${guests ? `, gestir: ${guests}` : ''}`) :
           'slökkt á þjóninum, allir í pásu'}
        </p>
      </div>

      <Wanted stats={stats} />

      <div className="b-crew__foot">
        <Link href="/crew" className="b-btn b-btn--small">Síður hópsins og öll tölfræðin</Link>
      </div>
    </div>
  );
}

export default memo(Crew);
