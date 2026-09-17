'use client';

import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence } from 'framer-motion';
import Lightbox from './Lightbox';
import { ArrowIcon, Strata } from './Bits';
import FoldPlank from './FoldPlank';
import { useKeepInView, useReducedMotionPref } from './hooks';
import type { Plate } from './data';

const BLOCK = 5;

/* Every fifth picture is hung double size, but only while a whole block of five
   follows it, so the last row never ends on a hole. The wall is laid out in
   source order with no reflow, so it always matches the order set in the admin
   panel. */
const isHero = (i: number, n: number) => i % BLOCK === 0 && i + BLOCK <= n;

/** Twilight: the pictures hang in item frames on a plank wall. Folded, the wall
    is one rail of frames you walk along by lantern light; every picture is still
    there, it just does not take the whole evening to scroll past. The plank at
    the foot hangs the rest of the wall. */
function Postcards({ plates }: { plates: Plate[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [origin, setOrigin] = useState<DOMRect | null>(null);
  const [hung, setHung] = useState(false);
  const [edges, setEdges] = useState({ start: true, end: true });
  const section = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotionPref();

  const prev  = useCallback(() => setOpen(i => (i === null ? null : (i - 1 + plates.length) % plates.length)), [plates.length]);
  const next  = useCallback(() => setOpen(i => (i === null ? null : (i + 1) % plates.length)), [plates.length]);
  const close = useCallback(() => setOpen(null), []);

  /* Which end of the rail we are at: the arrows and the dark falloff read it.
     Sampled once per frame, and only committed when it actually changed, so
     dragging the rail does not re-render every frame it moves. */
  const raf = useRef(0);
  const measure = useCallback(() => {
    raf.current = 0;
    const el = rail.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const next = { start: el.scrollLeft <= 2, end: el.scrollLeft >= max - 2 };
    setEdges(prev => (prev.start === next.start && prev.end === next.end ? prev : next));
  }, []);
  const onRailScroll = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(measure);
  }, [measure]);
  useEffect(() => {
    measure();
    window.addEventListener('resize', onRailScroll, { passive: true });
    return () => {
      window.removeEventListener('resize', onRailScroll);
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [measure, onRailScroll, plates.length, hung]);

  const nudge = (dir: 1 | -1) => {
    const el = rail.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' });
  };

  useKeepInView(hung, section);

  return (
    <section id="postcards" ref={section} className="b-sec b-sec--wall" aria-labelledby="postcards-title">
      <Strata flip />
      <div className="b-wrap">
        <div className="b-head">
          <div>
            <h2 id="postcards-title" className="b-title">Myndaalbúm</h2>
            <p className="b-lede">{plates.length} myndir úr heiminum okkar, í þeirri röð sem byggingarnar risu.</p>
          </div>
          <p className="b-note">{hung ? 'smelltu á ramma til að stækka' : 'renndu eftir veggnum, smelltu á ramma til að stækka'}</p>
        </div>

        <div className="b-wallrail">
          <div
            id="postcards-wall"
            ref={rail}
            onScroll={onRailScroll}
            className={`b-wall ${hung ? 'b-wall--hung' : 'b-wall--rail'}${edges.start ? ' at-start' : ''}${edges.end ? ' at-end' : ''}`}
          >
            {plates.map((p, i) => (
              <button
                key={p.id}
                type="button"
                style={{ '--i': i } as CSSProperties}
                className={`b-frame${isHero(i, plates.length) ? ' b-frame--hero' : ''}`}
                onClick={e => { setOrigin(e.currentTarget.getBoundingClientRect()); setOpen(i); }}
                aria-label={`Opna mynd: ${p.title}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt={p.title} loading={i < 3 ? 'eager' : 'lazy'} decoding="async" width={480} height={480} />
                <span className="b-frame__plate">
                  <span className="b-frame__no">{String(i + 1).padStart(2, '0')}</span>
                  <span className="b-frame__cap"><b>{p.title}</b>{p.sub && <>, {p.sub}</>}</span>
                </span>
              </button>
            ))}
          </div>

          {!hung && (
            <>
              <button type="button" className="b-wallrail__arrow b-wallrail__arrow--l" onClick={() => nudge(-1)} disabled={edges.start} aria-label="Fyrri myndir"><ArrowIcon flip /></button>
              <button type="button" className="b-wallrail__arrow b-wallrail__arrow--r" onClick={() => nudge(1)}  disabled={edges.end}   aria-label="Næstu myndir"><ArrowIcon /></button>
            </>
          )}
        </div>

        <FoldPlank
          open={hung}
          onToggle={() => setHung(v => !v)}
          controls="postcards-wall"
          openLabel="Hengja upp allan vegginn"
          closeLabel="Taka vegginn niður"
          count={plates.length}
        />
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

/* Memoised: the home page re-renders whenever the server ping, the stats or
   the active section changes, and this section depends on none of them. */
export default memo(Postcards);
