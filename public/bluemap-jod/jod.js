/* JOÐ's part of the BlueMap viewer, loaded by the index.html that
   scripts/bluemap-brand.mjs writes. BlueMap boots on its own; once its map
   has loaded, this

   - keeps the drawing sharp but no heavier than it needs to be: at most two
     device pixels per CSS pixel, and a smaller hires area on phones;
   - holds the camera over the part of the world that is rendered, so nobody
     drifts out into the void;
   - puts the plank with the way back to JOÐ across the top of the full screen
     map, and turns a place's lantern into its postcard;
   - and, inside the home page's frame, answers the page: how far the map has
     come (so the still can hand over once the first tiles are drawn), pausing
     while the frame is out of sight, night and day, and flying to a place.

   The page talks to it through window.jod (same origin); it talks back with
   postMessage({ source: 'jod-map', type, … }). */
(() => {
  'use strict';

  const facts = window.JOD_MAP || {};
  const embedded = window.top !== window;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = matchMedia('(max-width: 899px)').matches;
  const params = new URLSearchParams(location.search);

  /* the hires layer on a phone: 96–127 blocks is 7×7 tiles instead of 9×9 */
  const PHONE_HIRES = 110;
  /* how far past the rendered edge the camera may look before it is held */
  const MARGIN = 48;
  const NIGHT = 0.25;

  const tell = (type, detail) => {
    if (embedded) window.parent.postMessage({ source: 'jod-map', type, ...detail }, location.origin);
  };

  const jod = (window.jod = {
    ready: false,
    night: false,
    paused: false,
    /* set once the map has loaded */
    pause() {},
    setNight() {},
    flyTo() {},
    choose() {},
  });

  /* ─── the plank (full screen only) ─────────────────────────── */

  const ARROW = '<svg viewBox="0 0 8 8" width="14" height="14" shape-rendering="crispEdges" aria-hidden="true" fill="currentColor"><rect x="0" y="3" width="8" height="2"/><rect x="1" y="2" width="2" height="4"/><rect x="2" y="1" width="2" height="6"/><rect x="3" y="0" width="1" height="8"/></svg>';

  /* Written out rather than left to toLocaleDateString, which falls back to
     English wherever the browser carries no Icelandic. Iceland keeps UTC. */
  const MONTHS = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
  const dateIs = (d) => `${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

  function plank() {
    const bar = document.createElement('header');
    bar.id = 'jod-plank';
    const back = document.createElement('a');
    back.className = 'jod-plank__back';
    back.href = '/#heimur';
    back.setAttribute('aria-label', 'Aftur á JOÐ');
    back.innerHTML = `${ARROW}<span>JOÐ</span>`;
    /* came from the site: go back to exactly where the visitor was */
    back.addEventListener('click', (e) => {
      if (document.referrer.startsWith(location.origin) && history.length > 1) {
        e.preventDefault();
        history.back();
      }
    });
    const title = document.createElement('span');
    title.className = 'jod-plank__title';
    title.textContent = 'Heimurinn';
    bar.append(back, title);
    const synced = facts.syncedAt ? new Date(facts.syncedAt) : null;
    if (synced && !Number.isNaN(synced.getTime())) {
      const note = document.createElement('span');
      note.className = 'jod-plank__note';
      note.textContent = `eins og hann var ${dateIs(synced)}`;
      bar.append(note);
    }
    document.body.append(bar);
  }

  /* ─── the places ───────────────────────────────────────────── */

  /* A lantern is BlueMap marker markup (src/lib/bluemap-markers.ts). In the
     frame, a click opens the place's postcard on the page; full screen, the
     first click shows what the place is and the second opens its postcard. */
  document.addEventListener('click', (e) => {
    const pin = e.target instanceof Element ? e.target.closest('.jod-pin') : null;
    if (!pin) return;
    e.preventDefault();
    e.stopPropagation();
    const id = Number(pin.dataset.stadur);
    if (!Number.isFinite(id)) return;
    if (embedded) {
      tell('place', { id });
      return;
    }
    if (pin.classList.contains('is-chosen')) {
      location.href = `/?stadur=${id}#heimur`;
      return;
    }
    jod.choose(id);
  }, true);

  function choose(id) {
    for (const pin of document.querySelectorAll('.jod-pin.is-chosen')) pin.classList.remove('is-chosen');
    if (id === null || id === undefined) return;
    const pin = document.querySelector(`.jod-pin[data-stadur="${Number(id)}"]`);
    if (!pin) return;
    pin.classList.add('is-chosen');
    if (!embedded && !pin.querySelector('.jod-pin__more')) {
      const more = document.createElement('small');
      more.className = 'jod-pin__more';
      more.textContent = 'Smelltu aftur: póstkortið';
      pin.querySelector('.jod-pin__label')?.append(more);
    }
  }

  /* ─── once the map is there ────────────────────────────────── */

  function whenLoaded(cb) {
    const started = Date.now();
    const check = () => {
      const app = window.bluemap;
      if (app?.mapViewer?.map && app.mapViewer.data.mapState === 'loaded') return cb(app);
      if (Date.now() - started < 60000) setTimeout(check, 100);
    };
    check();
  }

  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);

  function animate(duration, frame, done) {
    if (reduce || duration <= 0) { frame(1); done?.(); return; }
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / duration);
      frame(ease(k));
      if (k < 1) requestAnimationFrame(step); else done?.();
    };
    requestAnimationFrame(step);
  }

  function setup(app) {
    const viewer = app.mapViewer;
    const cm = viewer.controlsManager;

    /* Sharp but not wasteful: three device pixels per CSS pixel draw 2.25 times
       the pixels of two, and a Minecraft texture looks the same either way. */
    const cap = Math.min(1, 2 / (window.devicePixelRatio || 1));
    if (viewer.superSampling > cap) viewer.superSampling = cap;
    if (phone && viewer.data.loadedHiresViewDistance > PHONE_HIRES) {
      viewer.data.loadedHiresViewDistance = PHONE_HIRES;
      viewer.updateLoadedMapArea();
    }

    /* Past the edge of the rendered world BlueMap paints its void colour, black
       unless the map says otherwise, which cuts a hard band under the horizon.
       Left at black, it becomes the sky a shade down, so the world stands in
       the evening air instead of on a black shelf. */
    const voidColor = viewer.data.uniforms.voidColor?.value;
    const skyColor = viewer.data.uniforms.skyColor?.value;
    if (voidColor && skyColor && voidColor.r + voidColor.g + voidColor.b < 0.02) {
      voidColor.setRGB(skyColor.r * 0.62, skyColor.g * 0.6, skyColor.b * 0.66);
      viewer.redraw();
    }

    /* Paused, the viewer draws nothing and stops asking for players. */
    const draw = viewer.render.bind(viewer);
    viewer.render = (...args) => { if (!jod.paused) draw(...args); };
    jod.pause = (on) => {
      if (jod.paused === !!on) return;
      jod.paused = !!on;
      for (const manager of [app.playerMarkerManager, app.markerFileManager]) {
        if (!manager) continue;
        if (on) manager.pauseAutoUpdates(); else manager.resumeAutoUpdates();
      }
      if (!on) viewer.redraw();
    };

    /* Night: the sun goes down and the town's own lights are what's left. */
    const sun = viewer.data.uniforms.sunlightStrength;
    jod.setNight = (on, instant) => {
      jod.night = !!on;
      const from = sun.value;
      const to = on ? NIGHT : 1;
      animate(instant ? 0 : 1400, (k) => { sun.value = from + (to - from) * k; viewer.redraw(); });
      tell('night', { on: jod.night });
    };
    if (params.has('kvold')) jod.setNight(true, true);

    /* Fly to a place: the camera's target glides there and comes in close enough to see it. */
    jod.flyTo = (point, id) => {
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z)) return;
      const from = { x: cm.position.x, y: cm.position.y, z: cm.position.z, d: cm.distance };
      const to = { x: point.x + 0.5, y: Number.isFinite(point.y) ? point.y : from.y, z: point.z + 0.5, d: Math.min(from.d, 70) };
      const far = Math.hypot(to.x - from.x, to.z - from.z);
      animate(Math.min(1600, 500 + far * 2), (k) => {
        cm.position.x = from.x + (to.x - from.x) * k;
        cm.position.y = from.y + (to.y - from.y) * k;
        cm.position.z = from.z + (to.z - from.z) * k;
        cm.distance = from.d + (to.d - from.d) * k;
        viewer.redraw();
      });
      if (id !== undefined) jod.choose(id);
    };
    jod.choose = choose;

    /* Keep the camera over the rendered world (a circle render mask gives a round one). */
    const b = facts.bounds;
    if (b) {
      const cx = (b.minX + b.maxX) / 2;
      const cz = (b.minZ + b.maxZ) / 2;
      const rx = (b.maxX - b.minX) / 2 + MARGIN;
      const rz = (b.maxZ - b.minZ) / 2 + MARGIN;
      app.events.addEventListener('bluemapCameraMoved', () => {
        /* the edges are the home map's; another map (a whole-world lowres one, say) roams free */
        if (app.appState?.controls?.state === 'free' || viewer.map?.data?.id !== facts.map) return;
        const p = cm.position;
        const dx = p.x - cx;
        const dz = p.z - cz;
        if (b.shape === 'circle') {
          const d = Math.hypot(dx / rx, dz / rz);
          if (d > 1) { p.x = cx + dx / d; p.z = cz + dz / d; }
        } else {
          if (Math.abs(dx) > rx) p.x = cx + Math.sign(dx) * rx;
          if (Math.abs(dz) > rz) p.z = cz + Math.sign(dz) * rz;
        }
      });
    }

    jod.ready = true;
    tell('hello', {});
    if (embedded) progress(app);
  }

  /* How far the first view has come. The page keeps its still up until the
     tiles around the start have arrived, then fades to the live map. */
  function progress(app) {
    let quiet = 0;
    const started = Date.now();
    const managers = () => {
      const map = app.mapViewer.map;
      return map ? [map.hiresTileManager, ...(map.lowresTileManager || [])].filter(Boolean) : [];
    };
    /* counted off the tile managers rather than their events, which may all
       have fired before this script was listening */
    const drawn = () => managers().reduce((n, m) => {
      let k = 0;
      m.tiles?.forEach((t) => { if (t.model && !t.unloaded) k++; });
      return n + k;
    }, 0);
    const tick = () => {
      const tiles = drawn();
      const busy = managers().reduce((n, m) => n + (m.currentlyLoading || 0), 0);
      quiet = tiles > 0 && busy === 0 ? quiet + 1 : 0;
      tell('progress', { tiles });
      if (quiet >= 2 || Date.now() - started > 9000) {
        /* one more frame so what arrived is on screen before the still goes */
        app.mapViewer.redraw();
        requestAnimationFrame(() => tell('ready', { tiles }));
        return;
      }
      setTimeout(tick, 150);
    };
    tick();
  }

  if (!embedded) plank();
  whenLoaded(setup);
})();
