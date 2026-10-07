'use client';

import '@/app/badlands.css';
import '@/app/board.css';
import type { ReactNode } from 'react';
import AddressBar from './AddressBar';
import Footer from './Footer';
import { Lantern } from './Bits';
import NightSky from './NightSky';
import { PAGE_LINKS } from './data';

/** Off the trail: a link that leads nowhere, or a page that broke on the way.
    The bar and the fire stay where they always are, so the way back is too;
    the page stands under the same night the crew's pages do, the lantern
    hanging dark in it, because nothing here burns, and the words on the
    ground under the ridge. */
export default function OffTrail({ title, children, actions }: { title: string; children: ReactNode; actions: ReactNode }) {
  return (
    <div className="b">
      <AddressBar links={PAGE_LINKS} always />
      <NightSky />
      <main id="efni" className="b-wrap b-page b-stray">
        <Lantern lit={false} className="b-stray__lantern" />
        <h1 className="b-title">{title}</h1>
        <p className="b-lede">{children}</p>
        <div className="b-stray__actions">{actions}</div>
      </main>
      <Footer />
    </div>
  );
}
