'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CopyIcon, Lantern, Mark, Strata } from './Bits';
import PlayerHead from './PlayerHead';
import ToastHost from './Toast';
import { SERVER_IP, type NavLink } from './data';
import { useCopy, useCrewSession } from './hooks';

export interface Door extends NavLink { id: string }

interface Props {
  links: Door[];
  /** the door the visitor is behind right now: the only one whose lantern is lit */
  activeId?: string | null;
  /** on the home page: open a door in place instead of following the hash */
  onDoor?: (id: string) => void;
  /** solid from the start: the other pages, which have no sunset to lie over */
  always?: boolean;
}

const SOLID_AFTER = 40; // px of scroll before the bar takes a surface

/** The bar: the mark, the three doors as lanterns and the address with its
    copy action. The server's state is the hero's to say, never the bar's. On the home page it lies over the sunset
    and takes a surface once the page has scrolled; elsewhere it is solid from
    the start. On phones the doors move to a hotbar at the foot of the screen,
    in reach of a thumb; on the home page the address is then the hero's own
    button, and on every other page it stays on the plank. A door's lantern is
    lit while the visitor is behind it, and only ever one is. */
export default function AddressBar({ links, activeId, onDoor, always = false }: Props) {
  const [solid, setSolid] = useState(always);
  const [, copy]          = useCopy(SERVER_IP);
  const { me } = useCrewSession();
  const path = usePathname();

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
    /* the page itself, or the place on it the visitor is in (a room, a wall in the crew's) */
    const current = !here ? undefined : l.href === path ? 'page' : 'location';
    const inner = <><Lantern lit={here} /><span className={`${cls}__label`}>{l.label}</span></>;
    if (onDoor) {
      return (
        <a key={l.id} href={l.href} className={className} aria-current={current}
           onClick={e => { e.preventDefault(); onDoor(l.id); }}>
          {inner}
        </a>
      );
    }
    return <Link key={l.id} href={l.href} className={className} aria-current={current}>{inner}</Link>;
  };

  return (
    <>
      <header className={`b-bar${onDoor ? ' b-bar--home' : ''}${solid ? ' is-solid' : ''}`}>
        <div className="b-wrap b-bar__inner">
          <Link href="/" className="b-bar__mark" aria-label="JOÐ, forsíða"><Mark /><span>JOÐ</span></Link>
          <nav className="b-doors" aria-label="Efnisyfirlit">
            {links.map(l => door(l, 'b-door'))}
          </nav>
          <div className="b-bar__end">
            {/* a signed-in member's own head, lit: one tap to their wall from any page */}
            {me && (
              <Link href={`/crew/${me}`} className="b-bar__me" aria-label={`Veggurinn þinn, ${me}`}>
                <PlayerHead name={me} size={24} />
              </Link>
            )}
            {/* named by what it shows: the address and the verb, with the verb's object spelled out for a screen reader; the toast says it was done.
                The button is a full tap tall; the paper tag drawn on it is the plank's own height, and a notched tag would clip a taller hit area. */}
            <button type="button" className="b-bar__addr" onClick={copy}>
              <span className="b-bar__tag">
                <CopyIcon />
                <span className="b-visually-hidden">Afrita vistfang þjónsins: </span>
                <span className="b-bar__ip">{SERVER_IP}</span>
                <b>afrita</b>
              </span>
            </button>
          </div>
        </div>
        {/* the ground under the plank: the same slice of strata that divides the hours */}
        <Strata className="b-bar__strata" />
      </header>
      <ToastHost />

      {/* The hotbar at the foot of a phone, on every page: the three doors as
          its slots, the one the visitor is behind framed the way the game
          frames the slot in hand. */}
      <nav className="b-hotbar" aria-label="Efnisyfirlit">
        {links.map(l => door(l, 'b-slot'))}
      </nav>
    </>
  );
}
