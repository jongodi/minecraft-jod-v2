import Link from 'next/link';
import { Campfire } from './Bits';
import { SERVER_IP } from './data';

const LINKS = [
  { href: '/#camp',      label: 'Búðirnar' },
  { href: '/#territory', label: 'Landakort' },
  { href: '/#postcards', label: 'Myndaalbúm' },
  { href: '/#showdown',  label: 'Einvígi' },
  { href: '/#tallies',   label: 'Tölfræði' },
  { href: '/crew',       label: 'Hópurinn' },
  { href: '/rp-editor',  label: 'Pakkaritill' },
  { href: '/admin',      label: 'Stjórnborð' },
];

/** The campfire: the last light. The fire sits on the ground at the foot
    of the page; the links are posted beside it on a small board. */
export default function Footer() {
  return (
    <footer id="campfire" className="b-foot">
      <div className="b-wrap b-foot__inner">
        <div className="b-foot__camp">
          <Campfire />
          <span className="b-foot__log" aria-hidden="true" />
        </div>
        <div className="b-foot__board">
          <nav className="b-foot__nav" aria-label="Neðri valmynd">
            {LINKS.map(l => <Link key={l.href} href={l.href} className="b-foot__link">{l.label}</Link>)}
          </nav>
          <p className="b-foot__credit">JOÐ, frá 2024. {SERVER_IP}</p>
          <p className="b-foot__small">Engin tengsl við Mojang eða Microsoft.</p>
        </div>
      </div>
      <div className="b-ground" aria-hidden="true" />
    </footer>
  );
}
