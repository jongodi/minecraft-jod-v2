'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { WorldPoint } from '@/lib/map-types';
import { cover, flightFrame, flightShape, project, type Flight as FlightData, type FlightShape } from '@/lib/map-flight';
import { Lantern } from './Bits';
import { titleCase } from './data';

export interface FlightPlace { id: number; label: string; world: WorldPoint }

interface Props {
  flight: FlightData;
  /** the flight is flown: the frames are fetched and play with the scroll.
      Otherwise the still stands alone, the places pinned on it. */
  fly: boolean;
  /** the stretch of page the frame is held over while the camera comes down
      (World.tsx); its top is where the flight starts */
  runway: RefObject<HTMLDivElement | null>;
  /** the places on the main map's ground */
  places: FlightPlace[];
  selected: number | null;
  onChoose: (id: number) => void;
  /** the pins step back: the live map has its own lanterns, the painted map its own pins */
  hidden: boolean;
  /** the still is what is on screen, at the very view the town's lights were taken off */
  onLanded: (landed: boolean) => void;
}

/* frames fetched at once: enough to keep ahead of a quick scroll, few enough
   that the first ones arrive first */
const AT_ONCE = 3;
/* a pin this far past the frame's edge is out of sight */
const EDGE = 24;

/** The flight down into the world (scripts/map-flight.mjs): the camera starts
    high over the whole rendered world, the land standing in the night like a
    model on a table, and comes down to the start view as the page is
    scrolled, one frame of the flight for each step of the scroll, two frames
    blended between steps. It ends on the start view itself, where the canvas
    steps aside for the still and its lights. Every frame keeps the camera it
    was taken with, so the places are pinned where they stand on whichever
    frame is showing; a pin opens the place's postcard as its chip on the rail
    does. The frames are fetched once the world is near, in order, so the
    overview arrives first; until a frame is here the nearest one before it
    stands in, and before any, the still. */
