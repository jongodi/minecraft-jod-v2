# JOÐ: Last Light in the Badlands

Design document for the redesign of play.jodcraft.world. Written before any code was touched. The site is a Next.js 15 app in TypeScript with plain CSS; that stack stays. The site is written in Icelandic; the copy stays Icelandic.

## Concept

The page is one evening on the server. The visitor arrives at sunset over a badlands (mesa) biome and scrolls into night, when the town's lanterns come on. Scrolling is time passing. Every section belongs to an hour of that evening, so the page has a narrative arc instead of a stack of blocks.

Time of day is a single scroll-driven value. The sky, the sun, the stars, the strata dividers and the lantern navigation all read from it. Nothing animates on its own schedule.

## What is actually here (content inventory)

Only this content is used. Nothing below is invented.

| Item | Value | Source |
|---|---|---|
| Server name | JOÐ | data.ts, layout.tsx |
| Address | play.jodcraft.world | data.ts |
| Edition | Java | TrailNav menu, removed RideIn section |
| Game version(s) | 26.1 and 1.21.11 | datapacks.ts gameVersion; also returned live by the status API |
| Since | summer 2024 | Hero copy |
| Access | by invitation only | Hero copy, RideIn copy |
| Intro | eight friends, one world, never restarted; custom JOÐ datapacks and resource pack; resource pack downloads on connect | Hero, Provisions |
| Crew | stebbias, AmmaGaur, joenana, ingunnbirta, Gamla123, fafnir1994, IMlonely, eikibleiki | data.ts |
| Live status | /api/server-status (Exaroton, falls back to api.mcsrvstat.us), polled every minute | hooks.ts |
| Player stats | /api/stats (live or cached snapshot with timestamp) | hooks.ts |
| Map | 11 named places, 3 zones, rivers and trails, editable from /admin | map-types.ts, /api/map |
| Gallery | 11 bundled screenshots, overridable from /admin | data.ts, /api/gallery |
| Duel | three-round reaction game, best time kept in localStorage | QuickDraw.tsx |
| Datapacks | 14 packs with name, description, category, version | datapacks.ts |
| Join steps | recent Java edition; ask one of us for an invite; open Multiplayer, add server, paste the address | RideIn.tsx (removed in #45), TrailNav menu |
| Links | /crew, /rp-editor, /admin, "no affiliation with Mojang or Microsoft" | Footer.tsx |

Not present anywhere: server rules, testimonials, uptime or player-count history. So there is no Ordinances section and the board carries only what exists.

## The evening, section by section

The existing order is kept. Each section gets an hour.

| Hour | Section | id | What changes |
|---|---|---|---|
| Sunset | Arrival | top | Full-viewport hero. Layered pixel-art mesa silhouettes with parallax, a low sun, the server name in the display slab, one primary action (copy the address), and the status lantern: lit with the player count when online, dark and labelled when offline. |
| Dusk | The town: who is in tonight | camp | The intro sentences move here from the hero, followed by the eight crew portraits. Lit lanterns behind the ones who are online; the others sit in dusk. |
| Twilight | The land | territory | The map sheet takes the full width of the page, so the world is big enough to read. The coastline is rasterised once into 20 by 20 blocks, rivers walk the grid, places are pixel banners, and the sheet sits in a wooden pixel frame. The places are listed under it as a grid of cards, each with the photo it holds. |
| Twilight | Pictures | postcards | The wall arrives folded: one rail of item frames you walk along sideways, its ends falling off into the dark, with the next picture peeking in so there is something to walk towards. Every picture is on that rail, so nothing is hidden; the plank at the foot hangs the whole wall instead. Hung, the frames butt against each other on the planks, each with its title on a plate in the bottom rail, every fifth double size and only while a whole block of five follows, so the wall tiles without holes. Nothing is reflowed either way, so the order on screen is exactly the order set in the admin panel. |
| Night | Duel | showdown | The reaction game stays. The arena is the mesa at night; the flash is lantern light. |
| Night | Tallies | tallies | Stats become wanted posters with pixel-torn edges and two nails: three for the top three, a ledger below. Heads are fetched at four times their drawn size so the 8 by 8 face stays sharp. Values in pixel type because they come from the game. |
| Night | The general store | provisions | Closed, the store is its stock: every pack a small crate stacked on the back shelves under the hanging sign, and whichever one you point at has its label read out on the counter below, on paper, with its kind, version and description. The plank opens the shelves proper, where each crate carries its own text and a hanging version tag. Every pack keeps its own 12 by 12 pixel glyph on a paper label in both. |
| Deep night | Ride in | ride | Restored from #45 with its original three steps as trail markers, ending at the address. |
| Campfire | Footer | campfire | One band of ground, no taller than it needs to be. A three-frame pixel campfire stands on the earth with its light pooled across it and embers rising from the flame, and behind it the far mesas of the hero return as a dark silhouette, so the page closes on the landscape it opened over. The evening's own sections are not posted again: the rail, the address bar and the drawer already carry them. What is posted is what is not part of the evening — the crew, the pack editor, the admin panel — and the way back up to the sunset, which rewinds the sky as it climbs. |

## Identity pillars

1. **Terracotta strata.** The banded terracotta layers of the badlands are the core motif: section dividers, the frame of the map, the base of the logo mark. Purpose: it is the one Western landscape native to Minecraft, so the brand reads Western and Minecraft in a single shape.
2. **Lantern light means interactive.** Amber is reserved for things you can act on. Purpose: light becomes the wayfinding system, so a visitor never has to guess what is clickable.
3. **Pixel type means live game data.** The pixel face appears only on the address, online status, player count, version and stat values. Purpose: when the visitor sees pixels, the actual server is talking.
4. **Printed paper means notices.** Stats, the installed-pack list and the join steps sit on weathered paper as letterpress notices. Purpose: on the frontier things were posted on a board, not listed in a UI.
5. **Night is the canvas.** Surfaces are warm off-black. Only the sky itself reaches blue-black at full night. Purpose: warmth keeps the page from reading as a generic dark theme.

## Palette (locked as tokens)

Checked by eye against the terracotta block textures and kept as given: the starting values already sit between the lit and shaded faces of the in-game blocks. The sky values were added so the sunset is built from the same family.

| Token | Hex | Role |
|---|---|---|
| night | #15100D | page surface at night |
| dusk | #2A1A14 | raised surfaces, the board |
| terracotta-red | #8F3D2E | strata |
| terracotta-orange | #A15325 | strata, sun rim |
| terracotta-yellow | #BA8523 | strata, sunset sky base |
| terracotta-white | #D1B2A1 | strata, secondary text on night |
| terracotta-brown | #4D3323 | strata, deep shadow |
| lantern | #F2A63B | interactive only: links, buttons, focus, lit lanterns |
| paper | #E8DCC4 | notices |
| ink | #1E1611 | text on paper |
| sky-sunset | #D8712F → #6B2A2A | hero sky at scroll 0 |
| sky-night | #0C0A14 | sky at full night, the only cool value |

Contrast, checked against WCAG AA: lantern on night 9.3:1, terracotta-white on night 9.5:1, paper on night 12.6:1, ink on paper 13.1:1.

## Typography

Three families, all self-hosted through `@fontsource`, all verified to render þ ð æ ö á é í ó ú ý in Chromium.

| Role | Family | Why |
|---|---|---|
| Display | Alfa Slab One | A Clarendon-descended fat slab, the shape of wood type on a real poster. Used only for the server name and section titles. |
| Text | Literata | A book serif designed for long reading on screens, sturdy at small sizes. Loaded as the weight-only variable cut, since the site sets no italics. |
| Data | Silkscreen | Drawn on an 8 px grid, so it stays crisp when sized in whole multiples. Used only for live server data. |

Rye, Caveat and Lora are removed. JetBrains Mono stays for the admin panel and the pack editor, which are out of scope.

## Motion

One scroll value drives the evening. Effects are separate modules, each switchable on its own: sky, parallax, particles, cursor light, audio.

- Sky: CSS scroll-driven animation (`animation-timeline: scroll(root)`), with a requestAnimationFrame fallback that sets the same custom property where scroll timelines are missing. Night is a second gradient cross-faded over the sunset, not one gradient whose stops are interpolated, so a scroll frame composites a layer instead of re-rasterising the viewport.
- Parallax: four mesa layers on desktop, two on phones, SVG with `shape-rendering: crispEdges`, moved in whole pixels.
- Particles: one canvas, dust at sunset that becomes embers at the campfire, paused off-screen and when the tab is hidden, DPR capped at 2, fewer on phones.
- Lantern navigation: a column of lanterns, one per section, in a side rail on desktop and a compact strip under the address bar on phones and tablets. Each lights when its section arrives. They are links, so amber is correct.
- Cursor light: fine pointers only. One pre-rasterised disc of warm light follows the pointer, moved by transform. Off on touch.
- Copy address: a telegraph ticker types the confirmation, the button takes a stamp; Clipboard API with a textarea fallback; announced via `aria-live`.
- Ambient sound: wind and a distant fire from Web Audio noise and filters, off by default, toggle in the lantern rail, remembered in localStorage.
- Reduced motion: no parallax, no particles, no scroll scrubbing, no sun. The page shows a fixed dusk-to-night composition with the stars out.

Gestures that need physics (map drag and zoom, lightbox throw, phone drawer) keep `framer-motion`, which is already installed. Everything that CSS can do is done in CSS.

### What an animated frame is allowed to touch

The evening and the cursor light both run at frame rate, and both were once
driven by custom properties set on `:root`. Custom properties inherit, so each
frame invalidated the computed style of every element on the page: a scripted
scroll from top to bottom spent five seconds in style recalculation on desktop
and twenty-five on a throttled phone, against eight milliseconds in layout.

Three rules keep that from coming back.

- **Nothing animated at frame rate is set on `:root`.** `--evening` is
  registered with `inherits: false`, and every element that reads it — the sky's
  night layer, the stars, the sun, the mesa layers and their band — carries the
  scroll-driven animation itself. The JS fallback writes to the same set. An
  element that reads `--evening` should therefore be a leaf, or own few children.
- **Per-frame values move a layer; they do not repaint one.** The cursor light
  is a fixed-size disc translated by `transform`, not a viewport-sized gradient
  painted at a moving position. `background-attachment: fixed` and
  `mix-blend-mode` on repeated elements are the expensive version of this and
  are not used.
- **A scroll handler reads `scrollY` and nothing else.** Section offsets are
  measured once and on resize, never inside the handler, so scrolling forces no
  layout. Handlers coalesce into one `requestAnimationFrame` and commit state
  only when the value actually changed.

`scripts/perf.mjs` measures all of this against a running server: image bytes
and decoded pixels, frame pacing over a full-page scroll and a pointer sweep,
and the time spent in style, layout and script. Run it before and after
anything that touches the sky, the parallax, the effects or the scroll
handlers.

### Photographs

Screenshots ship at 1920px and the admin panel accepts up to 2560px, while the
page hangs them at anything from a 52px map thumbnail to a full-screen
lightbox. Every one of them goes through `photoProps` in
`src/components/badlands/photo.ts`, which names the slot and hands back a
`srcset`, so the browser fetches roughly what it will draw. It uses
`getImageProps` rather than `<Image>` because the stylesheet already frames
each picture with its own box, border and `object-fit`. Player heads stay raw
`<img>`: they are 8 by 8 textures and must not be resampled.

## Every major decision and its purpose

| Decision | Purpose in one sentence |
|---|---|
| Scroll is time of day | Gives the page a story so the sections feel like one evening rather than a list. |
| Badlands, not saloon props | The badlands exist in Minecraft, so the Western reading comes from the game and not from clip art. |
| Strata as the only ornament | One motif, repeated, is what makes a screenshot of any section recognizable. |
| Amber only on interactive elements | Visitors learn in one glance that light means "you can act here". |
| Pixel face only on live data | Draws a hard line between what the site says and what the server says. |
| Paper only for notices | Stats, packs and join steps read as posted documents, which is the frontier's own UI. |
| Warm off-black surfaces | Keeps the night from becoming a generic dark theme. |
| Intro copy moves to the town section | The hero holds one message and one action; the explanation belongs where the people are. |
| Ride in restored | The brief asks for join steps ending at the address, and the steps already existed in the repo. |
| No rules section | No rules exist in the content and nothing may be invented. |
| Lanterns as navigation | Section navigation doubles as the visible clock of the evening. |
| One pixel glyph per pack | A drawn glyph tells a visitor what a pack does faster than its name, and keeps the store from reading as a table. Every category has its own drawing, so a pack the site has never seen still gets a real icon instead of a stand-in chest. |
| No dense packing in the album | Dense grid packing moves tiles into earlier holes, so the wall stopped matching the order the admin set. Source order is now the only thing that decides where a picture hangs. |
| The world is painted, not baked | The coastline used to be a constant nobody could change. Terrain is now data the admin paints block by block, so the map can follow the world as it grows. |
| Blocks everywhere | Square corners, one-pixel notches, bevelled solid buttons and a block-rasterised map keep every surface reading as Minecraft, not as a web template. |
| Cursor light is one moving layer | The one desktop-only effect rewards a fine pointer without hiding anything from touch, and costs a composite rather than a repaint. |
| Fewer layers and particles on phones | Holds 60 fps on a mid-range phone where the effect would otherwise be the first thing to stutter. |
| Long sections arrive folded | The album and the store were a screen and a half of scrolling each before anything else could be reached; folded they are a glance, and the visitor decides when to open them. |
| The folded album is a rail, not a short grid | Cutting the wall to the first few pictures would hide the rest behind a button; a rail keeps every picture one sideways push away, so folding costs the visitor nothing. |
| One plank folds both | The same wooden control in both places is learned once, and it says what it opens and how much is in there before it is pressed. |
| The store's label goes on the counter | A crate you point at is read out in full on paper below, so the stock can stay small without the text being lost. |
| Folding scrolls the section's top back | A section that shrinks under the visitor would leave them standing below it wondering what happened. |
| The footer stops repeating the evening | The sections are already on the lantern rail, in the address bar and in the drawer, so posting them a fourth time made the last thing on the page its longest list. |
| The way back is named an hour, not a direction | Scrolling is time here, so the climb back is "aftur í sólsetrið" and the sky really does rewind on the way up. |
| The mesas come back as a silhouette | The page opened over that ridge; closing on it bookends the evening, and it costs no height because it sits behind the band. |
| Sticky address bar after the hero | The address is the site's single purpose, so it stays reachable once the hero scrolls away. |
| `framer-motion` kept for gestures only | Drag physics cannot be done in CSS; everything else can, so it is. |
| Tokens in one file | Components reference names, never values, so the palette can be retuned in one place. |
| Metadata and favicon from the strata mark | The brand should be recognizable in a browser tab and a link preview, not only on the page. |

## Out of scope

`/admin` is a tool, so it uses the same tokens in a quieter register (`src/app/admin/admin.css`): night surfaces, amber only on actions, the display slab for panel titles, pixel type for live values. Its map editor draws the same block map as the public site through the shared `MapArt` component, so what the admin sees is what visitors see. The world itself is painted there: the terrain is a grid of blocks (`src/lib/terrain.ts`) saved with the map, and the coastline's beach is derived from it rather than painted, so a hand-drawn coast still looks right. `/rp-editor` keeps its own dark root and reads the generic token names (`--bg`, `--accent`, `--text`) that stay defined in `globals.css`.

The crew pages (`/crew`, `/crew/[username]`) share the nav, footer and stylesheet, so they get the new tokens, type and board treatment while keeping their structure.
