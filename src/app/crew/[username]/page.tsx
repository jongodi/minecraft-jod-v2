import '@/app/badlands.css';
import '@/app/board.css';
import '@/app/wall.css';
import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readProfile, isCrewUsername, canonicalUsername, allPhotos, getCrewSession } from '@/lib/crew';
import { hasPassword } from '@/lib/crew-access';
import { readMap } from '@/lib/map';
import { woodOf } from '@/lib/map-types';
import { getCachedStats } from '@/lib/stats';
import { readNoShows } from '@/lib/play-night';
import { sameUser } from '@/lib/crew-types';
import Wall, { type WallPlace } from '@/components/wall/Wall';
import type { CrewSessionSeed } from '@/components/badlands/hooks';
import { SITE_NAME } from '@/components/badlands/data';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ username: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/* The card's words and the page are drawn in one request: the wall is read once for both. */
const wallOf = cache((username: string) => readProfile(canonicalUsername(username)));

/* Who is looking, read here so the owner's own wall is drawn with its pin
   slot and banner from the first paint. The browser asks again behind it
   (useCrewSession), which puts right a session this read could not get. */
async function viewer(): Promise<CrewSessionSeed> {
  const session = await getCrewSession();
  if (!session) return { me: null, hasPassword: false };
  return { me: session.username, hasPassword: await hasPassword(session.username).catch(() => false) };
}

/* The wall is rendered on the server with what hangs on it, so a shared
   link shows the poster at once and carries the member's own card. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  if (!isCrewUsername(username)) return { title: 'Fannst ekki' };
  const profile = await wallOf(username);
  const prints = allPhotos(profile).length;
  const description = profile.bio || `Veggur ${profile.username} á JOÐ: ${profile.entries.length} færslur og ${prints} myndir úr leiknum.`;
  return {
    title: profile.username,
    description,
    openGraph: { title: `${profile.username}, eftirlýst`, description, type: 'profile', locale: 'is_IS', siteName: SITE_NAME },
  };
}

export default async function CrewWallPage({ params, searchParams }: Props) {
  const { username } = await params;
  if (!isCrewUsername(username)) notFound();
  const [profile, map, query, snapshot, session, noShowTally] = await Promise.all([
    wallOf(username), readMap().catch(() => null), searchParams, getCachedStats().catch(() => null), viewer(),
    /* Asked beside the rest rather than after them; a wall without numbers
       simply does not use it. The tally lives in Redis, as the snapshot does,
       so without Redis there is nothing to ask. */
    process.env.REDIS_URL ? readNoShows().catch(() => null) : null,
  ]);
  /* The poster is drawn with the last snapshot's numbers, which is one quick
     read, so it stands at its full height at once; the wall then asks for the
     live ones. Drawn without them, it grew by its whole table of charges a
     second in and pushed every sign under it off a phone's screen. */
  const mine = snapshot?.players.find(p => sameUser(p.username, profile.username));
  /* their best draw is on the wall already read; only the no-show tally is one more read */
  const noShows = (noShowTally && Object.entries(noShowTally).find(([u]) => sameUser(u, profile.username))?.[1]) || 0;
  const stats = mine ? { ...mine, drawMs: profile.bestDrawMs ?? 0, noShows } : null;
  const places: WallPlace[] = (map?.locations ?? []).map(l => ({ id: l.id, label: l.label, sublabel: l.sublabel, builders: l.builders ?? [], wood: woodOf(l) }));
  return <Wall initial={profile} places={places} initialStats={stats} justSignedIn={query.innskrad === '1'} session={session} />;
}
