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

export default function Footer() {
  return (
    <footer id="campfire" className="b-foot">
      <div className="b-wrap b-foot__inner">
        <Campfire />
        <div className="b-foot__text">
          <nav className="b-foot__nav" aria-label="Neðri valmynd">
            {LINKS.map(l => <Link key={l.href} href={l.href} className="b-link">{l.label}</Link>)}
          </nav>
          <p className="b-note">JOÐ, frá 2024. {SERVER_IP}</p>
          <p className="b-foot__small">Engin tengsl við Mojang eða Microsoft.</p>
        </div>
      </div>
    </footer>
  );
}
