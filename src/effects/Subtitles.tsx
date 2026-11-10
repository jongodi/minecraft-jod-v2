'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LINE_MS, SOUND_LINE, hear, nextGone, onSound, still, type HeardLine } from './subtitles';

/** The game's subtitle box, at the foot of the screen on the right: what the
    site is sounding, while the wind and the fire are on (subtitles.ts).
    Nothing is drawn until a sound is heard. The box goes into the browser's
    top layer as the toast does (Toast.tsx), so a duel's hit is written over
    the duel and the server's chime over the map's whole screen. Not read
    out: whoever hears a screen reader hears the sound. */
export default function Subtitles() {
  const [lines, setLines] = useState<HeardLine[]>([]);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => onSound(key => setLines(l => hear(l, key, Date.now()))), []);
  useEffect(() => {
    const wait = nextGone(lines, Date.now());
    if (wait === null) return;
    const t = setTimeout(() => setLines(l => still(l, Date.now())), wait + 20);
    return () => clearTimeout(t);
  }, [lines]);

  const up = lines.length > 0;
  useLayoutEffect(() => {
    if (!up) return;
    try { box.current?.showPopover?.(); } catch { /* no top layer here: the box stays where it is drawn */ }
  }, [up]);

  if (!up) return null;
  return (
    <div ref={box} popover="manual" className="b-subs" aria-hidden="true" style={{ ['--line-ms' as string]: `${LINE_MS}ms` }}>
      {/* keyed by when it was heard, so a line heard again starts its three seconds over */}
      {lines.map(l => <span key={`${l.key}-${l.at}`} className="b-subs__line">{SOUND_LINE[l.key]}</span>)}
    </div>
  );
}
