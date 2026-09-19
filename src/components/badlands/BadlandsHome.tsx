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
import { PLATES, SECTIONS, isRoom, sentenceCase, titleCase, type Plate, type RoomId } from './data';
import { useReducedMotionPref, useScrollSpy, useServerStatus } from './hooks';

/* Effects load after the page is interactive; none of them is needed for the first paint. */
const Particles   = dynamic(() => import('@/effects/Particles'),   { ssr: false });
const CursorLight = dynamic(() => import('@/effects/CursorLight'), { ssr: false });

/** The evening: the sunset, the world, and the campfire. The crew and the
    shelf are rooms that open over the world; the hash says which is open, so
    /#hopur and /#hillan work from anywhere and the back button closes a room. */
export default function BadlandsHome({ syncedOn }: { syncedOn: string | null }) {
  const server = useServerStatus();
  const reduce = useReducedMotionPref();
  const reached = useScrollSpy(['heimur']) === 'heimur';
  const [room, setRoom] = useState<RoomId | null>(null);
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
      setRoom(isRoom(h) ? h : null);
      if (isRoom(h) || h === 'heimur') showWorld();
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

  /* The lantern of the world is lit once the evening has reached it; a room's
     lantern is lit while the room is open. */
  const doors = SECTIONS.map(l => ({ ...l, lit: l.id === 'heimur' ? reached || room !== null : room === l.id }));
  const active = room ?? (reached ? 'heimur' : null);

  return (
    <div className="b">
      <Sky />
      <Particles heroId="top" fireId="campfire" />
      <CursorLight />
      <AddressBar links={doors} activeId={active} onDoor={openDoor} />
      <main>
        <Hero server={server} />
        <World plates={plates} server={server} syncedOn={syncedOn} room={room} onCloseRoom={closeRoom} />
      </main>
      <Footer />
    </div>
  );
}
