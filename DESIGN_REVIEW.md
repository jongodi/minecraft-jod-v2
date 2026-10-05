# JOÐ design review

Phase 1 of the design upgrade: a review of the site as it is, before any code is touched. Measured on 4 October 2026 against a production build (`next build` + `next start`) of commit `66ba3b1`, in headless Chromium 1194. The sandbox has no route to minotar.net, mc-heads.net, Exaroton or mcsrvstat, so every screenshot shows the fallbacks the site draws for those: the unknown-head glyph, the dark lantern saying "Náði ekki sambandi". That is itself useful: it is what a visitor sees when the server is down.

Screenshots are in `shots-before/` and, after Phase 4, `shots-final/` (not committed; `node scripts/shots.mjs` regenerates them). Lighthouse reports are summarised in section 7 (baseline) and section 9 (after).

## 1. The identity as it actually is

This is the source of truth. The upgrade extends it; it does not replace it.

**Concept.** One evening on the server. The visitor arrives at sunset over a badlands biome and scrolls into night. The page is two screens and a campfire: the sunset (hero), the world (a BlueMap frame that fills the viewport), and the fire (footer). The crew's room (*Eftirlýst*) and the shelf (*Hillan*) open over the world from the foot of the frame. The hash is the state. The design is documented in `DESIGN.md`; this review agrees with almost all of it.

**Palette** (`src/app/tokens.css`). Warm off-black, terracotta strata, one amber reserved for what can be pressed, paper for what was posted.

| Role | Token | Hex | Contrast where used |
|---|---|---|---|
| Page surface | `--night` | `#15100D` | |
| Raised surface, rooms | `--dusk` / `--dusk-2` | `#2A1A14` / `#21150F` | |
| Strata | `--tc-red` `--tc-orange` `--tc-yellow` `--tc-white` `--tc-brown` | `#8F3D2E` `#A15325` `#BA8523` `#D1B2A1` `#4D3323` | |
| Interactive only | `--lantern` / `--lantern-deep` | `#F2A63B` / `#C9801F` | 9.3:1 on night |
| Amber on paper | `--lantern-ink` | `#794D13` | 5.4:1 on paper |
| Paper and ink | `--paper` `--paper-2` / `--ink` `--ink-soft` `--ink-faint` | `#E8DCC4` `#DCCDB0` / `#1E1611` `#5A4634` `#6E5A45` | ink-faint 4.8:1 on paper, 4.2:1 on paper-2 |
| Text on night | `--text` `--text-soft` `--text-faint` | `#E8DCC4` `#D1B2A1` `#9A8272` | 13.9 / 9.5 / 5.2:1 |
| Sky | sunset `#3B1A20` → `#8F3D2E` → `#D8712F` → `#E9B24A`; night `#0C0A14` → `#15100D` | | the only cool value is night-top |
| Status | `--online` / `--offline` | `#8FB06A` / `#8F3D2E` | 7.7:1 on night |
| Wood | `--wood` `--wood-light` `--wood-dark` | `#4D3323` `#6B4A2E` `#35221A` | tc-white 5.8:1 on wood |
| Accents | `--sun` `--star` `--dust` `--ember` | `#F4D394` `#E8DCC4` `#C99A5A` `#E0602A` | ember 5.3:1 on night |

Everything is referenced by token name; the only raw hex in component CSS is the snow and the Hrekkjavaka sky, both seasonal (`badlands.css:33, 1199-1211`). Translucent night (`rgba(21,16,13,…)`) appears at eleven different alphas across the three stylesheets; these are not tokens and should become two or three.

**Type.** Three faces, self-hosted through `@fontsource` and `next/font/local`, all carrying þ ð æ ö.

| Role | Face | Grid (measured from the outlines) | Where |
|---|---|---|---|
| Display | Alfa Slab One 400 | real curves, not a pixel face | the wordmark, section and room titles, poster names |
| Text | Pixelify Sans 400 / 600 | pixel-styled, outlines on a 1-unit grid: crisp at any size | running prose, the hero line, ledes, bios, notes |
| Label / data | Silkscreen 400 / 700 | strict 8 px per em: crisp only at 8, 16, 24, 32 px | navigation, buttons, captions, counts, tags, everything the server says |

`DESIGN.md` says all three are drawn on a pixel grid. Two are; the slab is a Clarendon with curves, and that is fine: it is the one thing on the page that is painted rather than placed.

Current scale: 23 distinct `font-size` values across the three stylesheets. The tokens define nine (`--fs-xs` 0.8rem through `--fs-hero`), but `0.6rem` appears 29 times as a literal and `0.65`, `0.7`, `0.9`, `1.15rem` once each. Eleven `letter-spacing` values.

**Spacing.** A 4 px scale, `--sp-1` to `--sp-8` (4, 8, 12, 16, 24, 32, 48, 64). `--gutter: clamp(1rem, 0.5rem + 3vw, 3rem)`, `--wrap: 1160px`, `--tap: 2.75rem` (44 px), `--bar: 3.5rem`, `--doorbar: 3.75rem`.

**Shape.** `--radius: 0` everywhere. `--px: 2px` is one pixel of the pixel art. Corners are notched by one pixel (`--notch`). Bevels are inset 2 px light top-left and shadow bottom-right (`--bevel`, `--bevel-in`). Borders are 1 px rules or 2 px pixel strokes. Shadows are hard offsets (`0 2px 0`, `0 8px 0`), never blurred, with two exceptions noted in section 4.

**Textures and motifs.** Wood grain as two repeating gradients over a three-stop plank; paper with two soft stains and a fibre grain, nails, torn edges; the strata band under every plank; stepped mesa outlines with strata through the near ridge; the lantern (nav, status, boot button, lit = interactive); the campfire (three frames, embers when burnt down); crates on a shelf; chips with a thumbnail and a count tag; keys on a plank for phone tools; the pixel sun and the tiled stars.

**Motion.** Scroll is time: sky, sun, stars and parallax run on CSS scroll-driven animations with a `--evening` fallback, in whole-pixel steps. Durations 120 / 240 / 480 ms, ease-out `cubic-bezier(0.22, 1, 0.36, 1)`. Rooms slide on one transform; a postcard rises 12 px; the counter's slip slides in. Infinite loops are all opacity only: lantern flicker (3.4 s), the fire's three frames (900 ms), the ticker's cursor. Reduced motion is honoured globally and per effect. Nothing fades up on scroll.

