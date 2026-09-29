import type { Metadata } from 'next';
import BadlandsHome from '@/components/badlands/BadlandsHome';
import { syncedOn } from '@/lib/bluemap-snapshot';
import { sharedNight } from '@/lib/night-share';

/* The play night's shareable link: the home page itself (shared as
   /kvold#hopur, so the crew's room opens on the fire), with the night's own
   link preview. Kept a minute, so an answer shows up soon after. */

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const night = await sharedNight();
  const title = `${night.title} · JOÐ`;
  const description = [night.note && `„${night.note}“`, ...night.lines].filter(Boolean).join(' · ');
  return {
    title,
    description,
    alternates: { canonical: '/kvold' },
    openGraph: { title, description, url: '/kvold', type: 'website', locale: 'is_IS', siteName: 'JOÐ' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function Kvold() {
  return <BadlandsHome syncedOn={syncedOn} />;
}
