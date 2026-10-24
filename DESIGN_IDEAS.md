# JOÐcraft: design ideas

The next design pass on jodcraft.world. Part 1 is the site as it stood before the pass. Part 2 is the ideas, filtered, with one recommended direction and a plan in passes. Part 3, at the end, is what was built: everything recommended plus both optional ideas, in nine commits, with the numbers before and after.

Measured on 5 October 2026 against a production build (`next build` + `next start`) of `5d3556c`, in headless Chromium 1194. This builds on `DESIGN.md` (the concept) and `DESIGN_REVIEW.md` (the passes from 4 October). I've left out anything those passes already tried and rejected, and say so where it matters.

**Sandbox limits.** The sandbox can't reach Exaroton, mcsrvstat, minotar or mc-heads. So every screenshot shows the fallbacks: the dark lantern saying *Náði ekki sambandi* and the question-mark heads. That's also what a visitor sees when those services are down.

Screenshots for Part 1 are in `docs/design-ideas/before/` (WebP). Part 3 adds a staged before-and-after set (`staged-before/`, `after/`) and three side-by-side comparisons, 2.7 MB in all.

---

## Part 1. The site as it is

### 1.1 What is here

| Route | What it is |
|---|---|
| `/` | The evening. The sunset hero (the name in the mesas, the address, the server's lantern), then the world (the BlueMap still with a lantern that boots the 3D map, a HUD and the places rail), then the campfire footer. Two rooms open over the world: *Eftirlýst* (`#hopur`, the crew, the next play night and the wanted board) and *Hillan* (`#hillan`, the 14 datapacks as crates). |
| `/kvold`, `/kvold/[id]`, `/stadur/[id]` | The same page with a night's fire or a place's postcard open. |
| `/crew` | *Hópurinn*: eight wanted posters, plus a board tab. |
| `/crew/[username]` | A member's wall: their poster, then what they pinned. |
| 404 and error | *Slóðin endar hér*: a dark lantern, two buttons, and the bar and the fire. |
| `/admin`, `/kort/[id]` | The admin tool and the skinned base maps. Out of scope here. |

**Resource Pack Editor.** The code is already gone (it was removed with the earlier redesign, along with `three` and `jszip`). One trace is left: the sentence in `DESIGN.md` line 227 recording its removal. Pass 0 deletes it. No route, middleware rule, redirect, package, test or README line mentions it. *útlitspakkinn* in the shelf copy is the server's resource pack, not the editor, so it stays.

### 1.2 The identity, as it actually is

**Concept.** One evening on the server. You arrive at sunset over a badlands biome and scroll into night. Scroll position is the time of day: the sky, the sun, the stars and the ridges all read it.

**Palette** (`src/app/tokens.css`)

| Role | Token | Hex |
|---|---|---|
| Page surface | `--night` | `#15100D` |
| Raised surface, rooms | `--dusk`, `--dusk-2` | `#2A1A14`, `#21150F` |
| Strata | `--tc-red`, `--tc-orange`, `--tc-yellow`, `--tc-white`, `--tc-brown` | `#8F3D2E`, `#A15325`, `#BA8523`, `#D1B2A1`, `#4D3323` |
| Pressable, and nothing else | `--lantern`, `--lantern-deep`, `--lantern-ink` (on paper) | `#F2A63B`, `#C9801F`, `#794D13` |
| Notices | `--paper`, `--paper-2`, `--ink`, `--ink-soft`, `--ink-faint` | `#E8DCC4`, `#DCCDB0`, `#1E1611`, `#5A4634`, `#6E5A45` |
| Text on night | `--text`, `--text-soft`, `--text-faint` | `#E8DCC4`, `#D1B2A1`, `#9A8272` |
| Sky | sunset top, mid, low, horizon; night top, low | `#3B1A20`, `#8F3D2E`, `#D8712F`, `#E9B24A`; `#0C0A14`, `#15100D` |
| Wood | `--wood`, `--wood-light`, `--wood-dark` | `#4D3323`, `#6B4A2E`, `#35221A` |
| Status | `--online`, `--offline` | `#8FB06A`, `#8F3D2E` |
| Light | `--sun`, `--star`, `--dust`, `--ember` | `#F4D394`, `#E8DCC4`, `#C99A5A`, `#E0602A` |
| Night, translucent | `--veil`, `--pane`, `--scrim`, `--scrim-deep` | night at 0.6, 0.8, 0.8, 0.94 |

**Type.** Three self-hosted faces through `next/font/local`, four files, all preloaded.

| Face | Job | Sizes |
|---|---|---|
| Alfa Slab One 400 | The wordmark, page and room titles, poster names | `--fs-hero` (up to 24rem), `--fs-2xl`, `--fs-xl`, `--fs-lg` |
| Pixelify Sans 400 / 600 | Every sentence the site says | `--fs-sm` 14, `--fs-md` 17, `--fs-lg` 20 |
| Silkscreen 400 | What can be pressed and what the server counts | 8, 16 and 24 px only (its 8 px grid) |

**Spacing.** A 4 px scale (`--sp-1` to `--sp-8`: 4, 8, 12, 16, 24, 32, 48, 64). Fluid gutter `clamp(1rem, 0.5rem + 3vw, 3rem)`, wrap 1160 px, tap target 44 px, bar 56 px, phone door bar 60 px.

**Shape.** Radius 0 everywhere. `--px` is 2 px, one pixel of the art. Corners notched by one pixel (`--notch`). Bevels are 2 px inset light top-left and shadow bottom-right. Borders are 1 px rules or 2 px strokes. Shadows are hard offsets, never blurred. The one soft thing is the pool of light behind a lantern.

**Textures and motifs.** Wood plank with grain, paper with stains, fibre and torn edges, the strata band under every plank, stepped mesa ridges, the lantern (doors, status, the map's boot control), the square Minecraft sun, the three-frame campfire, crates on a shelf, wanted posters, place chips with thumbnails, the paper tooltip, the advancement-style toast on paper.

**Motion.** Scroll-driven CSS animations for the sky, sun, stars and ridges, in whole-pixel steps, with a one-property JS fallback. Durations 120, 240 and 480 ms on `cubic-bezier(0.22, 1, 0.36, 1)`. Rooms slide in on one transform. Infinite loops are opacity only (lantern flicker 3.4 s, fire frames 900 ms). Dust and embers on one canvas, cursor light on fine pointers. All of it off under reduced motion and skipped on low-end devices. Nothing fades up on scroll.

**Wordmark.** **JOÐ** is the mark and the word players say. **JOÐcraft** is the name as written: titles, manifest, footer credit, link previews, email sender. The bar's mark is a pixel J cut from the strata. A pixel Ð was drawn and rejected at 16 and 32 px (it closes into a D). It reads at 48 px and up.

**Copy tone.** Icelandic, plain and specific. Places and things get their own names (doors, lanterns, the plank, the counter) instead of UI words. Examples: *Minecraft-heimur átta vina, frá sumrinu 2024. Aðgangur með boði.* · *Slóðin endar hér* · *Aftur í sólsetrið* · *Söðlaðu hestinn*. No marketing words, no invented numbers, no em dashes in copy.

### 1.3 Critique, desktop (1440 × 900, also checked at 1024 and 1920)

What works and must stay: scroll as time, the world as the page, rooms over the world, amber meaning pressable, the plank and strata, posters, crates and the lantern. None of it reads as a template.

1. **The hero has three alignments and a hole in the middle.** The sentence and button align to the wrap's left. The lantern floats in the middle. The sun is pinned right, and at 1920 it sits *outside* the wrap (x 1530 to 1690 of a wrap ending at 1340). Between the action row and the name there's 260 px of plain sky at 1440 × 900, and 380 px at 1920 × 1080. (`before/home-1440-top.webp`, `before/top-1920.webp`)
2. **Hierarchy jumps from 350 px to 17 px.** After the wordmark, the next thing is a 17 to 20 px sentence. Nothing sits between them, so the one line that says what this place is reads like a caption.
3. **The hero ends at a line, not in the land.** A 6 px strata stripe separates a lit orange ridge from the map still with its black sky. The concept says you walk from the badlands into the world, but the page reads as "new section begins". (`before/kvold-1440.webp`)
4. **The map's HUD tools look disabled.** On desktop, *Teiknað kort*, *Myndir · 11* and *Heill skjár* are thin paper-coloured outlines on a busy photo. On phones the same tools are bevelled wooden keys with amber icons. So one control has two looks, and the desktop look is the weaker one. (`before/home-1440-heimur.webp`)
5. **Rooms have inverted hierarchy.** The room's own title on the plank (*Eftirlýst*, 20 px) is smaller than the heading inside it (*Næsta spilakvöld*, about 44 px). *Á hillunni* has the same issue against its lede. (`before/home-1440-hopur.webp`)
6. **The crew room's empty states are scattered.** With no data you get three separate notes in three places (*næ ekki sambandi…* to the right of the heads, *Ekkert kvöld á dagskrá*, *engar tölur enn…*). It reads as three failures, not one quiet room.
7. **`/crew` and the walls drop the evening.** The home page is a scene. The roll call and the walls are a black page with a back link, until the fire at the foot. Clicking a poster leaves the world entirely. (`before/crew-1440.webp`)
8. **A wall with little on it is a wide empty box.** At 1440 the poster is 830 px wide with the skin on the left and nothing filling the right two-thirds. It also looks nothing like the roll-call poster you just clicked. (`before/crew_stebbias-1440.webp`)

### 1.4 Critique, mobile (390 × 844, also checked at 360 and 768)

1. **The main action is in the hardest place to reach, and too small.** Copying the address from anywhere means tapping the bar's paper tag, top right, 240 × **36** px (`.b-bar.is-solid .b-bar__addr { min-height: 2.25rem }` overrides `--tap`). The bar's mark, the way home, is **24 × 24** px. The doors are at the bottom at 130 × 74, which is right. So the thumb gets the three doors, but not the one action.
2. **On phones the address tag has no verb.** Below 480 px, *afrita* is hidden. All that's left is a 4 px nail and the address, so nothing says tapping copies.
3. **The first screen reads small type first and the name last.** In order: the sentence (17 px), the button, the lantern, then about 250 px of sky with the sun, then *JOÐ* at the bottom with its feet under the door bar. On a phone the eye lands on a paragraph before the brand. (`before/home-390-top.webp`)
4. **The map still is blurry on every phone.** `photoProps(MAP_POSTER, '100vw')` asks for an image as wide as the screen. But the frame is portrait and the still is cropped with `object-fit: cover`, so it's drawn about 1.8× wider than the screen. At 390 px and dpr 3 the browser picks the 828 w file and stretches it about 4×. You can see it at dpr 1 too. (`before/home-390-heimur.webp`) This one is a real bug, not a matter of taste.
5. **On a 768 tablet the doors sit at the bottom** under a top bar that's mostly empty. The doors fit in the top bar from about 640 px. (`before/top-768.webp`)
6. **The rooms on a phone are well built** (a sheet over the world, the plank, Escape and Back close them, focus goes to the ✕). They have the same hierarchy inversion as desktop.
7. **The footer on a phone** stacks links, the button and the credit, with the fire at the very bottom behind the door bar's edge. It's the scene, but it shows up last and half covered. (`before/home-390-bottom.webp`)

### 1.5 Navigation friction (both sizes)

- **The crew has two names and two destinations.** The *Eftirlýst* door opens the room on the home page (`/#hopur`). The footer's *Hópurinn* goes to `/crew`. On `/crew` and every wall the *Eftirlýst* door is lit as "you are here", but pressing it takes you back to the home page's room. A door that's lit as the current page shouldn't take you somewhere else.
- **Admin sits beside the crew.** *Stjórnborð* is the owner's tool, but the footer shows it as a peer of *Hópurinn*.
- **What already works:** no hamburger anywhere; Escape, Back and the ✕ close rooms; focus moves into an opened room; the bar never covers a target (rooms aren't anchors, and the frame is scrolled by script); the skip link is the first tab stop.

### 1.6 Baseline numbers

**Lighthouse 13, mobile preset** (Moto G Power emulation, simulated slow 4G, 4× CPU). The home page was run three times because simulated LCP and TBT vary.

| Page | Perf | A11y | BP | SEO | FCP | LCP | TBT | CLS | SI |
|---|---|---|---|---|---|---|---|---|---|
| `/` run 1 | 84 | 100 | 100 | 100 | 1.1 s | 3.2 s | 360 ms | 0 | 2.8 s |
| `/` run 2 | 97 | 100 | 100 | 100 | 1.1 s | 2.6 s | 30 ms | 0 | 1.1 s |
| `/` run 3 | 95 | 100 | 100 | 100 | 1.1 s | 2.7 s | 110 ms | 0 | 1.1 s |
| `/crew` | 98 | 100 | 96 | 100 | 1.1 s | 2.3 s | 40 ms | 0.006 | 1.1 s |
| `/crew/stebbias` | 91 | 100 | 96 | 100 | 1.1 s | 3.3 s | 130 ms | 0 | 1.1 s |
| `/` desktop | 100 | 100 | 100 | 100 | 0.3 s | 0.6 s | 0 ms | 0 | 0.3 s |

- **LCP is over the 2.0 s target on every mobile run.** The LCP element is `h1.b-hero__mark`, the wordmark. Its time is mostly waiting on three render-blocking stylesheets (simulated 457, 307 and 157 ms: badlands 12.6 kB, tokens and globals 5.2 kB, board 3.7 kB). Then the shared React and Next runtime adds to the simulated dependency graph.
- **Best Practices 96 on `/crew` and the wall** comes only from console errors for the head images the sandbox blocks.
- **The wall's 3.3 s** is the skin image from minotar, which fails here.
- **INP** can't be measured by Lighthouse. The stand-ins are TBT 30 to 130 ms (one 360 ms outlier) and the earlier scroll probe, which showed no long frames on a throttled phone.

**JS and CSS per route** (gzipped, from the build manifest)

| Route | First load JS | of which shared runtime | CSS |
|---|---|---|---|
| `/`, `/kvold`, `/stadur/[id]` | 135 kB (Next reports 138) | 103 kB | 15.6 kB in 3 files |
| `/crew` | 126 kB | 103 kB | 19.0 kB |
| `/crew/[username]` | 149 kB | 103 kB | 19.0 kB |
| 404 | 102 kB | 103 kB | (shared) |

On demand: framer-motion with the album, sheet and lightbox (39.5 kB), the crew room (10.7 kB), the shelf (4.3 kB), particles (2.0 kB).

**Responsive.** At 360, 390, 768, 1024, 1440 and 1920 there's no horizontal scroll on any page. The overflow detector only reports the mesa SVGs the hero clips on purpose and the chips inside the scrolling places rail.

---

## Part 2. Ideas

How the ideas were filtered. I generated about 35 candidates, then cut any idea that:

- could belong to another site,
- doesn't name the moment it improves,
- breaks the evening's language,
- was already built or rejected in `DESIGN_REVIEW.md`,
- or costs more than it pays.

What's left is below. Every kept decision has its one-sentence reason in **bold**.

### A) Navigation concepts

All three keep: five or fewer top-level items, the address one tap away from anywhere, a lit indicator for where you are, no hamburger on desktop, 44 px+ targets on touch, and a compact header that never covers content.

None of the three has a drop-down menu, so there's no menu to trap focus in. The surfaces that do open over the page (the two rooms, the duel, the album, the lightbox) get the full treatment: focus moves in and is trapped, Escape and route change close them, and page scroll is locked or contained.

#### Concept 1: Hotbar and offhand (recommended)

The game's own inventory bar becomes the phone's navigation, and the copy action becomes the offhand slot that sits apart from it, exactly as in the game.

```
390 px
┌──────────────────────────────────┐
│ [J]                    ◉ 3 inni  │ 44 px plank: the mark, the lantern in miniature
├──────────────────────────────────┤
│                                  │
│              page                │
│                                  │
│ ┌──────┬──────┬──────┐  ┌──────┐ │
│ │  ▯   │ ▣    │  ▯   │  │  ⧉   │ │ 64 px: hotbar, 3 slots, the selected one framed
│ │Heimur│Eftir │Hillan│  │Afrita│ │        offhand, one slot set apart, copies the address
│ └──────┴──────┴──────┘  └──────┘ │
└──────────────────────────────────┘

1440 px
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [J] JOÐ   ▯ Heimurinn  ▯ Eftirlýst  ▯ Hillan        ◉ 3 inni  [⧉ play.jodcraft.world afrita] │
└──────────────────────────────────────────────────────────────────────────────────────┘
  the plank: mark, three doors, the lantern in miniature, the address tag
```

- **Mobile.** The bottom bar becomes three hotbar slots (the doors) plus an offhand slot set apart from them, as in the game's HUD. It sits on the right, where the game puts it for a player whose main hand is set to left, because a right thumb reaches that edge first. The offhand copies the address and drops the paper toast. The selected door gets the hotbar's own selection frame: a 2 px light frame one pixel outside the slot, notched, plus `aria-current`. That replaces today's thin amber rule. The top bar shrinks to a 44 px plank with the mark (now a 44 × 44 target) and the server's lantern in miniature (lit or dark, plus the player count). It links to the crew room. **The main action moves from a 36 px tag in the top corner to a 64 px slot under the thumb, and live status becomes visible on every page.**
- **Desktop.** The plank stays: mark, three doors, address. It gains the miniature lantern before the address, so the server's state shows on every page and not just in the hero. **A returning player's first question is "is it on?", and it should be answered wherever they land.**
- **Tablet (640 to 899 px).** The doors move into the top bar and the hotbar goes away. **At 768 the top bar has room for them, and a tablet isn't held like a phone.**
- **Why it fits.** Every visitor has used a hotbar thousands of times. The selection frame is the game's own "you are here", and the offhand is the game's own "the other hand, always ready".
- **Why it's easier than today.** One reachable place for everything on a phone, a proper target for the main action, and status on every page.

#### Concept 2: The same plank, set straight

Keep today's layout and fix only what's broken.

- **Mobile.** The door bar as it is, with:
  - the bar's address tag at 44 px and showing a copy glyph,
  - the mark at 44 × 44,
  - one name for the crew,
  - a lit door that never leads away from the page you're on.
- **Desktop.** Unchanged apart from the crew fix and *Stjórnborð* moving into the credit line.
- **Why.** **It is the smallest change that removes every real friction found in 1.4 and 1.5.**
- **Weakness.** The main action stays in the top corner on phones.

#### Concept 3: Trail marker

A thin vertical strata column down the left edge on desktop. It's marked with the hours (sunset, the world, the fire), fills as you scroll, and each hour can be clicked. Phones get Concept 1's hotbar.

- **Why it fits.** Scroll is time here, and this would show it.
- **Why I don't recommend it.** The home page is only three screens tall, and the sky already shows the time. It adds a second navigation system to a page that needs one.

**Common to all three: one crew door.**

- *Eftirlýst* stays the door's name (the wanted board is the better sign). The footer's *Hópurinn* link goes, since the room's own foot already leads to *Veggir hópsins og öll tölfræðin*.
- On `/crew` and the walls, the lit *Eftirlýst* door points to `/crew` itself (`aria-current="page"`, and it scrolls to the top). It never leads back to the home page's room.
- *Stjórnborð* moves into the footer's small credit line.

**One place, one name, and a lit door that keeps its promise.**

### B) Layout concepts

#### Home: the hero

**Desktop (1440).** Keep the title card. Tighten it to one left edge and three levels.

```
1440 × 900
┌───────────────────────────────────────────────────────────────────────────────┐
│ plank (transparent over the sky)                                              │
│                                                                   ┌────┐      │
│   Minecraft-heimur átta vina,                                     │ ■  │ sun  │  sentence at the middle step
│   frá sumrinu 2024. Aðgangur með boði.                            └────┘      │  (Pixelify 600, ~32 px)
│                                                                               │  sun pulled inside the wrap
│   [⧉ PLAY.JODCRAFT.WORLD]   ◉ Slökkt á þjóninum · síðast kveikt í gær          │  action row unchanged
│                              ▲ Næsta spilakvöld: fim. 20:00                   │
│                                                                               │
│   ██ ██ ██   JOÐ   (the name, among the ridges)                               │  name, 22 to 24rem
│ ▄▄█▀▀▀▀█▄▄▄▄▄█▀▀█▄▄▄▄▄█▀▀▀▀█▄▄▄ ridges ▄▄▄▄█▀▀▀▀▀█▄▄▄▄▄▄▄▄▄█▀▀█▄▄▄▄▄▄▄▄▄▄▄▄▄▄ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ near ridge runs on, over the top of the world ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  see C2
└───────────────────────────────────────────────────────────────────────────────┘
```

- The sentence moves up a step, from 17 to 20 px to about 32 px (Pixelify 600, `--fs-xl`), with the wordmark's hard pixel shadow it already has. **The one line that says what this is should be the second loudest thing on the screen, not the fifth.** It stays on the dark upper sky, where it measured 7:1 or better.
- The sun moves inside the wrap, right-aligned to the wrap's edge at every width. **Three things on two edges read as a composition, and at 1920 the sun currently floats outside it.**
- The 260 px gap shrinks because the sentence grows. What's left stays as sky, on purpose: the sky is the scene, and it changes as you scroll.
- **Cut nothing.** Every element in the hero earns its place.

**Mobile (390).** A different composition, not a squeezed desktop. It reads top to bottom: what this is, then who it is, then what to do, and the action ends up in the thumb's reach.

```
390 × 844 (with Concept 1)
┌──────────────────────────────┐
│ [J]                ◉ slökkt  │ 44px plank
│                        ┌──┐  │
│ Minecraft-heimur átta  │■ │  │ sentence, 20 px, on the dark upper sky
│ vina, frá sumrinu      └──┘  │ sun, small, top right (it sets with the scroll)
│ 2024. Aðgangur með boði.     │
│                              │
│                              │
│      J O Ð                   │ the name, centre of the screen, among the ridges
│ ▄█▀▀█▄▄▄█▀▀▀▀█▄▄▄█▀▀█▄▄▄▄▄▄▄ │
│ ▓▓▓▓▓▓▓ ground ▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ [⧉ PLAY.JODCRAFT.WORLD     ] │ full-width button on the dark ground: 8:1 or better
│ ◉ Slökkt á þjóninum · í gær  │ lantern line under it
├──────┬──────┬──────┐ ┌──────┤
│Heimur│Eftir │Hillan│ │Afrita│ hotbar
└──────┴──────┴──────┘ └──────┘
```

- The name takes the middle of the screen, standing in the ridges as it does now. Under the ridges, the hero ends in a band of dark ground. The address button sits on that ground, full width, with the lantern line under it, right above the hotbar. **On a phone the brand should be seen first and the action should be under the thumb. Today it's the other way round.**
- The button on dark ground needs no shadow tricks to read, and the sky above holds only one sentence and the sun.
- A phone on its side keeps today's rule: below 500 px of height the name comes first.

**Transitions.** Hero to world goes through the ridges (C2). World to fire stays as it is: the frame's foot rests on a ground line and the fire band has the far ridge in silhouette. **It already closes the evening where it opened.**

#### Home: the world

- **Desktop.** The HUD tools become the same bevelled wooden keys as on phones, with their words beside the icon (there's room). **One control should have one look, and the phone's look is the better one** (1.3 #4).
- **Mobile.** The still is requested at the width it's actually drawn: about 1.8× the screen on a portrait frame (`sizes="(max-aspect-ratio: 1/1) 180vw, 100vw"` or computed from the frame's aspect ratio). **The world is what visitors come for, and on every phone it's currently a blur.** Expect about 40 to 60 kB more on phones, behind the hero, at `fetchPriority="low"` as now.
- **Keep:** the places rail, the boot lantern and the full screen.

#### Home: the rooms

- The room's title on the plank goes to `--fs-xl`, and headings inside a room drop to `--fs-lg`. **A room's name is the biggest thing in the room.**
- *Eftirlýst* with nothing to show gets one line under the portraits that covers all of it: *Næ ekki sambandi við þjóninn núna; tölurnar og kvöldin birtast þegar hann svarar.* The three scattered notes go. **One quiet sentence reads as a state; three read as breakage.** The empty night shows its small fire with *Ekkert kvöld á dagskrá* beside it, not under a big heading.

```
Eftirlýst room, 1440
┌ plank ─ Eftirlýst ──────────────────────────────────────────────── [✕] ┐
│  [■][■][■][■][■][■][■][■]   heads, the ones who are in lit                      │
│  Næ ekki sambandi við þjóninn núna; tölurnar og kvöldin birtast þegar hann svarar. │
│  ▲ Ekkert kvöld á dagskrá.                               [Kveikja eld]          │
│  ─── wanted board (rail of posters) ───                                          │
│  [Veggir hópsins og öll tölfræðin →]                                            │
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### Home: the campfire

- **Mobile.** Put the fire first in the band, then *Aftur í sólsetrið*, then the links, then the credit. **The fire is the scene and the duel's door. It shouldn't come last, half under the door bar.** The band gets bottom padding equal to the hotbar.
- **Desktop.** Unchanged apart from *Stjórnborð* moving into the credit line.

#### `/crew`: the roll call at night

```
1440                                                         390
┌──────────────────────────────────────────────────┐        ┌───────────────────────┐
│ plank                                             │        │ [J]          ◉ slökkt │
│ ·  ·   stars  ·      ·        ·    ·     ·        │        │ ·  stars   ·    ·     │
│  Eftirlýst                       [Félagar|Taflan] │        │ Eftirlýst             │
│  Öll sem hafa aðgang …                            │        │ Öll sem hafa aðgang … │
│ ▄█▀▀█▄▄▄█▀▀▀ far ridge, night ▀▀▀█▄▄▄█▀▀█▄▄▄▄▄▄▄ │        │ [Félagar] [Taflan]    │
│ [poster][poster][poster][poster]                  │        │ ▄█▀▀█▄▄ ridge ▄▄█▀▀█▄ │
│ [poster][poster][poster][poster]                  │        │ [poster][poster]      │
│                fire band                          │        │ [poster][poster] …    │
└──────────────────────────────────────────────────┘        └───────────────────────┘
```

- The page gets the night sky (the same tiled stars) and the far ridge in silhouette behind the title, and the posters hang below the ridge line. **The roll call is the same evening an hour later, not a different website.** Cost: the existing star tile and `Ridge` component, server-rendered, no new JS.
- The title is the door's name, *Eftirlýst*, so the door you pressed and the page you land on agree.
- *← Aftur á forsíðu* goes: the mark, the doors and the hotbar already do that job.
- **Keep the 4 × 2 and 2 × 4 poster grid.** These are eight parallel people, which is exactly when a grid is right.

#### `/crew/[username]`: the wall

```
1440                                                         390
┌──────────────────────────────────────────────────┐        ┌───────────────────────┐
│ ┌──────────────┐  ┌─ pinned sheet ────────────┐   │        │ ┌───────────────────┐ │
│ │ EFTIRLÝST    │  │ print / note              │   │        │ │ EFTIRLÝST         │ │
│ │  [ skin ]    │  └───────────────────────────┘   │        │ │ [skin]  stebbias  │ │
│ │  stebbias    │  ┌─ pinned sheet ────────────┐   │        │ │ bio · stats       │ │
│ │  alias, bio  │  │ …                         │   │        │ └───────────────────┘ │
│ │  stats       │  └───────────────────────────┘   │        │ [pinned sheet]        │
│ │  (sticky)    │                                  │        │ [pinned sheet]        │
│ └──────────────┘                                  │        └───────────────────────┘
└──────────────────────────────────────────────────┘
```

- From 1024 px, the poster becomes the roll call's portrait poster at 1.5× scale, pinned left (sticky), with what the member pinned flowing in a column on the right. **The poster you clicked on `/crew` should be the poster you arrive at, and the right two-thirds of the page should hold their pictures, not empty paper.**
- **Mobile.** Unchanged in order: poster, then sheets. The poster's skin and name share a row so the first sheet starts above the fold.

#### 404 and error

Keep. It's on brand, short, and has two ways out. It inherits the hotbar.

### C) Signature moments

Five ideas, ranked. Each has a cost I'm willing to defend.

#### C1. Someone's home: lit windows in the name, and the crew on the ridge

- **What.** When the server is up and anyone is in, the counters of the **O** and the **Ð** in the hero's *JOÐ* light up warm (`--sun`) like windows with people behind them. Their heads stand on the plateau of the near ridge beside the name, as 8 × 8 skins drawn at 4× and `image-rendering: pixelated`. When nobody is in, the windows show the sky through them, as they do now, and the ridge is empty.
- **Where.** The hero, both sizes. On a phone, up to four heads, then a *+n* tag.
- **Why.** The name is the most-seen thing on the site, and this turns it from a logo into a house you can see is occupied from across the room. It answers "is anyone on?" before any text is read, and it makes the Ð an owned, living part of the brand rather than a letter.
- **Behaviour.**
  - The windows light over 480 ms opacity when the status changes. Same on reduced motion, since it's a state and not decoration.
  - Heads don't move. A head is a link to that member's wall, with the paper tooltip naming them.
- **Performance.**
  - Two absolutely positioned spans behind the `h1`, sized in `em` against Alfa Slab's fixed counters, opacity only. No effect on LCP: the `h1` stays the LCP text and the spans are empty boxes.
  - Heads are at most eight 1 kB images, server-rendered from the status the page already has, `loading="lazy"`, below the name in source order.
  - **Fallback:** status unknown means dark windows and no heads.

#### C2. Down into the valley: the hero to world transition

- **What.** The near ridge runs past the bottom of the hero and over the top of the world frame by 64 px on desktop and 40 px on phones. It's the same stepped outline, gone dark at night, and the frame's top edge is clipped to it. As you scroll, the ridges already sink. Now you see the town's still appear *between and below* them, as if you've come over the mesas and are looking down into the valley.
- **Why.** The concept's central claim (you move from the badlands into the world) is currently told by a 6 px line. This makes the page's one big transition feel like moving through the land.
- **Mobile and desktop.** Same idea, one ridge on phones (as the hero already does), with a 40 px overlap.
- **Performance.** CSS and the existing `Ridge` SVG. The overlap rides the same scroll timeline as the ridges, with transforms in whole pixels. No new JS. Under reduced motion the ridge sits still at the overlap.

#### C3. The offhand slot and the hotbar

Concept 1 above, counted here because it's the one in-game UI reference a visitor uses on every visit. **Recognised in a glance by every player, and it fixes the thumb-reach problem at the same time.** Cost: CSS and markup in `AddressBar`. No new JS beyond the copy hook it already uses.

#### C4. The block-break hand-off

- **What.** When the 3D map is ready behind the still, the still breaks away block by block instead of fading. It's a grid of 16 × 9 blocks on desktop and 6 × 12 on a phone. Each block shows the game's crack overlay in three stages (drawn on the 16 grid, one tiny sprite) and then goes. The sweep runs outward from the lantern you pressed, over 480 ms in total.
- **Why.** Pressing the lantern is the one moment on the site where the visitor asks for more. The break shows that the picture was a picture and that the live world is under it, using the game's own verb for "remove this".
- **Mobile and desktop.** The same sweep with fewer, larger blocks on phones.
- **Performance.**
  - The blocks are divs that share the already-decoded still as `background-image` with `background-position`, so there's no new image. Only opacity animates, with a per-block `animation-delay`.
  - It runs once, only after the viewer reports its first frame, and only if `useEffectsAllowed()` (not on low-end devices, not on Save-Data).
  - Under reduced motion or on low-end devices it's today's crossfade.
- **Cost.** Medium. Only worth it if C1 to C3 are in.

#### C5. The Ð seal

- **What.** A wax seal in `--tc-red` with the Ð cut into it in the slab, used in exactly three places: the foot of each wanted poster (the board's authority), the corner of the copy toast, and the corner of a wall's poster. Always 48 px or larger, where the earlier trial showed the Ð reads as Ð.
- **Why.** The brief asks for the Ð as an owned, recurring element. A seal is what a frontier notice was authorised with, and it puts the Ð at a size where it actually reads.
- **Performance.** One inline SVG symbol. No effect on any metric.

**Considered and cut**

| Idea | Why it's out |
|---|---|
| Light that follows device tilt on phones | iOS asks for a permission prompt to read motion. Asking for a sensor to light a sunset isn't worth it. |
| Sky by the real clock | It breaks scroll-as-time, which is the concept. |
| A weather shift (rain over the mesas) | There's no real weather data to drive it, so it would be decoration. The season system already covers snow. |
| Minecraft title-screen splash text beside the name | Rotated pixel type falls off its grid and smears (found in the last pass). |
| Purple Minecraft-style item tooltips | The paper tag is already the site's tooltip, and purple breaks the palette. |
| WebGL hero scenery | The real 3D world is one tap away, and the hero is the LCP. |
| Fade-up on scroll, counters that roll up | They explain nothing. |
| Pixel Ð as the bar's mark | Tried and failed at 16 to 32 px. The seal (C5) uses it at a size where it works. |

### D) Visual system refinements

**Type: one size per role, and more contrast between steps.**

| Role | Face | Size |
|---|---|---|
| The name | Alfa Slab | `--fs-hero` |
| Page and room titles | Alfa Slab | `--fs-2xl` (pages), `--fs-xl` (rooms on their plank). Nothing inside a room is bigger. |
| Headings inside a room or page | Alfa Slab | `--fs-lg` |
| The hero sentence and ledes | Pixelify 600 | `--fs-xl` (hero), `--fs-lg` (ledes) |
| Body | Pixelify 400 | `--fs-md` |
| Small print | Pixelify 400 | `--fs-sm`, and never smaller |
| Pressables and server data | Silkscreen | 16 and 24 px (8 for a tag's numeral) |

**No new sizes.** The nine tokens stay, and every use is mapped to a role. Steps above body are at least 1.25× apart, and display steps at least 1.5×.

**Palette roles.** No new colours. Two roles get written down so they stay consistent:

- **Chat colours for state:** `--online` (in, lit), `--tc-yellow` (kindling), `--tc-red` (off, crashed). These are used only for the server's state, never for decoration.
- **Home light:** `--sun` is the colour of the lit windows (C1). It's never used for something pressable, so amber keeps its meaning.

**Iconography.** Every icon is drawn on a 16 × 16 grid, at 1×, 2× or 3× only, with `shape-rendering: crispEdges`, no circles and no diagonals except 45°. That covers the lantern, chevron, copy, sound, map, picture, moon, ✕ and the new seal. The bar's 4 px nail becomes the copy glyph, so the tag says what a tap does (1.4 #2).

**Light rules.** The scene has four light sources: the sun, lanterns (pressable), the fire, and the windows (people are in). Only these four may cast a soft pool. Everything else is hard-edged: hard shadows, bevels, notches. **If something glows, there must be a light there.**

**Motion language.** Nothing else moves.

| What moves | Trigger | Duration and easing | Why |
|---|---|---|---|
| Sky, sun, stars, ridges, the valley overlap | Scroll position | scroll-linked, whole-pixel steps | Scrolling is time passing |
| A room | Opening a door | 240 ms transform, ease-out | It rises over the world, which stays in view |
| The toast | Copying | 240 ms in, held 2.6 s, 120 ms out | The game's advancement idiom says "done" |
| The windows in the name | Status change | 480 ms opacity | Someone came home |
| The block-break | The 3D map's first frame | 480 ms total, opacity per block | The picture gives way to the world |
| Lantern flicker, fire frames | Always, while on screen | 3.4 s opacity; 900 ms `steps(3)` | Live light; paused offscreen |
| Hotbar selection frame | Changing door | instant | The game snaps; so does this |

Reduced motion keeps only state changes (the windows, the toast in place, rooms without the slide). Low-end devices skip particles, the cursor light and the block-break.

---

## Recommended direction

**Concept 1 navigation, the mobile-first hero, C1 to C3 as the signature, D throughout. Then C4 and C5 if you want them.**

The evening stays exactly as it is. The work makes four things true that aren't yet:

- the main action is under the thumb on a phone,
- the crew has one door that keeps its promise,
- the land carries you from the badlands into the world,
- the name tells you whether anyone is home.

## Implementation plan

One commit per pass. After each one: `next build`, screenshots at 390 and 1440 compared with the pass before, a throttled-mobile check of any effect, Lighthouse on `/`, and fixing regressions before moving on. Ordered by impact over cost.

| Pass | What | Why, in one sentence | Measure |
|---|---|---|---|
| 0 | **Fixes.** The phone's map still requested at its drawn width; the bar's mark and address tag at 44 px; the copy glyph on the tag; the Resource Pack Editor sentence removed from `DESIGN.md`. | Two real bugs and the last trace of the editor, before anything visual moves. | Still sharp at 390 dpr 3; target sizes; `grep` clean. |
| 1 | **Navigation (Concept 1).** Hotbar and offhand on phones, doors in the top bar from 640 px, the miniature lantern in the bar, one crew door, `/crew` lit door stays on `/crew`, *Stjórnborð* into the credit line. | The main action under the thumb and status on every page. | Tab order; `aria-current`; targets ≥ 44 px; screenshots at 360, 390, 768. |
| 2 | **The hero.** Phone composition (sentence, name, address on the ground); desktop sentence at the middle step and the sun inside the wrap. | The brand first and the action in reach on phones, and three clear levels on desktop. | Contrast ≥ 4.5:1 on every hero line at all six widths; CLS 0; LCP no worse. |
| 3 | **Down into the valley (C2).** | The page's one big transition happens in the land. | Scroll probe: no long frames at 4× CPU; reduced-motion shot. |
| 4 | **Someone's home (C1).** | The name answers "is anyone on?" before a word is read. | Staged online and offline states; LCP element unchanged. |
| 5 | **Rooms and the world's HUD.** Room hierarchy, one empty-state line, the desktop HUD tools as wooden keys. | A room's name is its largest thing, and one control has one look. | Shots of both rooms at 390 and 1440. |
| 6 | **`/crew` at night and the wall's two columns.** | The roll call and the walls are the same evening, and the poster you click is the poster you get. | `/crew` and a wall at all six widths; Lighthouse on both. |
| 7 | **Performance.** `board.css` loaded with the rooms instead of on first paint; the static hero, mesa and footer markup moved to Server Components where they read no client state; re-measure LCP. | Fewer render-blocking bytes and less to hydrate is what stands between 2.6 s and 2.0 s. | Lighthouse mobile ×3 on `/`; JS per route before and after. |
| 8 | **Optional: the Ð seal (C5) and the block-break (C4).** | Only if passes 1 to 7 are in and you want them. | Low-end and reduced-motion fallbacks checked. |
| 9 | **Write-up.** This file's closing section: what was built and why, before and after screenshots, Lighthouse and bundle numbers, and what's worth doing later. | | |

**Honest note on LCP.** The previous pass couldn't get the simulated mobile LCP under 2.0 s. The runtime (103 kB) and the blocking CSS set a floor around 2.3 s in Lighthouse's model. Pass 7 goes after the CSS and the hydrated markup. If it still won't go under 2.0 s, the remaining lever is the React 19 / Next 16 upgrade, which I'd propose as a separate change rather than fold into a design pass.

## The picks

All of the recommendation, and both optional ideas: Concept 1 (hotbar and offhand), the crew door named *Eftirlýst*, signature moments C1 to C5, and the phone's address on the ground under the name.

---

## Part 3. What was built

Nine commits on `feat/design-ideas-hotbar` after this document's first version, one per pass. After every pass: `next build`, `tsc`, `next lint`, the 236 unit tests, screenshots at 390 and 1440 against the pass before, and any effect checked on a 4× CPU phone profile, before the commit.

**Staged data.** `scripts/stage.mjs` (new; `STAGE=1` in `scripts/shots.mjs`) serves the screenshots a running server with three of the crew in, a week of stats, drawn pixel heads in place of minotar and mc-heads, and, with `STAGE_NIGHT=1`, a play night two days out. Every "after" screenshot below uses it, and so does the matching "before" set, so the two compare like for like. Nothing in it ships.

### What changed, and why

| Pass | Commit | What | Why, in one sentence |
|---|---|---|---|
| 0 Fixes | `625c708` | The map still is requested at the width it is drawn (`sizes` follows the portrait frame's height); the bar's mark and address are full 44 px taps; the copy glyph replaces the tag's nail; the Resource Pack Editor sentence left `DESIGN.md`. | The world was a blur on every phone, the main action was under the minimum target size, and the editor's last trace was a line of prose. |
| 1 Navigation | `3b152b4` | The phone's door bar became the hotbar (three slots sunk in a strip, the one in hand framed in light) with the offhand slot beside it copying the address; the server's lantern rides in the bar on every page; the doors move into the bar from 760 px; the crew's door leads to `/crew` from every other page and is lit there and on the walls; the footer's crew link went and *Stjórnborð* moved into the small print. | One reachable place for everything on a phone, status on every page, and a lit door that never leads somewhere else. |
| 2 Hero | `20cdc1b` | Under 900 px the hero reads down: sentence, sun, the name among the ridges, and a band of the ridges' dark ground under them with the address (full width on a phone) and the lantern; a phone on its side puts the sentence and the address on the same ground. On a wide screen the sentence takes the middle step (Pixelify 600 at `--fs-xl`, two lines), the sun stands on the wrap's right edge, and the lantern's pool of night is deeper. | The brand comes first and the action sits under the thumb on a phone, and the wide hero has three levels on two edges. |
| 3 The valley | `eee016b` | The hero's ground runs on over the top of the world's frame as a stepped ridge, low under the HUD's title and tools and peaking in the open sky between, its edge lit by a pixel of the rock's brown; it sinks a few art pixels to rest on a view timeline as the world comes up. | The page's one big turn happens in the land instead of at a ruled line. |
| 4 Someone's home | `6d12e62` | The counters of the O and the Ð are windows that light, panes and all, while somebody is in; the crew who are in stand on a plateau of the near ridge as their heads, at the land's own scale, each a link to their wall. | The name answers "is anyone on?" before a word is read. |
| 5 Rooms and tools | `35bea83` | Room titles to `--fs-xl`, headings inside to `--fs-lg`; an empty crew room says its state in one line under the portraits; the desktop map tools are the phone's wooden keys with their words. | A room's name is its largest thing, three empty notes read as three failures, and one control should have one look. |
| 6 Crew pages | `45b5f8f` | `/crew` and the walls hang in the night sky with the stars and the far ridge (`NightSky.tsx`); the roll call is titled *Eftirlýst* and carries the next fire's line; the back links went; from 1024 px a wall is two columns with the roll call's portrait poster on the left; on a phone the skin and the name share a row. | The crew's pages are the same evening, and the poster you press is the poster you arrive at. |
| 7 Performance | `f410c5d` | The home page's first paint waits for one page stylesheet instead of two (the paper, campfire and effects moved into `badlands.css`; the posters and counter come with the rooms); the map still is asked for after load and idle, or at once if the frame is on screen, and fades up. | Fewer render-blocking bytes, and the sharp still off the critical path. |
| 8 Seal and break | `d26a6fe` | JOÐ's seal (the Ð in red wax, 48 px) on the foot of each wanted poster, the copy toast and the corner of a member's poster; when the 3D map is drawn, the still breaks away block by block from the lantern outward. | The Ð finally has a place where it reads as Ð, and the one moment a visitor asks for more gets the game's own verb for "remove this". |

**Where the build differs from the plan, and why**

- **The tablet breakpoint is 760 px, not 640.** Measured, the mark, three doors, the lantern and the address tag need about 700 px; between 760 and 1100 px the tag is the copy glyph and the verb (the address stays its accessible name and the toast shows it).
- **The campfire stays at the foot on a phone.** The plan said "fire first", but the fire stands on the ground strip, which is what makes it a campfire. Instead the way up and the sound share one row, so the fire comes a row sooner.
- **A phone on its side got the ground band too.** Not in the plan; its sentence sat on the brightest band of the sky at 2.0:1, and on the ground it reads at 12:1.
- **No Server Component conversion.** Since passes 4 and 6 the hero and the mesa read live status (windows and heads), the footer reads the season and the duel's state, and the sky is a few lines; nothing static enough was left to move, so the gains came from the stylesheet split and the deferred still instead. `experimental.inlineCss` was tried again with the smaller sheet and was worse (FCP 1.3 s, LCP 2.8 s); not kept.
- **Focus.** The dialogs (album, lightbox, duel, the wall's sign-in) already trapped Tab and returned focus (`useDialogFocus`). The rooms stay non-modal on purpose: the doors must stay usable to go from one room to the other, and the world under a room is inert.
- **On the toast the seal took the lantern's place**, where the game's advancement toast shows the item, rather than adding a second icon a 360 px toast had no room for.
- **The phone's still costs more bytes than before**, by design: 150 kB fetched on a phone against 35 kB (the sharp file instead of a third-size one), now after the page has loaded, never on the first screen's path.

### Before and after

Staged pairs (same data both sides) in `docs/design-ideas/staged-before/` and `docs/design-ideas/after/`, same file names: `home-390-top`, `home-1440-top`, `home-390-heimur`, `home-1440-heimur`, `home-*-hopur`, `home-*-hillan`, `home-*-campfire`, the full home page at both widths, `crew-*`, `crew_stebbias-*`. Side by side:

- `docs/design-ideas/compare-390-hero.webp`: the phone hero, before and after.
- `docs/design-ideas/compare-1440-hero.webp`: the wide hero.
- `docs/design-ideas/compare-1440-wall.webp`: a member's wall.

Moments in `docs/design-ideas/after/`: `windows-heads-1440`, `windows-heads-390` and `windows-dark-1440` (C1 lit and dark), `valley-1440` and `valley-390` (C2), `block-break-1440` (C4, mid-sweep), `toast-seal-1440` and `seal-wall` (C5), `hero-360-night` (a planned night on the smallest phone), `hero-844x390` (a phone on its side), `room-empty-1440` (the crew room's one line), `bar-1024` (the doors in the bar), `crew-1440-night`.

### Lighthouse, before and after

Lighthouse 13, mobile preset (Moto G Power, simulated slow 4G, 4× CPU), production builds, the same sandbox. "Before" is `5d3556c` rebuilt and served beside the final build in the same session; the three runs from the start of the session (84, 97, 95) are in Part 1.

| Page | | Perf | A11y | BP | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|---|
| `/` ×3 | before | 97 / 97 / 98 | 100 | 100 | 100 | 1.1 s | 2.6 / 2.6 / 2.3 s | 50 / 50 / 50 ms | 0 |
| `/` ×3 | after | **99 / 99 / 99** | 100 | 100 | 100 | 1.1 s | **2.1 / 2.0 / 2.1 s** | 60 / 30 / 40 ms | 0 |
| `/crew` ×2 | before | 98 / 99 | 100 | 96 | 100 | 1.1 s | 2.3 / 2.1 s | 50 / 30 ms | 0.006 |
| `/crew` ×2 | after | 97 / 97 | 100 | 96 | 100 | 1.1 s | 2.6 / 2.6 s | 60 / 60 ms | 0.008 |
| `/crew/stebbias` ×2 | before | 92 / 96 | 100 | 96 | 100 | 1.1 s | 3.3 / 2.7 s | 80 / 90 ms | 0 |
| `/crew/stebbias` ×2 | after | 96 / 92 | 100 | 96 | 100 | 1.1 s | 2.3 / 3.4 s | 160 / 70 ms | 0.003 |
| `/` desktop | after | 100 | 100 | 100 | 100 | 0.3 s | 0.6 s | 0 ms | 0 |
| `/crew` desktop | after | 100 | 100 | 96 | 100 | 0.3 s | 0.6 s | 0 ms | 0 |

Against the targets:

- **Performance 95+.** Home 99 on every run; the roll call 97 to 99 before and after (a paired run gave both builds the same 2.13 s LCP, so the difference is run-to-run noise plus about 4 kB of JS for the bar's lantern and the night line); a wall 92 to 96, its LCP being the skin image the sandbox cannot fetch.
- **Accessibility, Best Practices, SEO 100.** Home 100 / 100 / 100. The crew pages lose Best Practices points only for console errors from the blocked head images, which do not occur in production.
- **LCP under 2.0 s.** Home went from 2.3 to 2.6 s to 2.0 to 2.1 s simulated, at the line but not reliably under it. Why it stops there: Lighthouse's LCP model counts every request that starts before the observed LCP, the async scripts included, and the name paints at first paint (about 0.17 s unthrottled), by when Next's runtime has started; so the simulated LCP is the time to download the runtime. Unthrottled, LCP equals FCP. The remaining lever is fewer runtime bytes (React 19 / Next 16).
- **CLS under 0.05.** Home 0, roll call 0.008, wall 0.003, with or without a night planned, the bar's lantern held at one width.
- **INP under 200 ms.** Not measurable in the sandbox. Stand-ins: TBT 30 to 60 ms on the home page, and after hydration the page makes no request but the status poll.

### Bundle, before and after

Gzipped, as served; the shared runtime is 103 kB in both.

| Route | JS before | JS after | CSS before | CSS after |
|---|---|---|---|---|
| `/`, `/kvold`, `/stadur/[id]` | 134.4 kB | 136.2 kB | 15.6 kB in 2 files | **14.4 kB in 1** (+ the layout's) |
| `/crew` | 125.1 kB | 128.9 kB | 19.0 kB in 3 | 21.0 kB in 3 |
| `/crew/[username]` | 148.3 kB | 149.8 kB | 19.0 kB in 3 | 21.0 kB in 3 |
| 404 | 101.1 kB | 101.5 kB | | |

The home page gained 1.8 kB of JS for the hotbar, the bar's lantern, the windows and the heads; the block break is a 0.7 kB chunk fetched only when the 3D map is asked for. `board.css` (2.9 kB) now arrives with the rooms on the home page.

### Effects on a throttled phone

`node scripts/perf.mjs` (dpr 2), before → after:

| | before | after |
|---|---|---|
| Mobile 390 × 844, 4× CPU, scroll | mean 16.8 ms, p95 20.0 ms, 1 long of 842 | mean 16.8 ms, p95 20.9 ms, 1 long of 785 |
| Mobile style recalculation over the scroll | 1243 ms | 1164 ms |
| Desktop 1440 × 900, scroll | mean 21.9 ms, p95 33.3 ms, 32 long of 531 | mean 21.8 ms, p95 31.4 ms, 25 long of 567 |
| Images fetched on a phone | 35 kB | 150 kB (the sharp still, after load) |

Everything new moves by transform or opacity only: the valley ridge (one transform in eight whole-pixel steps on a view timeline), the windows (one opacity), the block break (opacity per block). Under reduced motion the ridge stands still, the windows and toast change in place, and the break is the old fade; on devices that skip effects (`useEffectsAllowed`: few cores, little memory, Save-Data) the break is the fade too.

### Contrast and responsiveness

Measured on the background under each hero line with the text hidden (5th percentile of the pixels in its box; the lowest single samples are dust and star pixels), with and without a night planned: 7.3 to 8.9:1 at 360, 390 and 768; 4.9 to 8.3:1 at 1024, 1440 and 1920; 8.9 to 12.3:1 on a phone on its side. At 360, 390, 768, 1024, 1440 and 1920, on the home page, the roll call, a wall, a night and the 404, `scrollWidth` equals the viewport everywhere; the overflow detector reports only the mesa SVGs the hero clips and the thumbnails inside the scrolling places rail.

### Worth doing later

1. **The React 19 / Next 16 upgrade**, as its own change: the runtime's bytes are the one thing between the home page and a reliable sub-2.0 s simulated LCP.
2. **A portrait still for phones.** `map:poster` could take a second still from BlueMap at 9:16; the phone would then fetch a picture shaped like its frame, sharp at dpr 3 for about half of today's 150 kB (the 1920-wide landscape still is still upscaled about 2× on a dpr 3 phone, because the crop shows only a third of its width).
3. **Measure in production**: INP from the field (`web-vitals` or Vercel Speed Insights), a wall's LCP with real skins, and Best Practices on the crew pages without the blocked heads.
4. **The seal on what leaves the site**: the link-preview cards (`/crew/[username]/opengraph-image`, `/kvold/card`) and the foot of the letters, at 48 px or more.
5. **Number keys for the doors on desktop**, 1 to 3 as in the game's hotbar, announced in the doors' tooltips.
6. **The wall's poster held in view on tall screens** (sticky where the poster fits the viewport), so a long wall keeps its owner beside it.

---

## Part 4. After living with it

Two changes asked for once the pass was live:

- **The phone's hero is the full-screen title card again.** Held upright, the sunset and JOÐ fill the screen down to the hotbar, with the sentence, the address and the lantern on the dark of the upper sky, as before the pass; the band of dark ground under the ridges is gone there. The windows and the heads on the ridge stay. A phone on its side keeps the ground band, since there the sentence would otherwise sit on the brightest band of the sky at 2:1. The offhand slot left the hotbar: the three doors share its width, and on a phone the address is the hero's own button.
- **The 3D map's frame is as it was before the pass.** The ridge over its top, the block break and the delayed, fading still are gone; the frame has its top plank and the desktop tools their old buttons back. Two things stay: the still keeps the size it is drawn at on a phone (the blur fix from pass 0), and it is drawn from the browser's first render rather than the page's markup, so it does not share the hero's first seconds; it is requested about 0.2 s into the load and is in place long before the frame is scrolled to, with no fade.

Measured after: Lighthouse mobile on `/` 98 / 99 / 96 (LCP 2.1 / 2.1 / 2.6 s, CLS 0), Accessibility, Best Practices and SEO 100; every hero line 4.8:1 or better at 360, 390 and 768 with a night planned; no horizontal scroll at 360 to 1920.

A last sweep before pushing found four small things, all fixed:

- **The bar's server lantern waits for the bar to take its surface.** Over the sunset at the top of the home page it said what the hero's own lantern says a few lines lower, in a smaller voice; it now shows once the page has scrolled and the bar is solid, and on every other page from the start.
- **A phone on its side gets a shorter hotbar.** At 740 × 360 the three slots took a fifth of the height; the label now sits beside the lantern and the bar is 3.25rem, so the hero's sentence keeps two lines above it.
- **The 404's crew link says "Eftirlýst"**, the name of the room it opens, not the old "Hópurinn".
- The large wax seal style, which nothing used any more, is gone from the stylesheet.

A review of the whole diff found six more, all fixed and measured:

- **Phones can copy the address on every page again.** With the offhand slot gone, the hero's button was the only copy action on a phone, and only the home page has a hero. Off the home page the bar's tag is back on phones as the copy glyph and *afrita*, the same tag tablets get; the whole address beside the lantern would have been cut to half its letters at 360 px.
- **"afrita" stays whole from 760 to 775 px with a member signed in.** The member's head used to squeeze the tag until the notch cut the last letter; the tag no longer gives way, and the doors close up below 900 px.
- **No blank space under a wall.** From 1024 px the poster spans the rows beside it, and the rows nothing filled each kept a gap: up to 200 px under a busy wall. The rows have no gap now and each thing in the right column keeps its own distance.
- **The name is whole on a phone on its side from 768 px.** The middle ridges grow with the width and stood over the lower half of JOÐ there; in that layout the far and near ridges frame it alone.
- **The selected hotbar slot's frame**: a ring of night outside it was clipped by its own notch and never drawn; it is gone, and the comment says what is drawn.
- Dead rules and stale comments (the back link's styles, a phone rule that could not apply, the toast's lantern), and `npm run shots` loads the staging module (and with it `sharp`) only when `STAGE=1`.

**The server's lantern, without the smudge.** It hung in a soft radial pool of night, which kept its small words readable but was the one soft-edged thing on a page of hard pixels: a dark blur that ran under the address button and off the side of a phone. It is now a plate, the hard band of shadow the game lays its chat on, square cut with the notched corners every tag on the site has. On an upright phone the address button and the plate are one column of one width; on a wide screen they hang side by side from one top line, the lantern's word level with the address. A night planned is a second entry on the plate under a hairline, its fire in the lantern's column and its words aligned with the lantern's. Two lines got shorter: "athugað rétt í þessu" is gone, and the moment of the answer shows only once it is two minutes old ("athugað fyrir 3 mín."), since a fresh one said nothing a lit or dark lantern did not; and the version reads as the launcher shows it, without the host's build number ("26.3", not "26.3 (182)"). Every line on the plate reads at 5.9:1 or better from 360 to 1920 px, with a night planned; without any backing the words fell to 2.3:1 on a wide screen.

---

## Part 5. Twelve more: the sky, the land, the world, the rooms and the fire

A brainstorm on 5 October 2026 asked what was still missing once the three passes above were in. The answer: the identity is a landscape, and the page told it more than it showed it. The hero was a logo over a gradient; every hour between sunset and night was one flat maroon; the ridges past the nearest were flat fills; a cold grey band of BlueMap's sky crossed the top of the world; the boot lantern hung in the one soft blur on the page; the rooms had no walls; and the fire, the page's last scene, was an icon beside the credits. Twelve ideas came out of it, and all twelve were built, in five passes and three follow-ups on `claude/clever-darwin-ccdsk4`. Every pass: `tsc`, `next lint`, the unit tests (236 on `main`, 240 with the moon's four), screenshots at 390 and 1440 with staged data, and a production build.

### What changed, and why

| Pass | What | Why, in one sentence |
|---|---|---|
| The sky | **Afterglow**: a band of the sunset riding with the land behind the ridges holds while the night takes the top of the sky, and goes last. **Clouds**: the game's flat clouds in the band of sky between the words and the name, lit from below at sunset and grey at night, drifting a few cells east; four on a wide screen, two on a phone, clear of every line of words. **The moon**: tonight's, in one of the game's eight phases (`src/lib/moon.ts`, tested against the almanac for October and November 2026), comes up over the J in the first third of a screen of scroll and stands risen in the night sky of the roll call and the walls; `?tungl=0` … `7` shows any phase. | Every hour between sunset and night now looks like that hour, and the empty sky has the game's own things in it. |
| The land | **Strata in every ridge**: bands in all three, faint on the far one; the far ridge a third of the way to the horizon's colour, with a stepped gold haze at its foot that goes with the afterglow. **The name cut from the strata**: five clays under every downward edge, a whole pixel count each, on the link preview too. **The crew on the ridge**: whole skins with a lit lantern in hand on the near plateau, each a link to their wall. | The badlands are the first identity pillar, and the name and the people now stand in them. |
| The world | **The page's night over the town**: `jod.js` gives BlueMap `--night` as its sky after dark (the colour over the light BlueMap multiplies it by), the map's own sky by day; the still was recoloured to match and `map:poster` takes every new one through the same script. **A lantern on a post**: hung from the arm of a fence post, a sign nailed under it, a paper tag under the sign; no pool of night. **The town's lights come on**: three layers of lamplight taken off the still by `scripts/map-lights.mjs` (about 7 kB together) light one after another when the world is reached. | The world is the page, and arriving in it at nightfall is the concept's one big turn. |
| The rooms | **Walls** of boards in both rooms (`--wall`); paper stands off them by a hard two-pixel shadow (`.b-hang`). **The shelf as a store**: slatted crates twice the size with their glyph on a nailed paper tag, two shelves of seven beside a counter sized to one label. **A notice board** on the roll call: the eight posters on one board of planks, capped and on two posts. | A room entered through a door should look like a room. |
| The fire | The fire in the middle of the band at eight times its pixels in a ring of stones, its light across the ground and on the foot of the ridge; the way up and the wind either side; the small print on the earth under the ground. | The page ends on its last light, so the light gets the middle. |

### Where the build differs from the cards, and why

- **The town's lights are taken off the night still, not a day still crossfading to night.** The sandbox can't reach the map data (a private Blob store, and the live site is outside the network policy), so no new still could be rendered here. Working from the still that exists turned out better anyway: a day still would have shown a bright town under a sky the scroll had already made night, where lamps lighting up at dusk is exactly the hour the page is at.
- **The lights are a state, not a scroll animation.** Held on a view timeline they were composited on every frame of the scroll through the world, and the desktop probe's long frames went from about 25 to about 117 per scroll. As a transition (on when the world is 55 % in view, off again back at the sunset) they cost the compositor a second and a half, and work in every browser, view timelines or not.
- **The ridges' night is a layer over each ridge, not their rock's fill.** With bands in all three ridges, animating the fill repainted them every frame and a throttled phone went from 0 to 13 long frames per scroll. Each ridge is now painted once in its sunset colours with the night as a second drawing of its outline fading in: a scroll frame repaints nothing in the land, and the phone is back to 1 or 2.
- **The haze is stepped, not dithered.** A dither pattern was another thing to rasterise every frame while the fill still animated; two flat steps of gold read the same at the ridge's scale.
- **The moon rises above the J, not out of it.** Rising from behind the letter, it showed half risen as a lump on the J's top bar, and a three-column crescent with a crater read as an exclamation mark; it now comes up the last step into its place, and the phases have a bowed terminator, the lit share only, as the game draws them.
- **On a phone two figures stand on the ridge and the rest are a count.** The plateau there stands in front of the name's feet, and a third figure covered the O's window.
- **The clouds are two layers the size of their band**, not three the size of the screen: the sky is behind the whole page and every layer in it is composited on every frame.
- **The lights' address is a hash of their own bytes**, not the still's: lights taken again with other settings would otherwise have been answered from a year-long cache.

### Measured

Production builds of `main` (`4848bf7`) and of this branch, served side by side in the same session, staged data.

**Bundle** (First Load JS, as Next reports it): `/` 138 → 140 kB, `/crew` 131 → 132 kB, `/crew/[username]` 152 → 154 kB; shared runtime 103 kB in both. CSS gzipped: the page sheet 14.0 → 15.1 kB, the board's 2.8 → 3.3 kB. New images: three lights layers, 2.1 to 2.6 kB each; the recoloured still 258 → 245 kB; the riders' skins only while someone is in.

**Lighthouse 12, mobile preset**, three runs each on `/`:

| | Perf | A11y | BP | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| `main` | 90 / 97 / 97 | 100 | 96 / 100 / 100 | 100 | 1.1 s | 2.6 / 2.6 / 2.5 s | 300 / 40 / 30 ms | 0 |
| this branch | 92 / 95 / 97 | 100 | 96 / 100 / 100 | 100 | 1.1 s | 2.6 / 2.6 / 2.5 s | 250 / 150 / 80 ms | 0 |

`/crew`: 97 / 100 / 96 / 100 on both, LCP 2.6 s, CLS 0.008 on `main` and 0.006 here. The LCP element is still the name, which paints with its cut at first paint. Best Practices loses points only to the head images the sandbox blocks, on both.

**Scroll probe** (`scripts/perf.mjs`, dpr 2):

| | `main` | this branch |
|---|---|---|
| Phone 390 × 844, 4× CPU | mean 16.7 to 16.8 ms, p95 18.8 to 19.5 ms, 0 to 5 long of ~870 | mean 16.7 to 16.8 ms, p95 18.8 to 19.6 ms, 1 to 7 long of ~940 |
| Desktop 1440 × 900 | mean 23.5 to 23.8 ms, p95 32 to 36 ms, 22 to 27 long of ~410 | mean 26.7 to 27.0 ms, p95 36 to 39 ms, 49 to 66 long of ~440 |

The phone, the figure this repo has always held to, is level. The desktop gap is the sandbox's software compositor at double density: every layer in the sky and the land is blended on the CPU there, 5 megapixels at a time. Switching features off one by one showed no single one left that is worth trading for it, and a desktop GPU composites a few more layers for nothing.

**Responsive and console.** `/`, `/crew`, a wall, `/kvold`, `/stadur/2` and the 404 at 360, 390, 768, 1024, 1440 and 1920: `scrollWidth` equals the viewport everywhere. A React hydration error (#418) appeared once in a sequence of page loads at 360; it appears in the same sequence on `main` too, so it is older than this pass and is noted below.

### Worth doing later

1. **Take a new still with the map sync** (Þjónn → Afrita kortið núna, or `npm run map:poster` against a local copy). It will come out of `jod.js` with the page's night for its sky, and its lights will be taken off it; the still committed here was recoloured by hand to match.
2. **Find the intermittent hydration mismatch (React #418)** that shows on some loads at 360 px on `main` and here alike; something rendered on the server with the time in it, probably.
3. **Measure the riders with real skins.** minotar's body render was staged here; check the figures' scale with the real ones, and whether the armour layer reads at 12 units wide.


---

## Part 6. The evening pass: the rooms, the fire, the keys, and what was underneath

A pass on 10 October 2026 over every page and room at 360 to 1920 px with staged data, and two read-only audits of the code (the home page; the walls and their server), on `improve/evening-pass`.

### What changed, and why

| Where | What | Why, in one sentence |
|---|---|---|
| Eftirlýst | The wanted board hangs right under the portraits and the night; the notice strip under it. | The room is named for the posters, and they hung a screen and more down. |
| The fire | A sign on a post beside the fire says *Einvígi*; the wind toggle is a named button like the way up; below 1024 px both share the row above the fire. | The duel was announced only by a tooltip, which a phone never shows. |
| The doors | 1, 2 and 3 take Heimurinn, Eftirlýst and Hillan; the numerals show on the lanterns while the doors have the keyboard. A modified click opens a new tab. | The game's own hotbar keys. |
| Off the trail | The 404 and the error page stand under the roll call's night, the dark lantern at the ridge's foot. | A wrong turn was a black page any site could have. |
| The shelf, the posters, the roll call | The empty counter is the game's empty slot; the week's row lines up with second and third; a bare wall says so once. | Each read as a small mistake. |
| The places' rail | "11 staðir og 4 stöðvar". | It counted, then explained what each tag already says. |
| Link cards | JOÐ's seal on the night's and the member's cards (`src/lib/og-seal.tsx`). | Part 3's "worth doing later". |
| Fixes | Icelandic dates on every browser (`formatDate` written out); a room swapped after a link closes at once; the wind toggle tells the truth after a link; heads that failed before hydration fall back; the town's lights wait for the world; the stats' note no longer says the server is off when it is on; status and stats capped in time, and a cached page's old status asked again at once. | Bugs found by looking and by the audits. |
| The walls | The owner's wall is drawn whole from the first paint (session seeded from the server); the pin slot holds still while it pins; no refetch that could blank a wall; signs memoised; screen-reader names for what tooltips said; unknown places refused; the roll call's pictures fetched at their size. | The second audit. |
| The server | The play night's answers read once and together; the walls in one MGET; pages read their night, place or wall once per request; the member card kept five minutes; the status fallback trimmed; the play-night bookkeeping after the answer. | Round trips nobody needed. |

### Measured

Production builds of `main` (`14849d6`) and the branch, same machine.

| | `main` | this branch |
|---|---|---|
| First Load JS `/` | 140 kB | 141 kB |
| `/crew`, `/crew/[username]` | 133, 156 kB | 134, 157 kB |
| Scroll probe, phone 390 × 844, 4× CPU | mean 6.0 ms, p95 9.3 ms, worst 44.7 ms, 1 long | mean 5.8 ms, p95 8.7 ms, worst 15.1 ms, 0 long |
| Scroll probe, desktop 1440 × 900 | style 658 ms, script 412 ms | style 511 ms, script 329 ms |

`scrollWidth` equals the viewport on `/`, `/crew`, a wall, `/kvold`, `/stadur/2` and the 404 at 360, 390, 768, 1024, 1440 and 1920; no console errors. Tests: 264 (lint, `tsc` and the build clean).

### Worth doing later

1. **A sign-in limit per member that cannot be used to lock a member out.** One was tried and taken out again: twenty wrong guesses from anyone shut the owner out for an hour. The limit per address stays (Vercel overwrites `x-forwarded-for`, so it is the visitor's own).
2. **A sign-in link that spends a use only on a press.** Chat apps and mail scanners that open a link to preview it spend its uses now.
3. **Check the owner's own wall signed in**: the seeded session was reasoned through and checked as a visitor, not in a member's browser.
4. **Pictures uploaded and never pinned** stay in storage; a daily sweep of `crew/` files nothing points at.

---

## Part 7. The game's own UI, after "it looks the same"

Part 6 was read as no change at all: fixes and refinements, nothing new to the eye. This pass took visible moments from the game and from the land, each with a reason in this world (DESIGN.md, *The game's own UI, and the land lived in*):

| Where | What |
|---|---|
| Every page | The experience bar over the phone's hotbar and under the plank, filling with the page. |
| The hero | The title screen's splash over the Ð; name tags over the crew; on a phone the crew climb the name; an armadillo on the ground that rolls up when touched. |
| The world | The still drifts like a camera over the town; F3 lines (XYZ and facing) while the live map is up. |
| The rooms | Crates open like chests; posters swing on their nails; on a phone the plank is pulled down to close a room. |
| The roll call | A lit lantern over the poster of whoever is in. |
| The fire | The campfire's smoke column. |
| Off the trail | The death screen: *Þú dóst!*, *Þú féllst út úr heiminum.*, *Stig: 0*, *Lifna aftur við* over *Titilskjár*. |

Measured on a production build: First Load JS `/` 141 → 142 kB. Scroll probe, phone 390 × 844 at 4× CPU: mean 7.2 ms, worst 30.0 ms, no long frames, style 2.0 s and script 0.7 s over the whole scroll (2.6 s and 1.4 s on `main`). No sideways scroll at 360 to 1920 on any page; reduced motion stills the drift, the smoke, the splash, the swing and the armadillo.

---

## Part 8. The quiet pass: what broke where nobody was looking

An /improve pass on 11 October 2026, on `improve/oct-11-pass`, after Part 7. No new features: three read-only audits of the code (the home page; the walls; the server), every finding traced before it was fixed, and a look at every page at 320 to 1920 px. Most of what it found sits behind the page: answers that were older than they looked, writes that failed without saying so, and gestures that did the opposite of what they showed.

### What changed, and why

| Where | What | Why, in one sentence |
|---|---|---|
| The status | The status route asks Exaroton live; only the home page's half-minute render may use Next's data cache. Only a live, recent answer may say when the server went out. | The data cache hands back its last entry however old and refreshes behind, so the first visitor after a quiet spell could see an evening that was over, and an idle instance could write its own old evening over the store's. |
| Play nights | A fire with several times needs its first at least three hours off, and the fire form greys out nearer times (and moves a chosen one, saying why) once a second time is added; an older poll cannot undo a fresh vote; starting the server cannot relight a fire put out meanwhile; the 'out' letter is kept and retried. | A night lit inside the three hours was decided at once on the proposer's own answer, and the README promised a retry the 'out' letter never got. |
| The board | A member Mojang did not answer for counts as failed. | They vanished from the board and the snapshot was saved without them. |
| The walls | Every write answers the store's trouble as 503 with its own words; lanterns say which state they want; offline reads 'Nettenging brást', not 'Failed to fetch'; /api/crew/me answers a store it cannot read with 503 rather than 'nobody'; the daily job sweeps out pictures that went up to a pin slot and were never pinned, once three days old (Part 6's item 4). | Members read 'Villa 500', a false 'not found' or the browser's English, a stale tab put lanterns out while showing them lit, and a store blip signed the owner out of their own wall. |
| The wind | A remembered 'on' arms on a finger lifted, and the toggle says on only once the sound plays. | A phone counts the lift, not the touch, as the gesture: the sound stayed silent under a toggle that said it was on. |
| The world | The way into the 3D map is a link in the server's markup; the paper tag under it says what it does at that width. | The server cannot know a phone, and sent one a dead button. |
| Keys and readers | One Escape closes one layer; the painted map's pins are exposed; hidden labels are read; nothing under a room's dark takes the keyboard; Back puts down the picture, the album, the duel and a wall's dialog before it leaves the page. | Escape closed the duel and the postcard together, and the back gesture went straight off the page. |
| Words | No 'point', 'click', 'drag' or number keys on a phone; the week written on each poster ('28. sep. til 5. okt.'); plurals on the link card; 'Skrá mig inn'; the pin slot says when a file is not a picture. | Each asked a phone for something it cannot do, or said nothing where it should have. |
| The hero | The '+1' beside the Ð's climber stands by its feet. | From 700 px it stood on the corner of the sun. |
| Small server things | Sign-in tries over IPv6 counted by the /64; the place card says who built it once; Modrinth's empty answer takes the fallback; calls to Exaroton, Modrinth and GitHub are capped in time. | Each was traced to a real path. |

### Measured

Production builds, same machine, same session.

| | before | after |
|---|---|---|
| Tests | 264 | 282 |
| First Load JS `/`, `/crew`, `/crew/[username]` | 142, 134, 157 kB | 143, 135, 158 kB |
| Lighthouse mobile `/` (three runs) | 84 / 96 / 98, LCP 3.1 / 2.6 / 2.2 s, TBT 410 / 140 / 70 ms | 96 / 96 / 96, LCP 2.6 s, TBT 70 / 70 / 90 ms |
| Lighthouse mobile `/crew` | 96, LCP 2.7 s | 96, LCP 2.7 s |
| Lighthouse mobile, a wall | 90 to 91, LCP 3.5 s | 90 to 91, LCP 3.4 to 3.5 s |
| Scroll probe, phone 390 × 844, 4× CPU | mean 16.7 ms, p95 19.3 ms, 0 long of 1014 | mean 16.7 ms, p95 18.7 to 19.0 ms, 1 to 3 long of about 1020 |

Accessibility, Best Practices and SEO are 100 on `/` before and after; a wall and `/crew` lose Best Practices only to the skin and head hosts the sandbox blocks, and a wall's LCP is the skin itself, so its number says little here. The desktop probe runs on the sandbox's software compositor and swings run to run (49 to 85 long frames of 376 to 603). `scrollWidth` equals the viewport on every page at 320 to 1920; the console is clean apart from the 404's own 404.

### Not done

1. **An idempotency key for Resend.** A letter whose send timed out after Resend delivered it can go twice. A key per night and letter would stop that, but Resend answers a reused key with a different body (a reader who turned the letters off in between) with a 409, which would hold the letter back for a day; it needs trying against Resend itself.
2. **A sign-in link that spends a use only on a press**, Part 6's item 2, still stands.
3. **A legacy-JavaScript trim.** Lighthouse counts 11 kB of transpiled code a modern `browserslist` would drop; it would also drop the older iPhones some of the crew may carry, so it is the owner's call.

---

## Part 9. What the server already wrote down

A brainstorm on 13 October 2026 asked where the room left was, after seven passes on the look. The answer was in the data: the server keeps every member's advancements with the moment each was done, and the site never read them; settled play nights were deleted outright once their embers went out; screenshots carry their exact time in their names; and a letter asked its reader to sign in before answering. Four of its ideas were built, on `feat/fires-advancements-tab-lantern`.

| Where | What | Why, in one sentence |
|---|---|---|
| The walls | **The game's own advancements** replace the invented star badges: each in the frame the game draws it in (task, goal, challenge), titled in the game's Icelandic, dated, newest first, six and then all on a press, with *fyrst allra* where the member was first of the crew. Read by the daily job from `world/players/advancements` (`src/lib/advancements.ts`); names and frames come from Mojang through `npm run advancements` (`src/lib/advancements.json`, 121 for 26.3). | The game already has a reward language, and these happened in the world; the badges were thresholds the site made up. |
| The wanted board | **Brautryðjandinn**, *Afrek unnin fyrst allra*: who was first of the crew to the most advancements, a poster like the others. | The firsts are a charge the board can post in its own form. |
| The crew's room | **Annáll** at its foot: every night held, a burnt-out fire each on one strip of ground; a press opens the evening (who lit it, who came, who said yes and didn't) and *Myndir kvöldsins*, the screenshots taken from half an hour before until the evening was over, found on the walls by the time in their names (`src/lib/night-photos.ts`). A past night's link opens it there. | Who came was worked out every week and then thrown away, and the evening's pictures were already on the walls with their times. |
| The letters | **Answer buttons**: a button per time offered, or *Ég mæti*, and *Kemst ekki*, each carrying a key for that reader and that night (`src/lib/night-answer.ts`). The link fills the answer in on a slip of paper by the fire; the answer goes on *Staðfesta svarið*, without signing in. | A letter is read in a mail app's own browser, which has no session; opening the link writes nothing, since scanners open links too. |
| The tab | **The tab's lantern**: while the server is on, the tab's icon is a lit lantern and the title carries how many of the crew are in, *(3) JOÐcraft*; a background tab asks for the status every three minutes. | On a play night the site waits in a background tab. |

### Where the build differs from the cards, and why

- **The tab's icon is JOÐ's mark when the server is off, not a dark lantern.** Off is how a tab spends most of its life, and the mark is the site's name; the lit lantern is the change worth seeing.
- **The annals are at the foot of the room, not under the fire.** Part 6 moved the wanted board up under the night because the room is named for it; history is the least pressing thing in the room.
- **The day an advancement was done sits under its title at every width.** Beside a wide wall the poster is a portrait column narrower than a phone, and a date column broke titles mid-word there.
- **A night still waiting to be settled is in the annals with who was seen**, rather than missing until the daily job comes round.

### Measured

Production build, on top of the quiet pass (Part 8): First Load JS `/` 143 → 144 kB (the tab's lantern rides with the bar), `/crew` 135 → 136 kB, `/crew/[username]` 158 → 160 kB (the advancements list); the annals load with the crew's room. Twelve new tests, 306 in all with the quiet pass's (the advancements read, firsts and ties, the folder fallback and a failed file keeping its last copy; the annals kept and none put out; the evening's pictures; a letter's key for its own night and reader, refused tampered, for another night or past its time; the answer buttons in the letters). `tsc`, `next lint` and the build clean. Checked against the live server read-only: `world/players/advancements` holds nine files in the game's format, and the crew has between 9 and 63 of the 121. Screens at 390 and 1440 with staged data: no sideways scroll.

### Worth doing later

1. **The first advancements arrive with the next daily run** (12:05). To see them at once, call `/api/cron/daily` with `CRON_SECRET` after the deploy.
2. **Nights settled before this change are gone**; the annals start with the nights still in the store.
3. **Run `npm run advancements` when the server moves to 26.4**, so new advancements have a name rather than being left out.
4. **A key per answer is a forwarded letter's risk**: whoever holds it can answer for its reader until the night starts. Among eight friends that is the trade, and it is written down in `night-answer.ts`.

---

## Part 10. The deeper evening: the game's chat, the climb, the press

A pass on 13 October 2026, on `improve/deeper-evening`, asked for the site to be more immersive and interactive while staying entirely itself. Read first: smekkur's canon for JOÐcraft (keep the sunset hero, the map is the focal point, moments drawn from the game's own UI) and its verdict of 10 October, that a pass of fixes and refinements "looks the same as before". The identity, in one sentence: one evening on a Minecraft server for eight friends, arriving at sunset over the badlands and scrolling down into the night, where the town's lanterns come on and the world they built is waiting. Every change is made in the world's own terms and committed on its own.

| Where | What | Why, in one sentence |
|---|---|---|
| The world | **Spjallið**: the game's chat over the places' rail prints what happened since this browser last read it (notes in their writer's name, advancements in the game's sentence and colour, fires lit) and who comes in and goes out while the page is open, in Mojang's Icelandic; lines hold ten seconds; T opens the log. | The server's news, in the game's own UI over the game's own world, gives a returning player a reason to come down into the valley and gives the world a voice. |
| The hero | **The climb**: one of the crew who comes in while the page is looked at climbs up onto the plateau (on a phone, onto their letter), and climbs down to go. | Motion that follows a real change in the world, and only that. |
| Everywhere | **The press**: everything that can be pressed sinks one of the art's pixels, as the game's stone button sinks into its block; nineteen kinds of control had no pressed state at all. | One physical answer to every touch, taken from the game. |
| The hero | **The splash** pops once as it comes, and a press brings the next fact. | A loop that said nothing becomes a toy that says more. |
| The world | **The still settles** with the scroll as the world is reached, in place of a minute-long drift. | The way down into the valley moves the camera; nothing loops for its own sake. |
| Eftirlýst | The posters come up into the room's first screen: 120 px higher at 1440 by 900, 55 px on a phone. | The room is named for them. |
| The admin | The map editor's keys say *1 til 6*, not a dashed range. | No dashes in the copy. |

### Removed, and how to bring it back

- **The splash's endless pulse** (`b-splash`, `infinite alternate`): replaced by a pop when the line changes. Reverting "The splash pops once as it comes" brings it back.
- **The still's 64-second drift** (`b-drift`, `.is-drifting`): replaced by `b-settle` on a view timeline. Reverting "The world settles as it is reached" brings it back whole.
- **The numbers' source note above the posters**: moved under them, not removed.

### Where the build differs from the cards, and why

- **The crew climb rather than walk.** Walking in from the plateau's far end floated over the lower ridge beside it, and walking off passed through the others standing there; climbing up from behind the edge and down again does neither, and is the phone's motion too.
- **A challenge is red in the chat, not the game's dark purple.** The walls already set a challenge apart in the strata's red; the game's purple read at 3:1 on the chat's veil, and the Nether's purple has no place in the badlands.
- **No loading screen in the game's chunk square.** It was the first candidate for the signature: the 3D map's boot. But the wait is the viewer's own download, which reports no progress, and the tiles after it take under 0.6 s; a square that filled would have had to make its numbers up.
- **The open log lets the lantern step aside.** At full length the log climbed into the signpost's plate, and an open chat in the game is a reading mode.

### Measured

Production builds of `main` (`e3364398`) and the branch, served side by side on this machine, Lighthouse 12 mobile preset.

| | `main` | this branch |
|---|---|---|
| Lighthouse `/` (three runs) | 95, 95, 95; A11y, BP and SEO 100; LCP 2.9 s; TBT 50 to 60 ms; CLS 0.001 | 95, 95, 95; A11y, BP and SEO 100; LCP 2.9 s; TBT 50 to 60 ms; CLS 0.001 |
| Lighthouse `/crew` (three runs) | 91 to 93, CLS 0.017 | 90 to 92, CLS 0.017 |
| Lighthouse, a wall, live stats blocked (two runs) | 88, LCP 3.8 to 3.9 s, CLS 0.018 | 88, LCP 3.8 s, CLS 0.018 |
| First Load JS `/`, `/crew`, `/crew/[username]` | 144, 136, 160 kB | 146, 136, 160 kB |
| Scroll probe, phone 390 × 844, 4× CPU (two runs) | mean 8.5 to 8.7 ms, p95 11.7 to 12.4 ms, 0 long | mean 7.4 to 8.5 ms, p95 10.7 to 11.9 ms, 0 long |
| Scroll probe, desktop 1440 × 900 | 1 long frame of about 2,000 | 1 long frame of about 2,000 |
| Tests | 306 | 312 |

A wall measured with its live numbers scores 72 to 74 with a CLS of 0.287 on both builds: without Redis on this machine there is no snapshot, so the poster is drawn bare and grows when the live numbers come. Production draws it from the snapshot (*Nothing moves as the wall loads*, DESIGN.md), which the blocked run stands in for. Its LCP is the faded print behind the poster, and 3.3 s of its 3.8 s is render delay: the same simulated wait on the page's scripts that DESIGN.md describes for the home page.

`tsc`, `next lint` and the build are clean; no sideways scroll at 390 and 1440 on `/`, `/crew`, a wall and the 404; the console is clean apart from the 404's own.

### Worth doing later

1. **The wall's Lighthouse score** (88 on `main` too): the lever is fewer bytes of runtime, the React 19 and Next 16 upgrade DESIGN.md already names.
2. **Who is where**: BlueMap's live players could put a head on the chip of the place a member stands at, so the rail says where to find them.
3. **Dashes in old code comments** (admin routes, `src/data/datapacks.ts`, `src/lib/season.ts`): never shown to anyone, left as they were.

---

## Part 11. The board, the tools and the woods: where the site still looked like a web page

A second pass on 13 October 2026, on `improve/creative-evening` (stacked on Part 10), asked for the layout and the style themselves to be more creative and more the site's own. Part 10 was mostly behaviour; this one looked for the screens that still read as generic, and found three: the roll call (eight identical posters, seven saying nothing had been heard yet), the world's tools on a wide screen (three outlined buttons), and the places' rail (eleven identical dark cards). On the way it found a bug that had made every phone wall with a cover print hard to read.

| Where | What | Why, in one sentence |
|---|---|---|
| A wall, on a phone | The poster's words are lifted over its faded print again. | With the body's box given up for the grid, the print and a paper wash up to 85 per cent opaque painted over the name, the bounty and every charge. |
| The roll call | **A wanted board**: every poster says what its member is wanted for (alias, or their place on their best charge; the charge; the bounty), the outlaw of the most charges hangs first at twice the size as *Mest eftirlýst á JOÐ* with the rewards set as a printed poster sets them, and the newest thing pinned is nailed up in the board's last space. Read from the snapshot on the server every five minutes. | The roll call was the uniform cards the canon rejects; the board's one hierarchy is now earned in the game, and nothing on it is invented. |
| A wall | The charges as a poster's rewards: one line each, a run of dots, the number; the member's own aliases first, in red; nobody else's. | Every member was called Draugurinn and Innipúkinn on their own wall, whoever had earned the name, in three lines a charge. |
| The world, wide screens | The tools are the hotbar's slots, as on a phone, each with its word under its icon; *Heill skjár* gets an icon. | The one corner of the world that looked like a web page. |
| The world | Each place's tag wears its wood as it looks at night, the board's edge in more of it along the top; the woods' colours move to `tokens.css`. | The walls already hang a place's posts on its wood; the rail now says which place is which before a word is read. |
| Every page | An empty experience bar shows its eighteen cells. | On every page but the evening's it was a black strip that looked like it had failed to draw. |

### Where the build differs from the cards, and why

- **The rail's tags are tinted, not hung as signs.** Full-colour boards of oak, birch and cherry along the foot of the night still outshone the map, the focal point; a quarter of the wood in the night's dark, with the edge in more of it, carries the wood and keeps the map brightest.
- **The most wanted hangs large only on a board drawn with the numbers.** Drawn without them (the store not answering, or this machine), the board hung them large a moment in, a layout shift of 0.49; it now fills in the charges in lines held open for them and never rearranges.
- **Names on the world's still were left for later.** Tags floating over each place in the still need the start view's camera and each place's coordinates; no local map carries the coordinates, so nothing could be checked against the picture.

### Measured

Production build of this branch, on top of Part 10, same machine; Lighthouse 12 mobile preset.

| | Part 10 | this pass |
|---|---|---|
| Lighthouse `/` (three runs) | 95, 95, 95; CLS 0.001 | 95, 95, 94; CLS 0.001 |
| Lighthouse `/crew`, no snapshot (three runs) | 90 to 92, CLS 0.017 | 90 to 93, CLS 0.010 to 0.015 |
| Lighthouse, a wall, live stats blocked (two runs) | 88, CLS 0.018 | 87 to 88, CLS 0.018 |
| First Load JS `/`, `/crew`, `/crew/[username]` | 146, 136, 160 kB | 147, 138, 161 kB |
| Scroll probe, phone 390 × 844, 4× CPU | 0 long | mean 6.1 ms, p95 9.3 ms, 0 long of about 2,500 |
| Tests | 312 | 316 |

`/crew` is now prerendered and kept for five minutes (`revalidate = 300`) rather than drawn only in the browser. No sideways scroll at 390 and 1440; `tsc`, `next lint` and the build are clean.

### Worth doing later

1. **Names over the places in the still**: the start view (`MAP_START_VIEW`) and each place's world coordinates, projected onto the still the way BlueMap's camera draws it, so the town is labelled before the 3D map is opened.
2. **The wall's Lighthouse score**, unchanged at 88: the runtime upgrade Part 10 names.

---

## Part 12. Taflan: the board comes out of hiding

A pass on 22 October 2026, on `claude/members-board-redesign-y1x6ly`, asked for the members' board to stop being hidden: posts, pictures and events easy to see for a signed-in member, what is new easy to spot, the map's news on it too, a structure that makes sense, and new things for the crew to do there. Decided with the owner before building: the board stays readable by everyone and members get the extras; it gets a door of its own; and it gains calls for something with a reward, questions, and @names with a letter.

What was hidden: the newest posts lived in a strip three screens down the crew's room, under the portraits, the fire and the wanted posters, and behind a second tab on `/crew`. Nothing anywhere said that something new had gone up, and the map's changes were told nowhere.

| Where | What | Why, in one sentence |
|---|---|---|
| The bar, every page | **Taflan, the second door** (key 2, a hotbar slot on phones), with what is new counted on its lantern as the game counts a stack on a slot. | The one place a returning member wants first is a press away from anywhere, and says it has news before it is opened. |
| Over the world, `/taflan` | **One board**: the crew's signs answered in place, the town's slips (fires, nights decided and held, advancements by the day, new places and pictures, the painted map, the 3D copy) beside them, the days divided by the strata. | Everything that happens on JOÐ, in the world's own materials: hand-lettered wood for what the crew wrote, printed paper for what the town posts. |
| The board | Filters as hotbar slots, kept in the address; *Til þín* when someone named you; *Á döfinni* pinned beside it. | Pictures, notes, events and the map are each one press, and what still asks something of the crew never scrolls away. |
| The board | *Nýtt* tags, and the member's own mark of when they last looked, kept on the server. | New is the same on the phone and the computer, and stops being new once seen. |
| A sign | **Óskast**: a printed notice with a reward, taken on and stamped *Í höfn*; **Hausaveiðarinn** on the wanted board. | A frontier town's bounty notice, and a reason to log in that ends in the game. |
| A sign | **A question**: answers that fill with heads. | The crew already decide things together; now on the board instead of in a chat that scrolls. |
| A sign, the mail | **@name**: a link, lit for the one named, and a letter, *Kallað á þig*, with its own ferskeytla. | A call by name should reach the person, wherever they are. |
| The crew's room, `/crew` | The strip and the tab point at the board instead of keeping a copy of it. | One place for the posts, two ways to it. |
| The bar, 760 to 1199 px | The address tag gives up its verb until 1100 px and its letters until 1200 px; the doors set closer. | Four doors and a member's head fit the plank at every width. |

### Where the build differs from the plan, and why

- **The map's news is worked out when the map is saved, not read from its history.** The history keeps the whole map, terrain and all, thirty times over; reading it for every visit's count would have cost a megabyte a visitor. A short list is kept beside it, and filled once from the history that was already there.
- **No hero line for the board.** The count on the door is on the first screen on every device (the bar over the sunset, the hotbar on a phone); a line in the hero drawn after the page loads would have moved the hero under the visitor.
- **The count, not an amber word.** Lighting the door's word as well read as a second door being open: amber on a door says which one the visitor is behind.
- **Questions and calls are notes with a field each**, not a store of their own, so the walls, the board and the chat read them with no second source.

### Measured

Production builds of `main` (`1f6c721`) and this branch, same machine.

| | `main` | this branch |
|---|---|---|
| First Load JS `/`, `/crew`, `/crew/[username]` | 147, 138, 160 kB | 149, 139, 166 kB |
| First Load JS `/taflan` | | 167 kB |
| Build warnings | 0 | 0 |
| Tests | 316 | 349 |
| Sideways scroll at 360, 390, 760, 800, 1024, 1440 on `/`, `/#taflan`, `/taflan`, `/crew`, a wall | none (but the bar's address was pushed off the plank at 760 to 899 px once a fourth door came) | none |
| New colour pairs | | every one 4.8:1 or more |

`tsc`, `next lint` and the build are clean. Posting a question with an @name, posting a call, answering, taking the call on, stamping it done, the filters in the address, key 2 opening the room and Escape closing it were all walked through in the browser against a local Redis, with no console errors.

### Worth doing later

1. **Who claimed your call, by post**: a letter to the one who posted a call when someone takes it on, in the same dress as *Kallað á þig*.
2. **The weekly paper** (*Vikublaðið*): a Sunday letter with the week on the board, the week's outlaw and the new places.
3. **Reactions beyond the lantern**: the game's own items as stamps on a sign (a cake, a skull, a diamond), counted like the lantern.
4. **Board search**, once there is enough on it to lose something.

---

## Part 13. Taflan, reviewed: what it counted, how it drew, how it looks

A review pass on 23 October 2026 on the same branch, after living with Part 12 for a day: an independent read of the code for defects, a measured look at how the board performs with a full season on it (92 items, 4,350 elements), and a design pass on the places it still looked like a list.

| Where | What | Why, in one sentence |
|---|---|---|
| The board, a phone | **Drawn as it is read**: the first twenty things at once, the rest as the foot of the board comes near (or at *Sýna eldra*), and days further down laid out only as they come into view. | Ninety live signs held a mid-range phone's hand for one to two seconds before it could scroll. |
| Myndir | **Item frames**: every picture on the board, the crew's and the map's, hangs as the game hangs one, an oak rim round a ring of leather, a day to a row, each a press from the lightbox. | Under Myndir the board was the same column of signs; pictures are what that filter is for. |
| The board | **The red string**: pinned across the board, a nail at each end, above the first thing that was already there when the visitor last looked. | One glance says where reading stops being news, in the board's own materials rather than a chat app's line. |
| The board | **Nýtt svar**, and replies counted on the door. | A reply under last week's post was invisible unless you went looking. |
| The map's slips | A new picture is held up like a postcard, twice the size, and opens in the lightbox. | The owner asked for new map pictures to be easy to see. |
| The pin slot, on the board | One line until it is used; *Settu upp ósk* and *Spyrðu hópinn* in Á döfinni turn it to a call or a question. | The news is the first thing under the filters, and the board says what can be put up where it is missing. |
| Óskast | The one who posted a call can free it from one who took it and never came back. | Otherwise the only way to close it paid them as Hausaveiðarinn. |

### Fixed

- **An advancement was never news**: it reaches the site a day after the game's own moment, so the seen mark had already passed it. Each daily copy now notes when it first finds an advancement, and the board counts that.
- **A picture hung later on a recently drawn place vanished** into the place's slip; a place now keeps the picture it was drawn with.
- **The map's news could tell a save twice** when a save landed between the deploy and the first read; a save and its news now share one moment, and a fill that fails is tried again.
- **The fires were read and decided twice** on every board read.
- **A member's slot was not in the board page's markup** (the session was not handed to the board), so it popped in after hydration and pushed the board down.
- **A post put up, or a lantern lit, while the board was still being fetched** was dropped when the fetch landed; changes are now made again on what the fetch brings.
- **Til þín** missed a reply calling you under your own post, could be stranded as the filter in hand, and was not said to a screen reader; **"1 svör"** is "1 svar"; a seen mark written from two tabs at once could go back; a writer could send a member any number of letters for naming them (now one an hour); the stats fallback dropped members whose only charge was a call or a no-show.
- **Found while measuring, before it shipped**: the size given to days laid out off screen stood in for their width too and widened the board's column under Á döfinni; it is the height alone now, and the column has its own track.

### Measured

Production build, local Redis, the board with 92 items; Chromium, phone 390 × 844 at 4× CPU throttling and desktop 1440 × 900 unthrottled, two runs each.

| | before | after |
|---|---|---|
| Main thread blocked after load, phone 4× | 1,202 to 2,190 ms | 353 to 428 ms |
| Board ready, phone 4× | 1.6 to 2.5 s | 0.9 to 1.1 s |
| Elements on the page | 4,350 | 1,250 |
| Scrolling, phone 4× (frame p95) | 33.3 ms, dropped frames | 16.7 ms, none dropped |
| Desktop, main thread blocked | 38 to 71 ms | 8 to 56 ms |
| `/api/board` | about 10 ms, 43 kB | about 10 ms, 43 kB |
| First Load JS `/`, `/crew/[username]`, `/taflan` | 149, 166, 167 kB | 149, 166, 169 kB |
| Tests | 349 | 355 |

No sideways scroll at 360 to 1440 on any page or filter; `tsc`, `next lint` and the build are clean.

### Worth doing later

1. **A letter when your call is taken on**, in the same dress as *Kallað á þig*.
2. **The weekly paper** (*Vikublaðið*).
3. **Item-frame stamps**: the game's items as reactions on a sign, counted like the lantern.

---

## Part 14. Items for a sign

The third thing on Part 13's list, asked for on 23 October 2026: the game's own items as reactions on a sign, counted like the lantern.

| Where | What | Why, in one sentence |
|---|---|---|
| Every sign, walls and the board | **The hotbar in the sign's foot**: what has been given, after the lantern, each item in one of the game's slots with its count written as the game writes a stack, yours in the frame of the slot in hand; pressing one gives it too or takes yours back. | A lantern says "seen"; a cake says "til hamingju", and every one of the crew reads a slot and a stack count without being told. |
| The empty slot after them | **The inventory**: all eight items, four or eight to a row, walked with the arrow keys, and the game's violet tooltip saying the item's name, its words and who gave it; with nothing pointed at, who gave what. | Giving needs every item at hand, and a phone, which points at nothing, still has to be able to see who gave what. |
| An item given | **The pop**: it jumps into its slot as an item picked up does in the game, narrow and tall and back over five ticks, with the game's pop when the sound is on. | The moment of giving should feel like picking something up, not like a form being sent. |
| The art | **Eight items drawn for the site** on the game's sixteen-pixel grid (`src/lib/item-art.ts`), shown only as CSS (`src/app/items.css`) that a test draws from the art and holds to it. | An icon is one element with a background, so ninety signs with items on them cost the page no script and next to no markup. |

Eight items and the plus are nine slots: one hotbar. Each member gives each item once, on any sign, their own too, and takes it back the same way. Nothing is stored on a sign until something is given, so every wall written before reads as it did.

### Reviewed before it shipped

An independent read of the code found no defect in the logic: the optimistic press, the board's replay of changes after a fetch and the server's answer end in the right state in every order. It found these, all fixed:

- **A slot's focus ring and its tag were cut by the slot beside it**; the slot pointed at or with the keyboard now stands over its neighbours.
- **A long list of givers ran off the screen** on a narrow desktop; a slot's tag now wraps at a width and is moved in as far as it must be to stay on the screen.
- **A refused take-back put the item at the end** of the hotbar and your name at the end of its givers; it now goes back where it hung, as it was.
- **A press on an item still on its way did nothing and said nothing**; the slot now says it is busy, and the keyboard is moved on only when a press goes ahead.
- **A refused gift could leave its pop behind**, to play when someone else's gift brought the slot back; **the inventory could open by itself** at the next sign-in after signing out in another tab; **giving what was already given reordered the givers** from a stale tab. None of these can happen now.
- **The icons relied on which stylesheet loaded last**; the slot sets only where its picture sits, and the picture comes from its own sheet.

### Measured

Production build, local Redis, the board with 92 items of which 51 carry items, Chromium; the same data on the branch without the change for comparison, two runs each.

| | without | with |
|---|---|---|
| Elements on the board | 1,207 to 1,214 | 1,267 to 1,313 |
| Main thread blocked after load, phone 4× | 1,013 to 1,167 ms | 1,132 to 1,210 ms |
| Board ready, phone 4× | 1.8 to 1.9 s | 1.7 to 1.9 s |
| Scrolling, phone 4× (frame p95) | 16.7 to 16.8 ms | 16.8 ms |
| First Load JS `/crew/[username]`, `/taflan` | 166, 169 kB | 169, 172 kB |
| Tests | 367 | 386 |

The machine ran slower and noisier than it did for Part 13: the commit before main was merged measured 716 to 1,377 ms on the same data, so the phone figures are for comparing the two columns, not with Part 13. No sideways scroll at 360 to 1440 on the board or a wall with every inventory open; reduced motion stills the pop and the inventory's arrival; `tsc`, `next lint` and the build are clean.

### Worth doing later

1. **Told when your sign is given something**: items carry no time yet, so they are not news on the door.
2. **The crew's favourite item** on the wanted posters, once there is a season of them.

---

## Part 15. Kvöldið í tölum

Idea 4 of the brainstorm of 24 October 2026, on `feat/night-in-numbers`. The day after a play night, the daily job already reads the stats copies either side of the evening to settle who came, and threw the rest of the difference away; the annals told who and showed the pictures, and nothing of what the evening did.

| Where | What | Why, in one sentence |
|---|---|---|
| The embers, the morning after | **A slip torn off by the fire**: the evening's totals as a poster lists its rewards (hours in the world all together, deaths, mobs felled, distance on foot), the night's outlaws in red under the board's names (*Draugur*, *Slátrari* and *Flakkari kvöldsins*), and the advancements given that evening in the game's frames. | The morning after is when the crew looks back at the night, and the embers are the one place the night is shown for its first week. |
| The annals | The same slip in each evening, under who came. | The night is kept with its numbers once the embers burn out. |
| The daily job | Counted when the night is settled and kept with it (`src/lib/night-numbers.ts`): each member's difference between the copies, and the advancements those who came were given from half an hour before the chosen time to the end of the evening, to the minute. Nights settled before are counted once, on the next run that can read the advancements, from the same copies (kept 400 days). | No extra read when the page is drawn, and the night keeps the numbers it had even when the copies change or expire. |

### Rules kept

- **An outlaw of the night only where one led outright**, of two or more counted, with more than nothing: two who died four times each make no ghost of the night, and one alone is no one's outlaw.
- **Honest about the window**: the totals run from one daily copy to the next, so the slip says they are from the game's daily numbers before and after the evening; the advancements are the evening's own.
- **A member missing from a copy, or whose counter went down** (a stats file started over), is left out of the totals rather than counted wrong.
- **Only the summary goes to the page**; each member's counters stay on the server.

### Measured

Seven new tests (405 in all, from 398): the tally and its edges, the evening's advancements, the summary and its outlaw rule, the settlement keeping the numbers and the embers showing them, and earlier nights counted once in the fires and the annals. Seen at 390 and 1440 against a local Redis with staged nights: no sideways scroll, no console errors, and a night that was never counted shows no slip.
