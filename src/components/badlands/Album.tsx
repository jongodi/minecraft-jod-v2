'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Lightbox from './Lightbox';
import { useReducedMotionPref } from './hooks';
import type { Plate } from './data';
import { photoProps, PHOTO_SIZES } from './photo';

const BLOCK = 5;
/* Every fifth picture is hung double size, but only while a whole block of five
   follows it, so the last row never ends on a hole. Source order is the admin's. */
const isHero = (i: number, n: number) => i % BLOCK === 0 && i + BLOCK <= n;

/** The whole wall of pictures, opened over the world from "Myndir". Item frames
    on planks, in the order set in the admin panel; a frame opens the lightbox. */
export default function Album({ plates, onClose }: { plates: Plate[]; onClose: () => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const [origin, setOrigin] = useState<DOMRect | null>(null);
  const reduce = useReducedMotionPref();

  const prev  = useCallback(() => setOpen(i => (i === null ? null : (i - 1 + plates.length) % plates.length)), [plates.length]);
  const next  = useCallback(() => setOpen(i => (i === null ? null : (i + 1) % plates.length)), [plates.length]);
  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && open === null) onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose, open]);

  return (
    <motion.div className="b-album" role="dialog" aria-modal="true" aria-label="Myndir úr heiminum"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : 0.2 }}>
      <div className="b-wrap b-album__inner">
        <div className="b-head">
          <div>
            <h2 className="b-title">Myndir úr heiminum</h2>
            <p className="b-note">{plates.length} myndir, í þeirri röð sem byggingarnar risu. Smelltu á ramma til að stækka.</p>
          </div>
          <button type="button" className="b-btn b-btn--small" onClick={onClose}>Loka</button>
        </div>
        <div className="b-wall">
          {plates.map((p, i) => {
            const hero = isHero(i, plates.length);
            return (
              <button
                key={p.id}
                type="button"
                className={`b-frame-pic${hero ? ' b-frame-pic--hero' : ''}`}
                onClick={e => { setOrigin(e.currentTarget.getBoundingClientRect()); setOpen(i); }}
                aria-label={`Opna mynd: ${p.title}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  {...photoProps(p.src, hero ? PHOTO_SIZES.frameHero : PHOTO_SIZES.frame)}
                  alt={p.title}
                  loading={i < 4 ? 'eager' : 'lazy'}
                  decoding="async"
                  width={480}
                  height={480}
                />
                <span className="b-frame-pic__plate">
                  <span className="b-frame-pic__no">{String(i + 1).padStart(2, '0')}</span>
                  <span className="b-frame-pic__cap"><b>{p.title}</b>{p.sub && <>, {p.sub}</>}</span>
                </span>
              </button>
            );
          })}
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
    </motion.div>
  );
}
