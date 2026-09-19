# JOÐ: one evening, three doors

A proposal for reworking the layout of play.jodcraft.world. Nothing here is built yet; the working prototype is in `design/redesign-mockup.html` (open it in a browser, press *Notes* for the pins). `DESIGN.md` still describes the site as it stands.

## What stays

The sunset. The sky that darkens as you scroll, the mesas, the sun, the dust. Alfa Slab One, Pixelify Sans and Silkscreen. The terracotta strata, amber only on what can be pressed, paper only for what was posted, warm off-black surfaces. The admin panel and everything it edits: the gallery, the packs, the painted map, its places. The crew pages.

## What changes

The page is shorter because it has fewer rooms, not less in them. Nine sections become four, and the 3D world becomes the page.

| Hour | Section | id | What it holds |
|---|---|---|---|
| Sunset | Arrival | top | Unchanged: the mark, the address, the status lantern. The lantern now also carries the version and the heads of who is in. |
| Dusk | The world | heimur | BlueMap fills the viewport directly under the mesas. On top of it, a thin HUD: the title and the sync date, the heads of who is in, three tools (*Teiknað kort*, *Myndir · 11*, *Heill skjár*), and a sideways rail of the eleven places with their photos along the bottom. |
| Night | The crew | hopur | The eight heads with a lantern behind the ones who are in, then the wanted board folded to one poster per stat: the leader in each of the five categories. A link to `/crew` for the whole ledger. |
| Deep night | Come in | inn | The three steps in one row, the address big, and the shelf under it: every pack a crate with its glyph, the label read out on the counter when pointed at, as the closed store does today. |
| Campfire | Footer | campfire | The fire, two links (*Hópurinn*, *Stjórnborð*), the credit, the way back up. Tap the fire: the duel. |

### The world is the page

The map is the thing visitors come back for, so it gets the viewport, not a framed box on a subpage. Three decisions make that affordable:

- **A poster first.** The frame opens as a still: one screenshot taken by `sync-map` at the start view, served at three widths. BlueMap's viewer (an iframe, three.js, about 6 MB of assets) boots only when someone presses the lantern in the middle of the frame. On desktop with a fast connection and `saveData` off, it may boot when the frame scrolls into view. On phones it never boots inline: *Heill skjár* hands over to `/bluemap/index.html`, so BlueMap's drag and pinch never fight the page scroll.
- **Places on the map.** The eleven places are one rail along the bottom of the frame, each with its photo. Tapping one opens its postcard (photo, name, where it is) with *Fljúga þangað*, which moves the camera. This replaces the *Staðir* grid and does most of the album's job. It needs one new field per place in the admin map editor: a 3D position in BlueMap's link format (`world:x:y:z:distance:rotation:angle:tilt:ortho:mode`), which the admin gets by framing the view in the viewer and copying the hash.
- **The drawn map is a toggle.** *Teiknað kort* lays the painted paper map over the same frame, flags and all, from the same `MapArt` the admin edits. Not a section, not a subpage. Its SVG mounts only when toggled.

`/heimskort` can stay as the full-screen page the *Heill skjár* button opens, or become a redirect to `/bluemap/index.html`.

### Photos live in the world

There is no album section. Every picture is one tap from the place it shows, and the whole wall is behind *Myndir · 11* as an overlay grid in the admin's order. The lightbox stays. The fold plank goes.

### The crew, one band

Portraits as today. Under them, five wanted posters instead of the tabbed board: *Spilatími*, *Verur felldar*, *Dauðsföll*, *Smíðað*, *Gengið*, each with the leader's head, name and value. No tabs, no ledger; the full numbers already exist on `/crew` and on each player's page.

### Come in, with the shelf

The join steps and the packs answer the same question, "what do I need?", so they share a section. The store sign, the open-shelves state and the second heading go. The crates keep their glyphs, the counter keeps the label. The pack count and game version are one line.

### Navigation: three lanterns

- Desktop: a top bar with the mark, three doors (*Heimurinn*, *Hópurinn*, *Komdu inn*), each a lantern that lights as the evening reaches it, and the address with *afrita*. Transparent over the hero, solid after it.
- Phone: the same three lanterns in a bottom bar, in reach of a thumb. The top bar keeps the mark and the address.

The lantern rail, the lantern strip and the drawer go. One scroll-spy over three ids replaces three listeners.

### What leaves

| Item | Fate |
|---|---|
| `/rp-editor` and `src/app/rp-editor/` | removed |
| `three`, `@types/three`, `jszip` | removed with it (BlueMap ships its own three.js) |
| `LanternRail`, the strip in `AddressBar`, the drawer | replaced by the three doors |
| `Postcards` section, `FoldPlank` | replaced by the rail and the overlay |
| `QuickDraw` section | kept as an easter egg behind the campfire, or dropped |
| `Tallies` tabs and ledger | replaced by five posters |
| `Provisions` sign and open shelves | replaced by the shelf in *Komdu inn* |
| `TerritoryMap` section | replaced by the drawn-map toggle on the world |
| Footer links *Heimskort*, *Pakkaritill* | removed |

## Performance

- No iframe, no WebGL, no viewer download until intent. The poster is one image.
- The drawn map SVG and the album grid mount on demand.
- Two fixed bars instead of rail + bar + strip; one scroll-spy.
- Dropping `/rp-editor` removes three.js and jszip from the bundle, its worker, and about thirty files from the build.
- Everything already in place stays: self-hosted fonts, `srcset` photos, the CSS scroll timeline for the sky, the rules in `DESIGN.md` about what a frame may touch.

Estimated page height (desktop / phone): today ~6 600 px / ~7 400 px, proposed ~3 600 px / ~4 200 px.

## Open questions

1. *Fljúga þangað*: whether BlueMap 5 follows a `hashchange` on its iframe, or the iframe has to reload with a new start view. Needs a check before the rail is built.
2. Whether the duel stays. Behind the fire it costs nothing; removing it costs one component.
3. Whether the poster is taken by `sync-map` (Playwright against the local copy) or uploaded from the admin panel.

## The prototype

`design/redesign-mockup.html` is a single file with the real palette, fonts and pixel pieces, and the site's own photos and pack glyphs. Player heads are drawn placeholders (the site uses mc-heads.net), stats and online state are examples, and the map is a still; *Ferðast um heiminn* only mimics the load.
