'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { MapConfig, WorldPoint } from '@/lib/map-types';
import { woodClass } from '@/lib/sign-wood';
import type { PlacePrints } from '@/lib/crew-places';
import { baseUrl, mapAt, onMap, type BaseLink, type MapBounds } from '@/lib/base-links';
import viewerFiles from '@/lib/bluemap-viewer.json';
import { BackIcon, CloseIcon, FoldedMapIcon, FullScreenIcon, Lantern, MoonIcon, PictureIcon, Sun } from './Bits';
import { plural } from '@/lib/format';
import Drawer from './Drawer';
import PlayerHead from './PlayerHead';
import Rail, { revealRailItem } from './Rail';
import Chat from './Chat';
import Flight, { type FlightPlace } from './Flight';
import Locator, { type CameraSink } from './Locator';
import { useLivePlayers } from './livePlayers';
import { FLIGHT, headingOf } from '@/lib/map-flight';
import { CREW, FACING, MAP_LIGHTS, MAP_POSTER, MAP_URL, SITE_NAME, handCase, plainClick, titleCase, type Plate, type RoomId } from './data';
import type { ServerState } from './hooks';
import { modalOpen, useEffectsAllowed, useInert, useMediaQuery, useReducedMotionPref, useRoomForEffects } from './hooks';
import { photoProps, PHOTO_SIZES } from './photo';
import { toast } from './Toast';

/* Everything that opens over the world is a screen of its own, fetched when
   its door is first opened: the paper sheet, the album, and the three rooms. */
const MapSheet = dynamic(() => import('./MapSheet'), { ssr: false });
const Album    = dynamic(() => import('./Album'),    { ssr: false });
const Crew     = dynamic(() => import('./Crew'),     { ssr: false });
const Shelf    = dynamic(() => import('./Shelf'),    { ssr: false });
const Board    = dynamic(() => import('@/components/board/Board'), { ssr: false });

/** What public/bluemap-jod/jod.js offers the page, once the viewer's map has loaded. */
interface JodViewer {
  ready: boolean;
  pause: (on: boolean) => void;
  setNight: (on: boolean, instant?: boolean) => void;
  flyTo: (point: WorldPoint, id?: number) => void;
  choose: (id: number | null) => void;
  /** 'outside': beyond the rendered world; 'missing': not on the map right now */
  follow: (name: string) => 'ok' | 'outside' | 'missing';
  unfollow: () => void;
}
type ViewerMessage = {
  source?: string; type?: string; tiles?: number; id?: number; on?: boolean; open?: boolean;
  x?: number; y?: number; z?: number; facing?: 'north' | 'south' | 'east' | 'west';
  /** camera: BlueMap's rotation of the camera round the point it holds, in radians, 0 facing north */
  rotation?: number;
  /** camera: where the camera itself stands on the ground (x, z) */
  ex?: number; ez?: number;
  /** follow: who the camera keeps with now, and who it let go of for walking out of the world */
  name?: string | null; outside?: string;
};

/* The main map's rendered edges, as map:brand wrote them; null before a copy is synced. */
const MAIN_BOUNDS = (viewerFiles as { bounds?: MapBounds | null }).bounds ?? null;

/* The viewer's code and the map's first files, fetched ahead the moment a
   visitor reaches for the lantern (hover, focus or touch), so a press finds
   most of it already here. Written by map:brand. */
let warmed = false;
function warmViewer() {
  if (warmed) return;
  warmed = true;
  for (const href of viewerFiles.warm) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  }
}

/** Keeps the last value a moment after it goes to null, so what was drawn
    from it can leave the way it came (badlands.css animates .is-leaving);
    `settle` is for when that animation has ended, and a timer clears it
    anyway should the animation never run. */
function useLinger<T>(value: T | null, ms = 400): { shown: T | null; leaving: boolean; settle: () => void } {
  const [kept, setKept] = useState<T | null>(value);
  const settle = useCallback(() => setKept(null), []);
  useEffect(() => {
    if (value !== null) { setKept(value); return; }
    const t = setTimeout(settle, ms);
    return () => clearTimeout(t);
  }, [value, ms, settle]);
  const shown = value ?? kept;
  return { shown, leaving: value === null && shown !== null, settle };
}

/** The way into the 3D map: a lantern hung from the arm of a fence post
    planted in the world, the sign nailed to the post under it, and what it
    does on a paper tag. The lantern is the control, as it always was; the
    wood and the paper are what keep its words legible over the still, where
    a soft pool of night round it was the one blurred edge on the page. */
/* The paper tag says what the lantern does where it is seen: in place on a
   wide screen, the whole screen on a phone (badlands.css keeps one of the two). */
function Signpost({ here }: { here: boolean }) {
  return (
    <>
      <span className="b-boot__post" aria-hidden="true" />
      <Lantern lit />
      <span className="b-boot__word">Ferðast um heiminn</span>
      {/* landed in the live map (World.tsx): it is already here, and waits to be taken hold of */}
      <span className="b-boot__sub b-boot__sub--wide">{here ? 'þrívíddarkortið er komið · smelltu og taktu í það' : 'hleður þrívíddarkortið · dragðu, snúðu, stækkaðu'}</span>
      <span className="b-boot__sub b-boot__sub--phone">opnar þrívíddarkortið á heilum skjá</span>
    </>
  );
}

