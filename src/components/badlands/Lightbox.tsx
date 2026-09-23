'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { ArrowIcon, CloseIcon } from './Bits';
import { useDialogFocus, useScrollLock } from './hooks';
import { SPRING, SPRING_THROW, project } from './motion';
import { photoProps, PHOTO_SIZES } from './photo';

export interface LightboxPhoto { src: string; title?: string; sub?: string }

interface Props {
  photos: LightboxPhoto[]; index: number;
  onClose: () => void; onPrev: () => void; onNext: () => void;
  /** Where the photo was on the page, so it opens from there and returns there. */
  origin?: DOMRect | null;
}

/* A photograph held in the hand: it opens from the print you clicked,
   follows the finger 1:1, and a flick throws it to the next one or
   drops it back onto the page. */
export default function Lightbox({ photos, index, onClose, onPrev, onNext, origin }: Props) {
  const reduce = useReducedMotion();
  const [dir, setDir] = useState(0);
  const [closing, setClosing] = useState(false);
  const photo = photos[index];
  const closeRef = useRef<HTMLButtonElement>(null);
  /* Only a click that began on the dark closes: a throw of the photo that
     falls short and is let go over the dark is the browser's click too. */
  const beganOutside = useRef(false);
  const onDown = (e: React.PointerEvent) => { beganOutside.current = !(e.target as Element).closest('.b-lb__card, .b-lb__bar, button'); };
  const onBackdrop = (e: React.MouseEvent) => {
    if (beganOutside.current && !(e.target as Element).closest('.b-lb__card, .b-lb__bar, button')) requestClose();
    beganOutside.current = false;
  };
  useDialogFocus(closeRef);
  useScrollLock();

  /* The photo flies back to the print it came from only if that is the one
     still showing; after walking to another it simply lets go. */
  const first = useRef(index);
  const requestClose = useCallback(() => {
    if (reduce || !origin || index !== first.current) { onClose(); return; }
    setDir(0);
    setClosing(true);
  }, [reduce, origin, onClose, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     requestClose();
      if (closing) return;
      if (e.key === 'ArrowLeft')  { setDir(-1); onPrev(); }
      if (e.key === 'ArrowRight') { setDir(1);  onNext(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose, onPrev, onNext, closing]);

  if (!photo) return null;

  const from = origin && !reduce
    ? { x: origin.left + origin.width / 2 - window.innerWidth / 2, y: origin.top + origin.height / 2 - window.innerHeight / 2, scale: Math.max(0.15, origin.width / Math.min(window.innerWidth * 0.9, 1100)), opacity: 1 }
    : { opacity: 0 };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const lx = info.offset.x + project(info.velocity.x);
    const ly = info.offset.y + project(info.velocity.y);
    if (Math.abs(ly) > window.innerHeight * 0.35 && Math.abs(ly) > Math.abs(lx)) { requestClose(); return; }
    if (photos.length > 1 && Math.abs(lx) > window.innerWidth * 0.3) { setDir(lx < 0 ? 1 : -1); (lx < 0 ? onNext : onPrev)(); }
  };

  return (
    <motion.div className="b-lb" role="dialog" aria-modal="true" aria-label={photo.title ?? 'Mynd'} onPointerDown={onDown} onClick={onBackdrop}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <button ref={closeRef} type="button" className="b-arrowbtn b-lb__close" onClick={requestClose} aria-label="Loka"><CloseIcon /></button>
      <div className="b-lb__img">
        <AnimatePresence custom={dir} mode="popLayout">
          <motion.div
            key={index}
            className="b-lb__card"
            custom={dir}
            initial={reduce ? { opacity: 0 } : dir === 0 ? from : { x: dir * window.innerWidth * 0.6, rotate: dir * 6, opacity: 0 }}
            animate={closing ? from : { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : dir === 0 ? from : { x: -dir * window.innerWidth * 0.6, rotate: -dir * 6, opacity: 0 }}
            transition={reduce ? { duration: 0.2 } : dir === 0 ? SPRING : SPRING_THROW}
            onAnimationComplete={() => { if (closing) onClose(); }}
            drag={!reduce && !closing}
            dragElastic={0.9}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragTransition={{ bounceStiffness: 400, bounceDamping: 30 }}
            onDragEnd={onDragEnd}
            onClick={e => e.stopPropagation()}
          >
            {/* no width/height: the card takes the photograph's own shape */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img {...photoProps(photo.src, PHOTO_SIZES.lightbox, 82)} alt={photo.title ?? ''} draggable={false} />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="b-lb__bar" onClick={e => e.stopPropagation()}>
        <div className="b-lb__cap">{photo.title}{photo.sub && <small>{photo.sub}</small>}</div>
        {photos.length > 1 && (
          <div className="b-inline">
            <span className="b-lb__count">{index + 1} / {photos.length}</span>
            <button type="button" className="b-arrowbtn" onClick={() => { if (closing) return; setDir(-1); onPrev(); }} aria-label="Fyrri mynd"><ArrowIcon flip /></button>
            <button type="button" className="b-arrowbtn" onClick={() => { if (closing) return; setDir(1); onNext(); }} aria-label="Næsta mynd"><ArrowIcon /></button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
