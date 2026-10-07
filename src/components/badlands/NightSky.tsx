'use client';

import { Moon, Stars } from './Bits';
import { Ridge } from './Mesa';
import { useMoonPhase } from './Season';

/** The evening an hour on, behind the top of the crew's own pages: the night
    sky with the same tiled stars the home page's sky comes out in, and the
    far ridge the evening opened over, dark now, along its foot. The roll call
    and the walls are the same place as the home page's room, so they hang in
    the same night rather than on a bare black page, under tonight's moon,
    risen now (src/lib/moon.ts). Nothing here moves; the moon comes out once
    the browser knows which night it is. */
export default function NightSky() {
  const moon = useMoonPhase();
  return (
    <div className="b-nightsky" aria-hidden="true">
      <Stars className="b-nightsky__stars" />
      {moon !== null && <Moon phase={moon} className="b-nightsky__moon" />}
      <Ridge />
    </div>
  );
}
