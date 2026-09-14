'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import PlayerHead from './PlayerHead';
import { Arrow, Rope, Stamp } from './Bits';
import { CREW } from './data';
import type { ServerState } from './hooks';

const TILT = [-3, 2, -1.5, 3, -2.5, 1.5, -2, 2.5];

export default function Camp({ server }: { server: ServerState }) {
  const { online, players, list } = server;
  const lower = list.map(n => n.toLowerCase());
  const riding = CREW.filter(n => lower.includes(n.toLowerCase())).length;
  const [swinging, setSwinging] = useState<string | null>(null);

  return (
    <section id="camp" className="j-sec">
      <div className="j-wrap">
        <div className="j-camp__head">
          <div className="j-camp__title">
            <p className="j-note j-note--big">Hver er inni í kvöld?</p>
            <p className="j-note">
              {online === null ? 'athuga stöðuna…' :
               online ? (riding === 0 ? 'þjónninn er opinn en enginn kominn inn enn' : `${riding} úr hópnum inni${players > riding ? `, gestir: ${players - riding}` : ''}`) :
               'slökkt á þjóninum, allir í pásu'}
            </p>
          </div>
          <p className="j-note j-note--faint">þau sem eru í lit eru inni núna <Arrow /></p>
        </div>

        <div className="j-rope">
          <Rope />
          <div className="j-rope__row">
            {CREW.map((name, i) => {
              const on = !!online && lower.includes(name.toLowerCase());
              return (
                <Link
                  key={name}
                  href={`/crew/${name}`}
                  className={`j-peg${on ? ' is-in' : ''}${swinging === name ? ' is-swing' : ''}`}
                  style={{ '--r': `${TILT[i % TILT.length]}deg` } as CSSProperties}
                  onPointerEnter={() => setSwinging(name)}
                  onAnimationEnd={() => setSwinging(s => (s === name ? null : s))}
                  title={name}
                >
                  <span className="j-peg__clip" aria-hidden="true" />
                  <span className="j-peg__frame"><PlayerHead name={name} size={128} /></span>
                  {on && <span className="j-peg__in"><Stamp small r={12}>Inni</Stamp></span>}
                  <span className="j-peg__name">{name}</span>
                  {!on && <span className="j-peg__away">í pásu</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
