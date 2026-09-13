'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { Shot } from '@/data/gallery';
import { Lightbox } from './Lightbox';

interface GalleryProps {
  shots: readonly Shot[];
}

/** Static class names so Tailwind can see them; `span` comes from the data. */
const SPAN: Record<Shot['span'], string> = {
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
  6: 'lg:col-span-6',
  7: 'lg:col-span-7',
  8: 'lg:col-span-8',
  12: 'lg:col-span-12',
};

const SIZES: Record<Shot['span'], string> = {
  4: '(min-width: 1024px) 33vw, 100vw',
  5: '(min-width: 1024px) 42vw, 100vw',
  6: '(min-width: 1024px) 50vw, 100vw',
  7: '(min-width: 1024px) 58vw, 100vw',
  8: '(min-width: 1024px) 67vw, 100vw',
  12: '100vw',
};

/**
 * Client component: it owns which picture is open. The grid itself is plain
 * markup; the pictures bleed to the viewport edge on every width. On desktop
 * a short tile stretches to its row so a narrow picture becomes a tall crop.
 */
export function Gallery({ shots }: GalleryProps) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <ul className="grid gap-2 lg:grid-cols-12">
        {shots.map((shot, i) => (
          <li key={shot.src} className={`flex ${SPAN[shot.span]}`}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="flex w-full flex-col text-left"
            >
              <Image
                src={shot.src}
                alt={shot.alt}
                width={shot.width}
                height={shot.height}
                sizes={SIZES[shot.span]}
                loading="lazy"
                className="aspect-[16/9] w-full object-cover lg:aspect-auto lg:min-h-0 lg:flex-1"
              />
              <span className="flex items-baseline justify-between gap-4 px-gutter py-3 lg:px-3">
                <span className="font-display text-name uppercase">{shot.title}</span>
                <span className="text-right text-meta text-muted">{shot.place}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open !== null && (
        <Lightbox shots={shots} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
