'use client';

import { memo, useEffect, useRef, type RefObject } from 'react';
import type { WorldPoint } from '@/lib/map-types';
import { cameraAt, cover, easeFlight, facing, fetchOrder, flightFrame, flightShape, project, warp, type Flight as FlightData, type FlightShape } from '@/lib/map-flight';
import { Lantern } from './Bits';
import { FACING, titleCase } from './data';

export interface FlightPlace { id: number; label: string; world: WorldPoint }

interface Props {
  flight: FlightData;
  /** the flight is flown: the frames are fetched and play with the scroll.
      Otherwise the still stands alone, the places pinned on it. */
  fly: boolean;
  /** the stretch of page the frame is held over while the camera comes down
      (World.tsx); its top is where the flight starts */
  runway: RefObject<HTMLDivElement | null>;
  /** the F3 lines over the places (World.tsx): where the camera is while it comes down */
  f3: RefObject<HTMLParagraphElement | null>;
  /** the places on the main map's ground */
  places: FlightPlace[];
  selected: number | null;
  onChoose: (id: number) => void;
  /** the pins step back: the live map has its own lanterns, the painted map its own pins */
  hidden: boolean;
  /** the camera is down: the still is what is on screen, at the very view the
      town's lights were taken off, and the way into the live map stands again */
  onLanded: (landed: boolean) => void;
}

/* frames fetched at once: enough to keep ahead of a quick scroll, few enough
   that the first ones arrive first */
const AT_ONCE = 4;
/* the frames kept decoded: the overview, and round the camera the one it has
   passed and the next few ahead of it */
const AROUND = [-1, 0, 1, 2, 3];
/* a pin this far past the frame's edge is out of sight */
const EDGE = 24;

type Moved = ReturnType<typeof warp>;
interface Sheet { el: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null; frame: number; shape: string; z: string }

/** The flight down into the world (scripts/map-flight.mjs): the camera starts
    high over the whole rendered world, the land standing in the night like a
    model on a table, and comes down to the start view as the page is scrolled.
    Between two stills the nearer one is zoomed in towards the next by the
    camera each was taken with, and the next fades in over it already lined
    up, so the camera moves instead of the frames dissolving. It ends on the
    start view itself, where the flight steps aside for the still and its
    lights. The places are pinned where they stand on whatever is showing; a
    pin opens the place's postcard as its chip on the rail does.

    What a frame of scroll costs: the handler reads scrollY and nothing else
    (where the world is on the page is measured on resize), and nothing is
    done while the camera has not moved. The two stills on screen are each
    painted once onto a sheet of their own, at the size they were taken, when
    they come on; the scroll only moves and fades the sheets, which the
    compositor does without painting. The stills are fetched as they are, a
    few MB, once the world is near (the overview, the landing, then ever
    finer between, so a quick scroll always has one near, moved to where the
    camera is), and only those round the camera are decoded, off the main
    thread, ahead of it. */
