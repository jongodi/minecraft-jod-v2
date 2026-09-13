# JOÐcraft: design

One direction, argued for. This document is the source of truth for every
visual decision on jodcraft.world. If something on the site cannot be traced
back to a line here, it does not belong on the site.

## Intent

Visiting the site should feel like walking up to a friend's house at night:
from the road you can already tell whether the light is on and who is inside,
and the door opens without anyone selling you anything. The pace is calm and
plain, one truth per glance, the way one friend tells another what the server
is, with nothing on the page that would embarrass its author if a stranger read
it. Everything is either a fact about right now or a thing to look at, and
there is exactly one place to linger for people who want to.

Brand voice: one friend telling another what the server is. Specific truths,
no adjectives about adventure.

## The mark

The name is JOÐcraft. "Joð" is the Icelandic name of the letter J, and the Ð
is the one letter that makes the name Icelandic. The mark is a heavy D whose
crossbar, the stroke that turns it into a Ð, is the only lit element. That
crossbar is the status lamp: amber when the server is online, dimmed while it
starts or stops, snow-grey when it is off. The favicon, the header wordmark and
the hero all carry the same lamp, so the tab strip alone tells you whether the
light is on.

- `src/components/brand/Mark.tsx`: the Ð alone, 32 unit grid, works at 16 px.
- `src/components/brand/Wordmark.tsx`: "JODcraft" as Young Serif outlines with
  the crossbar drawn separately so it can carry state.
- `src/app/icon.svg`: the framed mark, lit.

## Palette

Logic in one sentence: an Icelandic winter dusk seen from the road, blue-black
ground and sky, snow-white text, and one lit window.

| Token | Hex | Use | Contrast on bg |
|---|---|---|---|
| bg | #0B1120 | ground and sky, page background | |
| surface | #121A2C | snow in shadow, panels and rows | |
| surface-2 | #1A2439 | next layer up, fields inside a panel | |
| line | #263250 | the one hairline | decorative |
| text | #EEF1F7 | all text | 16.6:1 |
| muted | #97A2BE | secondary text, unlit lamp | 7.4:1 |
| accent | #F0B25A | the lit window: online lamp, copy button | 10.1:1 |
| accent-deep | #D89A3E | the same light, pressed | 7.7:1 |
| accent-ink | #1A1206 | text on the accent | 9.9:1 on accent |

The accent appears at most twice per screen: the lamp in the wordmark, and the
copy button. When the server is offline the lamp is muted, so the offline page
has one amber element, not two. No red anywhere; an unlit lamp is the offline
state. The minigame's spark is the same amber, and the game only shows one.

Focus rings are 2 px of `text`, offset 3 px, so focus is visible without
spending the accent.

## Typography

Two faces, both self hosted from `src/fonts` through `next/font/local`,
Google's latin split (27 KB and 30 KB), which contains ð þ æ ö and every acute
vowel. Preloaded, `font-display: swap`, size-adjusted fallbacks so the swap
does not shift layout.

- **Young Serif** (display): one heavy weight, warm, slightly hand-cut. It is
  the lamp light of the type system. Used for the name, the state word
  ("Í gangi"), section headings, and any number that is a score or a total.
- **Instrument Sans** (body and UI): cool, narrow, precise. It is the snow.
  Everything else.

The tension is warm serif against cool grotesk, which is the palette logic in
type. Both faces have tabular and lining figures; the `.num` utility turns them
on wherever a number is data.

| Role | Face | Size | Line height | Tracking |
|---|---|---|---|---|
| display | Young Serif | clamp(48px, 9vw, 112px) | 0.92 | -0.015em |
| h2 | Young Serif | clamp(28px, 16px + 2.2vw, 40px) | 1.1 | -0.005em |
| figure | Young Serif | 24px | 1 | 0 |
| lead | Instrument Sans 500 | 20px | 1.35 | 0 |
| body | Instrument Sans 400 | 16px | 1.55 | 0 |
| meta | Instrument Sans 400 | 14px | 1.45 | 0.005em |
| label | Instrument Sans 600 | 13px | 1.2 | 0.02em |

