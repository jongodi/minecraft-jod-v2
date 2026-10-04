import BadlandsHome from '@/components/badlands/BadlandsHome';
import { syncedOn } from '@/lib/bluemap-snapshot';
import { baseLinks } from '@/lib/bluemap-bases';
import { loadHomeData } from '@/lib/home-data';

/* The page is drawn on the server with the server's status, the play nights,
   the gallery, the map and the crew's prints (src/lib/home-data.ts), and drawn
   again every half minute, so the hero is whole at first paint and nothing
   moves when the browser's own polling takes over. The world is drawn from
   the copy of the map kept on the site, taken when `syncedOn` says; the other
   bases with a 3D map of their own (/kort/<id>) are linked under it. */
export const revalidate = 30;

export default async function Home() {
  const initial = await loadHomeData();
  return <BadlandsHome syncedOn={syncedOn} bases={baseLinks()} initial={initial} />;
}
