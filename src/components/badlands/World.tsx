'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import type { MapConfig } from '@/lib/map-types';
import { DEFAULT_CONFIG } from '@/lib/map-types';
import { Lantern } from './Bits';
import Drawer from './Drawer';
import PlayerHead from './PlayerHead';
import Rail, { revealRailItem } from './Rail';
import { CREW, MAP_POSTER, MAP_URL, handCase, titleCase, type Plate, type RoomId } from './data';
import type { ServerState } from './hooks';
import { useMediaQuery, useReducedMotionPref } from './hooks';
import { SPRING } from './motion';
import { photoProps, PHOTO_SIZES } from './photo';

/* Everything that opens over the world is a screen of its own, fetched when
   its door is first opened: the paper sheet, the album, and the two rooms. */
const MapSheet = dynamic(() => import('./MapSheet'), { ssr: false });
const Album    = dynamic(() => import('./Album'),    { ssr: false });
const Crew     = dynamic(() => import('./Crew'),     { ssr: false });
const Shelf    = dynamic(() => import('./Shelf'),    { ssr: false });

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
    lantern is pressed. The places hang along the foot with their photos, the
    painted map lays over the same frame, the album opens on top, and the two
    rooms of the evening (the crew, the shelf) rise from the foot of the frame
    when their door is opened, leaving the world in view above them. */
function World({ plates, server, syncedOn, room, onCloseRoom }: Props) {
  const [config, setConfig]   = useState<MapConfig>(DEFAULT_CONFIG);
  const [selected, setSelect] = useState<number | null>(null);
  const [drawn, setDrawn]     = useState(false);
  const [album, setAlbum]     = useState(false);
  const [live, setLive]       = useState(false);
  const [ready, setReady]     = useState(false);
  /* A room stays mounted once it has been opened, so its fetches happen once. */
  const [visited, setVisited] = useState<Record<RoomId, boolean>>({ hopur: false, hillan: false });
  const places = useRef<HTMLDivElement>(null);
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
      })
      .catch(() => {});
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
  }, []);

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
  /* While a room is open, the world's own controls are out of reach. */
  const shut = room !== null;

  return (
    <section id="heimur" className="b-world" aria-labelledby="heimur-title">
      <div className={`b-frame${live ? ' is-live' : ''}${ready ? ' is-ready' : ''}${drawn ? ' is-drawn' : ''}${shut ? ' is-room' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img {...photoProps(MAP_POSTER, PHOTO_SIZES.poster)} className="b-frame__poster" alt="Heimasvæðið á JOÐ séð úr lofti" width={1920} height={1080} loading="lazy" decoding="async" />
        <div className="b-frame__shade" aria-hidden="true" />

        {live && (
          <iframe
            src={MAP_URL}
            title="Þrívíddarkort af heimasvæðinu"
            className="b-frame__view"
            onLoad={e => {
              /* The viewer is served from this site, so its document can be reached:
                 its control bar and zoom buttons are moved clear of the HUD. */
              try {
                const doc = e.currentTarget.contentDocument;
                if (doc && !doc.getElementById('jod-hud')) {
                  const style = doc.createElement('style');
                  style.id = 'jod-hud';
                  style.textContent = '.control-bar { top: 4.5rem !important; } #zoom-buttons { bottom: 8rem !important; }';
                  doc.head.appendChild(style);
                }
              } catch { /* not ours to touch after all */ }
              setReady(true);
            }}
            allow="fullscreen"
            allowFullScreen
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
            <div
              className="b-hud__tools"
              // @ts-expect-error inert is not in React 18's types yet
              inert={shut ? '' : undefined}
            >
              <button type="button" className={`b-btn b-btn--small b-btn--ghost${drawn ? ' is-on' : ''}`} aria-pressed={drawn} onClick={() => setDrawn(v => !v)}>Teiknað kort</button>
              <button type="button" className="b-btn b-btn--small b-btn--ghost" onClick={() => setAlbum(true)}>Myndir · {plates.length}</button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- BlueMap's own app, not a Next page */}
              <a href={MAP_URL} className="b-btn b-btn--small b-btn--ghost">Heill skjár</a>
            </div>
          </div>

          <div
            className="b-hud__mid"
            // @ts-expect-error inert is not in React 18's types yet
            inert={shut ? '' : undefined}
          >
            {!live && !drawn && (
              phone ? (
                // eslint-disable-next-line @next/next/no-html-link-for-pages
                <a href={MAP_URL} className="b-boot">
                  <Lantern lit />
                  <span className="b-boot__word">Ferðast um heiminn</span>
                  <span className="b-boot__sub">opnar þrívíddarkortið á heilum skjá</span>
                </a>
              ) : (
                <button type="button" className="b-boot" onClick={() => setLive(true)}>
                  <Lantern lit />
                  <span className="b-boot__word">Ferðast um heiminn</span>
                  <span className="b-boot__sub">hleður þrívíddarkortið · dragðu, snúðu, stækkaðu</span>
                </button>
              )
            )}
            {live && !ready && <p className="b-boot__wait" role="status">sæki kortið…</p>}
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
                </span>
                <button type="button" className="b-card__x" onClick={() => setSelect(null)} aria-label="Loka">✕</button>
              </figcaption>
            </motion.figure>
          )}
        </AnimatePresence>

        {/* The places: a rail along the foot of the world, each with its photo. */}
        <div
          ref={places}
          className="b-places"
          // @ts-expect-error inert is not in React 18's types yet
          inert={shut ? '' : undefined}
        >
          <p className="b-places__head">Staðir · {config.locations.length} · veldu stað til að sjá myndina</p>
          <Rail label="Staðir" prevLabel="Fyrri staðir" nextLabel="Næstu staðir" count={config.locations.length}>
            {config.locations.map(loc => {
              const thumb = loc.photoId ? plates.find(p => p.id === loc.photoId) ?? null : null;
              return (
                <button key={loc.id} type="button" data-rail-item={loc.id}
                  className={`b-chip${loc.id === selected ? ' is-on' : ''}`} aria-pressed={loc.id === selected} onClick={() => choose(loc.id)}>
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
        <Drawer id="hopur" open={room === 'hopur'} title="Hópurinn" note="átta vinir, einn heimur, frá sumrinu 2024" onClose={onCloseRoom}>
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
