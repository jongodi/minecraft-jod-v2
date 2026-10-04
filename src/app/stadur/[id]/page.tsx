import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import BadlandsHome from '@/components/badlands/BadlandsHome';
import { syncedOn } from '@/lib/bluemap-snapshot';
import { baseLinks } from '@/lib/bluemap-bases';
import { loadHomeData } from '@/lib/home-data';
import { sharedPlace } from '@/lib/place-share';
import { SITE_NAME } from '@/components/badlands/data';

/* A place's shareable link: the home page itself, with the place's postcard
   open (World reads the id from the address), but with the place's own link
   preview, so a link pasted into a chat shows its photo and name. Drawn per
   place and again every half minute, like the home page, so a renamed place
   or a new photo shows up soon after. */

export const revalidate = 30;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shared = await sharedPlace((await params).id);
  if (!shared) return {};
  const title = shared.title;
  const url = `/stadur/${shared.place.id}`;
  return {
    title,
    description: shared.description,
    alternates: { canonical: url },
    openGraph: { title, description: shared.description, url, type: 'website', locale: 'is_IS', siteName: SITE_NAME },
    twitter: { card: 'summary_large_image', title, description: shared.description },
  };
}

export default async function Place({ params }: Props) {
  const [shared, initial] = await Promise.all([sharedPlace((await params).id), loadHomeData()]);
  if (!shared) redirect('/#heimur');
  return <BadlandsHome syncedOn={syncedOn} bases={baseLinks()} initial={initial} />;
}
