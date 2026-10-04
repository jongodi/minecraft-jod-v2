import type { Metadata } from 'next';
import BadlandsHome from '@/components/badlands/BadlandsHome';
import { syncedOn } from '@/lib/bluemap-snapshot';
import { baseLinks } from '@/lib/bluemap-bases';
import { loadHomeData } from '@/lib/home-data';
import { nightMetadata, sharedNight } from '@/lib/night-share';

/* The next play night's shareable link: the home page itself (shared as
   /kvold#hopur, so the crew's room opens on the fire), with the night's own
   link preview. Drawn again every half minute like the home page, so an
   answer shows up soon after. Each night has a link of its own too,
   /kvold/<id> (./[id]/page.tsx). */

export const revalidate = 30;

export async function generateMetadata(): Promise<Metadata> {
  return nightMetadata(await sharedNight());
}

export default async function Kvold() {
  const initial = await loadHomeData();
  return <BadlandsHome syncedOn={syncedOn} bases={baseLinks()} initial={initial} />;
}
