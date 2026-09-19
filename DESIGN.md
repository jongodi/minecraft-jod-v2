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
| Edition | Java | status lantern, the shelf |
| Game version(s) | 26.1 and 1.21.11 | datapacks.ts gameVersion; also returned live by the status API |
| Since | summer 2024 | Hero copy |
| Access | by invitation only | Hero copy |
| Intro | eight friends, one world, never restarted; custom JOÐ datapacks and resource pack; resource pack downloads on connect | Hero, Provisions |
| Crew | stebbias, AmmaGaur, joenana, ingunnbirta, Gamla123, fafnir1994, IMlonely, eikibleiki | data.ts |
| Live status | /api/server-status (Exaroton, falls back to api.mcsrvstat.us), polled every minute | hooks.ts |
| Player stats | /api/stats (live or cached snapshot with timestamp): play time, mob kills, deaths, time since death, time since rest, travel on foot (walk, sprint, crouch, climb, swim averaged), damage taken over dealt, raid wins, records played | hooks.ts, api/stats/route.ts |
| Map | 11 named places, 3 zones, rivers and trails, editable from /admin | map-types.ts, /api/map |
| Gallery | 11 bundled screenshots, overridable from /admin | data.ts, /api/gallery |
| Duel | three-round reaction game, best time kept in localStorage | QuickDraw.tsx |
| Datapacks | 14 packs with name, description, category, version | datapacks.ts |
| Links | /crew, /admin, "no affiliation with Mojang or Microsoft" | Footer.tsx |

Not present anywhere: server rules, testimonials, uptime or player-count history. So there is no Ordinances section and the board carries only what exists.

## The evening, section by section

The page is shorter because it has fewer rooms, not less in them. The page is two screens and a campfire: the sunset, then the world, which is the page. Everything else is folded into the world's frame: the places, the photos and the painted map as its tools, and the crew and the shelf as two rooms that rise from the foot of the frame when their door is opened, leaving the world in view above them. Nothing scrolls past the world; the page ends where it started, in front of the mesas.

| Hour | Section | id | What it holds |
|---|---|---|---|
| Sunset | Arrival | top | Full-viewport hero. Layered pixel-art mesa silhouettes with parallax, a low sun, the server name in the display slab, one primary action (copy the address), and the status lantern: lit with the player count, the heads of who is in and the game version when online, dark and labelled when offline. |
| Dusk | The world | heimur | BlueMap fills the viewport directly under the mesas, so the badlands sit on top of the real world. The frame opens as a still (`public/map-poster.webp`, taken by `map:poster` at the start view); the viewer, an iframe with its own three.js, boots only when the lantern in the middle is pressed, and on phones it opens full screen instead so its drag and pinch never fight the page scroll. A thin HUD lies over it: the title and the sync date, the heads of who is in, and three tools. *Teiknað kort* lays the painted paper map over the same frame (`MapSheet`, the same `MapArt` the admin edits); *Myndir* opens the whole wall as an overlay in the admin's order; *Heill skjár* hands over to the viewer alone. The eleven places ride a rail along the foot of the frame, each with its photo; a chip or a flag opens the place's postcard. There is no "fly there": the 3D map covers the home area only, and the places are spread across the whole world. |
| Night | The crew's room | hopur | A room over the world, opened from the second door, the status lantern or `/#hopur`. A plank across its top carries the title and the way out. Inside: the eight portraits in one row with a lantern behind the ones who are in, then the wanted board on one rail: one poster per charge, the top three on each. Each poster names the outlaw first (Innipúkinn, Slátrarinn, Draugurinn, Ódauðlegi, Vökustaurinn, Flakkarinn, Boxpúðinn, Ræningjabaninn, Plötusnúðurinn) and the charge under it; the leader in full, second and third as two lines under the rule. A charge nobody has been caught for is not posted. The stats are fetched when the room first opens, not with the page. The whole book is on `/crew` and each player's page. |
| Deep night | The shelf | hillan | The other room, from the third door or `/#hillan`. Every installed pack is a crate with its 12 by 12 glyph; point at one and its label goes on the counter, on paper. One line carries the count and the game version. The address is not posted again: it is in the hero and in the bar. |
| Campfire | Footer | campfire | One band of ground. The three-frame pixel campfire on the earth with its light pooled across it, the far mesas back as a silhouette, the rooms off the evening (the crew, the admin panel), the wind-and-fire toggle, and the way back up to the sunset. Tap the fire and the duel comes out: the reaction game, three draws, best time kept in the browser. |

### Navigation: three lanterns

