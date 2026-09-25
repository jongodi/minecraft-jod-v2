'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lantern, Mark, Strata } from './Bits';
import PlayerHead from './PlayerHead';
import { SERVER_IP, type NavLink } from './data';
import { useCopy, useCrewSession } from './hooks';

export interface Door extends NavLink { id: string }

interface Props {
  links: Door[];
  /** the door the visitor is behind right now: the only one whose lantern is lit */
  activeId?: string | null;
  /** on the home page: open a door in place instead of following the hash */
  onDoor?: (id: string) => void;
  /** solid from the start, and no bar at the foot: the other pages */
  always?: boolean;
}

const SOLID_AFTER = 40; // px of scroll before the bar takes a surface

/** The bar: the mark, the three doors as lanterns, and the address with its
    copy action. On the home page it lies over the sunset and takes a surface
    once the page has scrolled; elsewhere it is solid from the start. On phones
    the doors move to a bar at the bottom, in reach of a thumb. A door's
    lantern is lit while the visitor is behind it, and only ever one is. */
export default function AddressBar({ links, activeId, onDoor, always = false }: Props) {
  const [solid, setSolid] = useState(always);
  const [copied, copy]    = useCopy(SERVER_IP);
  const { me } = useCrewSession();

  useEffect(() => {
    if (always) return;
    let raf = 0;
    const measure = () => { raf = 0; setSolid(window.scrollY > SOLID_AFTER); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [always]);

  const door = (l: Door, cls: string) => {
    const here = l.id === activeId;
    const className = `${cls}${here ? ' is-here' : ''}`;
    const inner = <><Lantern lit={here} />{l.label}</>;
    if (onDoor) {
      return (
        <a key={l.id} href={l.href} className={className} aria-current={here ? 'location' : undefined}
           onClick={e => { e.preventDefault(); onDoor(l.id); }}>
          {inner}
        </a>
      );
    }
    return <Link key={l.id} href={l.href} className={className}>{inner}</Link>;
  };

  return (
    <>
      <header className={`b-bar${solid ? ' is-solid' : ''}`}>
        <div className="b-wrap b-bar__inner">
          <Link href="/" className="b-bar__mark" aria-label="JOÐ, forsíða"><Mark /><span>JOÐ</span></Link>
          <nav className="b-doors" aria-label="Efnisyfirlit">
            {links.map(l => door(l, 'b-door'))}
          </nav>
          <div className="b-bar__end">
            {/* a signed-in member's own head, lit: one tap to their wall from any page */}
            {me && (
              <Link href={`/crew/${me}`} className="b-bar__me" aria-label={`Veggurinn þinn, ${me}`} title="Veggurinn þinn">
                <PlayerHead name={me} size={24} />
              </Link>
            )}
            <button type="button" className="b-bar__addr" onClick={copy} aria-label={`Afrita vistfang þjónsins, ${SERVER_IP}`}>
              <span>{SERVER_IP}</span>
              <b aria-live="polite">{copied ? 'afritað' : 'afrita'}</b>
            </button>
          </div>
        </div>
        {/* the ground under the plank: the same slice of strata that divides the hours */}
        <Strata className="b-bar__strata" />
      </header>

      {!always && (
        <nav className="b-doorbar" aria-label="Efnisyfirlit">
          {links.map(l => door(l, 'b-doorbar__item'))}
        </nav>
      )}
    </>
  );
}