**Copy tone.** Icelandic throughout. Plain, first person where the server speaks ("reyni aftur eftir smástund"), named things rather than UI words (doors, lanterns, the counter, the plank). Labels mostly lower-case sentence fragments; the pixel face carries what the server says. No marketing words. No invented numbers. Footer credit correct.

**The name.** The mark and the hero say **JOÐ**. The domain, the emails and your brief say **JOÐcraft**. The title tag is "JOÐ, Minecraft-heimurinn okkar". This is the one place the brand is not yet owned; see the questions in section 8.

## 2. What works and must be protected

- **The concept is the identity.** Sunset to night by scroll, the world as the page, rooms over the world, the fire at the end. Nothing here reads as a template; the first screenshot of any section is recognisably this site.
- **Amber means pressable.** The one rule a visitor learns in a glance. It holds across the bar, the chips, the HUD, the posters and the walls. Protect it absolutely; no amber on anything inert.
- **The strata and the plank.** The bar turning into a hung plank with the strata under it once the page moves (`badlands.css:323-344`) is the best transition on the site.
- **The frame as the world.** Poster first, viewer on request, viewer sleeps when hidden, the hand-over on first tiles. Technically and visually right.
- **Phone layout.** Doors in a bottom bar in reach of a thumb; the frame fills the screen between the bars; tools become keys on a plank in full screen. No hamburger anywhere.
- **Hash as state, back button closes rooms, Escape closes everything.** Already meets the brief's navigation behaviour.
- **Paper for what was posted.** Wanted posters, the counter, the walls, the calendar. Coherent and specific to this server's content.
- **Performance discipline already in the code.** Scroll frames touch only compositor properties, custom properties are never animated on `:root`, images go through `getImageProps` with per-slot `sizes`, effects are lazy and off under reduced motion. `scripts/perf.mjs` and `scripts/shots.mjs` exist. Lighthouse desktop is 100 / 100 / 100 / 100.
- **The pixel glyphs on the shelf, the lantern, the fire, the mesa outlines.** One drawn icon style, on the grid, every one of them authored here.

## 3. Problems, ranked by impact

### High

1. **Silkscreen is set off its grid almost everywhere.** The face is 8 px per em (measured: every stem lands on a 125-unit step of a 1000-unit em). It is crisp at 16 and 24 px (`--fs-data`, `--fs-data-lg`) and nowhere else. It is set at 9.6 px (`0.6rem`, 29 places), 12.8 px (`--fs-xs`, 32 places) and 14.4 px (`--fs-sm`, 28 places), where each font pixel becomes 1.2, 1.6 or 1.8 device pixels and the pixels come out uneven. This is the site's own rule ("everything on a pixel grid") broken on most labels, and it is also the cause of problem 2. Files: `tokens.css:101-115`, `badlands.css:411, 449, 554, 586, 649, 657, 726-727, 740-741, 858, 953, 956, 1097`, `board.css:87-109, 333`, `wall.css:71, 100, 121, 147, 161-164, 182`.

2. **Tiny text.** 9.6 px upper-case labels carry real information: the phone's door names (`badlands.css:411`), the places' sub-labels on the rail (`:727`), the HUD's sync date and who is in (`:554`), the hero's fine print (`:449`), the room notes (`:858`), the posters' charges and ranks (`board.css:89-106`). The brief says no tiny text; nothing should be under 12 px, and labels should be 14 px or more.

3. **Too many type sizes, too little contrast between them.** 23 sizes, 11 tracking values. The display face is used at one size for a room title (`--fs-lg`) and nearly the same size for a poster name; a kicker, a caption, a note and a button all sit between 9.6 and 14.4 px. The hierarchy reads as "big word, then a lot of small caps".

4. **Live status is fetched in the browser after hydration, and the hero moves when it arrives.** `useServerStatus` (`hooks.ts:44-66`) and `usePlayNight` (`night.ts:66-76`) run on the client; the lantern panel is server-rendered as "Athuga stöðuna, bíð eftir svari" and then grows by a line or two; `NightLine` returns `null` until mounted (`PlayNight.tsx:54`) and then inserts a 70 px row under the lantern on any day a play night exists. The brief asks for server-side status with caching and no layout shift. Measured CLS today is 0.008 with no night planned; with a night it will be well over 0.05.

5. **Mobile LCP is 2.7 s against a 2.0 s target.** The LCP element is the `JOÐ` heading. It waits on three render-blocking stylesheets (simulated 450 ms) and on five preloaded fonts (51 kB) competing with 142 kB of JS on the simulated 4G link. Two of the five fonts (Pixelify 600, Silkscreen 700) are not used above the fold. The initial bundle also carries the whole play-night board, form and calendar (`chunk 1132`, 16 kB gz) because `Hero.tsx:7` imports `NightLine` from `PlayNight.tsx`, which pulls `NightBoard`, `LightFire` and `Calendar` with it.

6. **Hero text on desktop sits on the brightest band of the sky.** The hero is bottom-aligned (`badlands.css:421-428`), so at 1440 × 900 the sub-line lands on `#AB512E` (paper 3.9:1, under AA for 20 px text) and the hint on `#D06B2F` (2.65:1, saved only by its 2 px shadow). On a phone the same text sits higher in the gradient and passes (7.4:1). The wordmark has the hard pixel shadow (`:443`); the sub-line does not (`:445`).

### Medium

7. **No skip link, and two accessible-name mismatches.** `layout.tsx:71-83` has no skip-to-content link. Lighthouse flags `label-content-name-mismatch` on the bar's copy button (`AddressBar.tsx:74-77`: visible "play.jodcraft.world afrita", name "Afrita vistfang þjónsins, play.jodcraft.world") and on the status lantern (`StatusLantern.tsx:47-49`: the visible row ends in ", athugað rétt í þessu" which the `aria-label` leaves out).

8. **Section navigation disappears on phones off the home page.** `AddressBar` hides the door bar when `always` is set (`AddressBar.tsx:84-88`), which every other page passes (`crew/page.tsx:58`, `Wall.tsx:342`, `OffTrail.tsx:14`). On a phone, `/crew` and the walls have a back link and the footer, nothing else. On desktop the three doors show but none is lit, so there is no current-section indicator on those pages.

