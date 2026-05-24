'use client';

import { useTheme } from '@/lib/theme';
import dynamic from 'next/dynamic';

const WesternHome = dynamic(() => import('@/components/western/WesternHome'), { ssr: false });

interface Props {
  matrixContent: React.ReactNode;
}

export default function ThemedPage({ matrixContent }: Props) {
  const { theme } = useTheme();
  if (theme === 'western') return <WesternHome />;
  return <>{matrixContent}</>;
}
