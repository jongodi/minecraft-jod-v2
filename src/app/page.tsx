import BadlandsHome from '@/components/badlands/BadlandsHome';
import { syncedOn } from '@/lib/bluemap-snapshot';
import { baseLinks } from '@/lib/bluemap-bases';

/* When the copy of the map kept on the site was taken: the world is drawn from
   that copy, and only the players on it come live from the server. The other
   bases that have a 3D map of their own (/kort/<id>) are linked under it. */
export default function Home() {
  return <BadlandsHome syncedOn={syncedOn} bases={baseLinks()} />;
}