9. **Two confirmations for one action, and one of them is a typing effect.** The hero button stamps "Afritað" and types "Afritað. Límdu það inn í leikinn." letter by letter (`CopyAddress.tsx:8-9, 23-32`); the bar's button only swaps the word "afrita" for "afritað". The brief suggests one advancement-toast style confirmation. The typing ticker is the one piece of motion on the site that explains nothing.

10. **The hint restates the button.** "smelltu til að afrita vistfangið" under a button with a copy icon and the address (`CopyAddress.tsx:12`), and "smelltu" (click) on a touch screen. The fine-print line "aðgangur með boði · útlitspakkinn sækist sjálfkrafa" (`Hero.tsx:25`) is 9.6 px and says what the shelf's lede already says.

11. **"Aðrar stöðvar" is a band between the world and the fire that belongs to neither.** Four ghost buttons under a 9.6 px heading (`World.tsx:570-582`, `badlands.css:647-651`). The bases are places with their own maps; the places already have a rail.

12. **Small buttons are 36 px tall on touch.** `.b-btn--small` sets `min-height: 2.25rem` (`badlands.css:157`) and is used for the base links, "Aftur í sólsetrið", the postcard's Deila, the crew room's foot button and the HUD tools on desktop. The phone's HUD keys are already 44 px; the rest should be too under a coarse pointer.

13. **Tooltips only a mouse can read.** Nineteen `title=` attributes in the public components (`World.tsx` 9, `MapSheet.tsx` 4, others). On touch they are unreachable; on desktop they are the browser's grey box, the one un-themed element on the site. The brief suggests item-tooltip style hovers.

14. **One contrast failure on paper.** A lit lantern's count on a wall print is `--lantern-deep` on paper, 2.35:1 (`wall.css:138`). `--lantern-ink` exists for exactly this (5.4:1).

15. **The wall's LCP image is lazy-loaded.** `PlayerHead` always sets `loading="lazy"` (`PlayerHead.tsx:45`), including the poster skin at the top of every wall, which is that page's LCP (measured 3.5 s).

### Low

16. **44 MB of PNGs ship in `public/screenshots/` that nothing references.** Only the `.webp` files are used. The PNGs are deployed with every build.
17. **`gradient` in `src/data/gallery.json` is a dead field** (sky-blue linear gradients from an earlier design) still typed in `gallery.ts:10` and returned by `/api/gallery`.
18. **Two chevron components** (`Bits.tsx:133-143` and `216-223`), and three icons drawn without `shapeRendering="crispEdges"`: `CopyIcon` (`:124`), `SoundIcon` (`:237`), `BulletHole` (`:254`, circles and lines, the one non-pixel drawing).
19. **`backdrop-filter: blur(6px)` on the phone's door bar** (`badlands.css:398`) over a 94 % opaque surface: invisible, but a backdrop pass on every scroll frame.
20. **Both pixel faces opt out of size-adjusted fallbacks** (`layout.tsx:19, 31`, `adjustFontFallback: false`), so a slow connection shows Trebuchet and Courier New at their own metrics before the swap.
21. **Idle warm-up of the rooms has a 4 s timeout** (`World.tsx:165-172`), so on a slow phone it runs inside the first seconds rather than when the browser is actually idle. Particles run from mount and are not skipped on low-end devices (`Particles.tsx:26-35`).
22. **The drawn map's trail animates `stroke-dashoffset`** (`badlands.css:543`), the one animation that is neither transform nor opacity. One-off, on open; acceptable, noted.
23. **Eleven alphas of translucent night** in the stylesheets (`rgba(21,16,13,0.18 … 0.94)`): should be three tokens (veil, pane, scrim).

## 4. AI-slop and vibe-coded patterns

Checked against the authentic-design tell catalogue and the brief's anti-slop list. The site is largely clean: no purple or blue gradients, no sparkle or emoji icons, no three-card feature grid, no testimonials, no invented stats, no filler verbs, no em dashes in copy (the 28 in the repo are all in code comments), no fade-up-on-scroll, no unstyled framework defaults, no `#` hrefs, correct copyright line.

What remains, by file and line:

| Where | What | Verdict |
|---|---|---|
| `CopyAddress.tsx:8-9, 23-32` | Typewriter ticker on copy | Reflexive. Motion that explains nothing; replace with one confirmation. |
| `CopyAddress.tsx:12`, `Hero.tsx:25` | Hint restating the button; fine print restating the shelf | Filler. Cut. |
| `badlands.css:398` | `backdrop-filter: blur(6px)` | Glass by habit. Cut. |
| `badlands.css:998` | `text-shadow: 0 1px 3px rgba(0,0,0,.7)` in the duel | The one soft shadow on a hard-shadow site. Make it a pixel shadow. |
| `src/data/gallery.json`, `gallery.ts:10` | Unused `gradient` strings in sky blue | Dead data from an earlier look. Remove. |
| `public/screenshots/*.png` | 44 MB unreferenced | Dead weight. Remove. |
| `Bits.tsx:133, 216` | Two chevrons | Duplicate component. Merge. |
| `World.tsx` and others | 19 `title=` tooltips | Browser default UI on a fully drawn site. Replace or drop. |
| `badlands.css` 0.6rem × 29 | Literal sizes beside a token scale | Drift. Fold into the scale. |
| `src/effects/CursorLight.tsx` | A warm disc following the pointer | **Authored, keep.** It is lantern light, fine pointers only, off under reduced motion, one composited layer. |
| `.b-lantern.is-lit::before` glows | Radial glow on lit lanterns | **Authored, keep.** Glow is the state, and only lanterns have it. |

Code-level: no god files (largest public component 589 lines, the stylesheet 1230), 32 test files, comments accurate and current. One stale-ish claim in `DESIGN.md` (three pixel faces) noted above.

## 5. Design direction

Keep the evening. Make it read at two sizes instead of six.

**Type.** Three faces, three jobs, nine sizes. Alfa Slab One for the wordmark and titles only, at three sizes (hero, title, room title). Pixelify Sans for everything the *site* says, at three sizes: lede 20 px, body 17 px, small 14 px; small labels, kickers, sub-labels and notes move here from Silkscreen and lose their upper-case where they are sentences. Silkscreen for what the *server* says and what can be pressed: numbers, names, the address, versions, counts, the doors and the buttons, at 16 and 24 px only (8 px kept for the chip numerals, where it is already dead on the grid). That restores the decision `DESIGN.md` records ("pixel face only on live data") and puts the bitmap face back on its grid. Two tracking values: 0.04em on Silkscreen capitals, 0 elsewhere.

