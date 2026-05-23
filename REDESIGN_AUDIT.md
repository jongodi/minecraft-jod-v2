# JODcraft — Redesign Audit

## 1. Site Purpose, Audience & Tone

**Purpose**: JODcraft is the official website for a private Minecraft Java Edition survival server. It acts as a server hub (live status, join info), community showcase (gallery, crew profiles), content discovery surface (datapacks, world map), and admin dashboard (server control, content management).

**Primary Audience**: 8 close-knit crew members — stebbias, AmmaGaur, joenana, ingunnbirta, Gamla123, fafnir1994, IMlonely, eikibleiki — with Icelandic/Norse naming conventions that signal a tight, culturally specific community.

**Current Tone**: Matrix terminal / cyberpunk — neon `#00ff41` on near-black, CRT scanlines, glitch animations, monospace everywhere. Intentionally hacky, retro-futuristic.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2.5 (App Router, React 18, TypeScript) |
| Styling | Tailwind CSS 3.4 + inline CSS-in-JS styles |
| Animation | Framer Motion 11.3.19 |
| 3D | Three.js 0.183.2 (RP editor model viewer) |
| Storage | Vercel KV (Redis) + Vercel Blob |
| Fonts | Space Grotesk (headings) + JetBrains Mono (labels/code) via Google Fonts |
| External APIs | Exaroton (server), Modrinth (datapacks), GitHub (releases), mc-heads.net (avatars) |
| Zip handling | jszip 3.10.1 (resource pack unpacking) |

---

## 3. Page & Route Inventory

### Public Routes
| Route | Component | Content |
|-------|-----------|---------|
| `/` | `page.tsx` | Home — Hero, Ticker, Server status, Gallery, Map, Datapacks, Stats, Join, Footer |
| `/crew` | `crew/page.tsx` | Crew directory + activity feed |
| `/crew/[username]` | `crew/[username]/page.tsx` | Player profile — bio, stats, achievements, posts, photos |
| `/rp-editor` | `rp-editor/page.tsx` | Browser-based resource pack editor (Three.js, jszip) |

