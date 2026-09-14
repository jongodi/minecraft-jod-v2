'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import SectionHead from './SectionHead';
import Lightbox from './Lightbox';
import type { Plate } from './data';

export default function Postcards({ plates }: { plates: Plate[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const onScroll = () => {
      const card = el.firstElementChild as HTMLElement | null;
      if (!card) return;
      const step = card.offsetWidth + parseFloat(getComputedStyle(el).columnGap || getComputedStyle(el).gap || '16');
      setCurrent(Math.min(plates.length - 1, Math.max(0, Math.round(el.scrollLeft / step))));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [plates.length]);

  const scrollTo = (i: number) => {
    const el = rail.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft), behavior: 'smooth' });
  };

  const prev = useCallback(() => setOpen(i => (i === null ? null : (i - 1 + plates.length) % plates.length)), [plates.length]);
  const next = useCallback(() => setOpen(i => (i === null ? null : (i + 1) % plates.length)), [plates.length]);
  const close = useCallback(() => setOpen(null), []);

  return (
    <section id="postcards" className="f-section">
      <div className="f-wrap">
        <SectionHead
          no="03"
          kicker="Postcards"
          title="Sent from the territory"
          lede="Screenshots from around the world, in the order the builds went up. Swipe through, tap one to see it big."
        />
      </div>

      <div className="f-cards f-reveal">
        <div ref={rail} className="f-cards__rail">
          {plates.map((p, i) => (
            <button
              key={p.id}
              className="f-card"
              style={{ '--tilt': `${i % 2 === 0 ? -0.8 : 0.7}deg` } as React.CSSProperties}
              onClick={() => setOpen(i)}
              aria-label={`Open ${p.title}`}
            >
              <span className="f-card__img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt={p.title} loading={i < 2 ? 'eager' : 'lazy'} decoding="async" />
              </span>
              <span className="f-card__cap">
                <span>
                  <span className="f-card__title">{p.title}</span><br />
                  <span className="f-card__sub">{p.sub}</span>
                </span>
                <span className="f-card__no">No. {String(i + 1).padStart(2, '0')}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="f-wrap f-cards__ctrl">
          <span className="f-label f-cards__count">{current + 1} of {plates.length}</span>
          <div className="f-cards__arrows">
            <button className="f-cards__arrow" onClick={() => scrollTo(Math.max(0, current - 1))} aria-label="Previous postcard">←</button>
            <button className="f-cards__arrow" onClick={() => scrollTo(Math.min(plates.length - 1, current + 1))} aria-label="Next postcard">→</button>
          </div>
        </div>
      </div>

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