**Hero.** One moment: the mark, the address, the lantern. The mark grows to its full 14 rem on every desktop width and to 18 rem from 1440 up. The sun is larger and lower so it stands over the ridge rather than in a corner. Every line of hero text takes the Minecraft text shadow, the hard 2 px offset in night, which is how the game itself keeps white text legible over any sky. The hint and the fine print go; "með boði" moves into the sub-line.

**Colour.** No new colours. The eleven night alphas become three tokens. The one amber-on-paper failure uses the ink amber that exists for it.

**Texture.** No new texture. The wood, paper, strata and notch already carry every surface; the work is to use them where the page still uses a bare band (the bases strip) or the browser's own box (tooltips).

**Motion.** Keep scroll-as-time, the rooms, the postcard. Add one thing: an advancement-style toast when the address is copied, a paper slip sliding down from under the plank, the lantern lit on it, "Afritað: play.jodcraft.world". Remove the typing ticker. Nothing else moves that does not move today.

**Layout.** The bases fold into the places rail as the last chips, each marked with a lit lantern (they lead to another map). The door bar is on every page on phones; on the crew pages the *Eftirlýst* lantern burns, because the walls are that room continued. The skip link is the first thing in the tab order.

**Game references, used with restraint.** The text shadow (hero), the advancement toast (copy), item-tooltip paper tags on hover and focus for the HUD heads and the doors (replacing `title`), chat colour logic for the status word (green on, gold kindling, red off) which the site already does and only needs naming as a rule. Nothing more.

## 6. Implementation plan

Small passes, one commit each. After each: build, screenshot at 390 and 1440, compare, fix regressions, then move on.

| Pass | What | Why, in one sentence | Measures |
|---|---|---|---|
| 1 | **Housekeeping.** Remove the PNGs and the `gradient` field; merge the chevrons; `crispEdges` on the three icons; the two accessible-name fixes; `--lantern-ink` on the lit count. | Clears dead weight and the two audit failures before anything visual moves. | Lighthouse a11y audit list; repo size. |
| 2 | **Navigation.** Skip link; door bar on every page on phones; *Eftirlýst* lit on `/crew*`; `.b-btn--small` 44 px under coarse pointers; drop the blur on the door bar. | Every page gets the same three doors, a current indicator and thumb-sized targets. | Tab order at 390; target sizes; screenshots of `/crew` at 390. |
| 3 | **Type scale.** Nine sizes in tokens; Silkscreen at 16 / 24 (8 for chip numerals) only; small labels to Pixelify 14; two tracking values; hero mark and sun sizing; the pixel text shadow on all hero text; cut the hint and the fine print. | Puts the bitmap face back on its grid, removes every line under 12 px, and gives the hierarchy two clear steps. | Font-size census (target ≤ 9); hero contrast ≥ 4.5:1 at 1440; screenshots at all six widths. |
| 4 | **Status on the server.** Home (and `/kvold`, `/stadur`) fetch status, nights, gallery, map config and place prints in the server component with `revalidate` 30 s and hand them to the client store as initial state; the lantern panel and the night line take a fixed height; the client keeps polling. | The hero is complete at first paint and never shifts, and six post-hydration fetches become zero. | CLS at 390 with a night planned (target < 0.02); request count. |
| 5 | **Copy confirmation.** One toast component for both copy actions; retire the ticker and the stamp. | One act, one confirmation, recognisable to every Minecraft player, drawn in this site's paper and wood. | Announced once via `role="status"`; works from keyboard; reduced motion shows it in place. |
| 6 | **Performance.** `experimental.inlineCss`; preload only the three hero faces (bold cuts via plain `@font-face`); enable size-adjusted fallbacks; split `NightLine` from `PlayNight`; idle warm-up without a timeout; particles and cursor light skipped on low-end devices (`hardwareConcurrency ≤ 4`, `deviceMemory ≤ 4`, `saveData`); eager `fetchpriority="high"` on the wall's poster skin. | Removes the render-blocking round trips and 16 kB of fonts and 12 kB of JS from the critical path, which is what stands between 2.7 s and 2.0 s. | Lighthouse mobile LCP < 2.0 s, perf ≥ 95; First Load JS per route before/after. |
| 7 | **World polish.** Bases into the places rail; paper-tag tooltips on HUD heads and doors replacing `title`; three night-alpha tokens; the duel's soft shadow made hard. | The frame becomes the one world artifact again, and the last browser-default UI leaves the site. | Screenshots of the frame at 390 and 1440; `title=` count → 0 in public components. |
| 8 | **Brand.** Whichever answer section 8 gets: name in title, footer, OG image and manifest made consistent; a pixel Ð mark variant tried beside the J. | The wordmark and the Ð should be the same thing on every page and in every link preview. | OG image regenerated; favicon and bar mark compared. |
| 9 | **Verify and write up.** Lighthouse at mobile and desktop on `/`, `/crew`, a wall; `scripts/perf.mjs`; screenshots at 360, 390, 768, 1024, 1440, 1920; this document's Phase 4 section. | | |

Considered and not planned: splitting the home page into server-component islands. The static markup is already server-rendered, the 101 kB of React and Next runtime dominates the bundle regardless, and the hero, mesa and footer need the live state anyway; the gain would be a few kilobytes for a large refactor. The play-night split and the server-side data in passes 4 and 6 take the real wins.

## 7. Baseline measurements

Lighthouse 13.5, mobile preset (Moto G Power emulation, simulated slow 4G, 4× CPU), production build, sandbox network. The crew and wall pages lose Best Practices points only for console errors from the blocked head images; those will not occur in production. The 404 page could not be scored (Lighthouse refuses a 404 status).

