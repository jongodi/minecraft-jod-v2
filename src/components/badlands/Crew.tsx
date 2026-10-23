'use client';

import '@/app/board.css';
import '@/app/wall.css';
import { memo, useEffect, useState } from 'react';
import Link from 'next/link';
import PlayerHead from './PlayerHead';
import Wanted from './Wanted';
import { NightBoard } from './PlayNight';
import Annall from './Annall';
import { CREW } from './data';
import { useStats, type ServerState } from './hooks';
import { sinceAt } from './night';
import { plural } from '@/lib/format';
import type { CrewSummary } from '@/app/api/crew/route';

/** The crew's room, opened over the world. Portraits of the eight with a
    lantern behind the ones who are in, the next play night's fire, then the
    wanted board the room is named for, on one rail. At the foot, the annals:
    the nights that have been (Annall.tsx). What the crew pinned on their
    walls hangs on the board, a door of its own (#taflan); the strip of it
    this room used to keep is a way there now. Everything here is fetched
    when the room is first opened, not with the page. */
function Crew({ server }: { server: ServerState }) {
  const stats = useStats();
  const [summary, setSummary] = useState<Record<string, CrewSummary>>({});
  const { online, life, players, list, lastOnline } = server;
  const lower = list.map(n => n.toLowerCase());
  const inside = CREW.filter(n => lower.includes(n.toLowerCase())).length;
  const guests = Math.max(0, players - inside);

  useEffect(() => {
    fetch('/api/crew', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((rows: CrewSummary[] | null) => { if (rows) setSummary(Object.fromEntries(rows.map(r => [r.username.toLowerCase(), r]))); })
      .catch(() => {});
  }, []);

  return (
    <div className="b-wrap b-crew">
      <div className="b-crew__row">
        <ul className="b-folk" aria-label="Hópurinn">
          {CREW.map(name => {
            const on = !!online && lower.includes(name.toLowerCase());
            const row = summary[name.toLowerCase()];
            return (
              <li key={name}>
                <Link href={`/crew/${name}`} className={`b-folk__item${on ? ' is-in' : ''}`}>
                  <span className="b-folk__frame">
                    <PlayerHead name={name} size={96} alt="" />
                    {on && <span className="b-folk__in">inni</span>}
                  </span>
                  <span className="b-folk__name">{name}</span>
                  {row && row.photoCount > 0 && <span className="b-folk__count">{row.photoCount} {plural(row.photoCount, 'mynd', 'myndir')}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
        {/* One line for the whole room's state: who is in, and if the board is
            bare, why. Three notes in three places (beside the heads, under
            the night, on the board) read as three things broken. */}
        <p className="b-note b-crew__who" aria-live="polite">
          {online === null ? 'athuga hver er inni' :
           online ? (inside === 0 ? 'þjónninn er opinn en enginn kominn inn enn' : `${inside} úr hópnum inni núna${guests ? `, gestir: ${guests}` : ''}`) :
           life === 'starting' || life === 'restarting' ? 'þjónninn er að vakna, komdu inn eftir augnablik' :
           life === 'stopping' ? 'þjónninn er að slokkna' :
           life === 'unknown' ? 'næ ekki sambandi við þjóninn í augnablikinu' :
           life === 'off' && lastOnline ? `slökkt á þjóninum, síðast kveikt ${sinceAt(lastOnline.at)}` :
           'slökkt á þjóninum, allir í pásu'}
          {stats.failed ? '. Náði ekki í tölurnar úr leiknum núna.' :
           stats.source !== null && stats.players.length === 0 ? '. Tölurnar birtast á spjöldunum þegar þjónninn hefur verið í gangi.' : ''}
        </p>
      </div>

      {/* the next play night: the most pressing thing in the room */}
      <NightBoard server={server} />

      <Wanted stats={stats} />

      {/* the nights that have been, last: the room's history, under what is happening now */}
      <Annall />

      <div className="b-crew__foot">
        {/* the board is the room next door: the doors' own link swaps one room for the other */}
        <a href="#taflan" className="b-btn b-btn--small">Taflan: það nýjasta frá hópnum</a>
        <Link href="/crew" className="b-btn b-btn--small">Veggir hópsins og öll tölfræðin</Link>
      </div>
    </div>
  );
}

export default memo(Crew);
