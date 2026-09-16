'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Lightbox from './Lightbox';
import { Strata } from './Bits';
import type { Plate } from './data';

const COLS = 4;

/* Some frames span two columns. How many is decided by the count, so the
   last row of the wall is always full; they are spread evenly, first one first. */
function wideIndices(n: number): Set<number> {
  const k = (COLS - (n % COLS)) % COLS;
  return new Set(Array.from({ length: k }, (_, i) => Math.floor((i * n) / k)));
}

/** Twilight: the pictures hang in item frames on a plank wall. A frame
    lights when pointed at; the nail and the tag are part of the frame. */
export default function Postcards({ plates }: { plates: Plate[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [origin, setOrigin] = useState<DOMRect | null>(null);
  const prev  = useCallback(() => setOpen(i => (i === null ? null : (i - 1 + plates.length) % plates.length)), [plates.length]);
  const next  = useCallback(() => setOpen(i => (i === null ? null : (i + 1) % plates.length)), [plates.length]);
  const close = useCallback(() => setOpen(null), []);
  const wide  = wideIndices(plates.length);

  return (
    <section id="postcards" className="b-sec b-sec--wall" aria-labelledby="postcards-title">
      <Strata flip />
      <div className="b-wrap">
        <div className="b-head">
          <div>
            <h2 id="postcards-title" className="b-title">Myndaalbúm</h2>
            <p className="b-lede">{plates.length} myndir úr heiminum okkar, í þeirri röð sem byggingarnar risu.</p>
          </div>
          <p className="b-note">smelltu á ramma til að stækka</p>
        </div>

        <div className="b-wall">
          {plates.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={`b-frame${wide.has(i) ? ' b-frame--wide' : ''}`}
              onClick={e => { setOrigin(e.currentTarget.getBoundingClientRect()); setOpen(i); }}
              aria-label={`Opna mynd: ${p.title}`}
            >
              <span className="b-frame__nail" aria-hidden="true" />
              <span className="b-frame__wood">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt={p.title} loading="lazy" decoding="async" width={wide.has(i) ? 640 : 480} height={480} />
              </span>
              <span className="b-frame__tag">
                <span className="b-frame__no">{String(i + 1).padStart(2, '0')}</span>
                <span className="b-frame__cap"><b>{p.title}</b>{p.sub && <>, {p.sub}</>}</span>
              </span>
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
