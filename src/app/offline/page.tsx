import type { Metadata } from 'next';
import Link from 'next/link';
import OffTrail from '@/components/badlands/OffTrail';

export const metadata: Metadata = { title: 'Tengingin rofnaði' };
export const dynamic = 'force-static';

/* The game's lost-connection screen, in the site's clothes: what a phone or
   a computer sees when it opens the site with no network (public/sw.js keeps
   this page, with its stylesheets and faces). The one button asks again, as
   the game's does. OffTrail comes in whole here, not through LostScreen: the
   screen is drawn from the worker's copy with no network, and has to stand
   in its first answer. */
export default function OfflinePage() {
  return (
    <OffTrail
      title="Tengingin rofnaði"
      cause="Sambandið við JOÐ slitnaði."
      actions={<Link href="/" className="b-btn b-btn--solid">Aftur í heiminn</Link>}
    >
      Tækið nær ekki á netið núna. Reyndu aftur þegar sambandið er komið.
    </OffTrail>
  );
}
