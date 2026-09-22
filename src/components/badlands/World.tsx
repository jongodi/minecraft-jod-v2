'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import type { MapConfig, WorldPoint } from '@/lib/map-types';
import type { PlacePrints } from '@/app/api/crew/places/route';
import { DEFAULT_CONFIG } from '@/lib/map-types';
import viewerFiles from '@/lib/bluemap-viewer.json';
import { Lantern } from './Bits';
import Drawer from './Drawer';
import PlayerHead from './PlayerHead';
import Rail, { revealRailItem } from './Rail';
import { CREW, MAP_POSTER, MAP_URL, handCase, titleCase, type Plate, type RoomId } from './data';
import type { ServerState } from './hooks';
import { useInert, useMediaQuery, useReducedMotionPref } from './hooks';
import { SPRING } from './motion';
import { photoProps, PHOTO_SIZES } from './photo';

/* Everything that opens over the world is a screen of its own, fetched when
   its door is first opened: the paper sheet, the album, and the two rooms. */
const MapSheet = dynamic(() => import('./MapSheet'), { ssr: false });
const Album    = dynamic(() => import('./Album'),    { ssr: false });
const Crew     = dynamic(() => import('./Crew'),     { ssr: false });
const Shelf    = dynamic(() => import('./Shelf'),    { ssr: false });

/** What public/bluemap-jod/jod.js offers the page, once the viewer's map has loaded. */
interface JodViewer {
  ready: boolean;
  pause: (on: boolean) => void;
  setNight: (on: boolean, instant?: boolean) => void;
  flyTo: (point: WorldPoint, id?: number) => void;
  choose: (id: number | null) => void;
}
type ViewerMessage = { source?: string; type?: string; tiles?: number; id?: number; on?: boolean };

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

