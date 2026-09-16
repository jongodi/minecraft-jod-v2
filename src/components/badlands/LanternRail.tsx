'use client';

import Link from 'next/link';
import { Lantern } from './Bits';
import { SECTIONS } from './data';
import AmbienceToggle from '@/effects/AmbienceToggle';

/** Desktop navigation: one lantern per section, lit once the evening has
    reached it. Lanterns are links, so amber is right. */
export default function LanternRail({ activeId }: { activeId: string | null }) {
  const reached = Math.max(0, SECTIONS.findIndex(s => s.id === activeId));
  return (
    <nav className="b-rail" aria-label="Efnisyfirlit">
      <span className="b-rail__post" aria-hidden="true" />
      {SECTIONS.map((s, i) => (
        <Link key={s.id} href={s.href} className={`b-rail__item${i === reached ? ' is-here' : ''}`} aria-current={i === reached ? 'location' : undefined}>
          <Lantern lit={i <= reached} />
          <span className="b-rail__label">{s.label}</span>
        </Link>
      ))}
      <AmbienceToggle className="b-rail__sound" />
    </nav>
  );
}
