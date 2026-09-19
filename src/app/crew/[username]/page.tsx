import '@/app/badlands.css';
import '@/app/board.css';
import '@/app/wall.css';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readProfile, isCrewUsername, canonicalUsername, allPhotos } from '@/lib/crew';
import { readMap } from '@/lib/map';
import Wall, { type WallPlace } from '@/components/wall/Wall';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ username: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/* The wall is rendered on the server with what hangs on it, so a shared
   link shows the poster at once and carries the member's own card. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  if (!isCrewUsername(username)) return { title: 'Fannst ekki · JOÐ' };
  const profile = await readProfile(username);
  const prints = allPhotos(profile).length;
  const description = profile.bio || `Veggur ${profile.username} á JOÐ: ${profile.entries.length} færslur og ${prints} myndir úr leiknum.`;
  return {
    title: `${profile.username} · JOÐ`,
    description,
    openGraph: { title: `${profile.username}, eftirlýst`, description, type: 'profile', locale: 'is_IS' },
  };
}

export default async function CrewWallPage({ params, searchParams }: Props) {
  const { username } = await params;
  if (!isCrewUsername(username)) notFound();
  const [profile, map, query] = await Promise.all([readProfile(canonicalUsername(username)), readMap().catch(() => null), searchParams]);
  const places: WallPlace[] = (map?.locations ?? []).map(l => ({ id: l.id, label: l.label, sublabel: l.sublabel, builders: l.builders ?? [] }));
  return <Wall initial={profile} places={places} justSignedIn={query.innskrad === '1'} />;
}
