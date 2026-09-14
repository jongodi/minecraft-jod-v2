'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SERVER_IP, type NavLink } from './data';
import { useCopy } from './hooks';

interface Props {
  links:     NavLink[];
  activeId?: string | null;
  /** Solid from the start (pages without a hero). */
  solid?:    boolean;
}

export default function TrailNav({ links, activeId, solid = false }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen]         = useState(false);
  const [copied, copy]          = useCopy(SERVER_IP);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const isSolid = solid || scrolled || open;

  return (
    <>
      <header className={`f-nav${isSolid ? ' is-solid' : ''}`}>
        <div className="f-wrap f-nav__inner">
          <Link href="/" className="f-nav__brand" onClick={() => setOpen(false)}>
            <span className="f-nav__mark">JO<span className="eth">Ð</span></span>
            <span className="f-nav__brandsub f-label">Survival</span>
          </Link>

          <nav className="f-nav__links f-label" aria-label="Sections">
            {links.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={`f-nav__link${activeId && l.id === activeId ? ' is-active' : ''}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="f-nav__right">
            <button className={`f-btn f-btn--small f-nav__ip${copied ? ' is-copied' : ''}`} onClick={copy}>
              {copied ? 'Copied' : SERVER_IP}
            </button>
            <button
              className={`f-nav__burger${open ? ' is-open' : ''}`}
              onClick={() => setOpen(o => !o)}
              aria-expanded={open}
              aria-controls="f-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <div id="f-menu" className={`f-menu${open ? ' is-open' : ''}`} aria-hidden={!open}>
        {links.map((l, i) => (
          <Link key={l.href} href={l.href} className="f-menu__link" onClick={() => setOpen(false)}>
            <small>{String(i + 1).padStart(2, '0')}</small>{l.label}
          </Link>
        ))}
        <div className="f-menu__foot">
          <button className={`f-btn${copied ? ' is-copied' : ''}`} onClick={copy}>
            {copied ? 'Address copied' : `Copy ${SERVER_IP}`}
          </button>
          <p className="f-note">Java Edition · whitelist only</p>
        </div>
      </div>
    </>
  );
}
