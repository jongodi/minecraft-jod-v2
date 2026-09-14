import Link from 'next/link';
import { SERVER_IP } from './data';

export default function Footer() {
  return (
    <footer className="f-foot">
      <div className="f-wrap f-foot__inner">
        <span className="f-nav__mark">JO<span className="eth">Ð</span></span>
        <nav className="f-foot__nav f-label" aria-label="Footer">
          <Link href="/#camp">Camp</Link>
          <Link href="/#territory">Territory</Link>
          <Link href="/#postcards">Postcards</Link>
          <Link href="/#showdown">Showdown</Link>
          <Link href="/#tallies">Tallies</Link>
          <Link href="/crew">Crew</Link>
          <Link href="/rp-editor">Pack editor</Link>
          <Link href="/admin">Admin</Link>
        </nav>
        <p className="f-foot__small">
          {SERVER_IP} · since 2024<br />
          Not affiliated with Mojang or Microsoft.
        </p>
      </div>
    </footer>
  );
}
