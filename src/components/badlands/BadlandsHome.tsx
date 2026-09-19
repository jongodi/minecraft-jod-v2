'use client';

import '@/app/badlands.css';
import '@/app/board.css';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { GalleryPhoto } from '@/lib/gallery';
import Sky from './Sky';
import AddressBar from './AddressBar';
import Hero from './Hero';
import World from './World';
import Crew from './Crew';
import Shelf from './Shelf';
import Footer from './Footer';
import { PLATES, SECTIONS, sentenceCase, titleCase, type Plate } from './data';
import { useScrollSpy, useServerStatus, useStats } from './hooks';

/* Effects load after the page is interactive; none of them is needed for the first paint. */
const Particles   = dynamic(() => import('@/effects/Particles'),   { ssr: false });
const CursorLight = dynamic(() => import('@/effects/CursorLight'), { ssr: false });

const SECTION_IDS = SECTIONS.map(s => s.id!);

/** The evening: sunset, the world, the crew, the shelf, the campfire. */
export default function BadlandsHome({ syncedOn }: { syncedOn: string | null }) {
  const server = useServerStatus();
  const stats  = useStats();
  const active = useScrollSpy(SECTION_IDS);
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

  return (
    <div className="b">
      <Sky />
      <Particles heroId="top" fireId="campfire" />
      <CursorLight />
      <AddressBar links={SECTIONS} activeId={active} />
      <main>
        <Hero server={server} />
        <World plates={plates} server={server} syncedOn={syncedOn} />
        <Crew server={server} stats={stats} />
        <Shelf version={server.version} />
      </main>
      <Footer />
    </div>
  );
}
