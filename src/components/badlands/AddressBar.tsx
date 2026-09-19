'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lantern, Mark } from './Bits';
import { SECTIONS, SERVER_IP, type NavLink } from './data';
import { useCopy } from './hooks';

interface Props { links: NavLink[]; activeId?: string | null; always?: boolean }

const SOLID_AFTER = 40; // px of scroll before the bar takes a surface

/** The bar: the mark, the three doors as lanterns, and the address with its
    copy action. On the home page it lies over the sunset and takes a surface
    once the page has scrolled; elsewhere it is solid from the start. On phones
    the doors move to a bar at the bottom, in reach of a thumb. */
export default function AddressBar({ links, activeId, always = false }: Props) {
  const [solid, setSolid] = useState(always);
  const [copied, copy]    = useCopy(SERVER_IP);

  useEffect(() => {
    if (always) return;
    let raf = 0;
    const measure = () => { raf = 0; setSolid(window.scrollY > SOLID_AFTER); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [always]);

  const reached = links.findIndex(l => l.id === activeId);

  return (
    <>
      <header className={`b-bar${solid ? ' is-solid' : ''}`}>
        <div className="b-wrap b-bar__inner">
          <Link href="/" className="b-bar__mark" aria-label="JOÐ, forsíða"><Mark /><span>JOÐ</span></Link>
          <nav className="b-doors" aria-label="Efnisyfirlit">
            {links.map((l, i) => (
              <Link key={l.href} href={l.href} className={`b-door${l.id && l.id === activeId ? ' is-here' : ''}`} aria-current={l.id && l.id === activeId ? 'location' : undefined}>
                <Lantern lit={reached >= 0 && i <= reached} />
                {l.label}
              </Link>
            ))}
          </nav>
          <button type="button" className="b-bar__addr" onClick={copy} aria-label={`Afrita vistfang þjónsins, ${SERVER_IP}`}>
            <span>{SERVER_IP}</span>
            <b aria-live="polite">{copied ? 'afritað' : 'afrita'}</b>
          </button>
        </div>
      </header>

      {!always && (
        <nav className="b-doorbar" aria-label="Efnisyfirlit">
          {SECTIONS.map((l, i) => (
            <Link key={l.href} href={l.href} className={`b-doorbar__item${l.id === activeId ? ' is-here' : ''}`} aria-current={l.id === activeId ? 'location' : undefined}>
              <Lantern lit={reached >= 0 && i <= reached} />
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
