import { cache } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import BadlandsHome from '@/components/badlands/BadlandsHome';
import { syncedOn } from '@/lib/bluemap-snapshot';
import { baseLinks } from '@/lib/bluemap-bases';
import { loadHomeData } from '@/lib/home-data';
import { nightMetadata, sharedNight } from '@/lib/night-share';

/* One play night's shareable link, /kvold/<id>#hopur: the home page with the
   crew's room open on that night's fire (NightBoard reads the id from the
   address), and that night's own link preview. A night that is gone sends
   the link on to the nights there are. Drawn again every half minute, like /kvold. */

export const revalidate = 30;

type Props = { params: Promise<{ id: string }> };

/* The link preview and the page are drawn in one request: the night is read once for both. */
const nightOf = cache((id: string) => sharedNight(id));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const night = await nightOf(id);
  return night ? nightMetadata(night, id) : {};
}

export default async function Night({ params }: Props) {
  const [night, initial] = await Promise.all([nightOf((await params).id), loadHomeData()]);
  if (!night) redirect('/kvold#hopur');
  return <BadlandsHome syncedOn={syncedOn} bases={baseLinks()} initial={initial} />;
}
