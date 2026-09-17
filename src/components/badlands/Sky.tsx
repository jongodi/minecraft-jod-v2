'use client';

import { memo, useEffect } from 'react';
import { Stars, Sun } from './Bits';
import { startEveningFallback } from '@/effects/evening';

/** The sky behind everything. Its colours, the sun and the stars read
    `--evening`, which CSS drives from scroll where scroll-driven animations
    exist and a small script drives elsewhere. */
function Sky() {
  useEffect(() => startEveningFallback(), []);
  return (
    <div className="b-sky" aria-hidden="true">
      {/* night, fading in over the sunset; a real element so the no-scroll-timeline
          fallback can drive it the same way it drives the stars and the sun */}
      <div className="b-sky__night" />
      <Stars className="b-sky__stars" />
      <div className="b-sky__sun"><Sun /></div>
    </div>
  );
}

/* Memoised: the home page re-renders whenever the server ping, the stats or
   the active section changes, and this section depends on none of them. */
export default memo(Sky);
