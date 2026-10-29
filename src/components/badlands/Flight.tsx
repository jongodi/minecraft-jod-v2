'use client';

import { memo, useEffect, useRef, type MutableRefObject, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { WorldPoint } from '@/lib/map-types';
import { cameraAt, cover, depthScale, easeFlight, facing, fetchOrder, flightFrame, flightProgress, flightShape, follow, heading, horizonPoint, projectPoint, warp, type Flight as FlightData, type FlightShape } from '@/lib/map-flight';
import { Lantern, Moon, Stars } from './Bits';
import { FACING, titleCase } from './data';
import PlayerHead from './PlayerHead';
import { useMoonPhase } from './Season';
import type { CameraSink } from './Locator';
import type { LivePlayer } from './livePlayers';

export interface FlightPlace { id: number; label: string; world: WorldPoint }

interface Props {
  flight: FlightData;
  /** the flight is flown: the frames are fetched and play with the scroll.
      Otherwise the still stands alone, the places pinned on it. */
  fly: boolean;
  /** the stretch of page the frame is held over while the camera comes down
      and then stays landed (World.tsx); the world's landing mark in it is
      where the camera touches down */
  runway: RefObject<HTMLDivElement | null>;
  /** the F3 lines over the places (World.tsx): where the camera is while it comes down */
  f3: RefObject<HTMLParagraphElement | null>;
  /** the places on the main map's ground */
  places: FlightPlace[];
  /** the crew in the overworld, where they stand (livePlayers.ts) */
  players: LivePlayer[];
  selected: number | null;
  onChoose: (id: number) => void;
  /** the place pointed at on the rail, whose lantern lights; and a lantern pointed at, for the rail */
  near: number | null;
  onNear: (id: number | null) => void;
  /** told where the camera is and the way it faces (the locator bar) */
  camera: MutableRefObject<CameraSink | null>;
  /** the pins step back: the live map has its own lanterns, the painted map its own pins */
  hidden: boolean;
  /** the camera is down: the still is what is on screen, at the very view the
      town's lights were taken off, and the way into the live map stands again */
  onLanded: (landed: boolean) => void;
  /** the visitor has set off down the page, once: time to wake the live map
      behind the flight (World.tsx), while the sky above still moves on its own */
  onApproach?: () => void;
}

/* frames fetched at once: enough to keep ahead of a quick scroll, few enough
   that the first ones arrive first */
const AT_ONCE = 4;
/* fetched as soon as the world is in reach: the overview and the landing.
   The rest wait for the visitor's first scroll, since the world is in reach
   from the first screen and a visitor who reads the sunset and goes paid
   for the whole flight, nearly 4 MB on a phone. */
const FIRST = 2;
/* the frames kept decoded: the overview, and round the camera the one it has
   passed and the next few ahead of it */
const AROUND = [-1, 0, 1, 2, 3];
/* a pin this far past the frame's edge is out of sight */
const EDGE = 24;
/* the camera sets off while the frame is still rising, this much of its
   height short of being held, so the world is moving from the moment it is seen */
const LEAD = 0.5;
/* The bank, in degrees: the stills only close in, straight ahead, so the
   camera is given a glider's lean over the overview, levelling out as it
   comes down and level for the landing, where the still takes over. */
const BANK = -2.5;

type Moved = ReturnType<typeof warp>;
interface Sheet { el: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null; frame: number; shape: string; z: string }
/* a pin and the point in the world it stands on: a place's lantern, or a member's head over them */
interface Pin { el: HTMLElement; at: [number, number, number]; least: number; depth: string }

/** The flight down into the world (scripts/map-flight.mjs): the camera starts
    high over the whole rendered world at dusk, the land hanging in the
    page's own night under its stars and tonight's moon, the last light on
    the horizon, and comes down to the start view as the page is scrolled,
    the light going as it comes, the stars giving way to the town's lamps.
    Between two stills the nearer one is zoomed in towards the next by the
    camera each was taken with, and the next fades in over it already lined
    up, so the camera moves instead of the frames dissolving. It ends on the
    start view itself, where the flight steps aside for the still and its
    lights. The places are pinned where they stand on whatever is showing,
    smaller the farther off, and so are the crew who are on, by their heads; a
    pin opens the place's postcard as its chip on the rail does.

    What a frame of scroll costs: the handler reads scrollY and nothing else
    (where the world is on the page is measured on resize), and nothing is
    done while the camera has not moved. The two stills on screen are each
    painted once onto a sheet of their own, at the size they were taken, when
    they come on; the scroll only moves and fades the sheets and the sky's
    layers, which the compositor does without painting. The stills are fetched
    as they are: the overview and the landing once the world is near, and the
    rest, a few MB, from the visitor's first scroll, ever finer between, so a
    quick scroll always has one near, moved to where the camera is. Only those
    round the camera are decoded, off the main thread, ahead of it. */
function Flight({ flight, fly, runway, f3, places, players, selected, onChoose, near, onNear, camera, hidden, onLanded, onApproach }: Props) {
  const layer = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const moon = useMoonPhase();
  /* the latest listeners, for the drawing loop below, which outlives a render */
  const latest = useRef({ onLanded, onApproach });
  const pins = useRef<Pin[]>([]);
  const redraw = useRef<() => void>(() => {});
  /* the visitor has scrolled since the page came: the whole flight is wanted, and the live map behind it */
  const scrolled = useRef(false);

  /* the pins as they are in the page, and a fresh look at them */
  useEffect(() => {
    latest.current = { onLanded, onApproach };
    const where = new Map<string, Pin['at']>();
    /* a place's lantern stands in the middle of its block, a block up; a head floats over its member */
    for (const pl of places) where.set(`place:${pl.id}`, [pl.world.x + 0.5, pl.world.y + 1, pl.world.z + 0.5]);
    for (const p of players) where.set(`player:${p.name}`, [p.x, p.y + 2.4, p.z]);
    pins.current = Array.from(layer.current?.querySelectorAll<HTMLElement>('[data-pin]') ?? []).flatMap(el => {
      const at = where.get(el.dataset.pin ?? '');
      return at ? [{ el, at, least: el.dataset.pin?.startsWith('player:') ? 0.7 : 0.5, depth: '' }] : [];
    });
    redraw.current();
  }, [places, players, onLanded, onApproach]);

  useEffect(() => {
    const box = layer.current;
    const scene = stage.current;
    const strip = runway.current;
    const frame = box?.closest<HTMLElement>('.b-frame');
    const section = strip?.parentElement ?? frame?.parentElement;
    if (!box || !frame || !section) return;
    /* the two stills on screen: the one the camera has passed, and over it the one it is reaching */
    const sheets: Sheet[] = Array.from(scene?.querySelectorAll('canvas') ?? []).map(el => ({ el, ctx: el.getContext('2d'), frame: -1, shape: '', z: '' }));
    /* the page's night behind the land (its stars, the moon), and the last light on the horizon */
    const sky = scene?.querySelector<HTMLElement>('.b-flight__sky') ?? null;
    const glow = scene?.querySelector<HTMLElement>('.b-flight__glow') ?? null;

    /* altitude: the night air between the camera and the land, thick over the overview and gone at the landing */
    const haze = scene?.querySelector<HTMLElement>('.b-flight__haze') ?? null;
    /* the landing mark: the scroll at which the camera is down (World.tsx, badlands.css) */
    const land = section.querySelector<HTMLElement>(':scope > .b-world__land');

    /* where the world is on the page and how big the frame is: measured on resize, never while scrolling */
    const geo = { top: 0, stick: 0, length: 0, lead: 0, w: 0, h: 0, glow: 0 };
    const measure = () => {
      geo.top = section.getBoundingClientRect().top + window.scrollY;
      geo.stick = parseFloat(getComputedStyle(frame).top) || 0;
      geo.length = land?.offsetTop ?? strip?.offsetHeight ?? 0;
      geo.lead = LEAD * box.clientHeight;
      geo.w = box.clientWidth;
      geo.h = box.clientHeight;
      geo.glow = glow?.offsetHeight ?? 0;
    };
    /* how far down the flight the page is, 0 at the overview and 1 landed */
    const progress = () => (!fly || geo.length <= 0 ? 1 : flightProgress(window.scrollY, geo.top, geo.stick, geo.lead, geo.length));
    /* The camera follows the scroll rather than jumping with it: a wheel
       notch moves the page a tenth of the way down at once, which jumped the
       camera four stills; followed, it glides there in a moment. -1 until the
       camera is placed, and again when the world comes back into reach, so
       arriving from far off does not fly the whole way in view. */
    let cur = -1;
    let lastT = 0;
    let lastTarget = -1;

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
    let approached = false;
    let showing = false;
    let f3Text = ['', ''];
    let skyLook = '';
    const stacked = new Map<HTMLElement, string>();

    const decode = (k: number) => {
      const blob = bytes[k];
      if (!blob || ready.has(k) || making.has(k) || failed || gone) return;
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
    /* starts what may be fetched now: up to AT_ONCE at a time, and past the
       first two only once the visitor has scrolled */
    let more = () => {};
    /* the stills on their way for the shape being flown: let go when the
       shape changes or the flight is torn down, rather than downloaded and
       decoded into a bitmap that is closed at once */
    let inflight: AbortController | null = null;
    const fetchSet = (s: FlightShape) => {
      const mine = round;
      inflight?.abort();
      const ac = new AbortController();
      inflight = ac;
      bytes = new Array(flight.frames).fill(null);
      const queue = fetchOrder(flight.frames);
      let out = 0;
      more = () => {
        while (!gone && mine === round && out < AT_ONCE && queue.length > 0 && (scrolled.current || flight.frames - queue.length < FIRST)) {
          const n = queue.shift()!;
          out++;
          fetch(flightFrame(flight, s, n), { priority: n === 0 ? 'high' : 'low', signal: ac.signal } as RequestInit)
            .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.blob(); })
            .then(
              (blob) => { if (mine === round) { bytes[n] = blob; if (wanted.has(n)) decode(n); } },
              /* without the overview there is no flight to fly: the still stands */
              () => { if (n === 0 && mine === round && !ac.signal.aborted) { failed = true; schedule(); } },
            )
            .finally(() => { if (mine === round) { out--; more(); } });
        }
      };
      more();
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
      const now = performance.now();
      const target = progress();
      /* The first frame after the camera has been at rest counts as one
         frame, not the whole rest, so the first notch glides too; after that
         the time that really passed, so a device drawing few frames a second
         still keeps up with the scroll. */
      const dt = cur === lastTarget ? 16 : Math.min(250, now - lastT);
      cur = cur < 0 ? target : follow(cur, target, dt);
      lastT = now;
      lastTarget = target;
      if (cur !== target) schedule();
      const p = cur;
      const along = easeFlight(p);
      const at = along * last;
      const i = Math.min(last, Math.floor(at));
      if (fly && fetching && p < 1 && i !== keptAt) { keptAt = i; keep(i); }
      if (fly && !approached && scrolled.current && p < 1) { approached = true; latest.current.onApproach?.(); }
      let lo = -1, hi = -1;
      if (fly && p < 1 && !failed) {
        for (let k = i; k >= 0; k--) if (ready.has(k)) { lo = k; break; }
        if (lo < at) for (let k = i + 1; k <= last; k++) if (ready.has(k)) { hi = k; break; }
      }
      const flying = lo >= 0 || hi >= 0;
      const key = `${s} ${w}x${h} ${flying ? `${lo} ${hi} ${at.toFixed(4)}` : 'still'} ${pins.current.length}`;
      if (key === lastKey) return;
      lastKey = key;

      const cam = flying ? cameraAt(shots[i], shots[Math.min(last, i + 1)], at - i) : shots[last];
      /* over a still and the one after, the after fades in as the camera reaches it */
      const alpha = lo >= 0 && hi >= 0 ? (at - lo) / (hi - lo) : hi >= 0 ? 1 : 0;
      const rect = cover(w, h, set.width, set.height);
      const q = rect.width / set.width;
      const still: Moved = { from: { x: set.width / 2, y: set.height / 2 }, scale: 1 };
      const moved = (k: number): Moved => (flying ? warp(shots[k], cam.look, cam.d, set.width, set.height) : still);
      const warpLo = lo >= 0 ? moved(lo) : null;
      const warpHi = hi >= 0 ? moved(hi) : null;

      /* A still is painted onto its sheet once, as it comes on, at the size
         it was taken; from there the sheet is only moved and faded. The sky
         is cut out of the stills, so the night behind shows through. */
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
          sheet.ctx?.clearRect(0, 0, set.width, set.height);
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
        for (const [sheet, z] of [[under, '1'], [over, '2']] as const) if (sheet.z !== z) { sheet.z = z; sheet.el.style.zIndex = z; }
        show(under, lo, warpLo, 1);
        /* a nearer still alone, moved out to a farther camera, leaves a margin: the night shows there */
        show(over, hi, warpHi, warpLo ? alpha : 1);
      }
      if (scene && flying !== showing) { showing = flying; scene.style.visibility = flying ? 'visible' : 'hidden'; }

      /* The lean: the whole flight turned about the middle of the frame,
         and drawn as much larger as keeps its corners out of sight; the pins
         are carried round with it below, standing upright. One transform on
         the stage, so the compositor does it. */
      const lean = flying ? BANK * (1 - along) ** 2 : 0;
      const rad = (lean * Math.PI) / 180;
      const cos = Math.cos(rad), sin = Math.sin(rad);
      const fit = cos + (Math.max(w, h) / Math.min(w, h)) * Math.abs(sin);
      if (scene) scene.style.transform = lean ? `rotate(${lean.toFixed(3)}deg) scale(${fit.toFixed(4)})` : '';
      const leaned = (pos: { x: number; y: number }) => (lean ? {
        x: w / 2 + fit * (cos * (pos.x - w / 2) - sin * (pos.y - h / 2)),
        y: h / 2 + fit * (sin * (pos.x - w / 2) + cos * (pos.y - h / 2)),
      } : pos);

      /* where a point in the world falls on what is showing, moved as its still is */
      const pointAt = (k: number, wp: Moved, point: readonly number[]) => {
        const pr = projectPoint(shots[k].m, point);
        return pr && {
          x: rect.x + q * (set.width / 2 + (pr.x * set.width - wp.from.x) * wp.scale),
          y: rect.y + q * (set.height / 2 + (pr.y * set.height - wp.from.y) * wp.scale),
        };
      };
      const onScreen = (point: readonly number[]) => {
        const a = flying ? (warpLo ? pointAt(lo, warpLo, point) : null) : pointAt(last, still, point);
        const b = warpHi ? pointAt(hi, warpHi, point) : null;
        return a && b ? { x: a.x + (b.x - a.x) * alpha, y: a.y + (b.y - a.y) * alpha } : a ?? b;
      };

      /* The sky: the evening's last light on the horizon, and the stars and
         the moon giving way to the town's lamps over the last stretch. Looking
         down from the overview the horizon is far over the frame, so the light
         holds until the camera has come down far enough to see it and fades
         over the landing. Both are layers moved and faded, never painted again. */
      if (flying && sky && glow) {
        const horizon = onScreen(horizonPoint(cam.eye, cam.look));
        const stars = Math.min(1, Math.max(0, (1 - along) / 0.3));
        const light = Math.min(1, Math.max(0, (1 - p) / 0.35));
        /* the air thins slowly at first and is gone a little before the town's lamps come on */
        const air = Math.min(1, Math.max(0, (0.9 - along) / 0.9)) ** 1.5;
        const look = `${horizon ? horizon.y.toFixed(1) : 'x'} ${stars.toFixed(3)} ${light.toFixed(3)} ${air.toFixed(3)}`;
        if (look !== skyLook) {
          skyLook = look;
          sky.style.opacity = stars.toFixed(3);
          if (haze) haze.style.opacity = air.toFixed(3);
          glow.style.opacity = horizon ? light.toFixed(3) : '0';
          if (horizon) glow.style.transform = `translateY(${(horizon.y - geo.glow).toFixed(1)}px)`;
        }
      }

      /* each pin where its point stands, smaller the farther it is from the camera */
      for (const pin of pins.current) {
        const seen = onScreen(pin.at);
        const pos = seen && leaned(seen);
        const { el } = pin;
        if (!pos || pos.x < -EDGE || pos.x > w + EDGE || pos.y < -EDGE || pos.y > h + EDGE) { el.style.visibility = 'hidden'; continue; }
        el.style.visibility = '';
        el.style.transform = `translate(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px)`;
        const depth = Math.max(pin.least, depthScale(Math.hypot(pin.at[0] - cam.eye[0], pin.at[1] - cam.eye[1], pin.at[2] - cam.eye[2]))).toFixed(2);
        if (depth !== pin.depth) { pin.depth = depth; el.style.setProperty('--depth', depth); }
        /* the nearer the camera, the lower in the frame: those stand in front.
           Written only when it changes, in steps, so the pins are not
           restacked on every frame of the scroll. */
        const z = String(Math.round(pos.y / 16));
        if (stacked.get(el) !== z) { stacked.set(el, z); el.style.zIndex = z; }
      }

      /* the locator bar: where the camera is and the way it faces */
      camera.current?.([cam.eye[0], cam.eye[2]], heading(cam.eye, cam.look));

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
    const remeasure = () => { measure(); lastKey = ''; skyLook = ''; schedule(); };
    redraw.current = () => { lastKey = ''; schedule(); };

    measure();
    draw();
    window.addEventListener('resize', remeasure);
    const ro = 'ResizeObserver' in window ? new ResizeObserver(remeasure) : null;
    ro?.observe(box);
    /* anything above the world growing or shrinking moves it down the page */
    ro?.observe(document.body);

    /* the scroll is only listened to, and the stills only fetched, while the world is near */
    let inReach = false;
    if (window.scrollY > 0) scrolled.current = true;
    const onScroll = () => {
      if (!scrolled.current && window.scrollY > 0) { scrolled.current = true; if (asked) start(); else more(); }
      if (inReach) schedule();
    };
    let io: IntersectionObserver | null = null;
    /* The first stills are not asked for until the page has loaded: on a
       phone the world is in reach from the first screen, and the overview
       and the landing, a sixth of a megabyte, were fetched beside the hero's
       own fonts and stylesheet and slowed them. A visitor who has already
       scrolled is on the way down, and gets them at once. */
    const onLoad = () => { loaded = true; if (asked) start(); };
    let loaded = document.readyState === 'complete';
    let asked = false;
    const start = () => {
      if (fetching) return;
      if (!loaded && !scrolled.current) { asked = true; return; }
      fetching = true;
      if (shape) fetchSet(shape);
      lastKey = '';
    };
    if (fly) {
      window.addEventListener('scroll', onScroll, { passive: true });
      if (!loaded) window.addEventListener('load', onLoad, { once: true });
      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(([e]) => { inReach = e.isIntersecting; if (inReach) { cur = -1; start(); schedule(); } }, { rootMargin: '100% 0px' });
        io.observe(section);
      } else { inReach = true; start(); }
    }
    return () => {
      gone = true;
      window.removeEventListener('load', onLoad);
      inflight?.abort();
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
  }, [flight, fly, runway, f3, camera]);

  /* a pointer over a lantern says so, for the rail; not a touch, which presses it */
  const point = (id: number | null) => (e: ReactPointerEvent) => { if (e.pointerType === 'mouse') onNear(id); };

  return (
    <>
      {fly && (
        <div ref={stage} className="b-flight" aria-hidden="true">
          <div className="b-flight__sky">
            <Stars className="b-flight__stars" />
            {moon !== null && <Moon phase={moon} className="b-flight__moon" />}
          </div>
          <div className="b-flight__glow" />
          <canvas className="b-flight__sheet" />
          <canvas className="b-flight__sheet" />
          <div className="b-flight__haze" />
        </div>
      )}
      {/* The pins are for a pointer: each is the place's chip on the rail,
          which is the way to it from a keyboard and for a screen reader; the
          crew who are on are in the HUD's heads. */}
      <div ref={layer} className={`b-pins${hidden ? ' is-hidden' : ''}`} aria-hidden="true">
        {places.map(pl => (
          <button key={pl.id} data-pin={`place:${pl.id}`} type="button" tabIndex={-1}
            className={`b-pin${pl.id === selected ? ' is-on' : ''}${pl.id === near ? ' is-near' : ''}`}
            onClick={() => onChoose(pl.id)} onPointerEnter={point(pl.id)} onPointerLeave={point(null)}>
            <Lantern lit className="b-pin__lamp" />
            <span className="b-pin__label">{titleCase(pl.label)}</span>
          </button>
        ))}
        {players.map(p => (
          <span key={p.name} data-pin={`player:${p.name}`} className="b-pin b-pin--player">
            <span className="b-nametag b-pin__tag">{p.name}</span>
            <PlayerHead name={p.name} size={16} alt="" className="b-pin__head" />
          </span>
        ))}
      </div>
    </>
  );
}

export default memo(Flight);