export default function Flight({ flight, fly, runway, places, selected, onChoose, hidden, onLanded }: Props) {
  const layer = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pins = useRef(new Map<number, HTMLButtonElement>());
  const placesRef = useRef(places);
  placesRef.current = places;
  const landedRef = useRef(onLanded);
  landedRef.current = onLanded;
  const redraw = useRef<() => void>(() => {});
  /* the world is close enough to start fetching the flight */
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (!fly || near) return;
    const section = runway.current?.parentElement;
    if (!section || !('IntersectionObserver' in window)) { setNear(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setNear(true); }, { rootMargin: '100% 0px' });
    io.observe(section);
    return () => io.disconnect();
  }, [fly, near, runway]);

  useEffect(() => {
    const box = layer.current;
    const paint = canvas.current;
    if (!box) return;
    const last = flight.frames - 1;
    let shape: FlightShape | null = null;
    let frames: (HTMLImageElement | null)[] = [];
    let raf = 0;
    let landed: boolean | null = null;
    let gone = false;

    const fetchSet = (s: FlightShape) => {
      const mine: (HTMLImageElement | null)[] = new Array(flight.frames).fill(null);
      frames = mine;
      let next = 0;
      const one = () => {
        if (gone || frames !== mine || next > last) return;
        const n = next++;
        const img = new Image();
        img.decoding = 'async';
        img.src = flightFrame(flight, s, n);
        img.decode().then(() => { if (frames === mine) { mine[n] = img; schedule(); } }, () => {}).finally(one);
      };
      for (let i = 0; i < AT_ONCE; i++) one();
    };

    /* how far down the runway the page is, 0 at the overview and 1 landed */
    const progress = () => {
      const strip = runway.current;
      const frame = box.closest<HTMLElement>('.b-frame');
      if (!fly || !strip?.parentElement || !frame) return 1;
      const length = strip.offsetHeight;
      if (length <= 0) return 1;
      const top = parseFloat(getComputedStyle(frame).top) || 0;
      return Math.min(1, Math.max(0, (top - strip.parentElement.getBoundingClientRect().top) / length));
    };

    const draw = () => {
      raf = 0;
      const w = box.clientWidth, h = box.clientHeight;
      if (!w || !h) return;
      const s = flightShape(flight, w, h);
      if (s !== shape) { shape = s; frames = []; if (fly && near) fetchSet(s); }
      const set = flight[s] ?? flight.wide;

      /* the frame the scroll is at, and the next one blended over it */
      let a = last, b = last, f = 0, flying = false;
      const p = progress();
      if (fly && p < 1) {
        const at = p * last;
        const i = Math.floor(at);
        let j = i;
        while (j >= 0 && !frames[j]) j--;
        if (j >= 0) {
          flying = true;
          a = j;
          if (j === i && frames[i + 1]) { b = i + 1; f = at - i; } else b = j;
        }
      }

      const rect = cover(w, h, set.width, set.height);
      if (paint) {
        if (flying) {
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          const cw = Math.round(w * dpr), ch = Math.round(h * dpr);
          if (paint.width !== cw || paint.height !== ch) { paint.width = cw; paint.height = ch; }
          const ctx = paint.getContext('2d');
          if (ctx) {
            ctx.globalAlpha = 1;
            ctx.drawImage(frames[a]!, rect.x * dpr, rect.y * dpr, rect.width * dpr, rect.height * dpr);
            if (f > 0) {
              ctx.globalAlpha = f;
              ctx.drawImage(frames[b]!, rect.x * dpr, rect.y * dpr, rect.width * dpr, rect.height * dpr);
            }
          }
        }
        paint.style.visibility = flying ? 'visible' : 'hidden';
      }

      /* each pin where its place stands in what is showing */
      const byId = new Map(placesRef.current.map(pl => [pl.id, pl]));
      pins.current.forEach((el, id) => {
        const place = byId.get(id);
        const pa = place && project(set.matrices[a], place.world);
        const pb = place && (f > 0 ? project(set.matrices[b], place.world) : pa);
        if (!pa || !pb) { el.style.visibility = 'hidden'; return; }
        const x = rect.x + (pa.x + (pb.x - pa.x) * f) * rect.width;
        const y = rect.y + (pa.y + (pb.y - pa.y) * f) * rect.height;
        const out = x < -EDGE || x > w + EDGE || y < -EDGE || y > h + EDGE;
        el.style.visibility = out ? 'hidden' : '';
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        /* the nearer the camera, the lower in the frame: those stand in front */
        el.style.zIndex = String(Math.round(y));
      });

      if (landed !== !flying) { landed = !flying; landedRef.current(landed); }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(draw); };
    redraw.current = schedule;

    draw();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const ro = 'ResizeObserver' in window ? new ResizeObserver(schedule) : null;
    ro?.observe(box);
    return () => {
      gone = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      ro?.disconnect();
      redraw.current = () => {};
    };
  }, [flight, fly, near, runway]);

  /* new places, or a pin added or taken away, are placed at once */
  useEffect(() => { redraw.current(); }, [places]);

  const pinRef = useCallback((id: number) => (el: HTMLButtonElement | null) => {
    if (el) pins.current.set(id, el); else pins.current.delete(id);
  }, []);

  return (
    <>
      {fly && <canvas ref={canvas} className="b-flight" aria-hidden="true" />}
      {/* The pins are for a pointer: each is the place's chip on the rail,
          which is the way to it from a keyboard and for a screen reader. */}
      <div ref={layer} className={`b-pins${hidden ? ' is-hidden' : ''}`} aria-hidden="true">
        {places.map(pl => (
          <button key={pl.id} ref={pinRef(pl.id)} type="button" tabIndex={-1}
            className={`b-pin${pl.id === selected ? ' is-on' : ''}`} onClick={() => onChoose(pl.id)}>
            <Lantern lit className="b-pin__lamp" />
            <span className="b-pin__label">{titleCase(pl.label)}</span>
          </button>
        ))}
      </div>
    </>
  );
}
