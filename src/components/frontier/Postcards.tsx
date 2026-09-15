'use client';

import { useCallback, useState } from 'react';
import type { CSSProperties } from 'react';
import { AnimatePresence } from 'framer-motion';
import Lightbox from './Lightbox';
import { Arrow, Stamp, Tape } from './Bits';
import type { Plate } from './data';

const TILT = [-2.5, 2, -1.5, 3, -3, 1.5, 2.5, -2, 1, -2.5, 2];
const COLS = 4;

/* Some prints span two columns. How many is decided by the count, so the
   last row of the album is always full; they are spread evenly, first one first. */
function wideIndices(n: number): Set<number> {
  const k = (COLS - (n % COLS)) % COLS;
  return new Set(Array.from({ length: k }, (_, i) => Math.floor((i * n) / k)));
}

export default function Postcards({ plates }: { plates: Plate[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [origin, setOrigin] = useState<DOMRect | null>(null);
  const prev  = useCallback(() => setOpen(i => (i === null ? null : (i - 1 + plates.length) % plates.length)), [plates.length]);
  const next  = useCallback(() => setOpen(i => (i === null ? null : (i + 1) % plates.length)), [plates.length]);
  const close = useCallback(() => setOpen(null), []);
  const wide  = wideIndices(plates.length);

  return (
    <section id="postcards" className="j-sec">
      <div className="j-wrap">
        <div className="j-album__head">
          <div>
            <Stamp r={-3}>Myndaalbúm</Stamp>
            <p className="j-note j-note--big" style={{ marginTop: '0.75rem' }}>{plates.length} myndir úr heiminum okkar</p>
            <p className="j-note">í þeirri röð sem byggingarnar risu</p>
          </div>
          <p className="j-note j-note--faint">myndirnar fá lit þegar þú bendir á þær; smelltu til að stækka <Arrow /></p>
        </div>

        <div className="j-album">
          {plates.map((p, i) => (
            <button
              key={p.id}
              className={`j-polaroid${wide.has(i) ? ' j-polaroid--wide' : ''}`}
              style={{ '--r': `${TILT[i % TILT.length]}deg` } as CSSProperties}
              onClick={e => { setOrigin(e.currentTarget.getBoundingClientRect()); setOpen(i); }}
              aria-label={`Opna mynd: ${p.title}`}
            >
              <Tape at="top" r={i % 2 ? 3 : -3} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.title} loading={i < 4 ? 'eager' : 'lazy'} decoding="async" />
              <span className="j-polaroid__no">{i + 1}</span>
              <span className="j-polaroid__cap"><b>{p.title}</b>{p.sub && <>, {p.sub}</>}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {open !== null && (
          <Lightbox
            key="lb"
            photos={plates.map(p => ({ src: p.src, title: p.title, sub: p.sub }))}
            index={open}
            origin={origin}
            onClose={close}
            onPrev={prev}
            onNext={next}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
