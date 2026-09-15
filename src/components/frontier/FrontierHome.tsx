'use client';

import '@/app/frontier.css';
import { useEffect, useState } from 'react';
import type { GalleryPhoto } from '@/lib/gallery';
import TrailNav, { Signpost } from './TrailNav';
import Hero from './Hero';
import Camp from './Camp';
import TerritoryMap from './TerritoryMap';
import Postcards from './Postcards';
import QuickDraw from './QuickDraw';
import Tallies from './Tallies';
import Provisions from './Provisions';
import RideIn from './RideIn';
import Footer from './Footer';
import { TrailLine } from './Bits';
import { HOME_LINKS, PLATES, sentenceCase, titleCase, type Plate } from './data';
import { useScrollSpy, useServerStatus, useStats } from './hooks';
import Atmosphere from './Atmosphere';

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
        <Atmosphere />
        <TrailLine />
        <span className="j-ring" style={{ top: '1.5%', left: '54%', width: '9rem', height: '9rem' }} aria-hidden="true" />
        <span className="j-ring" style={{ top: '46%', right: '-2rem', width: '8rem', height: '8rem' }} aria-hidden="true" />
        <span className="j-ring" style={{ top: '79%', left: '4%', width: '9rem', height: '9rem' }} aria-hidden="true" />
        <TrailNav links={HOME_LINKS} activeId={active} />
        <Signpost links={HOME_LINKS} activeId={active} fixed />
        <main>
          <Hero server={server} activeId={active} />
          <Camp server={server} />
          <TerritoryMap plates={plates} />
          <Postcards plates={plates} />
          <QuickDraw />
          <Tallies stats={stats} />
          <Provisions />
          <RideIn />
        </main>
        <Footer />
      </div>
    </div>
  );
}
