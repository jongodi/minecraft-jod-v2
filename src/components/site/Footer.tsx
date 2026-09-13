import Link from 'next/link';
import { Wordmark } from '@/components/brand/Wordmark';
import { SERVER } from '@/data/server';
import type { Lamp } from '@/lib/status/types';

interface FooterProps {
  lamp: Lamp;
}

/** The name once more, the full width of the page, the way a poster ends. */
export function Footer({ lamp }: FooterProps) {
  return (
    <footer className="mx-auto max-w-site px-gutter pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-24">
      <div className="masthead border-t border-line pt-6 text-text">
        <Wordmark lamp={lamp} title="JOÐcraft" />
      </div>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 font-label text-label uppercase text-muted">
        <p>{SERVER.address}</p>
        <p className="flex flex-wrap gap-x-5">
          <Link href="/rp-editor" className="py-2">
            Pakkaverkfæri
          </Link>
          <span className="py-2">Ekki tengt Mojang</span>
        </p>
      </div>
    </footer>
  );
}
