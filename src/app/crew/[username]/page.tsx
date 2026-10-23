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
import { getCachedStats, withCharges } from '@/lib/stats';
import { outlaws } from '@/components/badlands/outlaws';
import { ADVANCEMENT_COUNT, readStoredAdvancements, wallAdvancements } from '@/lib/advancements';
import { sameUser } from '@/lib/crew-types';
import Wall, { type WallCorner, type WallPlace } from '@/components/wall/Wall';
import { FLIGHT, flightFrame, frameFor } from '@/lib/map-flight';
import { onMap, type MapBounds } from '@/lib/base-links';
import viewerFiles from '@/lib/bluemap-viewer.json';
import type { CrewSessionSeed } from '@/components/badlands/hooks';
import { SITE_NAME } from '@/components/badlands/data';
import { plural } from '@/lib/format';

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
  const entries = profile.entries.length;
  const description = profile.bio || `Veggur ${profile.username} á JOÐ: ${entries} ${plural(entries, 'færsla', 'færslur')} og ${prints} ${plural(prints, 'mynd', 'myndir')} úr leiknum.`;
  return {
    title: profile.username,
    description,
    openGraph: { title: `${profile.username}, eftirlýst`, description, type: 'profile', locale: 'is_IS', siteName: SITE_NAME },
  };
}

export default async function CrewWallPage({ params, searchParams }: Props) {
  const { username } = await params;
  if (!isCrewUsername(username)) notFound();
  const [profile, map, query, snapshot, session, crewAdvancements] = await Promise.all([
    wallOf(username), readMap().catch(() => null), searchParams, getCachedStats().catch(() => null), viewer(),
    /* the game's advancements, from the daily copy (src/lib/advancements.ts); null before the first */
    readStoredAdvancements(),
  ]);
  /* The poster is drawn with the last snapshot's numbers, which is one quick
     read, so it stands at its full height at once; the wall then asks for the
     live ones. Drawn without them, it grew by its whole table of charges a
     second in and pushed every sign under it off a phone's screen. The
     snapshot carries the charges kept beside it (the draws, the calls brought
     home, the no-shows, the firsts), read once for the poster and for which
     charges they are the outlaw of, so an alias on their poster is one the
     board gives them. */
  const charged = snapshot ? await withCharges(snapshot.players).catch(() => snapshot.players) : null;
  const mine = charged?.find(p => sameUser(p.username, profile.username));
  /* their best draw is on the wall just read, which is newer than any copy */
  const stats = mine ? { ...mine, drawMs: profile.bestDrawMs ?? 0 } : null;
  const led = charged ? outlaws(charged).byName.get(profile.username.toLowerCase())?.led ?? [] : [];
  /* only this member's, with their names: the list of every advancement stays on the server */
  const advancements = crewAdvancements ? { list: wallAdvancements(profile.username, crewAdvancements), of: ADVANCEMENT_COUNT } : null;
  const places: WallPlace[] = (map?.locations ?? []).map(l => ({ id: l.id, label: l.label, sublabel: l.sublabel, builders: l.builders ?? [], wood: woodOf(l) }));
  return <Wall initial={profile} places={places} initialStats={stats} initialLed={led} advancements={advancements} justSignedIn={query.innskrad === '1'} corner={cornerOf(map?.locations ?? [], profile.username)} session={session} />;
}

/* The main map's rendered edges, as map:brand wrote them */
const BOUNDS = (viewerFiles as { bounds?: MapBounds | null }).bounds ?? null;

/** What a member built that stands on the main map's ground, on the still of
    the flight that shows it best, and where each place stands in it. */
function cornerOf(locations: { id: number; label: string; builders?: string[]; world?: { x: number; y: number; z: number } | null }[], username: string): WallCorner | null {
  if (!FLIGHT) return null;
  const built = locations.flatMap(l =>
    l.world && (l.builders ?? []).some(b => sameUser(b, username)) && (!BOUNDS || onMap(BOUNDS, l.world)) ? [{ ...l, world: l.world }] : []);
  /* a place's lantern stands in the middle of its block, a block up */
  const pick = frameFor(FLIGHT.wide, built.map(l => [l.world.x + 0.5, l.world.y + 1, l.world.z + 0.5]));
  if (!pick) return null;
  const pins = built.flatMap((l, i) => { const at = pick.at[i]; return at ? [{ id: l.id, label: l.label, x: at.x, y: at.y }] : []; });
  return { src: flightFrame(FLIGHT, 'wide', pick.k), pins };
}
