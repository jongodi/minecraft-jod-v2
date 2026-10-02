'use client';

import { AnimatePresence } from 'framer-motion';
import Lightbox, { type LightboxPhoto } from '@/components/badlands/Lightbox';

interface Props {
  photos:  LightboxPhoto[];
  /** which print is held up, or null */
  index:   number | null;
  origin:  DOMRect | null;
  onClose: () => void;
  onPrev:  () => void;
  onNext:  () => void;
}

/** The wall's lightbox, in a chunk of its own with the motion library its
    throw needs, so a visitor who only reads the wall never downloads it.
    It stays mounted, empty, so a print can still fly back to where it came
    from when it is let go. */
export default function WallLightbox({ photos, index, origin, onClose, onPrev, onNext }: Props) {
  return (
    <AnimatePresence>
      {index !== null && photos[index] && (
        <Lightbox key="lb" photos={photos} index={index} origin={origin} onClose={onClose} onPrev={onPrev} onNext={onNext} />
      )}
    </AnimatePresence>
  );
}
