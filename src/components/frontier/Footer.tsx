import Link from 'next/link';
import { SERVER_IP } from './data';

export default function Footer() {
  return (
    <footer className="j-foot">
      <div className="j-wrap j-foot__inner">
        <span className="j-note">— JOÐ, since 2024. {SERVER_IP}</span>
        <nav className="j-foot__nav" aria-label="Footer">
          <Link href="/#camp">Camp</Link>
          <Link href="/#territory">Territory</Link>
          <Link href="/#postcards">Postcards</Link>
          <Link href="/#showdown">Showdown</Link>
          <Link href="/#tallies">Tallies</Link>
          <Link href="/crew">Crew</Link>
          <Link href="/rp-editor">Pack editor</Link>
          <Link href="/admin">Admin</Link>
        </nav>
        <p className="j-foot__small">Not affiliated with Mojang or Microsoft.</p>
      </div>
    </footer>
  );
}
