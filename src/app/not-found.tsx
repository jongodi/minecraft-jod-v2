import type { Metadata } from 'next';
import Link from 'next/link';
import OffTrail from '@/components/badlands/OffTrail';

export const metadata: Metadata = { title: 'Fannst ekki' };

/* Any address the site doesn't have, and a wall for a name that isn't in the crew. */
export default function NotFound() {
  return (
    <OffTrail
      title="Slóðin endar hér"
      actions={<>
        <Link href="/#heimur" className="b-btn b-btn--solid">Út í heiminn</Link>
        <Link href="/crew" className="b-btn">Eftirlýst</Link>
      </>}
    >
      Hér er ekkert nema sandur og terrakotta. Síðan sem þú leitar að er ekki til, eða hún hefur verið flutt.
    </OffTrail>
  );
}
