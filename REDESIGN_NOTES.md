# JODcraft — Redesign Notes

## Summary

The redesign evolves JODcraft from "Matrix terminal" to "Austere. Nordic. Editorial." — a premium private members' portal that feels like a well-funded indie game studio designed it. Every structural decision and API call from the original is preserved intact; the transformation is entirely visual and typographic.

---

## Key Design Decisions

### 1. Color System — Cool Dark Base

**Decision**: Shift background from warm near-black `#080808` to cool blue-dark `#06080c` and `#0d1018`.

**Rationale**: The site's screenshots are its crown jewel — castles, Venice-inspired builds, underground clubs. Cool dark backgrounds (~2% blue tint) make these images read dramatically better. Warm near-blacks fight with the cool sky blues and stone greys in Minecraft screenshots.

The green accent (`#00ff41`) is preserved entirely — it's JOD's DNA, it's Minecraft's grass green. What changed is how sparingly it's deployed. Every instance of the green now has more breathing room, which makes each appearance more impactful.

### 2. Scene Changes via Section Backgrounds

**Decision**: Alternate between `#06080c` (base), `#0d1018` (elevated), and `#040508` (darkest — map only) across sections.

**Rationale**: The original site used `#080808` for every section. This created a monotone scroll with no visual rhythm. The alternation now makes each section feel like a deliberate scene in a film — you *feel* when you've entered a new area.

The map section is the darkest (`#040508`) because the SVG map is already its own visual world. The darker frame makes the map "pop" out of the page.

### 3. Gallery — Featured Hero Layout

**Decision**: First photo becomes a full-width featured card above a 4-column grid.

**Rationale**: With 11 screenshots, a uniform grid treats all photos equally — but the first photo (GOÐI CASTLE) is the most dramatic and deserves feature placement. The editorial separation between the hero image and the supporting grid creates a hierarchy that feels designed rather than just populated.

The 3D perspective tilt effect was removed from gallery cards. It was visually engaging but felt gratuitous — the pure image reveal (from gradient placeholder to real photo on hover) is more cinematic.

### 4. Typography Scale — Up

**Decision**: Section titles increased from `clamp(2.5rem, 6vw, 5rem)` to `clamp(3rem, 7vw, 6rem)`.

**Rationale**: The original sizes were slightly conservative. On large viewports, headings were competing with body text for attention. The new scale makes each section title clearly the dominant visual element, allowing the rest of the content to breathe.

### 5. Footer — Designed, Not a Line

**Decision**: 3-column footer grid (Brand / Navigation / Server info) replacing the single centered line.

**Rationale**: The original footer ("JOD · private survival · 2024") was a missed opportunity. A site this considered deserves a footer that reflects the same craft. The new footer adds navigation shortcuts (useful on deep sections), server info, and the "Not affiliated with Mojang" attribution that serious Minecraft sites include.

### 6. Section Label Utility Class

**Decision**: Extracted `.section-label` CSS class to globals.css.

**Rationale**: All section labels ("01 — SERVER", "02 — THE WORLD", etc.) share identical typography. Rather than repeating all inline style props 7+ times, a utility class keeps this consistent and easier to update globally.

### 7. Nav — Crew Added, RP Editor Kept

**Decision**: Added `/crew` as a first-class nav link alongside RP EDITOR.

**Rationale**: The Crew page is arguably the most personal and social part of the site — profiles, activity feed, achievements. It shouldn't require knowing the URL. It's now surfaced in the main nav.

### 8. Animations — Timing Refined

**Decision**: Section padding increased from `clamp(4rem, 10vw, 8rem)` to `clamp(5rem, 12vw, 9rem)`.

**Rationale**: Cinematic breathing room. The tighter sections felt crowded against each other. The additional vertical space lets each section establish itself before the next begins.

---

## Tradeoffs

### Not Changed: Admin Panel
The admin panel (`/admin`) is a functional tool used by one person. Its design was deliberately not touched — it doesn't need to be beautiful, it needs to be fast and functional. Applying the redesign's spacing to admin CRUD panels would have been unnecessary churn.

### Not Changed: RP Editor
The resource pack editor is a developer tool with its own interaction paradigm (tabs, Three.js model viewer, file upload). Redesigning it would require understanding the full Three.js integration and testing across the tab views — separate work that belongs in its own iteration.

### Hover Handlers in Server Components
The original `page.tsx` footer used inline `onMouseEnter`/`onMouseLeave` handlers, which don't work in Next.js server components. These were replaced with CSS class-based hover states (`.footer-link:hover`), which is the correct approach and has no functional difference.

### `<img>` vs `<Image />`
All Minecraft player head images use raw `<img>` tags with `imageRendering: 'pixelated'`. This is intentional — Next.js `Image` would apply optimization and anti-aliasing that would blur the pixelated Minecraft aesthetic. The build warnings about `<img>` are pre-existing and expected.

---

## Files Modified

| File | Change |
|------|--------|
| `src/app/globals.css` | Complete token rewrite: new color system, refined animations, `.section-label` utility |
| `src/app/page.tsx` | Footer redesign (3-column grid, proper nav links) |
| `src/app/crew/page.tsx` | Color token updates, refined cards, better animation |
| `src/app/crew/[username]/page.tsx` | Color token updates via sed replacement |
| `src/components/NavHeader.tsx` | Crew link added, refined hover states, better mobile menu |
| `src/components/HeroSection.tsx` | Color tokens, refined spacing and timing |
| `src/components/TickerStrip.tsx` | Refined colors and separator treatment |
| `src/components/ServerStatus.tsx` | New background, refined crew cards, better typography |
| `src/components/GallerySection.tsx` | Featured hero card, 4-col grid, simplified hover (no tilt) |
| `src/components/MapSection.tsx` | Darkest background, color tokens |
| `src/components/DatapacksSection.tsx` | Elevated background, refined cards, slide-in accent line |
| `src/components/StatsSection.tsx` | Silver/bronze rank colors, better tabs, spacing |
| `src/components/JoinSection.tsx` | Refined spacing, cleaner glow, section label updated to 06 |
| `src/components/Lightbox.tsx` | Color tokens, refined close/nav buttons |
| `src/components/ScrollProgress.tsx` | Thinner bar (1.5px), refined glow |

## Files Added

| File | Purpose |
|------|---------|
| `REDESIGN_AUDIT.md` | Complete content, logic, and tech inventory |
| `REDESIGN_SYSTEM.md` | Design system and creative direction |
| `REDESIGN_NOTES.md` | This file — decisions and tradeoffs |