The bar carries the mark, three doors and the address: Heimurinn, Hópurinn, Hillan. The first door is the world; the other two are rooms that open over it. A door's lantern is lit while the visitor is behind it: the world's once the page has reached the frame, a room's while the room is open. Over the sunset the bar is only its contents; once the page has scrolled it takes a surface. On phones the same three lanterns sit in a bar at the foot of the screen, in reach of a thumb, and the top bar keeps the mark and the address.

The hash is the state. `#hopur` and `#hillan` open their room and bring the frame into view, from the bar, from the status lantern, from the crew pages as `/#hopur`, and from a pasted link; the back button, Escape, the plank's ✕, a tap on the darkened world or the first door close it. No element carries those ids, so the browser has nothing to jump to and the frame is scrolled into view by the page itself. One scroll-spy over one id and one hash listener is the whole of it.

### The rooms

A room is `position: absolute` inside the frame: it rises from the foot of the frame by one transform, stops short of the top (5.5rem on desktop, 4rem on phones) so the world stays in view, and scrolls inside itself with `overscroll-behavior: contain`, so the page never moves under it and no scroll lock is needed. Its plank is the same wood the bar is hung from. While a room is open a dark layer falls over the world (one opacity), the boot lantern and the places fade out, and the world's controls are `inert`. A room's contents are code-split and mounted on first opening; the chunks are fetched once the page is idle so the door opens at once. Under reduced motion a room appears without sliding.

## Identity pillars

1. **Terracotta strata.** The banded terracotta layers of the badlands are the core motif: section dividers, the frame of the map, the base of the logo mark. Purpose: it is the one Western landscape native to Minecraft, so the brand reads Western and Minecraft in a single shape.
2. **Lantern light means interactive.** Amber is reserved for things you can act on. Purpose: light becomes the wayfinding system, so a visitor never has to guess what is clickable.
3. **Everything is drawn on a pixel grid.** All three families are pixel faces: the slab for headings, a text face for running prose, and the bitmap face for every short string — navigation, controls, captions, tags, counts, and what the server says. Purpose: the type belongs to the same world the screenshots come from, so nothing on the page reads as borrowed from a different site.
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
| Text | Pixelify Sans | The one pixel face with text proportions, so a paragraph still reads at length. Carries running prose only: the hero line, a section's opening sentence, a crew member's own words, the body of a post. Two real cuts, 400 and 600. |
| Label | Silkscreen | Drawn on an 8 px grid, so it stays crisp when sized in whole multiples. Everything that is a short string: navigation, buttons, captions, tags, counts, notices, and live server data. Two real cuts, 400 and 700. |

Both label and text carry a real bold, so nothing is ever synthetically emboldened — faux bold smears a bitmap face. Which selectors sit on which side of the prose/label line is collected in one block at the foot of `badlands.css` and `board.css` rather than spread through them, so the line is one thing to read.

Literata, Rye, Caveat and Lora are removed. JetBrains Mono stays for the admin panel and the pack editor, which are out of scope.

## Motion

One scroll value drives the evening. Effects are separate modules, each switchable on its own: sky, parallax, particles, cursor light, audio.

