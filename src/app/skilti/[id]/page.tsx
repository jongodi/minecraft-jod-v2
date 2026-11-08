import '@/app/badlands.css';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readAllProfiles } from '@/lib/crew';
import { SITE_NAME } from '@/components/badlands/data';
import NightSky from '@/components/badlands/NightSky';
import SignRedirect from './SignRedirect';

/* A sign's own link: /skilti/<id> is the wall scrolled to that sign, and its
   preview in a chat is the sign itself (opengraph-image.tsx beside this).
   The page carries the card's words for the scraper and sends a browser on
   to the wall. A redirect from the server would hand the scraper the wall's
   card instead, so the hop is the browser's, and it starts as the page is
   read rather than once the site's scripts have come: over mobile data the
   effect alone left a bare page up for a second. While the wall comes, the
   page is the crew pages' night with one slip nailed up, saying where the
   sign hangs; its link is the way on for a browser without script. */

type Props = { params: Promise<{ id: string }> };

export async function findSign(id: string) {
  for (const p of await readAllProfiles()) {
    const e = p.entries.find(e => e.id === id);
    if (e) return { profile: p, entry: e };
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const sign = await findSign(id);
  /* a sign taken down draws the death screen, so its tab says what the screen does, as a missing wall's does */
  if (!sign) return { title: 'Fannst ekki' };
  const words = sign.entry.text.trim() || sign.entry.photos[0]?.caption || 'Mynd';
  return {
    title: `${words.slice(0, 70)} · ${sign.profile.username}`,
    description: `Skilti á vegg ${sign.profile.username} á ${SITE_NAME}.`,
    openGraph: { title: words.slice(0, 70), description: `${sign.profile.username} á ${SITE_NAME}` },
  };
}

export default async function SignPage({ params }: Props) {
  const { id } = await params;
  const sign = await findSign(id);
  if (!sign) notFound();
  const href = `/crew/${sign.profile.username}#${sign.entry.id}`;
  /* written into a script, so a < is escaped: nothing in the address can close the tag */
  const hop = `location.replace(${JSON.stringify(href).replace(/</g, '\\u003c')})`;
  return (
    <div className="b">
      {/* the hop, as the page is read; a script React puts on the page in the browser does not run, so the effect is for a visit from inside the site */}
      <script dangerouslySetInnerHTML={{ __html: hop }} />
      <SignRedirect href={href} />
      <NightSky />
      <main id="efni" className="b-wrap b-page">
        <p className="b-paper b-hop">
          <span className="b-paper__nail" aria-hidden="true" />
          Skiltið hangir á <a href={href} className="b-link">vegg {sign.profile.username}</a>.
        </p>
      </main>
    </div>
  );
}
