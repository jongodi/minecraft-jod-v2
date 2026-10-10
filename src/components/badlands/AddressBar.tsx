'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CopyIcon, Lantern, Mark, Strata } from './Bits';
import PlayerHead from './PlayerHead';
import ToastHost from './Toast';
import { SERVER_IP, plainClick, type NavLink } from './data';
import { useCopy, useCrewSession, useServerStatus, type ServerState } from './hooks';
import type { ServerLife } from '@/lib/server-state';

export interface Door extends NavLink { id: string }

interface Props {
  links: Door[];
  /** the door the visitor is behind right now: the only one whose lantern is lit */
  activeId?: string | null;
  /** on the home page: open a door in place instead of following the hash */
  onDoor?: (id: string) => void;
  /** solid from the start: the other pages, which have no sunset to lie over */
  always?: boolean;
  /** the status the page was drawn with on the server, so the bar's lantern is right at first paint */
  status?: ServerState;
}

const SOLID_AFTER = 40; // px of scroll before the bar takes a surface

/* The bar's lantern says the server's state in a word or two: the hero's
   lantern says it in full. Chat colours: green in, gold on the way, the
   lantern's own dark when out. */
const SHORT: Record<ServerLife, string> = {
  on: 'opið', off: 'slökkt', starting: 'vaknar', restarting: 'vaknar', stopping: 'slokknar', crashed: 'hrundi', unknown: '',
};
const LONG: Record<ServerLife, string> = {
  on: 'Kveikt á þjóninum', off: 'Slökkt á þjóninum', starting: 'Þjónninn er að vakna', restarting: 'Þjónninn endurræsist',
  stopping: 'Þjónninn er að slokkna', crashed: 'Þjónninn hrundi', unknown: 'Náði ekki sambandi við þjóninn',
};

/** The server's lantern, small, in the bar on every page: lit with the count
    of who is in, kindling on the way up or down, dark when out. It opens the
    crew's room, where the same people stand by name. */
function BarLantern({ server, home }: { server: ServerState; home: boolean }) {
  const { life, players } = server;
  const online = server.online === true;
  const burn = online ? 'is-on' : life === 'starting' || life === 'restarting' || life === 'stopping' ? 'is-kindling' : life ? 'is-off' : '';
  const word = !life ? '' : online && players > 0 ? `${players} inni` : SHORT[life];
  const name = !life ? 'Staða þjónsins' : `${LONG[life]}${online ? `, ${players === 0 ? 'enginn inni' : `${players} inni`}` : ''}`;
  return (
    <a href={home ? '#hopur' : '/#hopur'} className={`b-bar__status b-tip b-tip--below ${burn}`} data-tip={name}>
      <Lantern lit={online} className={burn === 'is-kindling' ? 'is-kindling' : undefined} />
      {/* the word that shows is the first of the name, so what a screen reader hears starts with what is seen */}
      <span className="b-bar__state">{word}</span>
      <span className="b-visually-hidden">{word ? ': ' : ''}{name}. Sjá hver er inni.</span>
    </a>
  );
}

/** The experience bar, as the game hangs it over the hotbar: green, in
    segments, filling as the visitor goes on. Here it fills with the page,
    the evening at the top and the campfire at the foot, so a glance says
    how far down the night is. Drawn twice, under the plank on a wide screen
    and over the hotbar on a phone; badlands.css shows the one that fits. */
function Xp() {
  return <span className="b-xp" aria-hidden="true"><span className="b-xp__fill" /></span>;
}

/** The bar: the mark, the three doors as lanterns, the server's lantern and
    the address with its copy action. On the home page it lies over the sunset
    and takes a surface once the page has scrolled; elsewhere it is solid from
    the start. On phones the doors move to a hotbar at the foot of the screen,
    in reach of a thumb; on the home page the address is then the hero's own
    button, and on every other page it stays on the plank. A door's lantern is
    lit while the visitor is behind it, and only ever one is. */
