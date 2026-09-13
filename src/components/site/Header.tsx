import Link from 'next/link';
import { Wordmark } from '@/components/brand/Wordmark';
import type { Lamp } from '@/lib/status/types';

const LINKS = [
  { href: '#pakkar', label: 'Pakkar' },
  { href: '#myndir', label: 'Myndir' },
  { href: '#kortid', label: 'Kortið' },
  { href: '#tolur', label: 'Tölur' },
  { href: '#kveikur', label: 'Kveikur' },
] as const;

interface HeaderProps {
  lamp: Lamp;
}

/** Sits on top of the hero image. Not sticky: the page is short. */
export function Header({ lamp }: HeaderProps) {
  return (
    <header className="relative z-10 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-gutter pt-[max(1.25rem,env(safe-area-inset-top))]">
      <Link href="/" className="flex min-h-11 items-center text-text" aria-label="JOÐcraft, forsíða">
        <Wordmark lamp={lamp} height={26} title="JOÐcraft" />
      </Link>
      <nav aria-label="Hlutar síðunnar">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 font-label text-label uppercase">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="flex min-h-11 items-center text-text">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