/* a plain click: anything with a modifier keeps the link's own meaning (a new tab) */
const plainClick = (e: React.MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

interface Props {
  plates: Plate[];
  server: ServerState;
  syncedOn: string | null;
  /** which room is open over the world, if any */
  room: RoomId | null;
  onCloseRoom: () => void;
}

/** Dusk: the world is the page. BlueMap fills the viewport under the mesas,
    opening as a still of the home area; the viewer itself boots only when the
    lantern is pressed, and the still stays up until the first tiles are drawn.
    The places hang along the foot with their photos; a place with world
    coordinates stands in the 3D map as a lantern, its chip flies the camera
    there and its lantern opens its postcard. The painted map lays over the same
    frame, the album opens on top, and the two rooms of the evening (the crew,
    the shelf) rise from the foot of the frame when their door is opened,
    leaving the world in view above them. *Heill skjár* makes the frame itself
    the whole screen, so nothing reloads; on a phone the lantern does. */
function World({ plates, server, syncedOn, room, onCloseRoom }: Props) {
  const [config, setConfig]   = useState<MapConfig>(DEFAULT_CONFIG);
  const [selected, setSelect] = useState<number | null>(null);
  const [drawn, setDrawn]     = useState(false);
  const [album, setAlbum]     = useState(false);
  const [live, setLive]       = useState(false);
  const [ready, setReady]     = useState(false);
  /* the viewer's map has loaded and window.jod answers */
  const [viewer, setViewer]   = useState(false);
  const [tiles, setTiles]     = useState(0);
  const [night, setNight]     = useState(false);
  /* the frame as the whole screen: the browser's own full screen, or fixed over the page where there is none (iPhone) */
  const [full, setFull]       = useState<false | 'native' | 'overlay'>(false);
  const [inView, setInView]   = useState(true);
  const frameRef = useRef<HTMLDivElement>(null);
  const viewRef  = useRef<HTMLIFrameElement>(null);
  /* A room stays mounted once it has been opened, so its fetches happen once. */
  const [visited, setVisited] = useState<Record<RoomId, boolean>>({ hopur: false, hillan: false });
  /* what the crew pinned at each place, from their walls */
  const [pinned, setPinned]   = useState<Record<string, PlacePrints>>({});
  /* While a room is open, the world's own controls are out of reach. */
  const shut = room !== null;
  const places = useInert<HTMLDivElement>(shut);
  const tools  = useInert<HTMLDivElement>(shut);
  const mid    = useInert<HTMLDivElement>(shut);
  const reduce = useReducedMotionPref();
  /* On phones the viewer opens full screen instead of inside the page, so
     BlueMap's drag and pinch never fight the page scroll. */
  const phone = useMediaQuery('(max-width: 899px)');

  useEffect(() => {
    fetch('/api/map', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((cfg: Partial<MapConfig> | null) => {
        if (!cfg?.locations?.length) return;
        setConfig({ locations: cfg.locations, zones: cfg.zones ?? [], paths: cfg.paths ?? [], terrain: cfg.terrain });
        /* a link from a wall names its place: /?stadur=<id>#heimur */
        const wanted = Number(new URLSearchParams(window.location.search).get('stadur'));
        if (wanted && cfg.locations.some(l => l.id === wanted)) { setSelect(wanted); setTimeout(() => revealRailItem(wanted, places.current), 300); }
      })
      .catch(() => {});
    fetch('/api/crew/places', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((data: Record<string, PlacePrints> | null) => { if (data) setPinned(data); })
      .catch(() => {});
  // places is a ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (room && !visited[room]) setVisited(v => ({ ...v, [room]: true }));
  }, [room, visited]);

  /* The rooms' code is fetched once the page is idle, so a door opens at once. */
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const warm = () => { import('./Crew'); import('./Shelf'); };
    if (w.requestIdleCallback) { const id = w.requestIdleCallback(warm, { timeout: 4000 }); return () => w.cancelIdleCallback?.(id); }
    const id = setTimeout(warm, 2500);
    return () => clearTimeout(id);
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

  /* What the viewer says: that it is there, how far the first view has come,
     that it is drawn, night and day, and a place's lantern pressed in 3D. */
  useEffect(() => {
    if (!live) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== viewRef.current?.contentWindow) return;
      const m = e.data as ViewerMessage | null;
      if (m?.source !== 'jod-map') return;
      if (m.type === 'hello') setViewer(true);
      else if (m.type === 'progress') setTiles(m.tiles ?? 0);
      else if (m.type === 'ready') setReady(true);
      else if (m.type === 'night') setNight(!!m.on);
      else if (m.type === 'place' && typeof m.id === 'number') { setSelect(m.id); revealRailItem(m.id, places.current); }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  // places is a ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  /* The chosen place, in 3D: the camera flies to it if it stands in the world. */
  useEffect(() => {
    if (!viewer) return;
    const loc = config.locations.find(l => l.id === selected);
    if (loc?.world) jod()?.flyTo(loc.world, loc.id);
    else jod()?.choose(null);
  }, [viewer, selected, config.locations, jod]);

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
  /* On a phone the map is only live as the whole screen: back in the page it
     is a still again, so a thumb scrolls the page, and the lantern reopens it. */
  const still = phone && !full;
  const hidden = !inView || shut || album || drawn || still;
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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && full === 'overlay') closeFull(); };
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

  useEffect(() => {
    if (selected === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelect(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const place = config.locations.find(l => l.id === selected) ?? null;
  const plate = place?.photoId ? plates.find(p => p.id === place.photoId) ?? null : null;
  const lower = server.list.map(n => n.toLowerCase());
  const inside = CREW.filter(n => lower.includes(n.toLowerCase()));
  const here = place ? pinned[String(place.id)] ?? null : null;

  return (
    <section id="heimur" className="b-world" aria-labelledby="heimur-title">
      <div ref={frameRef} className={`b-frame${live ? ' is-live' : ''}${ready ? ' is-ready' : ''}${drawn ? ' is-drawn' : ''}${shut ? ' is-room' : ''}${full === 'overlay' ? ' is-full' : ''}${live && still ? ' is-still' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img {...photoProps(MAP_POSTER, PHOTO_SIZES.poster)} className="b-frame__poster" alt="Heimasvæðið á JOÐ séð úr lofti" width={1920} height={1080} decoding="async" fetchPriority="low" />
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
          <div className="b-hud__top">
            <div className="b-hud__title">
              <h2 id="heimur-title" className="b-title">Heimurinn</h2>
              <p className="b-hud__meta">
                {syncedOn ? `eins og hann var ${syncedOn}` : 'heimasvæðið í þrívídd'}
                {inside.length > 0 && (
                  <span className="b-hud__in" aria-label={`inni núna: ${inside.join(', ')}`}>
                    <span className="b-hud__dot" aria-hidden="true" />
                    inni núna
                    {inside.map(n => <PlayerHead key={n} name={n} size={16} />)}
                  </span>
                )}
              </p>
            </div>
            <div ref={tools} className="b-hud__tools">
              {viewer && !drawn && !still && (
                <button type="button" className={`b-btn b-btn--small b-btn--ghost${night ? ' is-on' : ''}`} aria-pressed={night}
                  title="Sólin sest og ljósin í bænum loga" onClick={() => jod()?.setNight(!night)}>Nótt</button>
              )}
              <button type="button" className={`b-btn b-btn--small b-btn--ghost${drawn ? ' is-on' : ''}`} aria-pressed={drawn} onClick={() => setDrawn(v => !v)}>Teiknað kort</button>
              {/* the album hangs over the page, outside the frame the browser's full screen shows */}
              <button type="button" className="b-btn b-btn--small b-btn--ghost" onClick={() => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); setAlbum(true); }}>Myndir · {plates.length}</button>
              {full ? (
                <button type="button" className="b-btn b-btn--small b-btn--ghost is-on" aria-label="Loka heilum skjá" onClick={closeFull}>✕ Loka</button>
              ) : (
                // eslint-disable-next-line @next/next/no-html-link-for-pages -- BlueMap's own app, not a Next page
                <a href={MAP_URL} className="b-btn b-btn--small b-btn--ghost" onPointerEnter={warmViewer} onFocus={warmViewer}
                  onClick={e => { if (plainClick(e)) { e.preventDefault(); setDrawn(false); openFull(); } }}>Heill skjár</a>
              )}
            </div>
          </div>

          <div ref={mid} className="b-hud__mid">
            {(!live || still) && !drawn && (
              phone ? (
                /* On a phone the frame becomes the whole screen, so the map's drag and
                   pinch never fight the page scroll. The link is the way in without script. */
                // eslint-disable-next-line @next/next/no-html-link-for-pages
                <a href={MAP_URL} className="b-boot" onTouchStart={warmViewer} onFocus={warmViewer}
                  onClick={e => { if (plainClick(e)) { e.preventDefault(); openFull(); } }}>
                  <Lantern lit />
                  <span className="b-boot__word">Ferðast um heiminn</span>
                  <span className="b-boot__sub">opnar þrívíddarkortið á heilum skjá</span>
                </a>
              ) : (
                <button type="button" className="b-boot" onPointerEnter={warmViewer} onFocus={warmViewer} onClick={() => setLive(true)}>
                  <Lantern lit />
                  <span className="b-boot__word">Ferðast um heiminn</span>
                  <span className="b-boot__sub">hleður þrívíddarkortið · dragðu, snúðu, stækkaðu</span>
                </button>
              )
            )}
            {live && !ready && !still && slow && (
              <p className="b-boot__wait" role="status">
                sæki kortið{tiles > 0 ? ` · ${tiles} ${tiles === 1 ? 'reitur' : 'reitir'}` : '…'}
              </p>
            )}
          </div>
        </div>

        <AnimatePresence>
          {place && !shut && (
            <motion.figure
              key={place.id}
              className="b-card b-paper"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              transition={reduce ? { duration: 0.15 } : SPRING}
              aria-live="polite"
            >
              {plate ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img {...photoProps(plate.src, PHOTO_SIZES.card)} alt={plate.title} loading="lazy" decoding="async" width={560} height={350} />
              ) : (
                <div className="b-card__empty" aria-hidden="true"><span>engin mynd enn</span></div>
              )}
              <figcaption className="b-card__cap">
                <span>
                  <b className="b-card__name">{titleCase(place.label)}</b>
                  {place.sublabel && <span className="b-card__sub">{handCase(place.sublabel).replace(/\s*·\s*/g, ', ')}</span>}
                  {place.builders && place.builders.length > 0 && (
                    <span className="b-card__builders">byggt af {place.builders.map((b, i) => <span key={b}>{i > 0 && ', '}<Link href={`/crew/${b}`}>{b}</Link></span>)}</span>
                  )}
                </span>
                <button type="button" className="b-card__x" onClick={() => setSelect(null)} aria-label="Loka">✕</button>
              </figcaption>
              {/* a place that stands in the world can be visited there */}
              {place.world && (!viewer || still) && !drawn && (
                <button type="button" className="b-btn b-btn--small b-btn--solid b-card__fly" onPointerEnter={warmViewer} onFocus={warmViewer}
                  onClick={() => (phone ? openFull() : setLive(true))}>
                  <Lantern lit /> Sjá staðinn í þrívídd
                </button>
              )}
              {/* what the crew pinned here, each print a tap from its wall */}
              {here && here.prints.length > 0 && (
                <div className="b-card__prints" aria-label="Myndir félaga af þessum stað">
                  {here.prints.slice(0, 4).map(p => (
                    <Link key={p.id} href={`/crew/${p.username}#${p.entryId}`} className="b-card__print" title={`${p.username}${p.caption ? `: ${p.caption}` : ''}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img {...photoProps(p.filename, PHOTO_SIZES.thumb)} alt={p.caption || `Mynd frá ${p.username}`} loading="lazy" decoding="async" width={56} height={40} />
                      <PlayerHead name={p.username} size={16} className="b-card__printhead" />
                    </Link>
                  ))}
                  <span className="b-card__more">{here.count} {here.count === 1 ? 'færsla' : 'færslur'} af veggjum</span>
                </div>
              )}
            </motion.figure>
          )}
        </AnimatePresence>

        {/* The places: a rail along the foot of the world, each with its photo. */}
        <div ref={places} className="b-places">
          <p className="b-places__head">Staðir · {config.locations.length} · veldu stað til að sjá myndina</p>
          <Rail label="Staðir" prevLabel="Fyrri staðir" nextLabel="Næstu staðir" count={config.locations.length}>
            {config.locations.map(loc => {
              const thumb = loc.photoId ? plates.find(p => p.id === loc.photoId) ?? null : null;
              const count = pinned[String(loc.id)]?.count ?? 0;
              return (
                <button key={loc.id} type="button" data-rail-item={loc.id}
                  className={`b-chip${loc.id === selected ? ' is-on' : ''}`} aria-pressed={loc.id === selected} onClick={() => choose(loc.id)}>
                  {count > 0 && <span className="b-chip__count" aria-label={`${count} færslur frá hópnum`}>{count}</span>}
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
          </Rail>
        </div>

        {/* The two rooms. Each rises from the foot of the frame over the world. */}
        <Drawer id="hopur" open={room === 'hopur'} title="Eftirlýst" note="átta vinir, einn heimur · þrjú efstu í hverjum flokki, beint úr leiknum" onClose={onCloseRoom}>
          {visited.hopur && <Crew server={server} />}
        </Drawer>
        <Drawer id="hillan" open={room === 'hillan'} title="Á hillunni" note="gagnapakkarnir sem eru uppsettir á þjóninum" onClose={onCloseRoom}>
          {visited.hillan && <Shelf version={server.version} />}
        </Drawer>
      </div>

      {album && <Album plates={plates} onClose={() => setAlbum(false)} />}
    </section>
  );
}

export default memo(World);