- Sky: CSS scroll-driven animation (`animation-timeline: scroll(root)`), with a requestAnimationFrame fallback that sets the same custom property where scroll timelines are missing. Night is a second gradient cross-faded over the sunset, not one gradient whose stops are interpolated, so a scroll frame composites a layer instead of re-rasterising the viewport.
- Parallax: four mesa layers on desktop, two on phones, SVG with `shape-rendering: crispEdges`, moved in whole pixels.
- Particles: one canvas, dust at sunset that becomes embers at the campfire, paused off-screen and when the tab is hidden, DPR capped at 2, fewer on phones.
- Lantern navigation: three lanterns, one per door, in the bar on desktop and in a bar at the foot of the screen on phones. Each lights when its section arrives. They are links, so amber is correct.
- Cursor light: fine pointers only. One pre-rasterised disc of warm light follows the pointer, moved by transform. Off on touch.
- Copy address: a telegraph ticker types the confirmation, the button takes a stamp; Clipboard API with a textarea fallback; announced via `aria-live`.
- Ambient sound: wind and a distant fire from Web Audio noise and filters, off by default, toggle in the lantern rail, remembered in localStorage.
- The window: the still inside the world's frame is moved by a CSS view timeline as the frame passes through the viewport, one transform on one layer. Browsers without view timelines get the still where it is.
- Rooms: one transform to open, one opacity to darken the world behind; nothing else moves.
- Reduced motion: no parallax, no particles, no scroll scrubbing, no sun, no window movement, rooms appear in place. The page shows a fixed dusk-to-night composition with the stars out.

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
| Lanterns as navigation | Three doors, each a lantern, double as the visible clock of the evening. |
| One pixel glyph per pack | A drawn glyph tells a visitor what a pack does faster than its name, and keeps the store from reading as a table. Every category has its own drawing, so a pack the site has never seen still gets a real icon instead of a stand-in chest. |
| No dense packing in the album | Dense grid packing moves tiles into earlier holes, so the wall stopped matching the order the admin set. Source order is now the only thing that decides where a picture hangs. |
| The world is painted, not baked | The coastline used to be a constant nobody could change. Terrain is now data the admin paints block by block, so the map can follow the world as it grows. |
| Blocks everywhere | Square corners, one-pixel notches, bevelled solid buttons and a block-rasterised map keep every surface reading as Minecraft, not as a web template. |
| Cursor light is one moving layer | The one desktop-only effect rewards a fine pointer without hiding anything from touch, and costs a composite rather than a repaint. |
| Fewer layers and particles on phones | Holds 60 fps on a mid-range phone where the effect would otherwise be the first thing to stutter. |
| The frame is the whole screen on a phone | Between the top bar and the door bar the world fills the screen, and a room opens over it as a sheet; the phone's home page is the world with three doors under a thumb. |
| The world is the page | The map is what visitors come back for, so it gets the viewport, not a framed box on a subpage. |
| The crew and the shelf are rooms over the world, not sections after it | Two screens and a campfire read as one place; nine posters and fourteen crates below the fold read as a brochure. |
| The world is a window | The still inside the frame moves a little slower than the page as the frame passes (one transform, a view timeline), so the ridge reads as an edge you look over rather than a picture hung on the page. |
| The posters ride one rail on every width | A room should be one screen tall; the board is read by walking along it, and a wheel over it walks it too. |
| A room's stats and stock load when the room opens | A visitor who only came for the world pays for the world. |
| A poster before the viewer | No iframe, no WebGL and none of the viewer's assets until someone asks for them; a visitor who never touches the map never downloads it. |
| Photos live in the world | Every picture is one tap from the place it shows, and the whole wall is behind one button, so the album stopped being a section. |
| The drawn map is a toggle | The paper sheet lies over the same frame the world is in, so the two maps are one place on the page, not two. |
| One poster per category, top three each | Every category is on screen at once, so there is nothing to switch between, and the top three still read at a glance. |
| Nicknames on the posters | A wanted poster names the outlaw, not the statute; the charge sits under the name in small type. |
| The store's label goes on the counter | A crate you point at is read out in full on paper below, so the stock can stay small without the text being lost. |
| The join steps are gone | The address is already the hero's one action and sits in the bar on every page; the status lantern carries the version. |
| The duel is behind the fire | It costs nothing hidden, and finding it is part of the fun. |
| The footer stops repeating the evening | The sections are already in the bar and in the bar at the foot of a phone, so posting them again made the last thing on the page its longest list. |
| The way back is named an hour, not a direction | Scrolling is time here, so the climb back is "aftur í sólsetrið" and the sky really does rewind on the way up. |
| The mesas come back as a silhouette | The page opened over that ridge; closing on it bookends the evening, and it costs no height because it sits behind the band. |
| Sticky address bar after the hero | The address is the site's single purpose, so it stays reachable once the hero scrolls away. |
| `framer-motion` kept for gestures only | Drag physics cannot be done in CSS; everything else can, so it is. |
| Tokens in one file | Components reference names, never values, so the palette can be retuned in one place. |
| Metadata and favicon from the strata mark | The brand should be recognizable in a browser tab and a link preview, not only on the page. |

## Out of scope

`/admin` is a tool, so it uses the same tokens in a quieter register (`src/app/admin/admin.css`): night surfaces, amber only on actions, the display slab for panel titles, pixel type for live values. Its map editor draws the same block map as the public site through the shared `MapArt` component, so what the admin sees is what visitors see. The world itself is painted there: the terrain is a grid of blocks (`src/lib/terrain.ts`) saved with the map, and the coastline's beach is derived from it rather than painted, so a hand-drawn coast still looks right. The resource pack editor that used to live at `/rp-editor` was removed with the redesign, along with `three` and `jszip`; the generic token names (`--bg`, `--accent`, `--text`) stay defined in `globals.css` for the admin panel.

The crew pages (`/crew`, `/crew/[username]`) share the nav, footer and stylesheet, so they get the new tokens, type and board treatment while keeping their structure.
