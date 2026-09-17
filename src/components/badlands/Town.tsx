'use client';

import { memo } from 'react';
import Link from 'next/link';
import PlayerHead from './PlayerHead';
import { Strata } from './Bits';
import { CREW } from './data';
import type { ServerState } from './hooks';

/** Dusk: what the server is, and who is in tonight. Portraits of the eight
    sit on the town wall; a lantern burns behind the ones who are online. */
function Town({ server }: { server: ServerState }) {
  const { online, players, list } = server;
  const lower = list.map(n => n.toLowerCase());
  const inside = CREW.filter(n => lower.includes(n.toLowerCase())).length;
  const guests = Math.max(0, players - inside);

  return (
    <section id="camp" className="b-sec b-sec--dusk" aria-labelledby="camp-title">
      <Strata />
      <div className="b-wrap b-town">
        <div className="b-town__intro">
          <h2 id="camp-title" className="b-title">Búðirnar</h2>
          <p>Átta vinir, einn heimur og ekkert verið að byrja upp á nýtt. Við erum með sérsmíðaða JOÐ gagnapakka og útlitspakka, og þú þarft boð til að komast inn.</p>
          <p>Hér höldum við utan um það sem er að gerast.</p>
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
      </div>
    </section>
  );
}

/* Memoised: the home page also re-renders on stats and on the active
   section, and this section reads neither. */
export default memo(Town);
