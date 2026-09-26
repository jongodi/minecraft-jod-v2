'use client';

import '@/app/badlands.css';
import '@/app/board.css';
import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { GalleryPhoto } from '@/lib/gallery';
import Sky from './Sky';
import AddressBar from './AddressBar';
import Hero from './Hero';
import World from './World';
import Footer from './Footer';
import { PLATES, SECTIONS, isRoom, sentenceCase, titleCase, type DoorId, type Plate, type RoomId } from './data';
import { useReducedMotionPref, useScrollSpy, useServerStatus } from './hooks';

/* Effects load after the page is interactive; none of them is needed for the first paint. */
const Particles   = dynamic(() => import('@/effects/Particles'),   { ssr: false });
const CursorLight = dynamic(() => import('@/effects/CursorLight'), { ssr: false });

/* How long a pressed door stays lit on its own if the page never reaches the
   frame (the visitor scrolled back up before the smooth scroll arrived). */
const PRESSED_HOLD_MS = 1500;

/** The evening: the sunset, the world, and the campfire. The crew and the
    shelf are rooms that open over the world; the hash says which is open, so
    /#hopur and /#hillan work from anywhere and the back button closes a room. */
export default function BadlandsHome({ syncedOn }: { syncedOn: string | null }) {
  const server = useServerStatus();
  const reduce = useReducedMotionPref();
  const reached = useScrollSpy(['heimur']) === 'heimur';
  const [room, setRoom] = useState<RoomId | null>(null);
  const [pressed, setPressed] = useState<DoorId | null>(null);
  const [plates, setPlates] = useState<Plate[]>(PLATES);

  /* The admin panel manages the gallery; fall back to the bundled list. */
  useEffect(() => {
    fetch('/api/gallery', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((photos: GalleryPhoto[] | null) => {
        if (!photos?.length) return;
        setPlates(photos.map(p => ({ id: p.id, src: p.filename, title: titleCase(p.title), sub: sentenceCase(p.sublabel) })));
      })
      .catch(() => {});
  }, []);

  const showWorld = useCallback(() => {
    document.getElementById('heimur')?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  }, [reduce]);

  /* The hash is the source of truth: read it on arrival, on the back button,
     and on any plain anchor to #hopur or #hillan (the status lantern, the crew
     pages). No element carries those ids, so the browser has nothing to jump
     to and the frame is brought into view here instead. */
  useEffect(() => {
    const read = () => {
      const h = decodeURIComponent(window.location.hash.slice(1));
      const door = isRoom(h) || h === 'heimur' ? h : null;
      setRoom(isRoom(h) ? h : null);
      setPressed(door);
      if (door) showWorld();
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, [showWorld]);

  /* A door in the bar: the world itself, or a room over it. */
  const openDoor = useCallback((id: string) => {
    const next = isRoom(id) ? id : null;
    const hash = next ? `#${next}` : '#heimur';
    if (window.location.hash !== hash) history.pushState(null, '', hash);
    setRoom(next);
    setPressed(next ?? 'heimur');
    showWorld();
  }, [showWorld]);
  const closeRoom = useCallback(() => {
    if (isRoom(window.location.hash.slice(1))) history.pushState(null, '', window.location.pathname + window.location.search);
    setRoom(null);
  }, []);

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
    <div className="b">
      <Sky />
      <Particles heroId="top" fireId="campfire" />
      <CursorLight />
      <AddressBar links={SECTIONS} activeId={active} onDoor={openDoor} />
      <main>
        <Hero server={server} />
        <World plates={plates} server={server} syncedOn={syncedOn} room={room} onCloseRoom={closeRoom} />
      </main>
      <Footer />
    </div>
  );
}