function Flight({ flight, fly, runway, f3, places, selected, onChoose, hidden, onLanded }: Props) {
  const layer = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  /* the latest places and the landing's listener, for the drawing loop below, which outlives a render */
  const latest = useRef({ places, onLanded });
  const pins = useRef<{ el: HTMLElement; world: WorldPoint }[]>([]);
  const redraw = useRef<() => void>(() => {});

  /* the pins as they are in the page, and a fresh look at them */
  useEffect(() => {
    latest.current = { places, onLanded };
    const byId = new Map(places.map(pl => [String(pl.id), pl.world]));
    pins.current = Array.from(layer.current?.querySelectorAll<HTMLElement>('[data-pin]') ?? []).flatMap(el => {
      const world = byId.get(el.dataset.pin ?? '');
      return world ? [{ el, world }] : [];
    });
    redraw.current();
  }, [places, onLanded]);

  useEffect(() => {
    const box = layer.current;
    const scene = stage.current;
    const strip = runway.current;
    const frame = box?.closest<HTMLElement>('.b-frame');
    const section = strip?.parentElement ?? frame?.parentElement;
    if (!box || !frame || !section) return;
    /* the two stills on screen: the one the camera has passed, and over it the one it is reaching */
    const sheets: Sheet[] = Array.from(scene?.querySelectorAll('canvas') ?? []).map(el => ({ el, ctx: el.getContext('2d', { alpha: false }), frame: -1, shape: '', z: '' }));

    /* where the world is on the page and how big the frame is: measured on resize, never while scrolling */
    const geo = { top: 0, stick: 0, length: 0, w: 0, h: 0 };
    const measure = () => {
      geo.top = section.getBoundingClientRect().top + window.scrollY;
      geo.stick = parseFloat(getComputedStyle(frame).top) || 0;
      geo.length = strip?.offsetHeight ?? 0;
      geo.w = box.clientWidth;
      geo.h = box.clientHeight;
    };
    /* how far down the runway the page is, 0 at the overview and 1 landed */
    const progress = () => {
      if (!fly || geo.length <= 0) return 1;
      return Math.min(1, Math.max(0, (window.scrollY + geo.stick - geo.top) / geo.length));
    };

    let gone = false;
    let raf = 0;
    let shape: FlightShape | null = null;
    /* a new set of stills (a new shape of frame) leaves what was under way for the old one */
    let round = 0;
    let fetching = false;
    let failed = typeof createImageBitmap !== 'function';
    let bytes: (Blob | null)[] = [];
    const ready = new Map<number, ImageBitmap>();
    const making = new Set<number>();
    let wanted = new Set<number>();
    let keptAt = -1;
    let lastKey = '';
    let landed: boolean | null = null;
    let showing = false;
    let f3Text = ['', ''];
    const stacked = new Map<HTMLElement, string>();

    const decode = (k: number) => {
      const blob = bytes[k];
      if (!blob || ready.has(k) || making.has(k) || failed) return;
      making.add(k);
      const mine = round;
      createImageBitmap(blob).then(
        (bitmap) => {
          making.delete(k);
          if (gone || mine !== round || !wanted.has(k)) { bitmap.close(); return; }
          ready.set(k, bitmap);
          schedule();
        },
        () => { making.delete(k); if (k === 0 && mine === round) { failed = true; schedule(); } },
      );
    };
    /* the overview and the stills round the camera decoded; the rest let go */
    const keep = (i: number) => {
      wanted = new Set([0, ...AROUND.map(d => i + d)]);
      ready.forEach((bitmap, k) => { if (!wanted.has(k)) { bitmap.close(); ready.delete(k); } });
      wanted.forEach(decode);
    };
    const fetchSet = (s: FlightShape) => {
      const mine = round;
      bytes = new Array(flight.frames).fill(null);
      const queue = fetchOrder(flight.frames);
      const one = () => {
        if (gone || mine !== round) return;
        const n = queue.shift();
        if (n === undefined) return;
        fetch(flightFrame(flight, s, n), { priority: n === 0 ? 'high' : 'low' } as RequestInit)
          .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.blob(); })
          .then(
            (blob) => { if (mine === round) { bytes[n] = blob; if (wanted.has(n)) decode(n); } },
            /* without the overview there is no flight to fly: the still stands */
            () => { if (n === 0 && mine === round) { failed = true; schedule(); } },
          )
          .finally(one);
      };
      for (let i = 0; i < AT_ONCE; i++) one();
    };

    const draw = () => {
      raf = 0;
      const { w, h } = geo;
      if (!w || !h) return;
      const s = flightShape(flight, w, h);
      if (s !== shape) {
        shape = s;
        round++;
        bytes = [];
        ready.forEach(bitmap => bitmap.close());
        ready.clear();
        keptAt = -1;
        failed = typeof createImageBitmap !== 'function';
        if (fetching) fetchSet(s);
      }
      const set = flight[s] ?? flight.wide;
      const shots = set.shots;
      const last = shots.length - 1;

      /* where the camera is on the path, and the stills that stand in for it:
         the nearest here at or before it, and the nearest after */
      const p = progress();
      const at = easeFlight(p) * last;
      const i = Math.min(last, Math.floor(at));
      if (fly && fetching && p < 1 && i !== keptAt) { keptAt = i; keep(i); }
      let lo = -1, hi = -1;
      if (fly && p < 1 && !failed) {
        for (let k = i; k >= 0; k--) if (ready.has(k)) { lo = k; break; }
        if (lo < at) for (let k = i + 1; k <= last; k++) if (ready.has(k)) { hi = k; break; }
      }
      const flying = lo >= 0 || hi >= 0;
      const key = `${s} ${w}x${h} ${flying ? `${lo} ${hi} ${at.toFixed(4)}` : 'still'} ${pins.current.length}`;
      if (key === lastKey) return;
      lastKey = key;

      const cam = cameraAt(shots[i], shots[Math.min(last, i + 1)], at - i);
      /* over a still and the one after, the after fades in as the camera reaches it */
      const alpha = lo >= 0 && hi >= 0 ? (at - lo) / (hi - lo) : hi >= 0 ? 1 : 0;
      const rect = cover(w, h, set.width, set.height);
      const q = rect.width / set.width;
      const still: Moved = { from: { x: set.width / 2, y: set.height / 2 }, scale: 1 };
      const moved = (k: number): Moved => (flying ? warp(shots[k], cam.look, cam.d, set.width, set.height) : still);
      const warpLo = lo >= 0 ? moved(lo) : null;
      const warpHi = hi >= 0 ? moved(hi) : null;

      /* A still is painted onto its sheet once, as it comes on, at the size
         it was taken; from there the sheet is only moved and faded. */
      const show = (sheet: Sheet, k: number, wp: Moved | null, a: number) => {
        const bitmap = ready.get(k);
        if (k < 0 || !wp || !bitmap) { sheet.el.style.opacity = '0'; return; }
        if (sheet.frame !== k || sheet.shape !== s) {
          if (sheet.el.width !== set.width || sheet.el.height !== set.height) {
            sheet.el.width = set.width;
            sheet.el.height = set.height;
            sheet.el.style.width = `${set.width}px`;
            sheet.el.style.height = `${set.height}px`;
          }
          sheet.ctx?.drawImage(bitmap, 0, 0);
          sheet.frame = k;
          sheet.shape = s;
        }
        const m = q * wp.scale;
        sheet.el.style.transform = `matrix(${m.toFixed(5)}, 0, 0, ${m.toFixed(5)}, ${(rect.x + q * (set.width / 2 - wp.from.x * wp.scale)).toFixed(2)}, ${(rect.y + q * (set.height / 2 - wp.from.y * wp.scale)).toFixed(2)})`;
        sheet.el.style.opacity = String(a);
      };
      if (flying && sheets.length === 2) {
        /* Passing a still, the sheet already showing the next one becomes the
           one under, and only the other is painted: one still per step, not two. */
        const holds = (k: number) => sheets.find(sh => sh.frame === k && sh.shape === s);
        const under = holds(lo) ?? sheets.find(sh => sh !== holds(hi)) ?? sheets[0];
        const over = sheets[0] === under ? sheets[1] : sheets[0];
        for (const [sheet, z] of [[under, '0'], [over, '1']] as const) if (sheet.z !== z) { sheet.z = z; sheet.el.style.zIndex = z; }
        show(under, lo, warpLo, 1);
        /* a nearer still alone, moved out to a farther camera, leaves a margin: the night shows there */
        show(over, hi, warpHi, warpLo ? alpha : 1);
      }
      if (scene && flying !== showing) { showing = flying; scene.style.visibility = flying ? 'visible' : 'hidden'; }

      /* each pin where its place stands in what is showing, moved as its still is */
      const pinAt = (k: number, wp: Moved, world: WorldPoint) => {
        const pr = project(shots[k].m, world);
        return pr && {
          x: rect.x + q * (set.width / 2 + (pr.x * set.width - wp.from.x) * wp.scale),
          y: rect.y + q * (set.height / 2 + (pr.y * set.height - wp.from.y) * wp.scale),
        };
      };
      for (const { el, world } of pins.current) {
        const a = flying ? (warpLo ? pinAt(lo, warpLo, world) : null) : pinAt(last, still, world);
        const b = warpHi ? pinAt(hi, warpHi, world) : null;
        const pos = a && b ? { x: a.x + (b.x - a.x) * alpha, y: a.y + (b.y - a.y) * alpha } : a ?? b;
        if (!pos || pos.x < -EDGE || pos.x > w + EDGE || pos.y < -EDGE || pos.y > h + EDGE) { el.style.visibility = 'hidden'; continue; }
        el.style.visibility = '';
        el.style.transform = `translate(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px)`;
        /* the nearer the camera, the lower in the frame: those stand in front.
           Written only when it changes, in steps, so the pins are not
           restacked on every frame of the scroll. */
        const z = String(Math.round(pos.y / 16));
        if (stacked.get(el) !== z) { stacked.set(el, z); el.style.zIndex = z; }
      }

      /* the F3 lines: where the camera is, as the game writes a position, and the way it faces */
      const lines = f3.current;
      const xyz = flying ? `XYZ: ${cam.eye.map(Math.floor).join(' / ')}` : '';
      const way = flying ? `Snýr í ${FACING[facing(cam.eye, cam.look)]}` : '';
      if (lines && (xyz !== f3Text[0] || way !== f3Text[1])) {
        f3Text = [xyz, way];
        lines.hidden = !flying;
        if (lines.children[0]) lines.children[0].textContent = xyz;
        if (lines.children[1]) lines.children[1].textContent = way;
      }

      const down = !fly || failed || p >= 1;
      if (down !== landed) { landed = down; latest.current.onLanded(down); }
    };
    const schedule = () => { if (!raf && !gone) raf = requestAnimationFrame(draw); };
    const remeasure = () => { measure(); lastKey = ''; schedule(); };
    redraw.current = () => { lastKey = ''; schedule(); };

    measure();
    draw();
    window.addEventListener('resize', remeasure);
    const ro = 'ResizeObserver' in window ? new ResizeObserver(remeasure) : null;
    ro?.observe(box);
    /* anything above the world growing or shrinking moves it down the page */
    ro?.observe(document.body);

    /* the scroll is only listened to, and the stills only fetched, while the world is near */
    let near = false;
    const onScroll = () => { if (near) schedule(); };
    let io: IntersectionObserver | null = null;
    if (fly) {
      window.addEventListener('scroll', onScroll, { passive: true });
      const start = () => { if (!fetching) { fetching = true; if (shape) fetchSet(shape); lastKey = ''; } };
      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(([e]) => { near = e.isIntersecting; if (near) { start(); schedule(); } }, { rootMargin: '100% 0px' });
        io.observe(section);
      } else { near = true; start(); }
    }
    return () => {
      gone = true;
      cancelAnimationFrame(raf);
      if (scene) scene.style.visibility = 'hidden';
      ready.forEach(bitmap => bitmap.close());
      ready.clear();
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', onScroll);
      ro?.disconnect();
      io?.disconnect();
      redraw.current = () => {};
    };
  }, [flight, fly, runway, f3]);

  return (
    <>
      {fly && (
        <div ref={stage} className="b-flight" aria-hidden="true">
          <canvas className="b-flight__sheet" />
          <canvas className="b-flight__sheet" />
        </div>
      )}
      {/* The pins are for a pointer: each is the place's chip on the rail,
          which is the way to it from a keyboard and for a screen reader. */}
      <div ref={layer} className={`b-pins${hidden ? ' is-hidden' : ''}`} aria-hidden="true">
        {places.map(pl => (
          <button key={pl.id} data-pin={pl.id} type="button" tabIndex={-1}
            className={`b-pin${pl.id === selected ? ' is-on' : ''}`} onClick={() => onChoose(pl.id)}>
            <Lantern lit className="b-pin__lamp" />
            <span className="b-pin__label">{titleCase(pl.label)}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export default memo(Flight);
