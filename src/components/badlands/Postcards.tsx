'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Lightbox from './Lightbox';
import { Strata } from './Bits';
import type { Plate } from './data';

const BLOCK = 5;

/* Every fifth picture is hung double size, but only while a whole block of five
   follows it, so the last row never ends on a hole. The wall is laid out in
   source order with no reflow, so it always matches the order set in the admin
   panel. */
const isHero = (i: number, n: number) => i % BLOCK === 0 && i + BLOCK <= n;

/** Twilight: the pictures hang in item frames on a plank wall, butted up
    against each other, each with its title on a plate in the bottom rail. */
export default function Postcards({ plates }: { plates: Plate[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [origin, setOrigin] = useState<DOMRect | null>(null);
  const prev  = useCallback(() => setOpen(i => (i === null ? null : (i - 1 + plates.length) % plates.length)), [plates.length]);
  const next  = useCallback(() => setOpen(i => (i === null ? null : (i + 1) % plates.length)), [plates.length]);
  const close = useCallback(() => setOpen(null), []);

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
              className={`b-frame${isHero(i, plates.length) ? ' b-frame--hero' : ''}`}
              onClick={e => { setOrigin(e.currentTarget.getBoundingClientRect()); setOpen(i); }}
              aria-label={`Opna mynd: ${p.title}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.title} loading={i < 5 ? 'eager' : 'lazy'} decoding="async" width={480} height={480} />
              <span className="b-frame__plate">
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
