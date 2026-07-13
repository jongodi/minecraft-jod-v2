# JODcraft: Minecraft Server Website

Website for the JOD private Minecraft survival server at **play.jodcraft.world**.

Built with Next.js 14, TypeScript, Tailwind CSS, and Framer Motion.

---

## Features

- **Server status** : live player count and online crew display via Exaroton API
- **Gallery** : screenshot lightbox with keyboard/swipe navigation, managed via admin panel
- **Datapacks** : lists installed datapacks with automatic update checks against Modrinth and GitHub APIs
- **Interactive map** : embedded Dynmap
- **Crew profiles** : per-player pages with bio, posts, and photo uploads; login via crew token
- **Player stats leaderboard** : playtime, kills, deaths, crafted items, distance walked (read from world stats files via Exaroton)
- **Resource Pack Editor** (`/rp-editor`) : browser-based resource-pack analyser and editor. A Minecraft-accurate dependency engine (run in a Web Worker) resolves parent chains, blockstates, item definitions (1.21.4+) and legacy overrides, fonts, particles, equipment, atlases and datapacks, then reports broken references and provably-unused files with a full evidence trail and confidence tier — it never suggests removing anything a reference (in the pack, at a vanilla path, or in a datapack) still points at. Includes a who-uses-this inspector, an interactive dependency graph, custom_model_data collision + duplicate-texture detection, bulk auto-fix for broken references and unused-file cleanup, and shareable Markdown/JSON reports. A Textures studio lets you browse every texture, preview the item/block it belongs to (3D for block models, stacked-layer preview for items), paint directly on the 3D model or in a pixel painter, and manage overlay layers (add/remove a layer1+ on any generated item, with a badge showing which textures have overlays). The 3D viewer resolves model parent chains against a bundled set of vanilla template models (so inherited geometry like cube_all/orientable/cross renders, including flat plants and crops), tints tinted faces, shows animated textures at their first frame (painting preserves the full frame strip), and previews entity-rendered textures that have no model in the pack: chests (single + double halves), beds, shulker boxes, boats, chest boats, minecarts, bells, banners, and legacy signs/hanging signs. Texture-only overrides with no model anywhere still get 3D — signs, hanging signs and beds map to their real vanilla block-model geometry, and any other block texture is shown on a preview cube. Navigation is four primary tabs (Overview, Report, Textures, Files) with the rest one click away under More. Vanilla-override detection uses a generated manifest of the current game's assets, and pack versions are read from either pack_format or the 1.21.9+ min_format/max_format fields (through Minecraft 26.2).
- **Admin panel** (`/admin`) : server control (start/stop/restart), datapack update manager, gallery management

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values.

| Variable | Description |
|---|---|
| `EXAROTON_API_KEY` | Exaroton API token : enables server status, control, and player stats |
| `EXAROTON_SERVER_ID` | Your server ID from exaroton.com (optional, avoids extra lookup) |
| `ADMIN_TOKEN` | Password for the `/admin` panel (min 8 characters) |
| `GITHUB_TOKEN` | GitHub classic PAT with no scopes : raises datapack API rate limit (optional) |
| `CREW_TOKEN_<USERNAME>` | Login token per crew member, e.g. `CREW_TOKEN_STEBBIAS=...` |

---

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Adding a Crew Member

1. Add the username to `CREW_USERNAMES` in `src/lib/crew.ts`
2. Add them to the `CREW` array in `src/components/ServerStatus.tsx`
3. Set `CREW_TOKEN_<UPPERCASE_USERNAME>` in your environment variables

## Datapack Update Tracking

Edit `src/data/datapacks.ts` to configure each datapack:

- `source: 'modrinth'` + `modrinthSlug` : checks Modrinth API
- `source: 'github'` + `githubRepo` (`owner/repo`) : checks GitHub Releases
- `source: 'manual'` : no automatic checking

Set `currentVersion` to the version currently installed on the server.
