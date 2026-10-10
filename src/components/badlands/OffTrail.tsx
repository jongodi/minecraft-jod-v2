'use client';

import '@/app/badlands.css';
import '@/app/board.css';
import type { ReactNode } from 'react';
import AddressBar from './AddressBar';
import Footer from './Footer';
import NightSky from './NightSky';
import { PAGE_LINKS } from './data';

/** Off the trail, as the game says it: the death screen. The world stands
    still under a veil of red, the title in the slab cut from the strata like
    the name, what happened in a line under it, the score the game always
    shows (nothing, here), and the ways back stacked in the middle of the
    screen, as the game stacks Respawn over Title Screen. The night is the
    roll call's and the walls', so the world behind the veil is still the
    badlands, and the bar and the fire stay where they always are. Used by
    the 404 and by a page that broke on the way (error.tsx). */
export default function OffTrail({ title, cause, score, children, actions }: {
  title: string;
  /** what happened, as the game words a death: "Þú féllst út úr heiminum." */
  cause?: string;
  /** the score line under it; the 404 shows the game's own nothing */
  score?: number;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="b b-died">
      <AddressBar links={PAGE_LINKS} always />
      <NightSky />
      <div className="b-died__veil" aria-hidden="true" />
      <main id="efni" className="b-wrap b-page b-stray">
        <h1 className="b-stray__title">{title}</h1>
        {cause && <p className="b-stray__cause">{cause}</p>}
        {score !== undefined && <p className="b-stray__score">Stig: <b>{score}</b></p>}
        <p className="b-stray__text">{children}</p>
        <div className="b-stray__actions">{actions}</div>
      </main>
      <Footer />
    </div>
  );
}
