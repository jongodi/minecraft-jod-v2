import Link from 'next/link';
import { Wordmark } from '@/components/brand/Wordmark';

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col px-gutter pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <Link href="/" className="text-text" aria-label="JOÐcraft, forsíða">
        <Wordmark lamp="off" height={26} title="JOÐcraft" />
      </Link>
      <div className="mt-auto">
        <p className="font-label text-label uppercase text-muted">Þessi slóð er ekki til</p>
        <p className="mt-[0.2em] font-display text-state uppercase">Ekkert hér</p>
        <Link href="/" className="mt-8 inline-block py-2 font-label text-label uppercase">
          Á forsíðuna
        </Link>
      </div>
    </main>
  );
}