export default function AddressBar({ links, activeId, onDoor, always = false, status }: Props) {
  const [solid, setSolid] = useState(always);
  const [, copy]          = useCopy(SERVER_IP);
  const { me } = useCrewSession();
  const server = useServerStatus(status);
  const path = usePathname();
  const router = useRouter();

  /* The experience bar fills with the page in CSS (badlands.css, scroll
     timeline). A browser without scroll timelines gets the same from here:
     one transform per frame on the bar's fill, written only when it moves. */
  useEffect(() => {
    if (CSS.supports('animation-timeline: scroll()')) return;
    let raf = 0;
    let last = -1;
    const fill = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const t = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const next = Math.round(t * 1000);
      if (next === last) return;
      last = next;
      document.querySelectorAll<HTMLElement>('.b-xp__fill').forEach(el => { el.style.transform = `scaleX(${t})`; });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(fill); };
    fill();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);

  /* The game's hotbar keys: 1, 2 and 3 take the three doors, as they take
     the three first slots in the game. Not while a field is being typed in,
     nor under a dialog, and never with a modifier, which belongs to the
     browser. Inside the 3D map the keys are the viewer's own: it is a frame
     of its own, so they never reach this page. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const i = ['1', '2', '3'].indexOf(e.key);
      const l = links[i];
      if (!l) return;
      const at = e.target instanceof HTMLElement ? e.target : null;
      if (at && (at.isContentEditable || at.closest('input, textarea, select'))) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      if (onDoor) onDoor(l.id);
      else router.push(l.href);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [links, onDoor, router]);

  useEffect(() => {
    if (always) return;
    let raf = 0;
    const measure = () => { raf = 0; setSolid(window.scrollY > SOLID_AFTER); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [always]);

  const door = (l: Door, cls: string, i: number) => {
    const here = l.id === activeId;
    const className = `${cls}${here ? ' is-here' : ''}`;
    /* the page itself, or the place on it the visitor is in (a room, a wall in the crew's) */
    const current = !here ? undefined : l.href === path ? 'page' : 'location';
    const key = String(i + 1);
    /* the key's numeral, written small on the lantern's corner as the game writes a stack's count, shows while the doors have the keyboard */
    const inner = <><Lantern lit={here} />{cls === 'b-door' && <span className="b-door__key" aria-hidden="true">{key}</span>}<span className={`${cls}__label`}>{l.label}</span></>;
    if (onDoor) {
      return (
        <a key={l.id} href={l.href} className={className} aria-current={current} aria-keyshortcuts={key}
           onClick={e => { if (plainClick(e)) { e.preventDefault(); onDoor(l.id); } }}>
          {inner}
        </a>
      );
    }
    return <Link key={l.id} href={l.href} className={className} aria-current={current} aria-keyshortcuts={key}>{inner}</Link>;
  };

  return (
    <>
      <header className={`b-bar${onDoor ? ' b-bar--home' : ''}${solid ? ' is-solid' : ''}`}>
        <div className="b-wrap b-bar__inner">
          <Link href="/" className="b-bar__mark" aria-label="JOÐ, forsíða"><Mark /><span>JOÐ</span></Link>
          <nav className="b-doors" aria-label="Efnisyfirlit">
            {links.map((l, i) => door(l, 'b-door', i))}
          </nav>
          <div className="b-bar__end">
            {/* a signed-in member's own head, lit: one tap to their wall from any page */}
            {me && (
              <Link href={`/crew/${me}`} className="b-bar__me" aria-label={`Veggurinn þinn, ${me}`}>
                <PlayerHead name={me} size={24} />
              </Link>
            )}
            <BarLantern server={server} home={!!onDoor} />
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
        <Xp />
      </header>
      <ToastHost />

      {/* The hotbar at the foot of a phone, on every page: the three doors as
          its slots, the one the visitor is behind framed the way the game
          frames the slot in hand. */}
      <nav className="b-hotbar" aria-label="Efnisyfirlit">
        <Xp />
        {links.map((l, i) => door(l, 'b-slot', i))}
      </nav>
    </>
  );
}
