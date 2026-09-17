import Link from 'next/link';
import { Campfire, Chevron } from './Bits';
import { Ridge } from './Mesa';
import { SERVER_IP } from './data';

/* The evening's own sections are on the lantern rail, in the address bar and in
   the drawer on phones, so the footer does not post them a second time. What is
   left is what is not part of the evening: the three rooms off the page, and
   the way back to the hour it started at. */
const LINKS = [
  { href: '/crew',      label: 'Hópurinn' },
  { href: '/rp-editor', label: 'Pakkaritill' },
  { href: '/admin',     label: 'Stjórnborð' },
];

/** The campfire: the last light. One band of ground at the foot of the page, the
    fire burning in front of the same mesas the evening opened over. Climbing
    back to the sunset rewinds the sky on the way up, because the sky is scroll. */
export default function Footer() {
  return (
    <footer id="campfire" className="b-foot">
      <Ridge />
      <div className="b-wrap b-foot__inner">
        <div className="b-foot__camp" aria-hidden="true"><Campfire /></div>

        <nav className="b-foot__nav" aria-label="Fleiri síður">
          {LINKS.map(l => <Link key={l.href} href={l.href} className="b-foot__link">{l.label}</Link>)}
        </nav>

        <Link href="/#top" className="b-btn b-btn--small b-foot__up">
          <Chevron className="b-foot__upchev" />
          Aftur í sólsetrið
        </Link>

        <div className="b-foot__credit">
          <p>JOÐ, frá 2024 · {SERVER_IP}</p>
          <p className="b-foot__small">Engin tengsl við Mojang eða Microsoft.</p>
        </div>
      </div>
      <div className="b-ground" aria-hidden="true" />
    </footer>
  );
}
