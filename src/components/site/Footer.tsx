import Link from 'next/link';
import { SERVER } from '@/data/server';

export function Footer() {
  return (
    <footer className="mx-auto flex max-w-site flex-wrap items-baseline justify-between gap-x-8 gap-y-2 px-gutter pb-[max(2rem,env(safe-area-inset-bottom))] pt-16 font-label text-label uppercase text-muted">
      <p>
        {SERVER.name} <span aria-hidden="true">·</span> {SERVER.address}
      </p>
      <p className="flex flex-wrap gap-x-5">
        <Link href="/rp-editor" className="py-2">
          Pakkaverkfæri
        </Link>
        <span className="py-2">Ekki tengt Mojang</span>
      </p>
    </footer>
  );
}
