'use client';

import { Wordmark } from '@/components/brand/Wordmark';
import { useStatus } from '@/lib/status/store';
import { lampFor, type ServerStatus } from '@/lib/status/types';

interface LiveWordmarkProps {
  initial: ServerStatus;
  height?: number;
  title?: string;
}

/** The wordmark with its lamp following the live status. */
export function LiveWordmark({ initial, height, title }: LiveWordmarkProps) {
  const status = useStatus(initial);
  return <Wordmark lamp={lampFor(status.state)} height={height} title={title} />;
}
