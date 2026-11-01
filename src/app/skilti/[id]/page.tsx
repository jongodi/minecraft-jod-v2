import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readAllProfiles } from '@/lib/crew';
import { SITE_NAME } from '@/components/badlands/data';
import SignRedirect from './SignRedirect';

/* A sign's own link: /skilti/<id> is the wall scrolled to that sign, and its
   preview in a chat is the sign itself (opengraph-image.tsx beside this).
   The page carries the card's words for the scraper and sends a browser on
   to the wall; nothing is drawn here. */

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
  if (!sign) return { title: 'Skilti' };
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
  return (
    <main className="b" style={{ padding: '2rem' }}>
      <SignRedirect href={href} />
      <p><a href={href} className="b-link">Skiltið á vegg {sign.profile.username}</a></p>
    </main>
  );
}
