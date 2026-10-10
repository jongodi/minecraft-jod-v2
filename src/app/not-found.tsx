import type { Metadata } from 'next';
import Link from 'next/link';
import OffTrail from '@/components/badlands/OffTrail';

export const metadata: Metadata = { title: 'Fannst ekki' };

/* Any address the site doesn't have, and a wall for a name that isn't in the
   crew: the game's death screen, as the game words a fall out of the world.
   Respawn takes the visitor into the world; the title screen is the sunset,
   which is the site's own title card. */
export default function NotFound() {
  return (
    <OffTrail
      title="Þú dóst!"
      cause="Þú féllst út úr heiminum."
      score={0}
      actions={<>
        <Link href="/#heimur" className="b-btn b-btn--solid">Lifna aftur við</Link>
        <Link href="/" className="b-btn">Titilskjár</Link>
      </>}
    >
      Síðan sem þú leitar að er ekki til, eða hún hefur verið flutt.
    </OffTrail>
  );
}
