import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Crew — JOD Minecraft',
  description:
    'Meet the 8 crew members of JOD, a private Minecraft survival server. View stats, posts, photos, and achievements.',
  openGraph: {
    title: 'The Crew — JOD Minecraft',
    description: '8 crew members. Private survival. play.jodcraft.world',
    type: 'website',
  },
};

export default function CrewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
