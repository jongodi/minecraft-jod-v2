'use client';

import '@/app/badlands.css';
import '@/app/board.css';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { GalleryPhoto } from '@/lib/gallery';
import Sky from './Sky';
import LanternRail from './LanternRail';
import AddressBar from './AddressBar';
import Hero from './Hero';
import Town from './Town';
import TerritoryMap from './TerritoryMap';
import Postcards from './Postcards';
import QuickDraw from './QuickDraw';
import Tallies from './Tallies';
import Provisions from './Provisions';
import RideIn from './RideIn';
import Footer from './Footer';
import { HOME_LINKS, PLATES, SECTIONS, sentenceCase, titleCase, type Plate } from './data';
import { useScrollSpy, useServerStatus, useStats } from './hooks';

/* Effects load after the page is interactive; none of them is needed for the first paint. */
const Particles   = dynamic(() => import('@/effects/Particles'),   { ssr: false });
const CursorLight = dynamic(() => import('@/effects/CursorLight'), { ssr: false });

const SECTION_IDS = SECTIONS.map(s => s.id!);

export default function BadlandsHome() {
  const server = useServerStatus();
  const stats  = useStats();
  const active = useScrollSpy(SECTION_IDS);
  const [plates, setPlates] = useState<Plate[]>(PLATES);

  /* The admin panel manages the gallery; fall back to the bundled list. */
  useEffect(() => {
    fetch('/api/gallery')
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
      <LanternRail activeId={active} />
      <AddressBar links={HOME_LINKS} activeId={active} />
      <main>
        <Hero server={server} />
        <Town server={server} />
        <TerritoryMap plates={plates} />
        <Postcards plates={plates} />
        <QuickDraw />
        <Tallies stats={stats} />
        <Provisions />
        <RideIn />
      </main>
      <Footer />
    </div>
  );
}
