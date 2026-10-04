import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import BadlandsHome from '@/components/badlands/BadlandsHome';
import { syncedOn } from '@/lib/bluemap-snapshot';
import { baseLinks } from '@/lib/bluemap-bases';
import { sharedPlace } from '@/lib/place-share';

/* A place's shareable link: the home page itself, with the place's postcard
   open (World reads the id from the address), but with the place's own link
   preview, so a link pasted into a chat shows its photo and name. The home
   page stays prerendered; this one is drawn per place and kept five minutes,
   so a renamed place or a new photo shows up soon after. */

export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shared = await sharedPlace((await params).id);
  if (!shared) return {};
  const title = `${shared.title} · JOÐ`;
  const url = `/stadur/${shared.place.id}`;
  return {
    title,
    description: shared.description,
    alternates: { canonical: url },
    openGraph: { title, description: shared.description, url, type: 'website', locale: 'is_IS', siteName: 'JOÐ' },
    twitter: { card: 'summary_large_image', title, description: shared.description },
  };
}

export default async function Place({ params }: Props) {
  const shared = await sharedPlace((await params).id);
  if (!shared) redirect('/#heimur');
  return <BadlandsHome syncedOn={syncedOn} bases={baseLinks()} />;
}
