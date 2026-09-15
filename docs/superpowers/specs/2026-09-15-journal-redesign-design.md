# The journal, pushed further

Design spec for the second pass on the public site (home + crew pages).
Approved in conversation on 2026-09-15.

## Goal

Keep the trail-journal identity and raise it a level: real depth and
light, cinematic hero, gesture-driven map and album, spring motion
everywhere, atmosphere. Nothing should read as a template. The crew
pages get the same treatment.

Out of scope: `/admin`, `/rp-editor`, the API layer, data files,
Icelandic copy, section order.

## Principles

- Interaction and visuals are designed together, section by section.
- Motion is spring-based (`framer-motion`, already a dependency).
  Default critically damped; bounce only after a gesture with momentum.
- Everything that moves can be grabbed and reversed; nothing locks input.
- Feedback on pointer-down, not on release.
- `prefers-reduced-motion`: cross-fades, no springs, no parallax, no
  motes, no lantern. `prefers-reduced-transparency`: solid bar.
- Every section verified at 1440 and 400 px.

## Sections

### 1. The sheet on the desk
- `body` background becomes dark saddle leather (`--leather-2` + noise).
- `.j` becomes one paper sheet lying on it: deckled edges (SVG mask or
  clip-path), cast shadow, faint fold line, grain kept.
- Lantern glow: a fixed radial-gradient layer whose centre lerps toward
  the pointer on `requestAnimationFrame`. Off under reduced motion and
  on coarse pointers.
- Dust motes: one low-cost `<canvas>`, ~40 particles, paused when the
  tab is hidden. Off under reduced motion.

### 2. Hero
- Wordmark: layered wood-type (inline highlight, ink-bleed edge,
  offset shadow), negative tracking at display size.
- The castle print becomes a wide panorama across the top of the sheet;
  the copy sits on it. Slight parallax on scroll (transform only).
- Signpost stays and becomes sticky on desktop.
- Telegram slip shows live status with a small ticking "sótt fyrir …".

### 3. Nav
- Translucent leather bar (`backdrop-filter`), no hard border, a
  gradient scroll-edge where content passes underneath.
- Mobile menu is a drawer: drag to close, velocity handoff, mirrored
  enter/exit path.

### 4. Camp
- Pegs swing on a real spring driven by pointer velocity; damping ~0.8,
  settle to their tilt.
- Online players get a warm lantern glow behind the frame.

### 5. Map
- Pan by drag (pointer capture, grab offset respected), zoom by wheel
  and pinch, rubber-banding at the edges.
- Picking a place from the index springs the view to the pin.
- The photo print animates from the pin to its corner (shared origin).
- Pins: brass/wax with highlight and hover lift. Trail draws as now.

### 6. Album
- Grid stays. The lightbox opens from the clicked polaroid (shared
  origin), tracks 1:1 on drag, dismisses on flick down / far drag,
  flicks left/right with momentum projection, exits along the path it
  came. Keyboard and swipe still work.

### 7. Duel
- Heat shimmer on the horizon, a spent-cartridge tick per round, a
  spring screen-kick on a hit. Logic unchanged.

### 8. Tallies
- Posters get torn lower edges and nails. Switching category re-sorts
  with `layout` animation so names move on the board.

### 9. Provisions + Ride in
- Receipt: slight curl, punched hole on a string.
- `RideIn` mounted after Provisions. Brand ember pulses; the plate
  responds on press-down.

### 10. Crew pages
- `/crew`: wall of wanted posters, bio as "síðast séð" line; feed as a
  telegraph tape.
- `/crew/[name]`: profile card is the poster proper (torn edge, nail,
  reward = playtime), posts as ledger lines, photos as polaroids with
  the same lightbox.

### 11. Type, access, bugs
- Tracking by size: negative on Rye display, ~0 body, slight positive
  on small caps.
- Fix the phone-width horizontal overflow in the hero.
- Focus rings kept; all interactive SVG keeps keyboard handling.

## Files

- `src/app/globals.css`, `src/app/frontier.css` (may split per section
  if it grows past ~1000 lines).
- `src/components/frontier/*` (Hero, TrailNav, Camp, TerritoryMap,
  Postcards, Lightbox, QuickDraw, Tallies, Provisions, RideIn, Bits,
  FrontierHome) plus new `Atmosphere.tsx` (lantern + motes) and
  `motion.ts` (shared spring presets, projection, rubberband helpers).
- `src/app/crew/page.tsx`, `src/app/crew/[username]/page.tsx`.

## Verification

- `npm run lint` and `npm run build` pass.
- Headless-Chromium screenshots of `/`, `/crew`, `/crew/[name]` at
  1440 and 400 px, compared before/after per section.
- Manual check of reduced-motion via emulation.
