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

## The devices

Each section carries one authored device, so the page reads as a sequence of
decisions rather than a stack of lists:

- **The question.** Every section opens on a full-width hairline with the
  question it answers, asked the way a friend would: "Hvað er öðruvísi en
  vanilla?", "Hvar er hvað?", "Hver hefur spilað mest?". The seven questions
  from the brief are the visible structure of the page.
- **The figure.** Under each heading stands one true number at display size:
  14 datapacks, 11 pictures, 8 players, 30 ticks. It is the only thing in the
  margin column, and it is always a fact.
- **The roster.** Under the state word sit the eight players' Minecraft faces
  in one row, pixel sharp, the ones in the world at full colour and the rest
  dimmed. With nobody on, which is most of the time, the row still says whose
  place this is. Heads are the mc-heads.net render the old site used; if that service fails, a head
  becomes a bone square with the player's initial, never a broken image.
- **The masthead.** The page ends with the wordmark at the full width of the
  page, lamp and all, the way a poster ends.

## The material

The site is made of three things the server already has: eleven screenshots,
a sketch map of eleven places, and Icelandic. The design job is to get out of
their way. There are no cards, no panels, no shadows, no rounded corners and
no icons. Structure comes from type, hairlines and the edges of photographs.

## The mark

"Joð" is the Icelandic name of the letter J, so the Ð is the letter that makes
the name Icelandic. The wordmark is JOÐcraft set in Archivo Condensed Black as
outlines; the crossbar that turns the D into a Ð is drawn separately and is
the status lamp: pink when the server is online, dimmed while it starts or
stops, grey when it is off. The favicon is the same D with the same bar. The
tab strip alone tells you whether the light is on.

- `src/components/brand/Wordmark.tsx`: the outlines, exported once from the
  font with HarfBuzz shaping, plus the hand-drawn bar.
- `src/components/brand/Mark.tsx` and `src/app/icon.svg`: the D alone on a
  32 unit grid. Reads at 16 px on a dark or light tab bar.

## Palette

Logic in one sentence: basalt, bone and cherry. Black sand for the ground,
driftwood for the type, and the pink of the cherry grove at the old base as
the one colour. Every other colour on the page comes from a screenshot.

| Token | Hex | Use | Contrast on bg |
|---|---|---|---|
| bg | #0F0E0C | the ground | |
| bg-2 | #1A1815 | the map and the game stage | |
| line | #2C2925 | the one hairline | decorative |
| text | #EFE9DC | all type | 16.0:1 |
| muted | #9A9184 | secondary type, the unlit lamp | 6.2:1 |
| accent | #F4A6C1 | the lamp and the copy block | 10.2:1 |
| accent-ink | #0F0E0C | type on the accent | 10.2:1 |

The accent appears at most twice per screen: the lamp in the wordmark and the
address block. When the server is offline the lamp is grey, so an offline page
has one pink element. There is no red; an unlit lamp is the offline state. On
the map the selected pin is pink; nothing else is.

Focus rings are 2 px of `text`, offset 3 px.

## Typography

Two families, four files, all static instances cut from Google's latin
splits and committed to `src/fonts` (about 72 KB in total, every Icelandic
glyph verified). Loaded with `next/font/local`, preloaded, `font-display:
swap`, fallbacks size-adjusted.

- **Archivo Condensed Black** (display): the poster face. Every heading,
  the state word, place names, pack names, the address, scores. Always
  uppercase.
- **Archivo Expanded SemiBold** (label): the same family stretched the other
  way. Tiny tracked labels, navigation, table heads, button words. The width
  contrast between the two Archivo cuts is the typographic signature of the
  site: one narrow and enormous, one wide and small, nothing in between.
- **Literata** (body, upright and italic): the reading face. Blurbs, the
  tagline, who is in, table numbers. It is the only lowercase on the page,
  which is why it reads as speech.

| Role | Face | Size | Line height | Tracking |
|---|---|---|---|---|
| state | Condensed | clamp(88px, 26vw, 240px) | 0.86 | -0.01em |
| h2 | Condensed | clamp(48px, 9vw, 96px) | 0.9 | -0.005em |
| figure | Condensed | 40px | 0.9 | 0 |
| name | Condensed | 24px | 1 | 0 |
| address | Condensed | clamp(24px, 6.4vw, 32px) | 1 | -0.01em |
| lead | Literata italic | 20px | 1.35 | 0 |
| body | Literata | 17px | 1.55 | 0 |
| meta | Literata | 15px | 1.45 | 0 |
| label | Expanded | 12px | 1.2 | 0.14em |

Body copy is 17 px so it holds its own next to the condensed caps; nothing on
the page is below 15 px except the tracked labels. Tabular lining figures are
turned on wherever a number is data.