Type does the structural work: every section is a Young Serif heading in the
left margin column and Instrument Sans content to its right. Strip the colour
and the page still has a spine.

## Grid and spacing

Layout paradigm: **a margin spine**. On desktop every section is a 12 column
grid, 24 px gap: the heading sits alone in columns 1 to 3 and the content in
columns 4 to 12, like marginal notes in a book. The hero deliberately inverts
it, name on the left, status panel on the right, so the first screen is the one
composition that breaks the rule. On mobile the heading stacks above.

- Container: 1440 px maximum, side gutter 20 px on phones, 40 px from 768 px,
  64 px from 1536 px. Gallery and map bleed to the viewport edge at every
  width; at 1920 that is where the extra width goes.
- Spacing scale, 4 px based: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Section
  rhythm is 64 px on phones and 96 px on desktop. Nothing off the scale.
- One radius: 6 px. The only round thing on the site is a player head, which
  is an image, not a token.
- Elevation model: three tones and one hairline, no shadows. bg, then
  surface, then surface-2, separated by `line` where two surfaces meet.

## Motion

Nothing moves unless it tells you something. No scroll reveals, no infinite
loops, no hover-only effects.

| Class | Meaning | Duration | Easing |
|---|---|---|---|
| feedback | you touched this (copy, press, tab) | 150 ms | cubic-bezier(0.2, 0, 0, 1) |
| panel | something opened (lightbox, pin detail, menu) | 250 ms | same |
| survey | the map is drawn once when it first comes into view | 1200 ms | same |
| game | the fuse burns while a round is live | rAF, at most 1.5 s per round | linear, it is a fuse |

`prefers-reduced-motion`: feedback and panel collapse to instant, survey is
skipped (the map is simply there), the fuse does not animate but the spark
still appears and the round is still playable.

## The signature moment

**Kortið**, the map. The world's eleven named places, three regions and one
river already exist as data. The map is redrawn as an inline SVG in the palette
above, and when it first scrolls into view it surveys itself: contours and the
river draw in, then the pins land, over 1.2 s, once. Tapping a pin opens that
place's screenshot in the same lightbox the gallery uses, so the map and the
gallery are one thing seen two ways. That answers "what is the world" and
"what does it look like" in one gesture.

Budget: inline SVG under 20 KB, client JS under 6 KB gzipped for pin selection
and the one IntersectionObserver that starts the draw, no canvas, no
requestAnimationFrame, one stroke animation that runs once and never again.
The stroke draw is the one animation on the site that is not transform or
opacity; it is paint only, on a single small SVG, and is the budgeted exception.

Everything else stays quiet so this lands.

## The minigame

**Kveikurinn**, the fuse. A creeper's fuse is 30 ticks, 1.5 s. The fuse lights
at a random moment; tap, click or press space before it burns down. Score in
ticks, 1 tick = 50 ms, three rounds per game, tapping early is a foul, too
slow and it goes off. Personal best in localStorage. Client-only, code split,
paused when off screen or when the tab is hidden. Rendered with DOM and CSS
transforms, no canvas.

## Language

All visitor-facing copy in Icelandic. The brand is written JOÐcraft. Server
states: Í gangi, Slökkt, Er að ræsa, Er að slökkva, Náði ekki sambandi. The
address is a "vistfang". No em dash anywhere in the repo.

## Client components and why

- `CopyAddress`: clipboard API and a two second confirmation.
- `StatusLive` (Phase 2): polls the status route and updates the lamp.
- `Lightbox` (Phase 2): keyboard and swipe navigation.
- `WorldMap` (Phase 2): pin selection and the one-time survey draw.
- `Fuse` (Phase 2): the game.
- `MotionSamples`: only on /stil.

Everything else is a server component.

## What was decided against

- Framer Motion: three motion classes do not need 30 KB of library. CSS
  transitions and one IntersectionObserver cover all of it.
- Pixel typography and block borders: a Minecraft site does not have to look
  like Minecraft's marketing.
- Runes, horns, blackletter: Icelandic is a living language, not a costume.
- A red offline colour: an unlit lamp says it better and keeps the palette to
  one hue.
