import type { Metadata } from 'next';
import { CREW_USERNAMES } from '@/lib/crew-list';

interface Props {
  params: Promise<{ username: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const displayName = CREW_USERNAMES.find(
    u => u.toLowerCase() === username.toLowerCase()
  ) ?? username;

  return {
    title: `${displayName} — JOD Crew`,
    description: `View ${displayName}'s profile on JOD, a private Minecraft survival server — stats, posts, photos, and achievements.`,
    openGraph: {
      title: `${displayName} — JOD Crew`,
      description: `${displayName}'s Minecraft profile on JOD. play.jodcraft.world`,
      images: [
        {
          url: `https://mc-heads.net/head/${username}/128`,
          width: 128,
          height: 128,
          alt: `${displayName}'s Minecraft head`,
        },
      ],
      type: 'profile',
    },
  };
}

export default function CrewProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
