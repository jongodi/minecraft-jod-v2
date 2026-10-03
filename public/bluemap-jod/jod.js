/* JOÐ's part of the BlueMap viewer, loaded by the index.html that
   scripts/bluemap-brand.mjs writes. BlueMap boots on its own; once its map
   has loaded, this

   - draws at one of three qualities, Létt, Venjulegt or Mikið, the one
     setting its menu offers in place of BlueMap's sliders; Venjulegt is sharp
     but no heavier than it needs to be, with a smaller hires area on phones;
   - keeps BlueMap's menu to what a visitor uses: the rest is hidden;
   - holds the camera over the part of the world that is rendered, so nobody
     drifts out into the void;
   - puts the plank with the way back to JOÐ across the top of the full screen
     map (named for the base on a base map's viewer, /kort/<id>), and turns a
     place's lantern into its postcard;
   - opens the map at night, the hour the site is set in;
   - and, inside the home page's frame, answers the page: when the first view
     is on screen (so the still can hand over), when its menu is open, pausing
     while the frame is out of sight, night and day, flying to a place, and
     following a player.

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
  const QUALITY_KEY = 'jod-map-quality';
  /* how far past the rendered edge the camera may look before it is held */
  const MARGIN = 48;
  const NIGHT = 0.25;
  const NIGHT_AMBIENT = 0.18;

  const tell = (type, detail) => {
    if (embedded) window.parent.postMessage({ source: 'jod-map', type, ...detail }, location.origin);
  };

  const jod = (window.jod = {
    ready: false,
    night: false,
    flying: false,
    paused: false,
    /* set once the map has loaded */
    pause() {},
    setNight() {},
    flyTo() {},
    choose() {},
    follow() { return 'missing'; },
    unfollow() {},
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
    /* a base map's viewer (/kort/<id>) names its base; the main map is the world */
    title.textContent = facts.title || 'Heimurinn';
    bar.append(back, title);
    const synced = facts.syncedAt ? new Date(facts.syncedAt) : null;
    if (synced && !Number.isNaN(synced.getTime())) {
      const note = document.createElement('span');
      note.className = 'jod-plank__note';
      note.textContent = facts.title ? `teiknað ${dateIs(synced)}` : `eins og hann var ${dateIs(synced)}`;
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

    quality(app);

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
    /* The map opens at night, the hour the site is set in: the town's own
       lights are what's left. BlueMap's night is dark, so the ambient light is
       lifted a little (never lowered) to keep the builds readable. ?dagur opens
       it in daylight. */
    const ambient = viewer.data.uniforms.ambientLight;
    if (ambient && ambient.value < NIGHT_AMBIENT) ambient.value = NIGHT_AMBIENT;
    jod.setNight(!params.has('dagur'), true);

    /* Fly to a place: the camera's target glides there and comes in close enough to see it. */
    jod.flyTo = (point, id, done) => {
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z)) return;
      /* a place chosen while following a player: the place wins */
      if (id !== undefined && id !== null) jod.unfollow();
      const from = { x: cm.position.x, y: cm.position.y, z: cm.position.z, d: cm.distance };
      const to = { x: point.x + 0.5, y: Number.isFinite(point.y) ? point.y : from.y, z: point.z + 0.5, d: Math.min(from.d, 70) };
      const far = Math.hypot(to.x - from.x, to.z - from.z);
      jod.flying = true;
      animate(Math.min(1600, 500 + far * 2), (k) => {
        cm.position.x = from.x + (to.x - from.x) * k;
        cm.position.y = from.y + (to.y - from.y) * k;
        cm.position.z = from.z + (to.z - from.z) * k;
        cm.distance = from.d + (to.d - from.d) * k;
        viewer.redraw();
      }, () => { jod.flying = false; done?.(); });
      if (id !== undefined && id !== null) jod.choose(id);
    };
    jod.choose = choose;

    /* Keep the camera over the rendered world (a circle render mask gives a round one). */
    const b = facts.bounds;
    const inside = b ? (() => {
      const cx = (b.minX + b.maxX) / 2;
      const cz = (b.minZ + b.maxZ) / 2;
      const rx = (b.maxX - b.minX) / 2 + MARGIN;
      const rz = (b.maxZ - b.minZ) / 2 + MARGIN;
      return { cx, cz, rx, rz, has: (x, z) => b.shape === 'circle'
        ? Math.hypot((x - cx) / rx, (z - cz) / rz) <= 1
        : Math.abs(x - cx) <= rx && Math.abs(z - cz) <= rz };
    })() : null;

    /* Follow a player: the camera flies to them and then keeps with them.
       BlueMap lets go by itself when the map is dragged; a player who walks
       out of the rendered world, or leaves the server, is let go here, since
       the camera is held over the rendered world. */
    let following = null;
    const home = () => viewer.map?.data?.id === facts.map;
    const playerNamed = (name) => {
      const set = app.playerMarkerManager?.getPlayerMarkerSet(false);
      if (!set) return null;
      const want = String(name).toLowerCase();
      for (const marker of set.markers.values()) {
        if (marker.visible && String(marker.data.name).toLowerCase() === want) return marker;
      }
      return null;
    };
    const letGo = (why) => {
      if (!following) return;
      const name = following.name;
      following = null;
      cm.controls?.stopFollowingPlayerMarker?.();
      tell('follow', { name: null, ...(why ? { [why]: name } : {}) });
    };
    jod.follow = (name) => {
      const marker = playerNamed(name);
      if (!marker) return 'missing';
      const p = marker.position;
      if (inside && home() && !inside.has(p.x, p.z)) return 'outside';
      if (!cm.controls?.followPlayerMarker) return 'missing';
      letGo();
      following = { name: marker.data.name, marker };
      tell('follow', { name: following.name });
      jod.flyTo({ x: p.x - 0.5, y: p.y, z: p.z - 0.5 }, null, () => {
        if (following?.marker === marker) cm.controls?.followPlayerMarker?.(marker);
      });
      return 'ok';
    };
    jod.unfollow = () => letGo();
    setInterval(() => {
      if (!following) return;
      const set = app.playerMarkerManager?.getPlayerMarkerSet(false);
      if (!set || ![...set.markers.values()].includes(following.marker) || !following.marker.visible) letGo('gone');
    }, 2000);

    app.events.addEventListener('bluemapCameraMoved', () => {
      if (following) {
        const p = following.marker.position;
        if (inside && home() && !inside.has(p.x, p.z)) { letGo('outside'); return; }
        /* dragged away: BlueMap has already let go */
        if (cm.controls?.data && cm.controls.data.followingPlayer === null && !jod.flying) letGo();
      }
      if (!inside) return;
      /* the edges are the home map's; another map (a whole-world lowres one, say) roams free */
      if (app.appState?.controls?.state === 'free' || !home()) return;
      const p = cm.position;
      const dx = p.x - inside.cx;
      const dz = p.z - inside.cz;
      if (b.shape === 'circle') {
        const d = Math.hypot(dx / inside.rx, dz / inside.rz);
        if (d > 1) { p.x = inside.cx + dx / d; p.z = inside.cz + dz / d; }
      } else {
        if (Math.abs(dx) > inside.rx) p.x = inside.cx + Math.sign(dx) * inside.rx;
        if (Math.abs(dz) > inside.rz) p.z = inside.cz + Math.sign(dz) * inside.rz;
      }
    });

    jod.ready = true;
    tell('hello', {});
    if (embedded) progress(app);
  }

  /* ─── quality: the one setting ─────────────────────────────── */

  /* BlueMap offers three resolutions and two view-distance sliders; the menu
     offers one choice instead. hires is the radius of full detail in blocks
     (32-block tiles, so 100 → 7×7, 160 → 11×11, 250 → 15×15), scale the
     device pixels drawn per CSS pixel. Venjulegt draws at most two device
     pixels per CSS pixel: three draw 2.25 times the pixels of two, and a
     Minecraft texture looks the same either way. The choice is kept in the
     browser; BlueMap itself keeps nothing (useCookies is off). */
  const QUALITIES = ['lett', 'venjulegt', 'mikid'];
  const QUALITY_LABEL = { lett: 'Létt', venjulegt: 'Venjulegt', mikid: 'Mikið' };
  const saveQuality = (q) => { try { localStorage.setItem(QUALITY_KEY, q); } catch { /* private mode: kept for this visit only */ } };
  let qualityNow = (() => {
    try { const q = localStorage.getItem(QUALITY_KEY); if (QUALITIES.includes(q)) return q; } catch { /* none */ }
    return 'venjulegt';
  })();
  /* before the map has loaded, a choice is only remembered; quality() applies it */
  let applyQuality = (q) => {
    if (!QUALITIES.includes(q)) return;
    qualityNow = q;
    saveQuality(q);
    tidy();
  };

  function quality(app) {
    const viewer = app.mapViewer;
    const dpr = window.devicePixelRatio || 1;
    const normal = Math.min(1, 2 / dpr);
    const desk = Number(app.settings?.hiresSliderDefault) || 160;
    const table = {
      lett:      { hires: phone ? 70 : 100,          scale: normal / 2 },
      venjulegt: { hires: phone ? PHONE_HIRES : desk, scale: normal },
      mikid:     { hires: phone ? 160 : 250,         scale: Math.min(2, 3 / dpr) },
    };
    applyQuality = (q) => {
      const t = table[q];
      if (!t) return;
      qualityNow = q;
      viewer.superSampling = t.scale;
      viewer.data.loadedHiresViewDistance = t.hires;
      viewer.updateLoadedMapArea();
      viewer.redraw();
      saveQuality(q);
      tidy();
    };
    applyQuality(qualityNow);
  }

  /* ─── the menu: only what a visitor uses ───────────────────── */

  /* Hidden by their labels, which are JOÐ's own (public/bluemap/lang/is.conf),
     so a BlueMap update that moves things around hides the same things, and
     one that renames them only shows them again. Nothing is removed from
     BlueMap's app, only hidden. */
  const HIDE_GROUPS = new Set(['Birta', 'Upplausn', 'Sjónlengd', 'Stjórnun', 'Frjálst flug', 'Útlit', 'Skjámynd', 'Tungumál']);
  const HIDE_BUTTONS = new Set(['Kort', 'Sækja kortið aftur', 'Sýna chunk-mörk', 'Villuleit', 'Endurstilla allt', 'Flug',
    /* in the frame the page has its own */
    ...(embedded ? ['Heill skjár'] : [])]);
  const HIDE_TITLES = ['Frjálst flug um heiminn'];
  const text = (el) => (el?.textContent || '').trim();

  function tidy() {
    const hide = (el) => el && el.classList.add('jod-hidden');
    for (const group of document.querySelectorAll('.side-menu .group')) {
      if (HIDE_GROUPS.has(text(group.querySelector(':scope > .title')))) hide(group);
    }
    for (const button of document.querySelectorAll('.side-menu .simple-button, .side-menu .switch-button')) {
      if (button.closest('.jod-quality')) continue;
      const label = button.querySelector('.label') ?? button;
      if (HIDE_BUTTONS.has(text(label))) hide(button);
    }
    for (const title of HIDE_TITLES) {
      for (const el of document.querySelectorAll(`.control-bar [title="${title}"]`)) hide(el);
    }
    /* in the frame the page's own Nótt is the day and night */
    if (embedded) for (const el of document.querySelectorAll('.control-bar .day-night-switch')) hide(el);
    qualityGroup();
  }

  /* Gæði, in the settings page in place of Upplausn and Sjónlengd, built like BlueMap's own groups. */
  function qualityGroup() {
    const groups = [...document.querySelectorAll('.side-menu .group:not(.jod-quality)')];
    const titled = (t) => groups.find((g) => text(g.querySelector(':scope > .title')) === t);
    /* only on the settings page: the one with Birta, Upplausn and Sjónlengd */
    const first = titled('Birta') ?? titled('Upplausn') ?? titled('Sjónlengd');
    if (!first) return;
    const view = titled('Sjónarhorn');
    let group = first.parentElement.querySelector(':scope > .jod-quality');
    if (!group) {
      group = document.createElement('div');
      group.className = 'group jod-quality';
      const title = document.createElement('span');
      title.className = 'title';
      title.textContent = 'Gæði';
      const content = document.createElement('div');
      content.className = 'content';
      for (const q of QUALITIES) {
        const button = document.createElement('div');
        button.className = 'simple-button';
        button.dataset.quality = q;
        button.setAttribute('role', 'button');
        button.tabIndex = 0;
        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = QUALITY_LABEL[q];
        button.append(label);
        button.addEventListener('click', () => applyQuality(q));
        button.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyQuality(q); } });
        content.append(button);
      }
      const help = document.createElement('p');
      help.className = 'jod-quality__help';
      help.textContent = 'Létt fyrir hægar tölvur og síma, Mikið sýnir meira í fullri upplausn.';
      content.append(help);
      group.append(title, content);
      if (view) view.after(group); else first.before(group);
    }
    for (const button of group.querySelectorAll('[data-quality]')) {
      const on = button.dataset.quality === qualityNow;
      button.classList.toggle('active', on);
      button.setAttribute('aria-pressed', String(on));
    }
  }

  /* BlueMap builds its menu as it opens, page by page, so it is tidied each
     time the app's markup changes (once a frame at most). */
  let tidyQueued = false;
  new MutationObserver(() => {
    if (tidyQueued) return;
    tidyQueued = true;
    requestAnimationFrame(() => { tidyQueued = false; tidy(); });
  }).observe(document.getElementById('app') ?? document.body, { childList: true, subtree: true });

  /* The first view, told to the page: the moment the nearest low-detail layer
     around the start is on screen (or 0.6 seconds after the map has loaded)
     the page swaps its still for the live map, and the detailed tiles stream
     in from there, the way the map always opened. Waiting for every detailed
     tile made opening feel slow. */
  function progress(app) {
    const started = Date.now();
    /* lowresTileManager[0] is the nearest of the low-detail layers */
    const near = () => app.mapViewer.map?.lowresTileManager?.[0] ?? null;
    /* counted off the tile manager rather than its events, which may all
       have fired before this script was listening */
    const drawn = () => {
      let k = 0;
      near()?.tiles?.forEach((t) => { if (t.model && !t.unloaded) k++; });
      return k;
    };
    const tick = () => {
      const tiles = drawn();
      const busy = near()?.currentlyLoading || 0;
      tell('progress', { tiles });
      if ((tiles > 0 && busy === 0) || Date.now() - started > 600) {
        /* one more frame so what arrived is on screen before the still goes */
        app.mapViewer.redraw();
        requestAnimationFrame(() => tell('ready', { tiles }));
        return;
      }
      setTimeout(tick, 100);
    };
    tick();
  }

  /* BlueMap's menu opens along the left edge; in the frame the page's own
     title and the places lie over that edge, so the page is told to step
     aside while the menu is open. */
  if (embedded) {
    let open = false;
    new MutationObserver(() => {
      const now = !!document.querySelector('#app .side-menu');
      if (now !== open) { open = now; tell('menu', { open }); }
    }).observe(document.getElementById('app') ?? document.body, { childList: true, subtree: true });
  }

  if (!embedded) plank();
  whenLoaded(setup);
})();
