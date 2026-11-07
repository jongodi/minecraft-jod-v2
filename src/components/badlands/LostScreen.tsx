'use client';

import '@/app/badlands.css';
import { lazy, Suspense, type ReactNode } from 'react';

export interface StrayProps {
  title: string;
  /** what happened, as the game words a death: "Þú féllst út úr heiminum." */
  cause?: string;
  /** the score line under it; the 404 shows the game's own nothing */
  score?: number;
  children: ReactNode;
  actions: ReactNode;
}

/** The words of the death screen and the ways back, in the middle of it:
    the title in the slab, what happened, the score, the paragraph, the
    buttons. OffTrail sets them in the night with the bar and the fire. */
export function Stray({ title, cause, score, children, actions }: StrayProps) {
  return (
    <main id="efni" className="b-wrap b-page b-stray">
      <h1 className="b-stray__title">{title}</h1>
      {cause && <p className="b-stray__cause">{cause}</p>}
      {score !== undefined && <p className="b-stray__score">Stig: <b>{score}</b></p>}
      <p className="b-stray__text">{children}</p>
      <div className="b-stray__actions">{actions}</div>
    </main>
  );
}

/* The words under the veil and nothing else: what stands while the rest of
   the screen is on its way, and for good if it cannot be fetched (a page
   left open over a deploy asks for a file the site no longer has). */
function Bare(props: StrayProps) {
  return (
    <div className="b b-died">
      <div className="b-died__veil" aria-hidden="true" />
      <Stray {...props} />
    </div>
  );
}

/* The 404 and the error screen are boundaries of the root layout, so every
   page carries them in its first load, whether or not they are ever shown.
   OffTrail brings the bar, the night sky and the footer with it, and every
   page paid for them twice before its first frame. Only this small piece
   comes with the page now. The stylesheet stays here, so a screen drawn on
   the server is styled from its first paint; the rest is fetched the first
   time one of the two is drawn. On the server it is there at once, and the
   page arrives whole. React.lazy, not next/dynamic: the latter's loader
   was one of the modules every page carried twice. */
const OffTrail = lazy(() => import('./OffTrail').catch(() => ({ default: Bare })));

export default function LostScreen(props: StrayProps) {
  return (
    <Suspense fallback={<Bare {...props} />}>
      <OffTrail {...props} />
    </Suspense>
  );
}
