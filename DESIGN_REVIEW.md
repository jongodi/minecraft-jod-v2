# JOÐ design review

Phase 1 of the design upgrade: a review of the site as it is, before any code is touched. Measured on 4 October 2026 against a production build (`next build` + `next start`) of commit `66ba3b1`, in headless Chromium 1194. The sandbox has no route to minotar.net, mc-heads.net, Exaroton or mcsrvstat, so every screenshot shows the fallbacks the site draws for those: the unknown-head glyph, the dark lantern saying "Náði ekki sambandi". That is itself useful: it is what a visitor sees when the server is down.

Screenshots are in `shots-before/` (not committed; `node scripts/shots.mjs` regenerates them). Lighthouse reports are summarised in section 7.

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
