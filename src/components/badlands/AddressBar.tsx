'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { Lantern, Mark } from './Bits';
import { SERVER_IP, type NavLink } from './data';
import { useCopy, useReducedMotionPref } from './hooks';
import { SPRING, project } from './motion';
import AmbienceToggle from '@/effects/AmbienceToggle';

interface Props { links: NavLink[]; activeId?: string | null; always?: boolean }

const SHOW_AFTER = 0.7; // of the viewport height

/** The slim bar with the address and the copy action. On the home page it
    stays hidden until the hero has scrolled past; elsewhere it is always up.
    On phones the menu is a drawer that follows the finger. */
export default function AddressBar({ links, activeId, always = false }: Props) {
  const [shown, setShown] = useState(always);
  const [open, setOpen]   = useState(false);
  const [copied, copy]    = useCopy(SERVER_IP);
  const reduce = useReducedMotionPref();

  useEffect(() => {
    if (always) return;
    let raf = 0;
    const measure = () => { raf = 0; setShown(window.scrollY > window.innerHeight * SHOW_AFTER); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [always]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    /* where the flick would land decides, not where the finger let go */
    const landing = info.offset.x + project(info.velocity.x);
    if (landing > window.innerWidth * 0.35) setOpen(false);
  };

  const reachedIndex = links.findIndex(l => l.id === activeId);

  return (
    <>
      <header className={`b-bar${shown || open ? ' is-shown' : ''}`}>
        <div className="b-wrap b-bar__inner">
          <Link href="/" className="b-bar__mark" onClick={() => setOpen(false)} aria-label="JOÐ, forsíða"><Mark /><span>JOÐ</span></Link>
          <nav className="b-bar__links" aria-label="Efnisyfirlit">
            {links.map(l => (
              <Link key={l.href} href={l.href} className={`b-bar__link${activeId && l.id === activeId ? ' is-active' : ''}`}>{l.label}</Link>
            ))}
          </nav>
          <button type="button" className="b-bar__addr" onClick={copy} aria-label={`Afrita vistfang þjónsins, ${SERVER_IP}`}>
            <span>{SERVER_IP}</span>
            <b aria-live="polite">{copied ? 'afritað' : 'afrita'}</b>
          </button>
          <button type="button" className={`b-burger${open ? ' is-open' : ''}`} onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="b-drawer" aria-label={open ? 'Loka valmynd' : 'Opna valmynd'}>
            <span /><span /><span />
          </button>
        </div>
        {!always && (
          <nav className="b-strip" aria-label="Hlutar síðunnar">
            {links.filter(l => l.id).map((l, i) => (
              <Link key={l.href} href={l.href} className={`b-strip__item${l.id === activeId ? ' is-here' : ''}`} aria-label={l.label} aria-current={l.id === activeId ? 'location' : undefined}>
                <Lantern lit={reachedIndex >= 0 && i <= reachedIndex} />
              </Link>
            ))}
          </nav>
        )}
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div key="scrim" className="b-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setOpen(false)} />
            <motion.nav
              key="drawer"
              id="b-drawer"
              className="b-drawer"
              aria-label="Valmynd"
              initial={reduce ? { opacity: 0 } : { x: '100%' }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: '100%' }}
              transition={reduce ? { duration: 0.2 } : SPRING}
              drag={reduce ? false : 'x'}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0.05, right: 1 }}
              onDragEnd={onDragEnd}
            >
              {links.map((l, i) => (
                <Link key={l.href} href={l.href} className={`b-drawer__link${activeId && l.id === activeId ? ' is-active' : ''}`} onClick={() => setOpen(false)}>
                  {l.id ? <Lantern lit={reachedIndex >= 0 && i <= reachedIndex} /> : <Mark className="b-drawer__markicon" />}
                  {l.label}
                </Link>
              ))}
              <div className="b-drawer__foot">
                <button type="button" className={`b-btn${copied ? ' b-btn--solid' : ''}`} onClick={copy}>{copied ? 'Vistfang afritað' : `Afrita ${SERVER_IP}`}</button>
                <div className="b-inline">
                  <AmbienceToggle />
                  <span className="b-note">vindur og eldur, slökkt nema þú kveikir</span>
                </div>
                <p className="b-note">Java-útgáfa, aðgangur með boði</p>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