Strip the colour and the page still has bones: every section is a stack of
condensed capitals in the left column and Literata to its right.

## Grid and spacing

Layout paradigm: **a margin spine with full-bleed plates**. On desktop every
section is a 12 column grid, 24 px gap: the heading stands alone in columns
1 to 5, the content takes 6 to 12. The photographs and the map ignore the
grid and run edge to edge at every width; at 1920 that is where the extra
width goes. The hero inverts the spine, state word left and address right,
so the first screen is the one composition that breaks the rule.

- Container: 1536 px maximum, side gutter 20 px on phones, 40 px from 768 px,
  64 px from 1536 px.
- Spacing scale, 4 px based: 4, 8, 12, 16, 24, 32, 48, 64, 96. Sections are
  64 px apart on phones, 96 px on desktop. Nothing off the scale.
- Radius: 0. Everything on the page is a rectangle because a screenshot is a
  rectangle.
- Elevation: none. Two ground tones and one hairline. Depth comes from the
  photographs.

## Motion

Nothing moves unless it tells you something. No scroll reveals, no loops, no
hover-only effects.

| Class | Meaning | Duration | Easing |
|---|---|---|---|
| feedback | you pressed this (copy, select) | 150 ms | cubic-bezier(0.2, 0, 0, 1) |
| panel | something opened or changed (lightbox, map pick) | 250 ms | same |
| survey | the map draws itself once when first seen | 1200 ms | same |
| fuse | the fuse burns while a round is live | up to 1.5 s, rAF | linear, it is a fuse |

`prefers-reduced-motion`: feedback and panel collapse to instant, the map is
simply there, the fuse does not travel but the spark still appears and the
round is still playable.

## The signature moment

**Kortið**, the map. The eleven named places, three regions and one river
already exist as data. The map is an inline SVG in the palette above: a faint
graticule, three contour rings per region drawn a little unevenly by seeded
noise so they read as a hand's work, the sea around Mushroom Island hatched,
the river, a square pin per place with its name placed by hand, and a
cartouche that says what the map is and that it is not to scale. When it first scrolls into view it
surveys itself: rings and river draw in, then the pins and names appear, over
1.2 s, once. Picking a place shows its photograph beside the map, so the map
and the gallery are one thing seen two ways. That answers "what is the world"
and "what does it look like" in one gesture. Because pins are small by nature,
the list beside the map is the real control on a phone, every row 44 px.

Budget: SVG under 12 KB inline, client JS under 6 KB gzipped for the pick and
the one IntersectionObserver that starts the draw, no canvas, no
requestAnimationFrame. The stroke draw is the one animation on the site that
is not transform or opacity; it is paint only, on one small SVG, runs once, and
is the budgeted exception.

## The minigame

**Kveikurinn**, the fuse. A creeper's fuse is 30 ticks, one and a half
seconds. The fuse is drawn as a ruler with a mark every five ticks, so you can
read your own time off it; a pink spark with a short trail burns along it.
The fuse lights at a random moment; press before it burns down.
Scored in ticks, three rounds a game, pressing early loses the round, too slow
and it goes off. The stage is one large button, so a thumb, a mouse and the
space bar are equals. Personal best in localStorage. Loaded on demand below
the fold, paused when off screen or when the tab is hidden. The burn and the
spark are transforms driven by one custom property from requestAnimationFrame,
no canvas.

## Language

All visitor-facing copy in Icelandic. The brand is written JOÐcraft. Server
states: Í gangi, Slökkt, Ræsir, Slekkur, Ekkert svar, Athuga. The address is a
"vistfang". No em dash anywhere in the repo.

## Client components and why

- `CopyAddress`: clipboard API and a two second confirmation.
- `PlayerHead`: only for the error fallback when the avatar service fails.
- `Gallery` and `Lightbox`: which picture is open, keyboard and swipe.
- `WorldMap`: the pick and the one-time survey draw.
- `Fuse` and `FuseLoader`: the game, split out of the initial bundle.
- `StatusLive` (Phase 2): polls the status route and updates the lamp.

Everything else is a server component.

## Decided against

- The first Phase 1 direction: navy ground, bordered cards, warm serif with a
  grotesk, amber button. It was the default look of generated sites with the
  hue changed, and nothing in it came from this world.
- Framer Motion: three motion classes do not need 30 KB of library.
- Pixel typography and block borders: a Minecraft site does not have to look
  like Minecraft's marketing.
- Runes, horns, blackletter: Icelandic is a living language, not a costume.
- A red offline colour: an unlit lamp says it better and keeps one hue.
- Rounded corners: nothing here is a button from an app store.
