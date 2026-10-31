import type { Metadata } from 'next';
import Link from 'next/link';
import OffTrail from '@/components/badlands/OffTrail';

export const metadata: Metadata = { title: 'Tengingin rofnaði' };
export const dynamic = 'force-static';

/* The game's lost-connection screen, in the site's clothes: what a phone
   sees when it opens the site with no network (public/sw.js keeps this page).
   The one button asks again, as the game's does. */
export default function OfflinePage() {
  return (
    <OffTrail
      title="Tengingin rofnaði"
      cause="Sambandið við JOÐ slitnaði."
      actions={<Link href="/" className="b-btn b-btn--solid">Aftur í heiminn</Link>}
    >
      Síminn nær ekki á netið núna. Reyndu aftur þegar sambandið er komið.
    </OffTrail>
  );
}
