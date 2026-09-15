'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import PlayerHead from './PlayerHead';
import { Arrow, Rope, Stamp } from './Bits';
import { CREW } from './data';
import type { ServerState } from './hooks';

const TILT = [-3, 2, -1.5, 3, -2.5, 1.5, -2, 2.5];

/* One portrait on a peg. Pointer speed across it kicks the rotation;
   an under-damped spring brings it back to its resting tilt. */
function Peg({ name, tilt, on }: { name: string; tilt: number; on: boolean }) {
  const reduce = useReducedMotion();
  const rot = useMotionValue(tilt);
  const spring = useSpring(rot, { stiffness: 140, damping: 9, mass: 0.9 });
  const last = useRef<{ x: number; t: number } | null>(null);

  const onMove = (e: React.PointerEvent) => {
    if (reduce) return;
    const now = performance.now();
    if (last.current) {
      const vx = (e.clientX - last.current.x) / Math.max(1, now - last.current.t); // px per ms
      rot.set(tilt + Math.max(-14, Math.min(14, vx * 40)));
    }
    last.current = { x: e.clientX, t: now };
  };
  const onLeave = () => { last.current = null; rot.set(tilt); };

  return (
    <Link href={`/crew/${name}`} className={`j-peg${on ? ' is-in' : ''}`} title={name} onPointerMove={onMove} onPointerLeave={onLeave}>
      <motion.span className="j-peg__swing" style={{ rotate: reduce ? tilt : spring }}>
        <span className="j-peg__clip" aria-hidden="true" />
        {on && <span className="j-peg__glow" aria-hidden="true" />}
        <span className="j-peg__frame"><PlayerHead name={name} size={128} /></span>
        {on && <span className="j-peg__in"><Stamp small r={12}>Inni</Stamp></span>}
        <span className="j-peg__name">{name}</span>
        {!on && <span className="j-peg__away">í pásu</span>}
      </motion.span>
    </Link>
  );
}

export default function Camp({ server }: { server: ServerState }) {
  const { online, players, list } = server;
  const lower = list.map(n => n.toLowerCase());
  const riding = CREW.filter(n => lower.includes(n.toLowerCase())).length;

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
            {CREW.map((name, i) => <Peg key={name} name={name} tilt={TILT[i % TILT.length]} on={!!online && lower.includes(name.toLowerCase())} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
