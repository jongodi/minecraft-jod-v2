import Link from 'next/link';
import { SERVER } from '@/data/server';
import type { ServerStatus } from '@/lib/status/types';
import { LiveWordmark } from './LiveWordmark';

interface FooterProps {
  initial: ServerStatus;
}

/** The name once more, the full width of the page, the way a poster ends. */
export function Footer({ initial }: FooterProps) {
  return (
    <footer className="mx-auto max-w-site px-gutter pb-safe-b pt-24">
      <div className="masthead border-t border-line pt-6 text-text">
        <LiveWordmark initial={initial} title="JOÐcraft" />
      </div>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 font-label text-label uppercase text-muted">
        <p>{SERVER.address}</p>
        <span className="flex flex-wrap gap-x-5">
          <Link href="/rp-editor" className="flex min-h-11 items-center">
            Pakkaverkfæri
          </Link>
          <span className="flex min-h-11 items-center">Ekki tengt Mojang</span>
        </span>
      </div>
    </footer>
  );
}