interface Props {
  plates: Plate[];
  /** the places, zones and paths, as the admin left them, drawn into the page on the server */
  config: MapConfig;
  /** what the crew pinned at each place, from their walls, by place id */
  pinned: Record<string, PlacePrints>;
  server: ServerState;
  syncedOn: string | null;
  /** the other bases with a 3D map of their own (/kort/<id>) */
  bases: BaseLink[];
  /** which room is open over the world, if any */
  room: RoomId | null;
  onCloseRoom: () => void;
}

/** Dusk: the world is the page. BlueMap fills the viewport under the mesas,
    opening as a still of the home area; the viewer itself boots only when the
    lantern is pressed, and the still stays up until the first tiles are drawn.
    The places hang along the foot with their photos; a place that stands on
    the map's rendered ground is a lantern in the 3D map, its chip flies the
    camera there and its lantern opens its postcard. A place at another base
    is seen in that base's own map, from its postcard's button; the camera
    never sets off over the void to look for it. The painted map lays over
    the same frame, the album opens on top, and the three rooms of the evening (the
    board, the crew, the shelf) rise from the foot of the frame when their door is opened,
    leaving the world in view above them. *Heill skjár* makes the frame itself
    the whole screen, so nothing reloads; on a phone the lantern does. */
function World({ plates, config, pinned, server, syncedOn, bases, room, onCloseRoom }: Props) {
  const [selected, setSelect] = useState<number | null>(null);
  const [drawn, setDrawn]     = useState(false);
  const [album, setAlbum]     = useState(false);
  const closeAlbum = useCallback(() => setAlbum(false), []);
  const [live, setLive]       = useState(false);
  const [ready, setReady]     = useState(false);
  /* the viewer's map has loaded and window.jod answers */
  const [viewer, setViewer]   = useState(false);
  const [tiles, setTiles]     = useState(0);
  /* where the live map is looking, for the F3 lines */
  const [camera, setCamera]   = useState<{ x: number; y: number; z: number; facing: string } | null>(null);
  const [night, setNight]     = useState(false);
  /* BlueMap's own menu is open along the left edge of the frame */
  const [menu, setMenu]       = useState(false);
  /* the player the camera keeps with, and a word when one can't be followed */
  const [following, setFollowing] = useState<string | null>(null);
  const [followNote, setFollowNote] = useState<string | null>(null);
  /* the frame as the whole screen: the browser's own full screen, or fixed over the page where there is none (iPhone) */
  const [full, setFull]       = useState<false | 'native' | 'overlay'>(false);
  const [inView, setInView]   = useState(true);
  /* the chat is open to be read, and the lantern in the middle steps aside for it */
  const [chatOpen, setChatOpen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const viewRef  = useRef<HTMLIFrameElement>(null);
  const hudTop   = useRef<HTMLDivElement>(null);
  /* A room stays mounted once it has been opened, so its fetches happen once. */
  const [visited, setVisited] = useState<Record<RoomId, boolean>>({ taflan: false, hopur: false, hillan: false });
  /* While a room is open, the world's own controls are out of reach. */
  const shut = room !== null;
  const places = useInert<HTMLDivElement>(shut);
  const tools  = useInert<HTMLDivElement>(shut);
  const mid    = useInert<HTMLDivElement>(shut);
  const back   = useInert<HTMLButtonElement>(shut);
  /* On phones the viewer opens full screen instead of inside the page, so
     BlueMap's drag and pinch never fight the page scroll. */
  const phone = useMediaQuery('(max-width: 899px)');

  /* A link names its place: a wall's /?stadur=<id>#heimur, or a shared /stadur/<id>. */
  useEffect(() => {
    const fromPath = window.location.pathname.match(/^\/stadur\/(\d+)\/?$/)?.[1];
    const wanted = Number(fromPath ?? new URLSearchParams(window.location.search).get('stadur'));
    if (!wanted || !config.locations.some(l => l.id === wanted)) return;
    setSelect(wanted);
    const t = setTimeout(() => revealRailItem(wanted, places.current), 300);
    /* a shared link whose chat dropped the #heimur: the postcard is down in the world */
    if (fromPath && !window.location.hash) document.getElementById('heimur')?.scrollIntoView({ block: 'start' });
    return () => clearTimeout(t);
  // once, on arrival; places is a ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (room && !visited[room]) setVisited(v => ({ ...v, [room]: true }));
  }, [room, visited]);

  /* The still is drawn from the browser's first render on, not into the
     page's markup: on a phone the frame starts right under the hero, so a
     still in the markup came down with the hero's name and shared its first
     seconds. Asked for once the page has hydrated, it is there long before
     anyone has scrolled to the world, as it always was, with no fade. */
  const [posterOn, setPosterOn] = useState(false);
  useEffect(() => { setPosterOn(true); }, []);
  /* the town's lights coming on over the still: not on a device that skips the effects */
  const effects = useEffectsAllowed();
  /* They come on when the world is most of the way into view, and go out
     again when the visitor climbs back up to the sunset, where it is not yet
     night: a state, like the name's windows, so it is a short transition
     (badlands.css) rather than an animation held for the whole scroll. */
  /* `reached` is the arrival itself, which the chat answers on every device;
     the lights are drawn only once the effects are allowed, since lighting
     them before then had them arrive already lit, or lit and going out again
     at the sunset. */
  const [reached, setReached] = useState(false);
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) { setReached(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.intersectionRatio >= 0.55) setReached(true);
      else if (e.intersectionRatio < 0.15 && e.boundingClientRect.top > 0) setReached(false);
    }, { threshold: [0, 0.15, 0.55] });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  /* The flight down into the world (Flight.tsx): where it has been taken,
     on a device with room for the effects and not under reduced motion. The
     frame is then held at the top of the screen over a stretch of page while
     the camera comes down, and the town's lights wait for the landing.
     Decided as soon as the page runs, not at the effects' idle moment: the
     runway lengthens the page, and arriving late it would move the campfire
     out from under a visitor who had already scrolled down to it. */
  const reduce = useReducedMotionPref();
  const capable = useRoomForEffects();
  const fly = FLIGHT !== null && capable && !reduce;
  const runway = useRef<HTMLDivElement>(null);
  const flightF3 = useRef<HTMLParagraphElement>(null);
  const [landed, setLanded] = useState(true);
  /* Landing in the live map, on a wide screen: past halfway down, the viewer
     is woken behind the flight, loading and drawing nothing (standby), and
     at the landing it takes over from the still at the very view the flight
     ends on, alive (water moving, the crew walking). It stays glass until the
     lantern is pressed, so the wheel still scrolls the page past it; climbing
     back up puts it to sleep behind the flight again. `auto` is that viewer,
     woken by the flight and not yet taken hold of. */
  const [auto, setAuto] = useState(false);
  const standby = live && auto && !landed;
  const shown = live && !standby;
  /* coming down: the way into the live map stands aside until the camera lands */
  const flying = fly && !shown && !landed;
  /* where the camera is, for the locator bar, told by the flight and by the live map */
  const cameraSink = useRef<CameraSink | null>(null);
  /* the place pointed at, on the rail or by its lantern: the other lights */
  const [near, setNear] = useState<number | null>(null);
  const lit = reached && effects && landed;

  /* The rooms' code is fetched once the browser is truly idle, so a door
     opens at once later and the first seconds, when a slow phone is still
     drawing the hero, pay nothing for rooms nobody has opened. */
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void };
    const warm = () => { import('@/components/board/Board'); import('./Crew'); import('./Shelf'); };
    if (w.requestIdleCallback) { const id = w.requestIdleCallback(warm); return () => w.cancelIdleCallback?.(id); }
    const id = setTimeout(warm, 6000);
    return () => clearTimeout(id);
  }, []);

  /* Deila: a place's own link, whose preview in a chat is its postcard
     (src/app/stadur/[id]). On a phone the phone's own share sheet opens,
     straight to Messenger or Discord; elsewhere the link is copied and the
     toast says so. */
  const share = useCallback(async (id: number, title: string) => {
    const url = `${window.location.origin}/stadur/${id}#heimur`;
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share && matchMedia('(pointer: coarse)').matches) {
      try { await nav.share({ title: `${title} · ${SITE_NAME}`, url }); return; }
      catch (e) { if ((e as DOMException)?.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); toast('Afritað', `hlekkur á ${title}`); }
    catch { window.prompt('Afritaðu hlekkinn:', url); }
  }, []);

  const choose = useCallback((id: number) => {
    setSelect(cur => (cur === id ? null : id));
    revealRailItem(id, places.current);
  }, [places]);

  const jod = useCallback((): JodViewer | null => {
    try {
      const w = viewRef.current?.contentWindow as (Window & { jod?: JodViewer }) | null | undefined;
      return w?.jod?.ready ? w.jod : null;
    } catch { return null; }
  }, []);

  /* A head in the HUD, pressed while the 3D map runs: the camera keeps with
     that player, and a second press (or a drag of the map) lets go. */
  const follow = useCallback((name: string) => {
    const v = jod();
    if (!v) return;
    if (following?.toLowerCase() === name.toLowerCase()) { v.unfollow(); return; }
    const r = v.follow(name);
    setFollowNote(r === 'outside' ? `${name} er utan kortsins` : r === 'missing' ? `${name} sést ekki á kortinu` : null);
  }, [jod, following]);
  useEffect(() => {
    if (!followNote) return;
    const t = setTimeout(() => setFollowNote(null), 4000);
    return () => clearTimeout(t);
  }, [followNote]);

  /* What the viewer says: that it is there, how far the first view has come,
     that it is drawn, night and day, and a place's lantern pressed in 3D. */
  const standbyRef = useRef(standby);
  standbyRef.current = standby;
  useEffect(() => {
    if (!live) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== viewRef.current?.contentWindow) return;
      const m = e.data as ViewerMessage | null;
      if (m?.source !== 'jod-map') return;
      if (m.type === 'hello') setViewer(true);
      else if (m.type === 'progress') setTiles(m.tiles ?? 0);
      else if (m.type === 'camera' && typeof m.x === 'number' && typeof m.y === 'number' && typeof m.z === 'number') {
        setCamera({ x: m.x, y: m.y, z: m.z, facing: m.facing ?? 'north' });
        /* asleep behind the flight, the viewer's camera is not the one on screen */
        if (typeof m.rotation === 'number' && !standbyRef.current) cameraSink.current?.([m.ex ?? m.x, m.ez ?? m.z], headingOf(m.rotation));
      }
      else if (m.type === 'ready') setReady(true);
      else if (m.type === 'night') setNight(!!m.on);
      else if (m.type === 'menu') setMenu(!!m.open);
      else if (m.type === 'place' && typeof m.id === 'number') { setSelect(m.id); revealRailItem(m.id, places.current); }
      else if (m.type === 'follow') {
        setFollowing(m.name ?? null);
        if (m.outside) setFollowNote(`${m.outside} fór út fyrir kortið`);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  // places is a ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  /* The chosen place, in 3D: the camera flies to it only if it stands on this
     map's rendered ground. A place at another base, or out past the edge of
     the render, would send it over nothing; that place's postcard opens the
     map that has it instead, if one does. */
  useEffect(() => {
    /* asleep behind the flight, the viewer holds the start view the flight lands on */
    if (!viewer || standby) return;
    const loc = config.locations.find(l => l.id === selected);
    if (loc?.world && mapAt(bases, MAIN_BOUNDS, loc.world) === 'main') jod()?.flyTo(loc.world, loc.id);
    else jod()?.choose(null);
  }, [viewer, standby, selected, config.locations, bases, jod]);

  /* The viewer draws nothing while nobody can see it: scrolled away, under a
     room, the album or the painted map. */
  useEffect(() => {
    const el = frameRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    /* by ratio: a frame whose edge only touches the viewport counts as intersecting */
    const io = new IntersectionObserver(([entry]) => setInView(entry.intersectionRatio >= 0.02), { threshold: [0, 0.02] });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  /* How far down the frame the title and the tools reach, so the postcard
     stops short of them (--hud-bottom in badlands.css). On a phone they are
     a third of the frame, and the card would otherwise cover the buttons. */
  useEffect(() => {
    const frame = frameRef.current;
    const top = hudTop.current;
    if (!frame || !top || !('ResizeObserver' in window)) return;
    const measure = () => {
      const reach = top.getBoundingClientRect().bottom - frame.getBoundingClientRect().top;
      frame.style.setProperty('--hud-bottom', `${Math.max(0, Math.round(reach))}px`);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    ro.observe(top);
    return () => ro.disconnect();
  }, []);

  /* On a phone the map is only live as the whole screen: back in the page it
     is a still again, so a thumb scrolls the page, and the lantern reopens it. */
  const still = phone && !full;
  const hidden = !inView || shut || album || drawn || still || standby;
  useEffect(() => { if (viewer) jod()?.pause(hidden); }, [viewer, hidden, jod]);

  /* The viewer says when its first view is drawn, which is usually well under
     a second. Should it not have said so in four (a slow texture download, or
     a viewer without JOÐ's script), it is shown anyway and fills in live. The
     loading line only appears if the wait is long enough to notice. */
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!live || ready) return;
    const show = setTimeout(() => setReady(true), 4000);
    const note = setTimeout(() => setSlow(true), 700);
    return () => { clearTimeout(show); clearTimeout(note); };
  }, [live, ready]);

  /* ─── the whole screen ─── */
  const openFull = useCallback(() => {
    setAuto(false);
    setLive(true);
    const el = frameRef.current;
    if (el?.requestFullscreen && document.fullscreenEnabled) {
      el.requestFullscreen({ navigationUI: 'hide' }).then(() => setFull('native')).catch(() => {
        setFull('overlay');
        window.history.pushState({ ...window.history.state, jodFull: true }, '');
      });
    } else {
      setFull('overlay');
      window.history.pushState({ ...window.history.state, jodFull: true }, '');
    }
  }, []);
  const closeFull = useCallback(() => {
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
    if ((window.history.state as { jodFull?: boolean } | null)?.jodFull) window.history.back();
    else setFull(false);
  }, []);
  useEffect(() => {
    if (!full) return;
    const onFs = () => { if (!document.fullscreenElement && full === 'native') setFull(false); };
    const onPop = () => { if (full === 'overlay' && !(window.history.state as { jodFull?: boolean } | null)?.jodFull) setFull(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && full === 'overlay' && !modalOpen()) closeFull(); };
    document.addEventListener('fullscreenchange', onFs);
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    document.documentElement.classList.toggle('is-map-full', full === 'overlay');
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('is-map-full');
    };
  }, [full, closeFull]);

  /* Escape lets the place go, unless something is open over the postcard:
     the album, a room. That one closes first, and the place stays picked. */
  useEffect(() => {
    if (selected === null || album || shut) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !modalOpen()) setSelect(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, album, shut]);

  const chosen = config.locations.find(l => l.id === selected) ?? null;
  /* the postcard stays up a beat after its place is let go, to leave the way it came */
  const { shown: place, leaving, settle } = useLinger(chosen && !shut ? chosen : null);
  const plate = place?.photoId ? plates.find(p => p.id === place.photoId) ?? null : null;
  const lower = server.list.map(n => n.toLowerCase());
  const inside = CREW.filter(n => lower.includes(n.toLowerCase()));
  /* heads can be followed while the live 3D map is on screen */
  const canFollow = viewer && shown && !drawn && !still;
  /* and pressed only while no room's dark lies over them: the follow itself goes on under the room */
  const headsLive = canFollow && !shut;
  useEffect(() => { if (!canFollow && following) jod()?.unfollow(); }, [canFollow, following, jod]);
  const here = place ? pinned[String(place.id)] ?? null : null;
  /* the 3D map that shows the chosen place: this one, a base's own, or none */
  const seen = place?.world ? mapAt(bases, MAIN_BOUNDS, place.world) : null;
  const atBase = seen !== null && seen !== 'main' ? seen : null;
  /* the places pinned on the still and the flight: those on this map's ground */
  const grounded = useMemo<FlightPlace[]>(() => config.locations.flatMap(l =>
    l.world && mapAt(bases, MAIN_BOUNDS, l.world) === 'main' ? [{ id: l.id, label: l.label, world: l.world }] : []), [config.locations, bases]);
  /* who is where: the crew in the overworld, while the world is in view; on
     the land itself only those standing on its rendered ground, the rest
     are on the locator bar alone */
  const players = useLivePlayers(inView && !shut, CREW);
  const onLand = useMemo(() => players.filter(p => !MAIN_BOUNDS || onMap(MAIN_BOUNDS, p)), [players]);
  /* The live map, taken hold of: from the lantern, the postcard or the whole
     screen. A viewer the flight woke is the same one, now let go of as glass. */
  const takeHold = useCallback(() => { setAuto(false); setLive(true); }, []);
  /* past halfway down on a wide screen: wake the live map behind the flight */
  const liveRef = useRef(live);
  liveRef.current = live;
  const approach = useCallback(() => {
    if (liveRef.current || window.matchMedia('(max-width: 899px)').matches) return;
    setAuto(true);
    setLive(true);
  }, []);
  const pointAt = useCallback((id: number | null) => {
    setNear(id);
    if (id !== null) revealRailItem(id, places.current);
  // places is a ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section id="heimur" className={`b-world${fly ? ' has-flight' : ''}`} aria-labelledby="heimur-title">
      <div ref={frameRef} className={`b-frame${shown ? ' is-live' : ''}${shown && ready ? ' is-ready' : ''}${standby ? ' is-standby' : ''}${shown && auto ? ' is-glass' : ''}${drawn ? ' is-drawn' : ''}${shut ? ' is-room' : ''}${full === 'overlay' ? ' is-full' : ''}${shown && still ? ' is-still' : ''}${menu && ready ? ' is-menu' : ''}${chatOpen ? ' is-chat' : ''}${flying ? ' is-flying' : ''}`}>
        {/* The still and its lights settle together as the world is
            reached, the camera coming down into the valley with the scroll
            (badlands.css). On a device with room for the effects, until the
            live map takes over, and not under reduced motion. Where the
            flight is flown, it is the camera coming down instead. */}
        <div className={`b-frame__scene${effects && !live && !fly ? ' is-settling' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {posterOn && <img {...photoProps(MAP_POSTER, PHOTO_SIZES.poster)} className="b-frame__poster" alt="Heimasvæðið á JOÐ séð úr lofti" width={1920} height={1080} decoding="async" fetchPriority="low" />}
        {/* The town's lights come on as the world comes into view: the still
            arrives in the dusk, and its lanterns light one group after
            another (badlands.css). The light is taken off
            the still itself (scripts/map-lights.mjs), a pool round every lamp
            it shows; the live map has its own. Under the frame's shade, so
            the dark at its edges falls on the lamplight too. */}
        {posterOn && effects && MAP_LIGHTS.length > 0 && (
          <div className={`b-frame__town${lit ? ' is-lit' : ''}${reached && effects && !landed ? ' is-dawn' : ''}`} aria-hidden="true">
            <div className="b-frame__dusk" />
            {MAP_LIGHTS.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- a few kB of soft light, drawn at a quarter of the still's size
              <img key={src} src={src} className={`b-frame__lights b-frame__lights--${i + 1}`} alt="" width={480} height={270} decoding="async" fetchPriority="low" />
            ))}
          </div>
        )}
        {/* The flight down, and the places pinned on whatever is showing.
            Once the live map is asked for, the still is what it takes over
            from, and the live map has its own lanterns. */}
        {FLIGHT && posterOn && (
          <Flight flight={FLIGHT} fly={fly && (!live || auto)} runway={runway} f3={flightF3} places={grounded} players={onLand}
            selected={selected} onChoose={choose} near={near} onNear={pointAt} camera={cameraSink}
            hidden={shown || drawn} onLanded={setLanded} onApproach={approach} />
        )}
        </div>

        <div className="b-frame__shade" aria-hidden="true" />

        {/* The viewer lays itself out for the frame (jod-embed in public/bluemap-jod/jod.css)
            and says when its first view is drawn; the still fades out then. */}
        {live && (
          <iframe
            ref={viewRef}
            src={MAP_URL}
            title="Þrívíddarkort af heimasvæðinu"
            className="b-frame__view"
            allow="fullscreen"
          />
        )}

        {drawn && (
          <div className="b-frame__sheet">
            <MapSheet config={config} selectedId={selected} onSelect={choose} />
          </div>
        )}

        {/* the dark that falls over the world while a room is open */}
        <div className="b-frame__dim" aria-hidden="true" onClick={onCloseRoom} />

        <div className="b-hud">
          <div ref={hudTop} className="b-hud__top">
            {/* The way out comes first: on a phone it is the back key at the
                left end of the plank, where the base maps' viewers keep theirs;
                on a wide screen it stands after the tools (badlands.css). */}
            {full && (
              <button ref={back} type="button" className="b-btn b-btn--small b-btn--ghost b-hud__back is-on" aria-label="Loka heilum skjá" onClick={closeFull}>
                <BackIcon className="b-hud__backicon" />
                <CloseIcon className="b-btn__icon b-hud__closeicon" /><span className="b-hud__word" aria-hidden="true">Loka</span>
              </button>
            )}
            <div className="b-hud__title">
              <h2 id="heimur-title" className="b-title">Heimurinn</h2>
              <p className="b-hud__meta">
                {/* on a phone's plank the date stands alone; the words before it are still read out */}
                {syncedOn ? <span><span className="b-hud__lead">eins og hann var </span>{syncedOn}</span> : 'heimasvæðið í þrívídd'}
                {inside.length > 0 && (
                  <span className="b-hud__in">
                    <span className="b-hud__dot" aria-hidden="true" />
                    <span className="b-hud__inword">inni núna</span>
                    {/* the names in words: a label on a bare span is not read */}
                    <span className="b-visually-hidden">: {inside.join(', ')}</span>
                    {inside.map(n => headsLive ? (
                      <button key={n} type="button" className={`b-hud__head b-tip b-tip--below${following?.toLowerCase() === n.toLowerCase() ? ' is-on' : ''}`}
                        aria-pressed={following?.toLowerCase() === n.toLowerCase()} aria-label={`Elta ${n}`}
                        data-tip={following?.toLowerCase() === n.toLowerCase() ? `Hætta að elta ${n}` : `Elta ${n}`}
                        onClick={() => follow(n)}>
                        <PlayerHead name={n} size={16} />
                      </button>
                    ) : <PlayerHead key={n} name={n} size={16} alt="" />)}
                  </span>
                )}
                {canFollow && (following || followNote) && (
                  <span className="b-hud__follow" role="status">{followNote ?? `Eltir ${following}`}</span>
                )}
              </p>
            </div>
            {/* On a phone the tools are slots sunk into one strip, as the hotbar's,
                each a drawn icon with its word kept for screen readers, so they
                never wrap down into the world among the places' name tags
                (badlands.css, the HUD on a phone). */}
            <div ref={tools} className="b-hud__tools">
              {viewer && shown && !drawn && !still && (
                <button type="button" className={`b-btn b-btn--small b-btn--ghost b-hud__tool b-tip b-tip--below${night ? ' is-on' : ''}`} aria-pressed={night}
                  data-tip="Sólin sest og ljósin í bænum loga" onClick={() => jod()?.setNight(!night)}>
                  <MoonIcon className="b-btn__icon" /><span className="b-hud__word">Nótt</span>
                </button>
              )}
              <button type="button" className={`b-btn b-btn--small b-btn--ghost b-hud__tool${drawn ? ' is-on' : ''}`} aria-pressed={drawn}
                onClick={() => setDrawn(v => !v)}>
                <FoldedMapIcon className="b-btn__icon" /><span className="b-hud__word">Teiknað kort</span>
              </button>
              {/* the album hangs over the page, outside the frame the browser's full screen shows */}
              <button type="button" className="b-btn b-btn--small b-btn--ghost b-hud__tool"
                onClick={() => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); setAlbum(true); }}>
                <PictureIcon className="b-btn__icon" /><span className="b-hud__word">Myndir<span className="b-hud__sep"> · </span></span><span className="b-hud__count">{plates.length}</span>
              </button>
              {!full && (
                // eslint-disable-next-line @next/next/no-html-link-for-pages -- BlueMap's own app, not a Next page
                <a href={MAP_URL} className="b-btn b-btn--small b-btn--ghost b-hud__tool" onPointerEnter={warmViewer} onFocus={warmViewer}
                  onClick={e => { if (plainClick(e)) { e.preventDefault(); setDrawn(false); openFull(); } }}>
                  <FullScreenIcon className="b-btn__icon" /><span className="b-hud__word">Heill skjár</span>
                </a>
              )}
            </div>
          </div>

          <div ref={mid} className="b-hud__mid">
            {(!shown || still || auto) && !drawn && (
              /* A link to the viewer, so it is the way in before the page's
                 script has run (the server cannot know a phone, and drew a dead
                 button there). With the script, a wide screen loads the map in
                 the frame; on a phone the frame becomes the whole screen, so the
                 map's drag and pinch never fight the page scroll. */
              // eslint-disable-next-line @next/next/no-html-link-for-pages
              <a href={MAP_URL} className="b-boot" onPointerEnter={warmViewer} onTouchStart={warmViewer} onFocus={warmViewer}
                onClick={e => { if (plainClick(e)) { e.preventDefault(); if (phone) openFull(); else takeHold(); } }}>
                <Signpost here={shown && auto && ready} />
              </a>
            )}
            {shown && !ready && !still && slow && (
              <p className="b-boot__wait" role="status">
                sæki kortið{tiles > 0 ? ` · ${tiles} ${plural(tiles, 'reitur', 'reitir')}` : '…'}
              </p>
            )}
          </div>
        </div>

        {/* the locator bar: the other bases and the crew, by where they stand from the way the camera faces */}
        <Locator bases={bases} players={players} sink={cameraSink} hidden={drawn || shut || (menu && ready)} />

        {place && (
            <figure
              key={place.id}
              className={`b-card b-paper${leaving ? ' is-leaving' : ''}`}
              onAnimationEnd={e => { if (leaving && e.target === e.currentTarget) settle(); }}
              aria-live="polite"
            >
              {plate ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img {...photoProps(plate.src, PHOTO_SIZES.card)} alt={plate.title} loading="lazy" decoding="async" width={560} height={350} />
              ) : (
                /* a postcard not yet painted: the evening's sun over the ridge, in faint ink */
                <div className="b-card__empty" aria-hidden="true">
                  <svg className="b-card__emptyridge" viewBox="0 0 64 40" preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges">
                    <path d="M0 40V30H8V26H18V30H26V22H36V28H44V24H52V30H64V40Z" fill="currentColor" />
                  </svg>
                  <span className="b-card__emptysun"><Sun /></span>
                  <span className="b-card__emptytext">engin mynd enn</span>
                </div>
              )}
              <figcaption className="b-card__cap">
                <span>
                  <b className="b-card__name">{titleCase(place.label)}</b>
                  {place.sublabel && <span className="b-card__sub">{handCase(place.sublabel).replace(/\s*·\s*/g, ', ')}</span>}
                  {place.builders && place.builders.length > 0 && (
                    <span className="b-card__builders">byggt af {place.builders.map((b, i) => <span key={b}>{i > 0 && ', '}<Link href={`/crew/${b}`}>{b}</Link></span>)}</span>
                  )}
                </span>
                <span className="b-card__tools">
                  <button type="button" className="b-btn b-btn--small b-btn--ghost b-card__share" onClick={() => share(place.id, titleCase(place.label))}>Deila</button>
                  <button type="button" className="b-card__x" onClick={() => setSelect(null)} aria-label="Loka póstkortinu"><CloseIcon /></button>
                </span>
              </figcaption>
              {/* a place on this map's ground can be visited here, one at another
                  base in that base's own map, and one in neither has no 3D to offer */}
              {atBase ? (
                // eslint-disable-next-line @next/next/no-html-link-for-pages -- BlueMap's own app, not a Next page
                <a href={baseUrl(atBase.id)} className="b-btn b-btn--small b-btn--solid b-card__fly">
                  <Lantern lit /> {atBase.name} í þrívídd
                </a>
              ) : seen === 'main' && (!viewer || still || auto) && !drawn && (
                <button type="button" className="b-btn b-btn--small b-btn--solid b-card__fly" onPointerEnter={warmViewer} onFocus={warmViewer}
                  onClick={() => (phone ? openFull() : takeHold())}>
                  <Lantern lit /> Sjá staðinn í þrívídd
                </button>
              )}
              {/* what the crew pinned here, each print a tap from its wall */}
              {here && here.prints.length > 0 && (
                <div className="b-card__prints" role="group" aria-label="Myndir félaga af þessum stað">
                  {here.prints.slice(0, 4).map(p => (
                    <Link key={p.id} href={`/crew/${p.username}#${p.entryId}`} className="b-card__print" aria-label={`${p.username}${p.caption ? `: ${p.caption}` : ''}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img {...photoProps(p.filename, PHOTO_SIZES.thumb)} alt={p.caption || `Mynd frá ${p.username}`} loading="lazy" decoding="async" width={56} height={40} />
                      <PlayerHead name={p.username} size={16} className="b-card__printhead" />
                    </Link>
                  ))}
                  <span className="b-card__more">{here.count} {plural(here.count, 'færsla', 'færslur')} af veggjum</span>
                </div>
              )}
            </figure>
        )}

        {/* The places: a rail along the foot of the world, each with its photo,
            and at its end the other bases, each a lit lantern that leads to a
            3D map of its own (/kort/<id>): places too, only further off. */}
        <div ref={places} className="b-places">
          {/* Spjallið: the game's chat over the world, in the corner it keeps
              over the hotbar, here the places' rail (Chat.tsx) */}
          <Chat active={reached && !shut} covered={place !== null || drawn || shut || album || (menu && ready)} server={server} onOpen={setChatOpen} />
          {/* The F3 lines while the camera comes down: where it is and the
              way it faces, written by Flight.tsx as it moves. */}
          {fly && (
            <p ref={flightF3} className="b-f3" aria-hidden="true" hidden>
              <span />
              <span />
            </p>
          )}
          {/* The game's F3 lines while the live map is up: the block the map
              holds and the way it faces, as a player reads them to find the
              same spot in the game, each line on its own veil of dark. */}
          {camera && shown && ready && !still && !drawn && (
            <p className="b-f3">
              {/* said as a sentence; a label on a paragraph is not read */}
              <span className="b-visually-hidden">Kortið horfir á {camera.x}, {camera.y}, {camera.z} og snýr í {FACING[camera.facing] ?? camera.facing}</span>
              <span aria-hidden="true">XYZ: {camera.x} / {camera.y} / {camera.z}</span>
              <span aria-hidden="true">Snýr í {FACING[camera.facing] ?? camera.facing}</span>
            </p>
          )}
          {/* a count, as the shelf counts its crates: each base's own tag already says it has its own map, and the rail's order says where */}
          <p className="b-places__head">{config.locations.length} {plural(config.locations.length, 'staður', 'staðir')}{bases.length > 0 && ` og ${bases.length} ${plural(bases.length, 'stöð', 'stöðvar')}`}</p>
          <Rail label="Staðir og stöðvar" prevLabel="Fyrri staðir" nextLabel="Næstu staðir" count={config.locations.length + bases.length}>
            {config.locations.map(loc => {
              const thumb = loc.photoId ? plates.find(p => p.id === loc.photoId) ?? null : null;
              const count = pinned[String(loc.id)]?.count ?? 0;
              return (
                <button key={loc.id} type="button" data-rail-item={loc.id}
                  className={`b-chip${woodClass(loc.wood)}${loc.id === selected ? ' is-on' : ''}${loc.id === near ? ' is-near' : ''}`} aria-pressed={loc.id === selected} onClick={() => choose(loc.id)}
                  onPointerEnter={e => { if (e.pointerType === 'mouse') setNear(loc.id); }} onPointerLeave={e => { if (e.pointerType === 'mouse') setNear(null); }}
                  onFocus={() => setNear(loc.id)} onBlur={() => setNear(null)}>
                  {/* a label on a bare span is not read; the count is spoken as words instead */}
                  {count > 0 && <><span className="b-chip__count" aria-hidden="true">{count}</span><span className="b-visually-hidden">{`${count} ${plural(count, 'færsla', 'færslur')} frá hópnum, `}</span></>}
                  <span className="b-chip__thumb">
                    {thumb
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img {...photoProps(thumb.src, PHOTO_SIZES.thumb)} alt="" loading="lazy" decoding="async" width={56} height={40} />
                      : <span className="b-chip__thumb--empty" aria-hidden="true" />}
                  </span>
                  <span className="b-chip__text">
                    <span className="b-chip__name">{titleCase(loc.label)}</span>
                    {loc.sublabel && <span className="b-chip__sub">{handCase(loc.sublabel).replace(/\s*·\s*/g, ', ')}</span>}
                  </span>
                </button>
              );
            })}
            {bases.map(b => (
              // eslint-disable-next-line @next/next/no-html-link-for-pages -- BlueMap's own app, not a Next page
              <a key={b.id} href={baseUrl(b.id)} className="b-chip b-chip--base" data-rail-item={`base-${b.id}`}>
                <span className="b-chip__thumb b-chip__thumb--lantern"><Lantern lit /></span>
                <span className="b-chip__text">
                  <span className="b-chip__name">{b.name}</span>
                  <span className="b-chip__sub">eigið þrívíddarkort</span>
                </span>
              </a>
            ))}
          </Rail>
        </div>

        {/* The three rooms. Each rises from the foot of the frame over the world. */}
        <Drawer id="taflan" open={room === 'taflan'} title="Taflan" note="allt sem gerist á JOÐ, nýjast efst" onClose={onCloseRoom}>
          {visited.taflan && <Board room open={room === 'taflan'} />}
        </Drawer>
        <Drawer id="hopur" open={room === 'hopur'} title="Eftirlýst" note="átta vinir, einn heimur · þrjú efstu í hverjum flokki, beint úr leiknum" onClose={onCloseRoom}>
          {visited.hopur && <Crew server={server} />}
        </Drawer>
        <Drawer id="hillan" open={room === 'hillan'} title="Á hillunni" note="gagnapakkarnir sem eru uppsettir á þjóninum" onClose={onCloseRoom}>
          {visited.hillan && <Shelf version={server.version} />}
        </Drawer>
      </div>
      {/* the stretch of page the frame is held over while the camera comes down */}
      {fly && <div ref={runway} className="b-world__runway" aria-hidden="true" />}

      {album && <Album plates={plates} onClose={closeAlbum} />}
    </section>
  );
}

export default memo(World);
