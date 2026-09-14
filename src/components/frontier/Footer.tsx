import Link from 'next/link';
import { SERVER_IP } from './data';

export default function Footer() {
  return (
    <footer className="j-foot">
      <div className="j-wrap j-foot__inner">
        <span className="j-note">JOÐ, frá 2024. {SERVER_IP}</span>
        <nav className="j-foot__nav" aria-label="Neðri valmynd">
          <Link href="/#camp">Búðirnar</Link>
          <Link href="/#territory">Landakort</Link>
          <Link href="/#postcards">Myndaalbúm</Link>
          <Link href="/#showdown">Einvígi</Link>
          <Link href="/#tallies">Tölfræði</Link>
          <Link href="/crew">Hópurinn</Link>
          <Link href="/rp-editor">Pakkaritill</Link>
          <Link href="/admin">Stjórnborð</Link>
        </nav>
        <p className="j-foot__small">Engin tengsl við Mojang eða Microsoft.</p>
      </div>
    </footer>
  );
}
