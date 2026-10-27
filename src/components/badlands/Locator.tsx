'use client';

import { memo, useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import { baseUrl, type BaseLink } from '@/lib/base-links';
import { bearing } from '@/lib/map-flight';
import { formatNumber } from '@/lib/format';
import { Lantern } from './Bits';
import PlayerHead from './PlayerHead';
import type { LivePlayer } from './livePlayers';

/** Where the camera stands and the way it faces across the ground (x, z),
    told by the flight as it comes down and by the live map as it turns. From
    where it stands, not the point it looks at: a member at that point is
    straight ahead, not under the bar's feet. */
export type CameraSink = (from: readonly [number, number], way: readonly [number, number]) => void;

/* the bar spans this far either side of straight ahead; anything farther
   round stands at its end, pointing on */
const SPAN = (70 * Math.PI) / 180;

interface Props {
  bases: BaseLink[];
  /** the crew in the overworld, where they stand (livePlayers.ts) */
  players: LivePlayer[];
  /** where the camera tells the bar it is */
  sink: MutableRefObject<CameraSink | null>;
  hidden: boolean;
}

/** The locator bar, as the game draws one over the hotbar: the other bases
    (each a lantern, as on the rail, opening its own 3D map) and the crew who
    are on (each their head), set along the bar by where they stand from the
    way the camera faces, straight ahead in the middle. What lies behind or
    far round stands at an end, pointing on. Moved by the camera, not by
    React: the marks are placed straight onto the page as it turns. */
function Locator({ bases, players, sink, hidden }: Props) {
  const bar = useRef<HTMLDivElement>(null);
  const cam = useRef<{ from: readonly [number, number]; way: readonly [number, number] } | null>(null);
  const marks = useRef<{ el: HTMLElement; at: [number, number]; name: string }[]>([]);
  /* The bar's width, measured as it changes, so each frame of the flight
     moves the marks along it with a transform: a left in per cent laid the
     bar out again on every frame the camera turned. */
  const span = useRef(0);

  const place = useCallback(() => {
    const c = cam.current;
    const el = bar.current;
    if (!c || !el) return;
    el.classList.add('is-up');
    for (const m of marks.current) {
      const { angle, blocks } = bearing(c.from, c.way, m.at);
      const off = Math.abs(angle) > SPAN;
      const u = Math.min(1, Math.max(0, 0.5 + angle / (2 * SPAN)));
      m.el.style.transform = `translateX(${(u * span.current).toFixed(1)}px)`;
      m.el.classList.toggle('is-off', off);
      m.el.classList.toggle('is-left', off && angle < 0);
      /* kubbar, as the map's own viewer counts them (is.conf); rounded to tens, so never one */
      const tip = `${m.name} · ${formatNumber(Math.round(blocks / 10) * 10)} kubbar`;
      if (m.el.dataset.tip !== tip) m.el.dataset.tip = tip;
    }
  }, []);

  useEffect(() => {
    sink.current = (from, way) => { cam.current = { from, way }; place(); };
    return () => { sink.current = null; };
  }, [sink, place]);

  /* the marks as they are in the page, placed at once; and again when the
     bar comes back from under the painted map or the viewer's menu, since
     React writing its class back took `is-up` with it, and a camera at rest
     sends nothing that would put it back */
  useEffect(() => {
    marks.current = Array.from(bar.current?.querySelectorAll<HTMLElement>('[data-x]') ?? []).map(el => ({
      el, at: [Number(el.dataset.x), Number(el.dataset.z)], name: el.dataset.name ?? '',
    }));
    span.current = bar.current?.clientWidth ?? 0;
    place();
  }, [bases, players, hidden, place]);
  const shown = bases.length + players.length > 0;
  useEffect(() => {
    const el = bar.current;
    if (!el || !('ResizeObserver' in window)) return;
    const ro = new ResizeObserver(() => { span.current = el.clientWidth; place(); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [shown, place]);

  if (bases.length === 0 && players.length === 0) return null;
  /* For a pointer and the eye: the bases are on the rail and the crew in
     the HUD, which is the way to them from a keyboard and for a screen reader. */
  return (
    <div ref={bar} className={`b-locator${hidden ? ' is-hidden' : ''}`} aria-hidden="true">
      <span className="b-locator__ahead" />
      {bases.map(b => (
        // eslint-disable-next-line @next/next/no-html-link-for-pages -- BlueMap's own app, not a Next page
        <a key={b.id} href={baseUrl(b.id)} tabIndex={-1} className="b-locator__mark b-locator__mark--base b-tip b-tip--below"
          data-x={b.x} data-z={b.z} data-name={b.name}>
          <Lantern lit />
        </a>
      ))}
      {players.map(p => (
        <span key={p.name} className="b-locator__mark b-locator__mark--player b-tip b-tip--below"
          data-x={p.x} data-z={p.z} data-name={p.name}>
          <PlayerHead name={p.name} size={16} alt="" />
        </span>
      ))}
    </div>
  );
}

export default memo(Locator);
