import type { Metadata } from 'next';
import Link from 'next/link';
import LostScreen from '@/components/badlands/LostScreen';

export const metadata: Metadata = { title: 'Fannst ekki' };

/* Any address the site doesn't have, and a wall for a name that isn't in the
   crew: the game's death screen, as the game words a fall out of the world.
   Respawn takes the visitor into the world; the title screen is the sunset,
   which is the site's own title card. */
export default function NotFound() {
  return (
    <LostScreen
      title="Þú dóst!"
      cause="Þú féllst út úr heiminum."
      score={0}
      actions={<>
        <Link href="/#heimur" className="b-btn b-btn--solid">Lifna aftur við</Link>
        <Link href="/" className="b-btn">Titilskjár</Link>
      </>}
    >
      {/* the game's screen has no paragraph: the cause says it */}
      {null}
    </LostScreen>
  );
}
