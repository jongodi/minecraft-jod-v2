'use client';

import { memo, useEffect } from 'react';
import { Cloud, Stars, Sun, type CLOUDS } from './Bits';
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
      {/* The game's flat clouds, far off in the band of sky between the words
          and the name: lit from below by the sunset, then dark against the
          stars. They drift a little with the evening, and the land rises
          over them as the page goes down into the valley. */}
      <div className="b-sky__clouds">
        <CloudSet tone="day" />
        <CloudSet tone="night" />
      </div>
    </div>
  );
}

/* Which cloud hangs where is the stylesheet's (badlands.css, .b-cloud--1 …). */
const SKY_CLOUDS: (keyof typeof CLOUDS)[] = ['a', 'b', 'c', 'd'];
function CloudSet({ tone }: { tone: 'day' | 'night' }) {
  return (
    <div className={`b-clouds b-clouds--${tone}`}>
      {SKY_CLOUDS.map((shape, i) => <Cloud key={shape} shape={shape} className={`b-cloud b-cloud--${i + 1}`} />)}
    </div>
  );
}

/* Memoised: the home page re-renders whenever the server ping, the stats or
   the active section changes, and this section depends on none of them. */
export default memo(Sky);
