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
| Twilight | The land | territory | The map stays interactive (drag, zoom, pins). It becomes a surveyor's sheet pinned to the board, with terracotta strata as its border. |
| Twilight | Pictures | postcards | The album stays. Prints sit on the night surface with paper borders; layout rhythm comes from the existing wide-print logic, not a uniform grid. |
| Night | Duel | showdown | The reaction game stays. The arena is the mesa at night; the flash is lantern light. |
| Night | Tallies | tallies | Stats become letterpress notices on the board: three posted sheets for the top three, a ledger below. Values in pixel type because they come from the game. |
| Night | Posted: what is installed | provisions | The datapack list becomes one long notice on the board. |
| Deep night | Ride in | ride | Restored from #45 with its original three steps as trail markers, ending at the address. |
| Campfire | Footer | footer | Links and the Mojang note, small, beside a pixel campfire with a few embers. |

## Identity pillars

1. **Terracotta strata.** The banded terracotta layers of the badlands are the core motif: section dividers, the frame of the map, the base of the logo mark. Purpose: it is the one Western landscape native to Minecraft, so the brand reads Western and Minecraft in a single shape.
2. **Lantern light means interactive.** Amber is reserved for things you can act on. Purpose: light becomes the wayfinding system, so a visitor never has to guess what is clickable.
3. **Pixel type means live game data.** The pixel face appears only on the address, online status, player count, version and stat values. Purpose: when the visitor sees pixels, the actual server is talking.
4. **Printed paper means notices.** Stats, the installed-pack list and the join steps sit on weathered paper as letterpress notices. Purpose: on the frontier things were posted on a board, not listed in a UI.
5. **Night is the canvas.** Surfaces are warm off-black. Only the sky itself reaches blue-black at full night. Purpose: warmth keeps the page from reading as a generic dark theme.

## Palette (locked as tokens)

Tuned against the terracotta block textures: the in-game blocks are dustier than the starting values, so the four colored terracottas were desaturated slightly and the yellow was warmed.

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
| Text | Literata | A book serif designed for long reading on screens, with an optical-size axis so it stays sturdy small and calm large. |
| Data | Silkscreen | Drawn on an 8 px grid, so it stays crisp when sized in whole multiples. Used only for live server data. |

Rye, Caveat, Lora and JetBrains Mono are removed from the public site. JetBrains Mono stays only if the admin tools still reference it.

## Motion

One scroll value drives the evening. Effects are separate modules, each switchable on its own: sky, parallax, particles, cursor light, audio.

- Sky: CSS scroll-driven animation on the hero (`animation-timeline: scroll()`), with an IntersectionObserver plus requestAnimationFrame fallback that sets the same custom property.
- Parallax: four mesa layers on desktop, two on phones, SVG with `shape-rendering: crispEdges`, moved in whole pixels.
- Particles: one canvas, dust at sunset that becomes embers at the campfire, paused off-screen and when the tab is hidden, DPR capped at 2, fewer on phones.
- Lantern navigation: a column of lanterns, one per section, in a side rail on desktop and a compact row on phones. Each lights when its section arrives. They are links, so amber is correct.
- Cursor light: fine pointers only. A warm radial light follows the pointer and lifts the paper texture under it. Off on touch.
- Copy address: a telegraph ticker types the confirmation, the button takes a stamp; Clipboard API with a textarea fallback; announced via `aria-live`.
- Ambient sound: wind and a distant fire from Web Audio noise and filters, off by default, toggle in the lantern rail, remembered in localStorage.
- Reduced motion: no parallax, no particles, no scroll scrubbing. The page shows a fixed dusk-to-night composition.

Gestures that need physics (map drag and zoom, lightbox throw, phone drawer) keep `framer-motion`, which is already installed. Everything that CSS can do is done in CSS.

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
| Cursor light lifts paper texture | The one desktop-only effect rewards a fine pointer without hiding anything from touch. |
| Fewer layers and particles on phones | Holds 60 fps on a mid-range phone where the effect would otherwise be the first thing to stutter. |
| Sticky address bar after the hero | The address is the site's single purpose, so it stays reachable once the hero scrolls away. |
| `framer-motion` kept for gestures only | Drag physics cannot be done in CSS; everything else can, so it is. |
| Tokens in one file | Components reference names, never values, so the palette can be retuned in one place. |
| Metadata and favicon from the strata mark | The brand should be recognizable in a browser tab and a link preview, not only on the page. |

## Out of scope

`/admin` and `/rp-editor` keep their own dark roots and are not restyled. They read the generic token names (`--bg`, `--accent`, `--text`) that stay defined in `globals.css`. The API layer and data files are untouched except where the status endpoint needs caching and a timeout.

The crew pages (`/crew`, `/crew/[username]`) share the nav, footer and stylesheet, so they get the new tokens, type and board treatment while keeping their structure.