| Page | Perf | A11y | Best Practices | SEO | FCP | LCP | TBT | CLS | Speed Index | TTI |
|---|---|---|---|---|---|---|---|---|---|---|
| `/` run 1 | 91 | 100 | 100 | 100 | 1.07 s | 2.77 s | 258 ms | 0.008 | 1.45 s | 3.65 s |
| `/` run 2 | 96 | 100 | 100 | 100 | 1.06 s | 2.71 s | 60 ms | 0.008 | 1.06 s | 3.01 s |
| `/crew` | 97 | 100 | 96 | 100 | 1.07 s | 2.57 s | 49 ms | 0.001 | 1.07 s | 2.83 s |
| `/crew/stebbias` | 90 | 100 | 96 | 100 | 1.07 s | 3.52 s | 113 ms | 0.017 | 1.07 s | 3.52 s |
| `/` desktop | 100 | 100 | 100 | 100 | 0.26 s | 0.70 s | 38 ms | 0.003 | | |

LCP elements: `/` the `h1.b-hero__mark`; `/crew` the `p.b-lede`; the wall its poster skin `<img>` (lazy-loaded). Render-blocking: the three stylesheets, 156 + 306 + 456 ms simulated. Flagged audits: `label-content-name-mismatch` (two nodes, section 3.7); `legacy-javascript` 12 kB inside Next's own runtime chunk (not ours to change); `bf-cache` blocked on the wall by `no-store`.

INP was not measured: Lighthouse does not report it, and the sandbox has no real-user data. The scroll probe below stands in for interaction cost.

**JS and CSS per route** (gzipped, as served; `polyfills` is `nomodule` and not fetched by modern browsers):

| Route | First Load JS (Next) | Shared runtime | Route-specific | CSS |
|---|---|---|---|---|
| `/`, `/kvold`, `/stadur/[id]` | 142 kB | 101 kB (React DOM 54, Next 47) | 41 kB in 6 chunks: play-night board + calendar 16, world 7.5, hooks and bar 5.4, 5.1, 4.2, page 0.2 | 17.7 kB in 3 files (tokens 2.5, badlands 10.9, board 4.3) |
| `/crew` | 128 kB | 101 kB | 27 kB | 21 kB in 4 files (+ wall 3.3) |
| `/crew/[username]` | 152 kB | 101 kB | 51 kB | 21 kB |
| `/_not-found` | 104 kB | 101 kB | 3 kB | |

Lazy chunks, fetched on demand: framer-motion + lightbox/album/sheet 39.5 kB; crew room 10.7 kB; shelf and glyphs 4.3 kB; map art 2.9 kB; lightbox 2.9 kB; particles 2.0 kB; cursor light 0.7 kB.

Fonts preloaded on every page: 5 files, 51 kB (Alfa Slab 19.1, Silkscreen 400/700 8.4 + 8.2, Pixelify 400/600 7.5 + 7.7).

