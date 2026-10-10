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
| Phone 390 × 844, 4× CPU | mean 16.7–16.8 ms, p95 18.8–19.5 ms, 0–5 long of ~870 | mean 16.7–16.8 ms, p95 18.8–19.6 ms, 1–7 long of ~940 |
| Desktop 1440 × 900 | mean 23.5–23.8 ms, p95 32–36 ms, 22–27 long of ~410 | mean 26.7–27.0 ms, p95 36–39 ms, 49–66 long of ~440 |

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
