import BadlandsHome from '@/components/badlands/BadlandsHome';
import snapshot from '@/lib/bluemap-snapshot.json';

/* When the copy of the map kept on the site was taken: the world is drawn from
   that copy, and only the players on it come live from the server. */
const syncedAt = (snapshot as { syncedAt: string | null }).syncedAt;
const syncedOn = syncedAt
  ? new Date(syncedAt).toLocaleDateString('is-IS', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Atlantic/Reykjavik' })
  : null;

export default function Home() {
  return <BadlandsHome syncedOn={syncedOn} />;
}