**Scroll probe** (`scripts/perf.mjs`, dpr 2): desktop 1440 × 900 mean frame 26.0 ms, p95 38 ms, 48 of 392 frames long; mobile 390 × 844 at 4× CPU mean 16.9 ms, p95 20.7 ms, 2 of 947 long. Images on the home page: 12, 155 kB on desktop, 35 kB on mobile, none oversized. (Desktop long frames are the headless sandbox's software GPU; the mobile figure is the one that matters and it is clean.)

**Responsive check** (`scripts/shots.mjs`, 360 / 390 / 768 / 1024 / 1440 / 1920): no horizontal scroll on any page at any width; no overlapping elements found. The overflow detector reports the mesa SVGs (clipped by the hero on purpose) and the chips inside the horizontally scrolling rail (expected).

## 8. Questions before the go-ahead

1. **JOÐ or JOÐcraft?** The mark and the hero say JOÐ; the domain, the mail and your brief say JOÐcraft. My recommendation: JOÐ stays the mark and the wordmark (the Ð is the brand), and "JOÐcraft" becomes the full name in the title tag, the footer credit, the OG image and the manifest ("JOÐcraft · Minecraft-heimurinn okkar"). Say if you want JOÐcraft on the hero instead.
2. **The toast replaces both the stamp and the ticker?** The stamp is charming and in-theme; two confirmations for one act is still one too many. I recommend the toast alone.
3. **Bases into the rail**, or keep them as a strip under the frame with a plank of their own?
4. **A pixel Ð as the mark** instead of the pixel J: worth trying as a variant in pass 8, or leave the J?

Everything else in the plan follows from the brief and needs no decision.

## 9. Phase 4: what was done

Eight passes, eight commits on `claude/upbeat-ritchie-mdp79b` after the review commit, then this one. Every pass was built for production, screenshotted at 390 and 1440 (and the home page section by section), and checked for console errors and horizontal overflow before it was committed. The identity in section 1 is unchanged: the same three faces, the same palette, the same evening from sunset to campfire. The four questions in section 8 were answered "go ahead with your recommendations on all four"; what that meant in practice is under *The four questions* below.

### What changed, and why

| Pass | Commit | What changed | Why, in one sentence |
|---|---|---|---|
| 1 Housekeeping | `7cbf631` | The `gradient` field left the gallery data and its tests; one `ChevronIcon` with a direction replaced two components; `crispEdges` on the copy, sound and bullet-hole icons; the bar's copy button and the status lantern renamed so their visible words are their accessible names; the lit lantern count on paper set in `--lantern-ink`. | Dead data and the two Lighthouse failures were cleared before anything visual moved. |
| 2 Navigation | `04c7cf4` | The door bar at the foot of a phone on every page (walls, roll call, 404, admin login), not only the home page; `aria-current` and a lit lantern on the door the visitor is behind; a skip link, *Beint í efnið*, as the first tab stop on every page, landing on `main#efni`; small buttons 44 px tall on coarse pointers. | Three doors, the address one tap away everywhere, and a keyboard is past the bar in one press. |
| 3 Type | `a384d3c` | Nine sizes (`--fs-sm` 14, `--fs-md` 17, `--fs-lg` 20, `xl`, `2xl`, `hero`, `--fs-chip` 8, `--fs-data` 16, `--fs-data-lg` 24) and `--fs-xs` retired; Silkscreen only at 8, 16 and 24 px and only for what can be pressed and what the server counts; Pixelify Sans 400 and 600 for every word, kickers 600 upper-case; two tracking values; the hero's sub-line given the wordmark's hard pixel shadow; the hint under the address and the fine print cut. | The bitmap face is back on its pixel grid, the words have one voice, and the hero reads on the brightest band of the sky. |
| 4 Status on the server | `744099b` | `loadHomeData()` reads status, nights, gallery, map config, place prints and season in the server component, each capped at 5 s, under `revalidate` (ISR; the status fetch windows make it 10 s); the client stores are seeded from it and keep polling; the explicit `no-store` fetches that had made `/` dynamic became `next: { revalidate }`, so `/` and `/kvold` are static again; the lantern panel and the night line hold a fixed height. | The hero is complete at first paint and nothing moves when the browser's own answers arrive. |
| 5 Toast | `61f294d` | One advancement-style toast on paper (`Toast.tsx`, `role="status"`, 2.6 s) confirms every copy and share; the stamp and the typing ticker retired. | One confirmation, drawn in the game's own idiom, instead of two mechanisms saying the same thing. |
| 6 Performance | `67a759d` | Four font files instead of five (Silkscreen 700 dropped), each with a size-adjusted fallback so the swap moves nothing; `NightLine` split from the play-night board, so the home page no longer ships the board, the form and the calendar; the map viewer warmed on idle without a timeout; particles and the cursor light skipped on low-end devices; the wall's poster skin eager with `fetchpriority="high"`; `experimental.inlineCss` tried and reverted (65 kB of HTML, worse LCP). | A lighter first screen, with 5 kB of JS and 6 kB of fonts off the critical path and no shift at the font swap. |
| 7 World | `64878b5` | The four bases with their own BlueMap ride at the end of the places rail as lantern chips and their strip under the world is gone; `title=` tooltips replaced by one CSS paper tag (`.b-tip[data-tip]`) that opens on hover and on keyboard focus, in the site's text face; the night's nine alphas collapsed to `--veil`, `--pane`, `--scrim` and `--scrim-deep`. | One list of where to go, tooltips in the site's own hand that a keyboard can open, and four named darks instead of nine numbers. |
| 8 Brand | `29cedcf` | `SITE_NAME = 'JOÐcraft'` feeds the root title and the template every page's title ends in, the manifest, the footer's credit, the site name on every link preview and the share-sheet titles; the BlueMap viewer and the base maps' pages take the same suffix; the OG image's small line says the written name and its sun moves low over the mesas, clear of it. A pixel Ð mark was drawn and compared with the J; the J stays, and `DESIGN.md` records the rule and the trial. | The site has one written name and one mark, and every tab, preview and letter agrees. |
| 9 Verify | this commit | The door bar at the foot of a phone made solid night: at 360 and 768 the world's title and tools showed through its 94 % scrim. The measurements and this section. | A floor is not a veil. |

Not done, on purpose: the hero still says JOÐ (the wordmark), the bar still says JOÐ, and the Silkscreen stamps on the link-preview cards still say JOÐ, because the bitmap face has no lower case and the stamps are set in the mark's voice. The admin panel kept its own `--fs-xs`; it is out of the evening's scope.

### The four questions, as decided

1. **JOÐ or JOÐcraft.** JOÐ is the mark and the wordmark: the hero, the bar, the favicon, the stamps in the bitmap face, and the word the players say ("á JOÐ", "JOÐ-félagi"). JOÐcraft is the name as it is written: the end of every page's title, the manifest, the footer's credit, `og:site_name` everywhere, the share titles and the letters. One constant in `data.ts` carries it. A nested layout's title replaces the one above it, template included, so the crew layout states the template again; without that a wall's title had no suffix.
2. **One toast.** The stamp and the ticker are gone; copying the address anywhere, or sharing a place or a night, puts one paper toast under the bar for 2.6 s, announced politely to a screen reader. The clipboard check in the final run holds `play.jodcraft.world`.
3. **Bases in the rail.** The rail's label reads *Staðir og stöðvar* with the count of both; the four base chips are last, with a lantern where a place has its print, and link to `/kort/<id>`.
4. **The Ð mark.** Drawn on the mark's 16 × 16 grid (2 px cells) at the J's height and stroke: stem `8,6 4×20`, bars `8,6 12×4` and `8,22 12×4`, corner steps `20,8 2×2` and `20,22 2×2`, bowl `20,10 4×12`, crossbar `6,14 10×4` (a 2 px bar was also tried). Set beside the J at 16, 32, 64 and 192 px, in the bar, in a browser tab and on paper. At 192 it read as Ð; at 64 as Ð or Đ; at 32 and 16, the sizes a favicon is seen at, the crossbar and the counter closed into a solid block and it read as a D. A J + Ð pair at 16 px was mush. The J keeps its hook and its air at every size, so the J stays. If the mark is ever revisited, the Ð belongs only at 48 px and above.

### Lighthouse, before and after

Same conditions as section 7: Lighthouse 13.5, mobile preset, production build, sandbox network. Two home runs each time, because simulated TBT and LCP vary between runs.

| Page | | Perf | A11y | BP | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|---|
| `/` | before | 91 / 96 | 100 | 100 | 100 | 1.07 s | 2.77 / 2.71 s | 258 / 60 ms | 0.008 |
| `/` | after | **97 / 98** | 100 | 100 | 100 | 1.06 s | **2.66 / 2.36 s** | **54 / 38 ms** | **0.000** |
| `/crew` | before | 97 | 100 | 96 | 100 | 1.07 s | 2.57 s | 49 ms | 0.001 |
| `/crew` | after | 97 | 100 | 96 | 100 | 1.07 s | 2.56 s | 38 ms | 0.008 |
| `/crew/stebbias` | before | 90 | 100 | 96 | 100 | 1.07 s | 3.52 s | 113 ms | 0.017 |
| `/crew/stebbias` | after | 90 | 100 | 96 | 100 | 1.06 s | 3.35 s | 172 ms | 0.019 |
| `/` desktop | before | 100 | 100 | 100 | 100 | 0.26 s | 0.70 s | 38 ms | 0.003 |
| `/` desktop | after | 100 | 100 | 100 | 100 | 0.25 s | **0.54 s** | 1 ms | **0.000** |
| `/crew` desktop | after | 100 | 100 | 96 | 100 | 0.30 s | 0.60 s | 0 ms | 0.000 |
| `/crew/stebbias` desktop | after | 100 | 100 | 96 | 100 | 0.30 s | 0.60 s | 3 ms | 0.000 |

Against the targets:

- **Performance 95+.** Home 97 to 98, crew 97. The wall stays at 90 for one reason: its LCP is the poster skin from minotar.net, which the sandbox blocks, so the measured 3.35 s is a failed request and the fallback glyph. In production the image is a few kilobytes and is now eager with `fetchpriority="high"`; it needs measuring there.
- **Accessibility, Best Practices, SEO 100.** Home: all three. Crew and wall lose Best Practices points only for console errors from the blocked head images, which do not occur in production. The two `label-content-name-mismatch` failures from the baseline are gone.
- **LCP under 2.0 s: not reached in the simulation.** The hero wordmark's simulated LCP is 2.4 to 2.7 s (baseline 2.7 to 2.8 s). Lighthouse's simulation puts every script that started before the paint into the LCP's dependency graph, so the 103 kB React and Next runtime plus the three stylesheets on a simulated slow 4G link set a floor near 2.3 s whatever the hero does. The unthrottled picture is different: LCP equals FCP (0.54 s on desktop) because the size-adjusted fallback holds the wordmark's box and the swap paints in place. The two moves that could lower the floor were tried or ruled out: inlining the CSS made the HTML 65 kB and LCP worse (pass 6), and Server Component islands were weighed in section 6 and not planned because the runtime ships regardless. What is left is the runtime itself, which a React 19 / Next 16 upgrade would shrink.
- **CLS under 0.05.** Home 0.000 at both sizes, with or without a night planned. Crew 0.008 and wall 0.019: one shift each, in the roll call and in the wall's poster, where the blocked head images fall back to the glyph.
- **INP under 200 ms.** Lighthouse cannot report INP and the sandbox has no field data. The stand-ins: TBT 38 to 54 ms on the home page, max potential FID 130 to 160 ms, and the scroll probe below with no long frame on a throttled phone. After hydration the home page makes no request but the status poll.

### Bundle, before and after

Gzipped, as served. The shared runtime is the two Next chunks plus 2.7 kB of small shared chunks; the baseline table counted the two chunks only.

| | before | after |
|---|---|---|
| `/`, `/kvold`, `/stadur/[id]` First Load JS | 142 kB | **137 kB** (the play-night board, form and calendar left the home page in pass 6) |
| `/crew` First Load JS | 128 kB | 128 kB |
| `/crew/[username]` First Load JS | 152 kB | 152 kB |
| Shared runtime | 103 kB | 103 kB (unchanged through every pass) |
| Fonts preloaded | 5 files, 51 kB | **4 files, 45 kB** (Alfa Slab 19, Pixelify 400 and 600 9 + 9, Silkscreen 400 8) |
| CSS on `/` | 17.7 kB in 3 files | 17.8 kB in 3 files (tokens and globals 2.8, badlands 10.9, board 4.2); the crew and wall pages add 3.5 kB |
| HTML on `/` | | 9.4 kB; `/crew` 5.3 kB; a wall 5.2 kB |
| Requests after hydration on `/` | 6 (status, nights, gallery, map, places, season) | 0; the status poll continues on its 10 s cadence |
| Rendering of `/` and `/kvold` | dynamic after pass 4's first cut | static, revalidated every 10 s |

**Scroll probe** (`node scripts/perf.mjs final /`, dpr 2): desktop 1440 × 900 mean frame 24.2 ms, p95 37 ms, 38 of 413 frames long (baseline 26.0, 38, 48 of 392; the long frames are the headless sandbox's software GPU); mobile 390 × 844 at 4× CPU mean 16.8 ms, p95 20.7 ms, **0 of 877 long** (baseline 2 of 947). Images on the home page unchanged: 12, 155 kB on desktop, 35 kB on mobile, none oversized.

### Checks on the final build

- **Keyboard.** The first Tab on every page lands on the skip link, which slides into view at 8 × 8 px with the paper outline (`:focus-visible` confirmed); Enter moves to `#efni`; the next stop is the hero's copy button. On a phone the door bar's lit door carries `aria-current="location"` and its three items are 74 px tall; small buttons measure 44 px on a coarse pointer.
- **Toast.** Copying from the hero or the bar puts the paper toast under the bar (`role="status"`, `aria-live="polite"`), 351 px wide at 390, gone after 2.6 s; the clipboard holds the address; no console errors.
- **Six widths.** 360, 390, 768, 1024, 1440 and 1920 on `/`, `/crew` and a wall: `scrollWidth` equals the viewport everywhere, the console is clean at every width, and the overflow detector reports only the mesa SVGs the hero clips and the chips inside the horizontally scrolling rail.
- **Titles.** Every page's title ends in the written name: `JOÐcraft · Minecraft-heimurinn okkar`, `Hópurinn · JOÐcraft`, `stebbias · JOÐcraft`, `Næsta spilakvöld · JOÐcraft`, `Kastali Goða · JOÐcraft`, `Stjórnborð · JOÐcraft`, `Fannst ekki · JOÐcraft`, `Heimurinn · JOÐcraft` on the map viewer. `og:site_name` is `JOÐcraft` on all of them; the manifest's name matches the title.
- **Tooltips.** The paper tags open on hover and on focus (computed `opacity: 1` on `::after`, paper background, 14 px text face) on the footer's fire, the sound toggle, the drawn map's three zoom buttons, the status lantern's heads, the HUD's heads and night switch, the wanted board's week head, a print's time and lantern, and the wall's bio button.
- **Tests and lint.** `tsc`, `next lint` and the 231 unit tests pass on every commit.

### Follow-ups for the owner

1. **The PNG screenshots in `public/screenshots/`** can be deleted once the admin's gallery migration has run against production KV; a record there may still name a `.png`.
2. **Measure in production**: the wall's LCP with the real skin image, Best Practices on the crew and wall pages, and INP from the field (Vercel Speed Insights or `web-vitals`). The sandbox cannot see any of the three.
3. **LCP under 2.0 s in the simulation** needs fewer runtime bytes; a React 19 / Next 16 upgrade is the lever, not the hero.
4. **The wall's `no-store` fetch** still blocks the back-forward cache (`bf-cache` audit); it can take `next: { revalidate }` the way the home data did.
5. **The remaining translucent values** in `badlands.css` (0.5, 0.7, 0.72) are gradient stops and were left as numbers on purpose.
6. **Light-on-dark contrast under the sunset** was fixed by the hard shadow on the hero's sub-line; if the copy there ever grows past two lines, check it again at 1440 × 900.

### After Phase 4

Two changes the owner asked for once the passes were in:

- **The hero's copy button has its stamp back.** *Afritað* is struck across its corner on a press, as before pass 5; the hero no longer drops a toast. The bar's copy keeps the toast, which now says only *Afritað* and the address: the line telling the visitor to paste it into the game is gone, and so is the matching line on the place and night link toasts. A screen reader hears *Afritað* from a live region beside the hero button.
- **The 3D map flies only to places on its own ground.** `map:brand` now writes the main map's rendered edges into `src/lib/bluemap-viewer.json`, the same edges the viewer holds its camera inside, and `mapAt` (`src/lib/base-links.ts`) decides which map shows a place. A place inside the edges flies the camera as before. A place at another base, Bleika setrið at Joðville for one, leaves the camera where it is, and its postcard's button opens that base's own map. A place beyond every rendered edge gets no 3D button at all.

### The bolder pass

Phase 4 refined the evening without restaging any of it: the same compositions, at better sizes. The owner asked for the design and layout to go further. Three places were still timid, and each was restaged in one commit. Judged with realistic data: the sandbox reaches neither the game server, the stats nor the head service, so screenshots were taken with an online server, three of the crew in, a full week of stats and drawn pixel heads served in their place.

| Commit | What changed | Why |
|---|---|---|
| `65875ef` Hero | The name stands at the foot of the sunset among the mesas, the far ridge behind its letters and the middle and near ridges in front of their feet, at half a desktop's width and nine tenths of a phone's. The sun is the game's square sun, setting behind the far ridge on a wide screen. The address and the server's lantern share one line on the dark of the upper sky, the lantern with no panel. | The hero was three stacked layers with the live status floating in a box beside nothing; now it is one scene, and the ridges' existing parallax makes the name rise out of the land as the page scrolls, at no cost per frame. A round pale sun beside the name read as a fourth letter. |
| `0196269` Posters | One wanted-poster anatomy for the room's board, the roll call and each wall: *Eftirlýst* across the top in the slab over a double rule, the outlaw's face large in a wooden frame, the name in the slab, the alias in red, the charge, the bounty as *Verðlaun*. | The word every wanted poster leads with was the smallest thing on these, the outlaw's face was a thumbnail, and the three pages used three different posters. |
| `1ac648a` World | The lantern that boots the 3D map is itself the control, at six times its pixels on a wide screen and four on a phone, in a pool of night instead of a panel. | The design says the lantern is what you press; it was a small icon in a generic notched card. |

Found on the way: the sun's size had been written to `--sun`, the sun's colour token, so the sun had been painted in the paper colour of the letters since the hero pass; it is `--sun-size` now.

| Page | Mobile perf | LCP | CLS | Desktop |
|---|---|---|---|---|
| `/` | 97 (was 96) | 2.62 s | 0.000 | 100 |
| `/crew` | 98 (was 97) | 2.28 s | 0.006 | 100 |
| `/crew/stebbias` | 92 (was 90) | 3.36 s, the blocked skin image | 0.000 | 100 |

First Load JS is unchanged at 138 kB for the home page. No horizontal overflow and no console errors at 360, 390, 768, 1024, 1440 and 1920 on any of the three pages; the server offline and reduced motion were checked on the hero.

Not done, and why:

- **Spacing on a pixel grid.** The spacing scale is already on a 4 px grid, every step a whole number of the art's 2 px pixels. What is off it are the fluid gutter and a few `clamp()` paddings, and pinning those to whole pixels would change nothing a visitor can see.
- **Tilting the roll call's posters** to break the grid: rotated pixel type falls off its grid and smears.
- **Still boxed:** the play night's card in the crew's room is a bordered panel, and the room's row of portraits is a row of equal frames. They are the next candidates for the same treatment.

### The fires, and a review on phones

**The play nights** were the last boxed thing in the crew's room, and an open night put each time in a box inside that box. A night is now drawn as the crew at a campfire: the fire on a patch of ground, the heads of who is coming standing beside it, and an open night's times as campsites side by side. Only the form for lighting a fire keeps an edge. The row of portraits was looked at with real heads and left alone: it already says who is in with a lit lantern behind each.

**A review** followed: a separate read of the whole diff for bugs, and a sweep of every page, tab, room and overlay on a phone at 390 and 360 with staged data (the hero copied and the bar copied, the world, a postcard, the drawn map and a pin on it, the album, the lightbox, the map full screen, both rooms scrolled, a crate on the shelf, the campfire and the duel, the roll call and its board tab, a wall and its sign-in, a night's link, a place's link, the 404 and the admin sign-in). What it found and what was done:

| Found | Fixed |
|---|---|
| With a play night planned, the hero's night line ran across the sun on a phone, light words on its white core. | On a phone the sun hangs in the hero's own open row between the words and the name, sized to that row; the sky's sun is for wider screens. |
| Without their panel the lantern's small words measured about 3:1 against the bright middle of the sky on a phone. | A soft pool of night behind the lantern; every line now measures 5.0:1 or better at 360, 390, 1024 × 600, 1440 and on a phone on its side. |
| A phone on its side (844 × 390) had no name on its first screen: the title card put it under the door bar. | Below 500 px of height the name comes first and the words follow. |
| A shared place link (/stadur/<id>) on a phone stopped 83 px short, with a strip of the hero above the world. Older than this pass. | Revealing the place's chip scrolls only the rail, never the page, so the page's own scroll to the world finishes. |
| "Eftirlýst" could clip on the narrowest roll-call cards, and long names were cut short at 320 px. | The masthead's and the name's smallest size is the scale's smallest; both scale with the poster. |
| The square sun's white core also lit the faint sun on a postcard with no photo yet. | The core is lit only in the sky and the hero. |
| A night under way had an amber kicker, against the rule that amber is only for what can be pressed. | It says so in the server lantern's green. |
| The admin sign-in still signed itself "JOÐ". | It says JOÐcraft and the address, from the same constant as everywhere else. |

After the fixes: no horizontal overflow and no console errors in any of the 27 states at 390 or 360; Lighthouse mobile 98 for the home page (LCP 2.35 s, CLS 0), 97 for the roll call, 91 for a wall (its LCP is the skin image the sandbox blocks), desktop 100.

