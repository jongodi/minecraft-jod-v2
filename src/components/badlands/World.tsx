'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import type { MapConfig } from '@/lib/map-types';
import { DEFAULT_CONFIG } from '@/lib/map-types';
import { ArrowIcon, Lantern } from './Bits';
import PlayerHead from './PlayerHead';
import { CREW, MAP_POSTER, MAP_URL, handCase, titleCase, type Plate } from './data';
import type { ServerState } from './hooks';
import { useMediaQuery, useReducedMotionPref } from './hooks';
import { SPRING } from './motion';
import { photoProps, PHOTO_SIZES } from './photo';

/* The paper sheet and the album are each a screen of their own; neither is
   needed until its button is pressed. */
const MapSheet = dynamic(() => import('./MapSheet'), { ssr: false });
const Album    = dynamic(() => import('./Album'),    { ssr: false });

interface Props { plates: Plate[]; server: ServerState; syncedOn: string | null }

/** Dusk: the world is the page. BlueMap fills the viewport under the mesas,
    opening as a still of the home area; the viewer itself boots only when the
    lantern is pressed. The places hang along the bottom with their photos, the
    painted map lays over the same frame, and the album opens on top. */
function World({ plates, server, syncedOn }: Props) {
  const [config, setConfig]   = useState<MapConfig>(DEFAULT_CONFIG);
  const [selected, setSelect] = useState<number | null>(null);
  const [drawn, setDrawn]     = useState(false);
  const [album, setAlbum]     = useState(false);
  const [live, setLive]       = useState(false);
  const [ready, setReady]     = useState(false);
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
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

  /* Which end of the rail we are at: the arrows and the dark falloff read it.
     Sampled once per frame and only committed when it changed. */
  const raf = useRef(0);
  const measure = useCallback(() => {
    raf.current = 0;
    const el = rail.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    /* the rail pads by 3px and snap parks the first chip past it, so the ends are a few px wide */
    const next = { start: el.scrollLeft <= 6, end: el.scrollLeft >= max - 6 };
    setEdges(prev => (prev.start === next.start && prev.end === next.end ? prev : next));
  }, []);
  const onRailScroll = useCallback(() => { if (!raf.current) raf.current = requestAnimationFrame(measure); }, [measure]);
  useEffect(() => {
    measure();
    window.addEventListener('resize', onRailScroll, { passive: true });
    return () => { window.removeEventListener('resize', onRailScroll); cancelAnimationFrame(raf.current); raf.current = 0; };
  }, [measure, onRailScroll, config.locations.length]);
  /* A mouse wheel has no sideways: over the rail, its up and down walk the places. */
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const at = el.scrollLeft;
      if ((e.deltaY < 0 && at <= 0) || (e.deltaY > 0 && at >= max)) return;
      e.preventDefault();
      el.scrollLeft = at + e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  const nudge = (dir: 1 | -1) => {
    const el = rail.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' });
  };

  const choose = useCallback((id: number) => {
    setSelect(cur => (cur === id ? null : id));
    const chip = rail.current?.querySelector<HTMLElement>(`[data-place="${id}"]`);
    chip?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
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

  return (
    <section id="heimur" className="b-world" aria-labelledby="heimur-title">
      <div className={`b-frame${live ? ' is-live' : ''}${ready ? ' is-ready' : ''}${drawn ? ' is-drawn' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img {...photoProps(MAP_POSTER, PHOTO_SIZES.poster)} className="b-frame__poster" alt="Heimasvæðið á JOÐ séð úr lofti" width={1920} height={1080} decoding="async" fetchPriority="low" />
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
            <div className="b-hud__tools">
              <button type="button" className={`b-btn b-btn--small b-btn--ghost${drawn ? ' is-on' : ''}`} aria-pressed={drawn} onClick={() => setDrawn(v => !v)}>Teiknað kort</button>
              <button type="button" className="b-btn b-btn--small b-btn--ghost" onClick={() => setAlbum(true)}>Myndir · {plates.length}</button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- BlueMap's own app, not a Next page */}
              <a href={MAP_URL} className="b-btn b-btn--small b-btn--ghost">Heill skjár</a>
            </div>
          </div>

          <div className="b-hud__mid">
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
          {place && (
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
      </div>

      {/* The places. Inside the frame on desktop, under it on phones: one node, moved by CSS. */}
      <div className="b-places">
        <p className="b-places__head">Staðir · {config.locations.length} · veldu stað til að sjá myndina</p>
        <div className="b-railwrap">
        <div ref={rail} onScroll={onRailScroll} className={`b-rail${edges.start ? ' at-start' : ''}${edges.end ? ' at-end' : ''}`}>
          {config.locations.map(loc => {
            const thumb = loc.photoId ? plates.find(p => p.id === loc.photoId) ?? null : null;
            return (
              <button key={loc.id} type="button" data-place={loc.id}
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
        </div>
        <button type="button" className="b-railwrap__arrow b-railwrap__arrow--l" onClick={() => nudge(-1)} disabled={edges.start} aria-label="Fyrri staðir"><ArrowIcon flip /></button>
        <button type="button" className="b-railwrap__arrow b-railwrap__arrow--r" onClick={() => nudge(1)}  disabled={edges.end}   aria-label="Næstu staðir"><ArrowIcon /></button>
        </div>
      </div>

      {album && <Album plates={plates} onClose={() => setAlbum(false)} />}
    </section>
  );
}

export default memo(World);
