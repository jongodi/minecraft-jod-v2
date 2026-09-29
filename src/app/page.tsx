import BadlandsHome from '@/components/badlands/BadlandsHome';
import { syncedOn } from '@/lib/bluemap-snapshot';

/* When the copy of the map kept on the site was taken: the world is drawn from
   that copy, and only the players on it come live from the server. */
export default function Home() {
  return <BadlandsHome syncedOn={syncedOn} />;
}
