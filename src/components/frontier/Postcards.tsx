'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import SectionHead from './SectionHead';
import Lightbox from './Lightbox';
import { TornEdge } from './Ornaments';
import type { Plate } from './data';

export default function Postcards({ plates }: { plates: Plate[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState<number | null>(null);

  /* On phones the grid is a swipe strip; keep the counter in step. */
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const onScroll = () => {
      const card = el.firstElementChild as HTMLElement | null;
      if (!card || el.scrollWidth <= el.clientWidth) return;
      const step = card.offsetWidth + 16;
      setCurrent(Math.min(plates.length - 1, Math.max(0, Math.round(el.scrollLeft / step))));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [plates.length]);

  const scrollTo = (i: number) => {
    const el = rail.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft, behavior: 'smooth' });
  };

  const prev  = useCallback(() => setOpen(i => (i === null ? null : (i - 1 + plates.length) % plates.length)), [plates.length]);
  const next  = useCallback(() => setOpen(i => (i === null ? null : (i + 1) % plates.length)), [plates.length]);
  const close = useCallback(() => setOpen(null), []);

  return (
    <section id="postcards" className="f-band f-band--paper">
      <TornEdge side="top" />
      <div className="f-wrap f-band__inner">
        <SectionHead
          kicker="Chapter III · Postcards"
          title="Tintypes from the territory"
          lede={`${plates.length} photographs from around the world, in the order the builds went up. Hover to see one in colour, tap to see it large.`}
        />

        <div ref={rail} className="f-photos">
          {plates.map((p, i) => (
            <button key={p.id} className="f-photo" onClick={() => setOpen(i)} aria-label={`Open ${p.title}`}>
              <span className="f-photo__frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt={p.title} loading={i < 3 ? 'eager' : 'lazy'} decoding="async" />
              </span>
              <span className="f-photo__cap">
                <span className="f-photo__no">No. {String(i + 1).padStart(2, '0')}</span>
                <span><b>{p.title}</b> <i>· {p.sub}</i></span>
              </span>
            </button>
          ))}
        </div>
        <div className="f-photos__ctrl">
          <span className="f-num">{current + 1} of {plates.length}</span>
          <span className="f-photos__arrows">
            <button className="f-arrow" onClick={() => scrollTo(Math.max(0, current - 1))} aria-label="Previous">←</button>
            <button className="f-arrow" onClick={() => scrollTo(Math.min(plates.length - 1, current + 1))} aria-label="Next">→</button>
          </span>
        </div>
      </div>
      <TornEdge side="bottom" />

      {open !== null && (
        <Lightbox
          photos={plates.map(p => ({ src: p.src, title: p.title, sub: p.sub }))}
          index={open}
          onClose={close}
          onPrev={prev}
          onNext={next}
        />
      )}
    </section>
  );
}
