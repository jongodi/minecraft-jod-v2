'use client';

import '@/app/badlands.css';
/* board.css (the posters, the counter) comes with the rooms that hang them: Crew.tsx, Shelf.tsx */
import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { BaseLink } from '@/lib/base-links';
import type { HomeData } from '@/lib/home-data';
import Sky from './Sky';
import AddressBar from './AddressBar';
import Hero from './Hero';
import World from './World';
import Footer from './Footer';
import { SECTIONS, isRoom, type DoorId, type RoomId } from './data';
import { seedStatus, useEffectsAllowed, useReducedMotionPref, useScrollSpy, useServerStatus } from './hooks';
import { seedNights } from './night';
import { seasonClass, useSeason } from './Season';

/* Effects load after the page is interactive; none of them is needed for the first paint. */
const Particles   = dynamic(() => import('@/effects/Particles'),   { ssr: false });
const CursorLight = dynamic(() => import('@/effects/CursorLight'), { ssr: false });

/* How long a pressed door stays lit on its own if the page never reaches the
   frame (the visitor scrolled back up before the smooth scroll arrived). */
const PRESSED_HOLD_MS = 1500;

/** The evening: the sunset, the world, and the campfire. The crew and the
    shelf are rooms that open over the world; the hash says which is open, so
    /#hopur and /#hillan work from anywhere and the back button closes a room.
    `initial` is everything the page was drawn with on the server
    (src/lib/home-data.ts): the status and the nights seed the browser's
    stores, which keep polling from there; the gallery, the map and the
    crew's prints are the page's for as long as it is open. */
export default function BadlandsHome({ syncedOn, bases, initial }: { syncedOn: string | null; bases: BaseLink[]; initial: HomeData }) {
  seedStatus(initial.status);
  seedNights(initial.nights);
  const server = useServerStatus(initial.status);
  const season = useSeason(initial.season);
  const effects = useEffectsAllowed();
  const reduce = useReducedMotionPref();
  const reached = useScrollSpy(['heimur']) === 'heimur';
  const [room, setRoom] = useState<RoomId | null>(null);
  const [pressed, setPressed] = useState<DoorId | null>(null);
  const { plates, map, pinned, nights } = initial;

  const showWorld = useCallback(() => {
    document.getElementById('heimur')?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  }, [reduce]);

  /* The hash is the source of truth: read it on arrival, on the back button,
     and on any plain anchor to #hopur or #hillan (the status lantern, the crew
     pages). No element carries those ids, so the browser has nothing to jump
     to and the frame is brought into view here instead. */
  useEffect(() => {
    const read = () => {
      /* the doors' ids are plain letters, so the hash is read as it is: decoding
         a pasted #%E0 threw and took the whole page down with it */
      const h = window.location.hash.slice(1);
      const door = isRoom(h) || h === 'heimur' ? h : null;
      setRoom(isRoom(h) ? h : null);
      setPressed(door);
      if (door) showWorld();
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, [showWorld]);

  /* A door in the bar: the world itself, or a room over it. Opening a room
     makes one history entry, marked as the doors' own; going from that room
     to the other, or out to the world, reuses it, so Back always leaves the
     rooms instead of walking back through them. */
  const openDoor = useCallback((id: string) => {
    const next = isRoom(id) ? id : null;
    const hash = next ? `#${next}` : '#heimur';
    if (window.location.hash !== hash) {
      const state = { jodRoom: !!next };
      if (isRoom(window.location.hash.slice(1)) && history.state?.jodRoom) history.replaceState(state, '', hash);
      else history.pushState(state, '', hash);
    }
    setRoom(next);
    setPressed(next ?? 'heimur');
    showWorld();
  }, [showWorld]);
  /* ✕, Escape or a tap on the dark world. The entry a door made is taken
     back, so Back afterwards does not open the room again; a room arrived at
     by a link (/#hopur, /kvold/<id>#hopur) just loses its hash. */
  const closeRoom = useCallback(() => {
    if (isRoom(window.location.hash.slice(1))) {
      if (history.state?.jodRoom) history.back();
      else history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    setRoom(null);
  }, []);

  /* Any link on the page to a door (the status lantern, the night's line)
     goes through the door itself. A plain #hopur did nothing when the hash
     already said #hopur: no hashchange, and no element by that id. */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const id = (e.target as Element | null)?.closest?.('a[href^="#"]')?.getAttribute('href')?.slice(1);
      if (!id || !(isRoom(id) || id === 'heimur')) return;
      e.preventDefault();
      openDoor(id);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [openDoor]);

  useEffect(() => {
    if (!room) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRoom(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [room, closeRoom]);

  /* One lantern is lit at a time, the door the visitor is behind: an open
     room's, otherwise the world's. Up at the sunset none is, even with a room
     left open below. A pressed door lights at once and holds while the page
     is still on its way down to the frame. */
  useEffect(() => {
    if (!pressed) return;
    if (reached) { setPressed(null); return; }
    const t = setTimeout(() => setPressed(null), PRESSED_HOLD_MS);
    return () => clearTimeout(t);
  }, [pressed, reached]);
  const active: DoorId | null = pressed ?? (reached ? room ?? 'heimur' : null);

  return (
    <div className={`b${seasonClass(season)}`}>
      <Sky />
      {/* the effects start once the browser is idle, and not at all on a device without room for them */}
      {effects && <Particles heroId="top" fireId="campfire" snow={season.snow} fireworks={season.fireworks} />}
      {effects && <CursorLight />}
      <AddressBar links={SECTIONS} activeId={active} onDoor={openDoor} />
      <main id="efni">
        <Hero server={server} season={season} nights={nights} />
        <World plates={plates} config={map} pinned={pinned} server={server} syncedOn={syncedOn} bases={bases} room={room} onCloseRoom={closeRoom} />
      </main>
      <Footer season={season} />
    </div>
  );
}
