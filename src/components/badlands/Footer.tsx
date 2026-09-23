'use client';

import { memo, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Campfire, Chevron } from './Bits';
import { Ridge } from './Mesa';
import { SERVER_IP } from './data';
import AmbienceToggle from '@/effects/AmbienceToggle';
import { useBackdropClose, useScrollLock } from './hooks';

/* The duel lives behind the fire; nobody pays for it until they tap. */
const QuickDraw = dynamic(() => import('./QuickDraw'), { ssr: false });

/* The evening's own sections are in the bar (and the bar at the foot of a
   phone), so the footer does not post them a second time. What is left is
   what is off the page: the crew's rooms and the admin panel. */
const LINKS = [
  { href: '/crew',  label: 'Hópurinn',   prefetch: true },
  /* not prefetched: every visitor who scrolled to the fire used to download
     the admin panel's code and stylesheet, which then sat unused */
  { href: '/admin', label: 'Stjórnborð', prefetch: false },
];

/** The campfire: the last light. One band of ground at the foot of the page,
    the fire burning in front of the same mesas the evening opened over. Tap the
    fire and the duel comes out. Climbing back to the sunset rewinds the sky on
    the way up, because the sky is scroll. */
function Footer() {
  const [duel, setDuel] = useState(false);
  const path = usePathname();
  useScrollLock(duel);
  const backdrop = useBackdropClose(() => setDuel(false));

  useEffect(() => {
    if (!duel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDuel(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duel]);

  return (
    <footer id="campfire" className="b-foot">
      <Ridge />
      <div className="b-wrap b-foot__inner">
        <div className="b-foot__camp">
          <button type="button" className="b-foot__fire" onClick={() => setDuel(true)} aria-haspopup="dialog" aria-label="Einvígi: prófaðu viðbragðstímann" title="Einvígi">
            <Campfire />
          </button>
        </div>

        <nav className="b-foot__nav" aria-label="Fleiri síður">
          {LINKS.map(l => <Link key={l.href} href={l.href} prefetch={l.prefetch ? undefined : false} className="b-foot__link" aria-current={path === l.href ? 'page' : undefined}>{l.label}</Link>)}
          <AmbienceToggle className="b-foot__sound" />
        </nav>

        <Link href="/#top" className="b-btn b-btn--small b-foot__up">
          <Chevron className="b-foot__upchev" />
          Aftur í sólsetrið
        </Link>

        <div className="b-foot__credit">
          <p>JOÐ, frá 2024 · {SERVER_IP}</p>
          <p className="b-foot__small">Engin tengsl við Mojang eða Microsoft.</p>
        </div>
      </div>
      <div className="b-ground" aria-hidden="true" />

      {duel && (
        <div className="b-duelbox" role="dialog" aria-modal="true" aria-label="Einvígi" {...backdrop}>
          <div className="b-duelbox__in">
            <QuickDraw onClose={() => setDuel(false)} />
          </div>
        </div>
      )}
    </footer>
  );
}

export default memo(Footer);
