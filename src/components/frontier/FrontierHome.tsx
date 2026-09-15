'use client';

import '@/app/frontier.css';
import { useEffect, useState } from 'react';
import type { GalleryPhoto } from '@/lib/gallery';
import TrailNav from './TrailNav';
import Hero from './Hero';
import Camp from './Camp';
import TerritoryMap from './TerritoryMap';
import Postcards from './Postcards';
import QuickDraw from './QuickDraw';
import Tallies from './Tallies';
import Provisions from './Provisions';
import Footer from './Footer';
import { HOME_LINKS, PLATES, sentenceCase, titleCase, type Plate } from './data';
import { useScrollSpy, useServerStatus, useStats } from './hooks';

const SECTION_IDS = HOME_LINKS.map(l => l.id).filter((id): id is string => !!id);

export default function FrontierHome() {
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
    <div className="j-desk">
      <div className="j">
        <div className="j-grain" aria-hidden="true" />
        <TrailNav links={HOME_LINKS} activeId={active} />
        <main>
          <Hero server={server} activeId={active} />
          <Camp server={server} />
          <TerritoryMap plates={plates} />
          <Postcards plates={plates} />
          <QuickDraw />
          <Tallies stats={stats} />
          <Provisions />
        </main>
        <Footer />
      </div>
    </div>
  );
}
