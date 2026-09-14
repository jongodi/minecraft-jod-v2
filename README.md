# JOÐ — Minecraft server website

Website for the JOÐ private Minecraft survival server at **play.jodcraft.world**.

Built with Next.js 15, TypeScript and plain CSS. No UI framework on the public pages.

---

## The public site

One page, read top to bottom, in a "territory at dusk" theme:

| Stop | What it shows |
|---|---|
| Hero | A layered landscape. The sun is the server status: up when the server answers, a moon when it is down. |
| Camp | Live status (pinged every minute) and the eight crew heads. Lit frames are the people on right now. |
| Territory | The interactive world map. Pins and the location list select a claim, and the matching screenshot appears. Edited in the admin panel. |
| Postcards | The screenshot gallery as a swipeable strip with a lightbox. Managed in the admin panel. |
| Showdown | Quick Draw, a three-round reaction game. Best time is kept in the browser. |
| Tallies | The player leaderboard: playtime, kills, deaths, crafted, distance walked. |
| Provisions | The datapack ledger. |
| Ride in | The server address. |

`/crew` lists the crew, `/crew/<name>` is a member page with bio, stats, achievement badges, posts and screenshots. Members log in there with their crew token.

Code lives in `src/components/frontier/`, styles in `src/app/frontier.css`, shared tokens in `src/app/globals.css`.

## Tools

- **Resource Pack Editor** (`/rp-editor`): browser-based resource-pack analyser and editor. A Minecraft-accurate dependency engine (run in a Web Worker) resolves parent chains, blockstates, item definitions and overrides, fonts, particles, equipment, atlases and datapacks, then reports broken references and provably unused files. Includes a who-uses-this inspector, a dependency graph, `custom_model_data` collision and duplicate-texture detection, bulk auto-fix, shareable reports, and a Textures studio with 3D previews and painting.
- **Admin panel** (`/admin`): server control (start/stop/restart), datapack update manager, gallery and map management.

---

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in the values.

| Variable | Description |
|---|---|
| `EXAROTON_API_KEY` | Exaroton API token: enables server status, control, and player stats |
| `EXAROTON_SERVER_ID` | Your server ID from exaroton.com (optional, avoids an extra lookup) |
| `ADMIN_TOKEN` | Password for the `/admin` panel (min 8 characters) |
| `GITHUB_TOKEN` | GitHub classic PAT with no scopes: raises the datapack API rate limit (optional) |
| `CREW_TOKEN_<USERNAME>` | Login token per crew member, e.g. `CREW_TOKEN_STEBBIAS=...` |
| `REDIS_URL` | Redis, stores crew profiles, posts, gallery metadata and stat snapshots |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob, stores uploaded photos |

---

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Adding a crew member

1. Add the username to `CREW_USERNAMES` in `src/lib/crew.ts`
2. Add them to `CREW` in `src/components/frontier/data.ts`
3. Set `CREW_TOKEN_<UPPERCASE_USERNAME>` in your environment variables

## Datapack update tracking

Edit `src/data/datapacks.ts` to configure each datapack:

- `source: 'modrinth'` + `modrinthSlug`: checks the Modrinth API
- `source: 'github'` + `githubRepo` (`owner/repo`): checks GitHub Releases
- `source: 'manual'`: no automatic checking

Set `currentVersion` to the version currently installed on the server.
