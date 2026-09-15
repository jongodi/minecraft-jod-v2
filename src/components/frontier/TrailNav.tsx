'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { SERVER_IP, type NavLink } from './data';
import { useCopy } from './hooks';

interface Props { links: NavLink[]; activeId?: string | null; always?: boolean }

/** The sticky bar. On the home page it stays hidden until the reader
    scrolls past the first page of the journal; elsewhere it's always up. */
export default function TrailNav({ links, activeId, always = false }: Props) {
  const [shown, setShown] = useState(always);
  const [open, setOpen]   = useState(false);
  const [copied, copy]    = useCopy(SERVER_IP);

  useEffect(() => {
    if (always) return;
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.7);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [always]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <header className={`j-bar${shown || open ? ' is-shown' : ''}`}>
        <div className="j-wrap j-bar__inner">
          <Link href="/" className="j-bar__mark" onClick={() => setOpen(false)}>JOÐ</Link>
          <nav className="j-bar__links" aria-label="Efnisyfirlit">
            {links.map(l => (
              <Link key={l.href} href={l.href} className={`j-bar__link${activeId && l.id === activeId ? ' is-active' : ''}`}>{l.label}</Link>
            ))}
          </nav>
          <div className="j-bar__right">
            <span className="j-bar__addr">{SERVER_IP}<button onClick={copy}>{copied ? 'afritað' : 'afrita'}</button></span>
            <button className={`j-burger${open ? ' is-open' : ''}`} onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="j-menu" aria-label={open ? 'Loka valmynd' : 'Opna valmynd'}>
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <div id="j-menu" className={`j-menu${open ? ' is-open' : ''}`} aria-hidden={!open}>
        {links.map((l, i) => (
          <Link key={l.href} href={l.href} className="j-menu__link" onClick={() => setOpen(false)}>
            <small>{i + 1}.</small>{l.label}
          </Link>
        ))}
        <div className="j-menu__foot">
          <button className={`j-btn${copied ? ' is-copied' : ''}`} onClick={copy}>{copied ? 'Vistfang afritað' : `Afrita ${SERVER_IP}`}</button>
          <p className="j-note j-note--faint">Java-útgáfa · aðgangur með boði</p>
        </div>
      </div>
    </>
  );
}

const TILT = [-2.5, 1.5, -1, 2.5, -2, 1];

/** The wooden signpost: one plank per section. When `fixed`, it stays hidden
    until the reader scrolls past the first page, same as the sticky bar. */
export function Signpost({ links, activeId, fixed = false }: { links: NavLink[]; activeId?: string | null; fixed?: boolean }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!fixed) return;
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.7);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [fixed]);

  return (
    <nav className={`j-sign${fixed ? ' j-sign--fixed' : ''}${fixed && shown ? ' is-shown' : ''}`} aria-label="Efnisyfirlit">
      <span className="j-sign__pole" aria-hidden="true" />
      {links.map((l, i) => (
        <Link key={l.href} href={l.href} className={`j-sign__plank${activeId && l.id === activeId ? ' is-active' : ''}`} style={{ '--r': `${TILT[i % TILT.length]}deg` } as CSSProperties}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
