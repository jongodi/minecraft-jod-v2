# JODcraft — Minecraft Server Website

Website for the JOD private Minecraft survival server at **play.jodcraft.world**.

Built with Next.js 14, TypeScript, Tailwind CSS, and Framer Motion.

---

## Features

- **Server status** — live player count and online crew display via Exaroton API
- **Gallery** — screenshot lightbox with keyboard/swipe navigation, managed via admin panel
- **Datapacks** — lists installed datapacks with automatic update checks against Modrinth and GitHub APIs
- **Interactive map** — embedded Dynmap
- **Crew profiles** — per-player pages with bio, posts, and photo uploads; login via crew token
- **Player stats leaderboard** — playtime, kills, deaths, crafted items, distance walked (read from world stats files via Exaroton)
- **Resource Pack Editor** — browser-based tool for inspecting and editing Minecraft resource packs (.zip), with texture viewer, 3D model preview, issue checker, pixel painter, pack diff tool, and more
- **Admin panel** (`/admin`) — server control (start/stop/restart), datapack update manager, gallery management

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values.

| Variable | Description |
|---|---|
| `EXAROTON_API_KEY` | Exaroton API token — enables server status, control, and player stats |
| `EXAROTON_SERVER_ID` | Your server ID from exaroton.com (optional, avoids extra lookup) |
| `ADMIN_TOKEN` | Password for the `/admin` panel (min 8 characters) |
| `GITHUB_TOKEN` | GitHub classic PAT with no scopes — raises datapack API rate limit (optional) |
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

- `source: 'modrinth'` + `modrinthSlug` — checks Modrinth API
- `source: 'github'` + `githubRepo` (`owner/repo`) — checks GitHub Releases
- `source: 'manual'` — no automatic checking

Set `currentVersion` to the version currently installed on the server.
