# JODcraft — Redesign System

## Visual Tone

**Three adjectives**: Austere. Nordic. Immersive.

The crew has Icelandic names (Ingunnbirta, Gamla, Fafnir, Stebbias — from Norse mythology). They've built a castle, a Venice, an underground club. This isn't a generic gamer site — it's a private club with personality. The redesign should feel like a premium indie game studio built a private members' portal: editorial precision with just enough darkness to feel like the server itself.

Evolutions from current: Matrix terminal → Architectural field notes from another world.

---

## Color Palette

The green identity stays. It IS Minecraft. It IS JOD's DNA. What changes is everything around it.

```
Background base:    #06080c  — deep cool dark, hint of ocean/night sky
Surface elevated:   #0d1018  — cards and alternate sections
Surface card:       #131722  — raised card surfaces

Accent primary:     #00ff41  — JOD green, used sparingly for maximum impact
Accent hover:       #00cc33  — dimmed state
Accent glow:        rgba(0, 255, 65, 0.12)  — ambient glow
Accent faint:       rgba(0, 255, 65, 0.06)  — background tint when online

Text primary:       #dde1ec  — cool off-white, reads well on deep backgrounds
Text secondary:     #505770  — muted grey-blue
Text faint:         #1e2230  — barely visible, attribution/metadata

Border default:     #1c2030  — hairline dividers
Border strong:      #2a3045  — accented borders

Status green:       #00ff41  — online/active
Status red:         #ff3355  — offline/error
Status gold:        #f0a500  — updates available / #1 rank
```

