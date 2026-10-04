import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import BadlandsHome from '@/components/badlands/BadlandsHome';
import { syncedOn } from '@/lib/bluemap-snapshot';
import { baseLinks } from '@/lib/bluemap-bases';
import { nightMetadata, sharedNight } from '@/lib/night-share';

/* One play night's shareable link, /kvold/<id>#hopur: the home page with the
   crew's room open on that night's fire (NightBoard reads the id from the
   address), and that night's own link preview. A night that is gone sends
   the link on to the nights there are. Kept a minute, like /kvold. */

export const revalidate = 60;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const night = await sharedNight(id);
  return night ? nightMetadata(night, id) : {};
}

export default async function Night({ params }: Props) {
  if (!(await sharedNight((await params).id))) redirect('/kvold#hopur');
  return <BadlandsHome syncedOn={syncedOn} bases={baseLinks()} />;
}
