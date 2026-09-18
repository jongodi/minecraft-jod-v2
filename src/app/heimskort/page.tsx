import '@/app/badlands.css';
import '@/app/board.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import AddressBar from '@/components/badlands/AddressBar';
import Footer from '@/components/badlands/Footer';
import WorldMap from '@/components/badlands/WorldMap';
import { ArrowIcon } from '@/components/badlands/Bits';
import { PAGE_LINKS } from '@/components/badlands/data';
import snapshot from '@/lib/bluemap-snapshot.json';

export const metadata: Metadata = {
  title: 'Heimskortið · JOÐ',
  description: 'Heimasvæðið á JOÐ í þrívídd, teiknað beint upp úr heiminum á þjóninum.',
};

/* When the copy kept on the site was taken: that is the map visitors see
   while the server is stopped. */
const syncedAt = (snapshot as { syncedAt: string | null }).syncedAt;
const syncedOn = syncedAt
  ? new Date(syncedAt).toLocaleDateString('is-IS', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Atlantic/Reykjavik' })
  : null;

export default function HeimskortPage() {
  return (
    <div className="b-desk">
      <div className="j">
        <AddressBar links={PAGE_LINKS} always />
        <main className="b-wrap b-page">
          <Link href="/" className="b-back"><ArrowIcon flip /> aftur á forsíðu</Link>
          <div className="b-page__head">
            <div>
              <h1 className="b-title">Heimskortið</h1>
              <p className="b-lede">Heimasvæðið okkar í þrívídd, teiknað beint upp úr heiminum á þjóninum.</p>
              <p className="b-note">
                Meðan þjónninn er í gangi er kortið lifandi.
                {syncedOn && ` Annars sést það eins og það var ${syncedOn}.`}
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- BlueMap's own app, not a Next page: a full page load is what it needs */}
            <a href="/bluemap/index.html" className="b-btn b-btn--small">Opna á heilum skjá</a>
          </div>
          <WorldMap />
        </main>
        <Footer />
      </div>
    </div>
  );
}