### Rationale
Shifting from warm near-black (#080808) to cool dark (#06080c) with blue undertones:
1. Screenshots look dramatically better against cool dark — the sky blues and stone greys sing
2. The green accent feels more natural (bioluminescent forest vs. terminal window)
3. Cool-toned backgrounds create more cinematic depth
4. Distinguishes from the generic "dark mode" aesthetic

---

## Typography

### Fonts
**No stack change.** Space Grotesk + JetBrains Mono are excellent choices for this site. What changes is how they're deployed.

```
Display/Headings:  Space Grotesk 900 — for all section titles and hero text
UI/Labels:         JetBrains Mono 400–700 — for section numbers, metadata, tags, values
Body text:         JetBrains Mono 400 — for descriptions and longer copy
```

### Typographic Scale
```
Display — hero: clamp(8rem, 22vw, 22rem)     Space Grotesk 900, tracking -0.03em
Display — join: clamp(2rem, 8.5vw, 9rem)     Space Grotesk 900, tracking -0.04em
Title L:        clamp(3rem, 7vw, 6rem)        Space Grotesk 900, tracking -0.03em
Title M:        clamp(2rem, 4vw, 3.5rem)      Space Grotesk 900, tracking -0.03em
Title S:        clamp(1.2rem, 2.5vw, 1.8rem)  Space Grotesk 800, tracking -0.02em
Label LG:       0.65rem                       JetBrains Mono 600, tracking 0.3em, uppercase
Label MD:       0.55rem                       JetBrains Mono 500, tracking 0.2em, uppercase
Label SM:       0.48rem                       JetBrains Mono 400, tracking 0.15em, uppercase
Body:           0.75rem                       JetBrains Mono 400, tracking 0.02em, line-height 1.7
Caption:        0.55rem                       JetBrains Mono 400, tracking 0.1em, color var(--muted)
```

### Typographic Principles
- **Section labels** (e.g., "01 — SERVER"): Label LG, color accent, `0.3em` tracking — these anchor each section's identity
- **Section titles**: Title L — massive, black weight, tight tracking. Headlines are layout elements.
- **Descriptions**: Body size, muted color — always supporting, never competing
- **Metadata/attribution**: Label SM or Caption — extremely light weight, barely visible, just present

---

## Spacing Rhythm

```
Section padding:    clamp(5rem, 12vw, 9rem) vertical  /  clamp(1.5rem, 6vw, 5rem) horizontal
Section inner gap:  clamp(2.5rem, 5vw, 4rem)
Card padding:       1.25–1.5rem
Grid gap:           1px (tight, newspaper-style) or 0.75rem (breathing room grid)
Heading → body:     1rem gap
Label → heading:    0.75rem gap
```

---

## Section Rhythm (Scene Changes)

Each section gets a background assignment for visual rhythm:

| Section | Background | Effect |
|---------|-----------|--------|
| Hero | `#06080c` | Particles, vignette |
| Ticker | `#0a0c12` | Border top/bottom |
| Server Status | `#0d1018` | Scene change (lighter) + online glow |
| Gallery | `#06080c` | Back to base — photos need darkest bg |
| Map | `#040508` | Even darker — map SVG pops |
| Datapacks | `#0d1018` | Scene change (lighter) |
| Stats | `#06080c` | Back to base |
| Join | `#06080c` | Full-viewport, particle bg |
| Footer | `#0d1018` | Elevated |

---

## Cinematic Principles Applied

### 1. Hero — Full-Viewport, Layered Depth
- Particle canvas fills viewport with subtle parallax on mouse
- Vignette gradient (transparent center → edges)
- Text floats in the middle with subtle parallax offset from particles
- Bottom: hairline green gradient (not full border)
- The "JOD" display type is the product of this: clamp(8rem, 22vw, 22rem) — enormous, intentional

### 2. Section Transitions — Scene Changes
- Alternating base/elevated backgrounds create deliberate rhythm
- The map section goes darkest of all — the SVG map is the scene itself
- Hairline borders between sections (`border-bottom: 1px solid var(--border)`)

### 3. Gallery — Editorial Layout
- First photo is a FEATURED HERO spanning 2 columns × 2 rows
- Remaining 10 photos fill a 4-column grid
- On mobile: uniform single column
- Reveal: images hidden behind gradient, exposed on hover
- No tilt effect on featured card — just a clean zoom + overlay sweep

### 4. Motion — Purposeful, Not Decorative
- All entrance animations: `opacity 0→1` + `translateY 24px→0`, duration 0.5–0.7s, ease `[0.16, 1, 0.3, 1]`
- Stagger: `index * 0.06s` max, stops after ~5 items
- Hover lifts: `translateY(-3px)` with box-shadow
- `prefers-reduced-motion`: all Framer Motion animations respect `useReducedMotion()`
- Glitch fires only in Hero and Join — not decoratively elsewhere

### 5. Typography as Layout
- Section number labels ("01") are positioned as large background watermarks in some sections
- Headlines bleed toward or past the edge of containers on larger viewports
- Uppercase mono labels with extreme tracking act as visual separators

### 6. Details That Signal Craft
- Grain overlay: `opacity: 0.02` — present but not obvious
- Custom scrollbar: 3px, accent color
- Focus states: `outline: 2px solid var(--accent)` + `outline-offset: 3px`
- Hover transitions: always `0.2–0.3s` cubic-bezier, never instant
- Interactive cards: hairline accent-colored top border slides in on hover
- Gallery cards: top-left "CLICK TO EXPAND" text fades in on hover (not visible at rest)

---

## Component Directives

### NavHeader
- 48px height, fixed
- Logo "JOD" in accent color, 1.1rem Space Grotesk 900
- Nav links at `0.52rem` JetBrains Mono, tracked uppercase — cool grey, accent on active/hover
- Active indicator: bottom border pixel line (1px, accent)
- Mobile menu: slides down from nav bar, full-width, left accent border on active
- Scrolled state: `rgba(6,8,12,0.96)` bg + `backdrop-filter: blur(12px)` + border

### Gallery Section
- Section label + "THE WORLD" title as before
- Grid: CSS Grid, `grid-template-columns: repeat(4, 1fr)` on desktop
- First card: `grid-column: span 2; grid-row: span 2` (featured)
- Featured card hover: scale(1.02) + overlay sweep (green radial from cursor position)
- Regular cards: 16:9 aspect ratio, hover reveals image from under gradient

### Datapack Cards
- Grid: `gap: 1px; background: var(--border)` newspaper style
- Each card: white background elevated (`var(--bg-card)`) with top accent line on hover
- Category color appears only in: tag background + tag border + top accent line
- No 3D tilt — replaced with a clean translateY(-2px) lift

### Stats Leaderboard
- Rank #1: Slightly different bg (`#f0a50008`), gold text
- Rank display: `★` for gold, `#2`–`#8` for rest
- Bar: absolutely positioned fill div (width = % of max)
- Tab buttons: mono uppercase, active underline in accent color

### Join Section
- Minimum `80vh`, centered content
- Big IP text is the hero — Space Grotesk 900 at `clamp(2rem, 8.5vw, 9rem)`
- Background: radial glow (very subtle) + grain
- Magnetic COPY button with fill animation on hover
- "WHITELIST REQUIRED · INVITE ONLY" barely visible at bottom

### Footer
- Grid: 3 columns on desktop, stacked on mobile
- Left: Logo "JOD" + tagline
- Center: Nav links
- Right: Server IP + year
- Top border: hairline green gradient

### Crew Page
- Same structure, refined tokens
- Member cards: slightly more padding, better avatar treatment
- Activity feed: better timestamp typography

### Crew Profile
- Better header area — username large, bio beneath
- Stats in a 5-column grid (flex-wrap)
- Achievements as pill badges
- Photos in a 3-column grid

---

## Accessibility Notes

- All interactive elements have explicit `focus-visible` styles
- Custom cursor automatically hidden on `max-width: 768px` (existing)
- `prefers-reduced-motion` via Framer Motion's `useReducedMotion` hook will be wired into entrance animations
- All images have `alt` text
- Lightbox keyboard navigation preserved
- Color contrast: text `#dde1ec` on `#06080c` = ~12:1 (AAA)

---

## What Does NOT Change

- All API endpoints and HTTP methods
- All authentication flows
- All Framer Motion entrance animation logic (refined, not replaced)
- All custom hooks and utility functions
- The custom cursor system (minor refinements only)
- The interactive SVG map (styling only)
- All form handlers (copy IP, post creation, bio edit, etc.)
- All scroll-triggered lazy loading
- The resource pack editor (separate page, not touched)
- The admin panel (functional tool, not part of public redesign)
- All route URLs and page structure
