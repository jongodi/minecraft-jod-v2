'use client';

import { useEffect } from 'react';
import { Stars, Sun } from './Bits';
import { startEveningFallback } from '@/effects/evening';

/** The sky behind everything. Its colours, the sun and the stars read
    `--evening`, which CSS drives from scroll where scroll-driven animations
    exist and a small script drives elsewhere. */
export default function Sky() {
  useEffect(() => startEveningFallback(), []);
  return (
    <div className="b-sky" aria-hidden="true">
      <Stars className="b-sky__stars" />
      <div className="b-sky__sun"><Sun /></div>
    </div>
  );
}