### Admin Routes (auth-gated)
| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin` | `admin/page.tsx` | Dashboard — server control, datapack updates, gallery/map management |
| `/admin/login` | `admin/login/page.tsx` | Password login |

### API Routes (25 endpoints)
- **Server**: `/api/server-status`, `/api/admin/server/[action]`
- **Datapacks**: `/api/datapacks`, `/api/datapacks/check-updates`, and 4 admin variants
- **Gallery**: `/api/gallery`, and 4 admin variants (upload, edit, delete, reorder)
- **Map**: `/api/map`, `/api/admin/map`
- **Crew**: `/api/crew`, `/api/crew/auth`, `/api/crew/feed`, `/api/crew/me`, and per-user bio/photo/post endpoints
- **Stats**: `/api/stats`
- **Admin auth**: `/api/admin/auth`

---

## 4. Complete Content Inventory

### Home Page

**Hero Section**
- Label: "PRIVATE MINECRAFT SERVER"
- Title: "JOD" (letter-by-letter animation)
- Subtitle: "private survival · custom datapacks · resource pack"
- CTA: "COPY IP" button → `play.jodcraft.world` (scramble animation on copy)
- Scroll hint: "SCROLL"

**Ticker Strip**
- Items: "SURVIVAL", "COMMUNITY", "CUSTOM DATAPACKS", "CUSTOM RESOURCE PACK", "PLAY.JODCRAFT.WORLD", "SINCE 2024"

**Section 01 — SERVER**
- Status: "ONLINE" / "OFFLINE"
- Player count, MOTD from Exaroton API
- Crew subsection: "WHO'S IN · THE CREW" — 8 player cards with avatars
- Update time + "EXAROTON API" attribution

**Section 02 — THE WORLD (Gallery)**
- 11 screenshots with titles and sublabels:
  1. GOÐI CASTLE / FAR AWAY LANDS
  2. JOÐ VILLE / OLD BASE
  3. PINK ESTATE / OLD BASE
  4. J CLUB / SECRET UNDERGROUND CLUB
  5. MUSHROOM ISLAND / SHROOMY HEAVEN
  6. POTIONS TOWER / NEW BASE
  7. VENICE / NEW BASE
  8. CITY HALL / NEW BASE
  9. THE VILLAGE / NEW BASE
  10. BALLOON PARADISE / NEW BASE
  11. NEW TOWN / NEW BASE
- Instruction: "HOVER TO REVEAL · CLICK TO EXPAND · {n} LOCATIONS"
- Footer: "SCREENSHOTS FROM JOD — play.jodcraft.world"

**Section 03 — THE REALM (Map)**
- Interactive SVG world map with 11+ location pins
- Pin types: SURFACE, UNDERGROUND, ISLAND, AERIAL
- Clickable location detail panel (label, sublabel, type, coordinates)
- Instruction: "CLICK LOCATIONS TO EXPLORE"

**Section 04 — DATAPACKS**
- 14 datapacks with categories, descriptions, versions, update status
- Categories: BUILD, COMBAT, SURVIVAL, SOCIAL, STRUCTURE, QOL, LOOT, WORLD, TRADE, CRAFT
- Auto-checks Modrinth/GitHub for updates when section enters viewport
- Summary bar: up-to-date count, updates available count

**Section 05 — LEADERBOARD**
- Tabs: PLAYTIME, KILLS, DEATHS, CRAFTED, WALKED
- Live or cached data from server stats files
- Gold/rank display for #1 player

**Section 05 — JOIN**
- Big IP address: "play.jodcraft.world" (occasional glitch, clickable to copy)
- Sub-label: "MINECRAFT JAVA EDITION"
- CTA: "COPY IP" (magnetic button)
- Note: "WHITELIST REQUIRED · INVITE ONLY"

**Footer**
- "JOD · private survival · 2024"

### Nav Header
- Logo: "JOD"
- Links: SERVER, GALLERY, MAP, DATAPACKS, RP EDITOR
- Server IP shown on desktop
- Hamburger menu on mobile

### Crew Page (`/crew`)
- Header: "THE CREW · {n} members"
- Tabs: MEMBERS, ACTIVITY FEED ({n})
- Member cards: avatar, username, bio preview, photo/post counts, "VIEW →"
- Feed: username, timestamp, post text

### Crew Profile (`/crew/[username]`)
- Username + editable bio
- Stats: Playtime, Mob kills, Deaths, Crafted, Distance walked
- Achievements: Newbie, Active Player, MVP, Mob Slayer, World Traveller
- Updates: Post feed + create form (owner only)
- Photos grid + upload (owner only)

---

## 5. Logic & API Inventory

### Data Fetching
- Server status: `GET /api/server-status` → Exaroton API, polls every 60s, pauses when tab hidden
- Datapacks: `GET /api/datapacks` (on mount) + `GET /api/datapacks/check-updates` (lazy, on section view)
- Gallery: `GET /api/gallery` (on mount, static fallback built-in)
- Stats: `GET /api/stats` (lazy, on section view)
- Map config: `GET /api/map` (on mount, DEFAULT_LOCATIONS fallback)
- Crew list + feed: `GET /api/crew`, `GET /api/crew/feed` (on page mount)
- Profile: `GET /api/crew/[username]` + stats/photos/posts endpoints

### Authentication
- Admin: `ADMIN_TOKEN` env var, session cookie `jod_admin_session`
- Crew: `CREW_TOKEN_<USERNAME>` env vars (8 tokens), session cookie `jod_crew_session`
- Auth lib: `/lib/auth.ts`, `/lib/crew.ts`
- Middleware: `/src/middleware.ts` (route protection)

### State Management
- All React hooks (`useState`, `useEffect`, `useCallback`, `useRef`)
- No external state library — component-local state throughout
- `localStorage` for crew session persistence

### Interactive Logic
- **IP scramble**: `scrambleText()` — randomizes characters, resolves over 800ms interval
- **Magnetic button**: Mouse proximity detection → spring animation offset
- **Gallery tilt**: Mouse position → perspective 3D rotation
- **Map pins**: SVG click handlers → select/deselect location
- **Lightbox**: Keyboard navigation (ESC, ←, →), swipe on mobile
- **Custom cursor**: Canvas particle trail, ring lag-follow, dot instant-follow
- **Scroll progress**: Window scroll position → fixed bar width
- **Active section**: IntersectionObserver for nav highlight
- **Glitch**: CSS keyframe animation cycling every ~7s
- **Ticker**: CSS animation infinite scroll

### Resource Pack Editor
- File upload → jszip unpack → analysis tabs
- Three.js model viewer (ModelsView)
- Tabs: Overview, Models (3D), Textures, Discs, Issues, Diff

---

## 6. Asset Inventory

### Screenshots (11)
`/public/screenshots/`: balloon-island.png, cherry-estate.png, j-club.png, mushroom-isle.png, night-sky.png, spawn-hill.png, the-castle.png, the-hall.png, the-tavern.png, the-village.png, waterfront.png

### Fonts
- **Space Grotesk** (Google Fonts): 300–900 weight — display/headings
- **JetBrains Mono** (Google Fonts): 100–800 weight + italic — labels, code, UI

### Dynamic Assets
- Player heads: `mc-heads.net/head/{name}/128` (fallback: `minotar.net/helm/{name}/128`)
- Server icon: Base64 from Exaroton API (52×52px, pixelated)
- User photos: Vercel Blob (crew profiles), Vercel Blob (gallery)

### Generated/Inline
- Grain texture: SVG `feTurbulence` filter, base64-encoded inline
- Particle system: Canvas 2D API
- Map: SVG inline in component
- All icons: Pure CSS or inline SVG (no image files)

---

## 7. Current Styling System

### Tokens
```css
--bg: #080808
--accent: #00ff41
--accent-dim: #00cc33
--card: #111111
--border: #1a1a1a
--text: #f0f0f0
--muted: #666666
```

### Typography
- **Space Grotesk 900** at `clamp(2.5rem–22rem)` for display headings
- **JetBrains Mono** at `0.45–0.75rem` for labels, uppercase, tracked
- Letter-spacing: `-0.03em` on display, `0.15–0.35em` on mono labels

### Animations in Use
- `glitch` — text clip-path offset, fires every ~7s
- `ticker-scroll` — infinite horizontal scroll
- `status-ring` — radial pulse for server status orb
- `letter-reveal` — clip-path slide-up (not currently used directly)
- `green-shimmer` — background-position sweep (not currently used)
- `scan` — defined but not used in production
- Framer Motion: entrance (opacity + translateY), scroll-triggered via `whileInView`

### Layout Rhythm
- Section padding: `clamp(4rem, 10vw, 8rem) clamp(1.5rem, 6vw, 5rem)`
- Consistent `borderBottom: '1px solid #1a1a1a'` dividers
- Grid: `auto-fill minmax(min(340px, 100%), 1fr)` for gallery; `minmax(min(240px, 100%), 1fr)` for datapacks

---

## 8. Identified Issues for Redesign

### Visual
1. All sections share identical `#080808` background — no visual rhythm or scene-change effect
2. Neon green #00ff41 is used uniformly everywhere, diluting its impact as an accent
3. Typography scale is repetitive — most headings use the same `clamp(2.5rem–5rem)` size
4. Gallery cards show gradient placeholders instead of images on load — the color-reveal feels dated
5. Footer is a single line — no personality or additional information
6. Mobile experience has small touch targets in crew grid and datapack cards
7. Section labels ("01 — SERVER") are identical in style across all sections — no differentiation

### Technical
1. Google Fonts loaded via `@import url()` in CSS — should use `next/font/google` for performance
2. No `prefers-reduced-motion` check on most animations (Framer Motion `useReducedMotion` not used)
3. Custom cursor and particle effects have no mobile/touch detection guard in CSS (just `@media`)

### Opportunity Areas
1. Gallery is the crown jewel — deserves a featured/hero layout, not uniform grid
2. Map section background could be much darker to make the SVG map pop
3. The "JOIN" section with big IP is conceptually strong but visually underdeveloped
4. Crew profiles are functional but sparse — could feel much more personal
5. The ticker strip is purely decorative — could carry more brand weight
