# JOÐ — Minecraft server website

Website for the JOÐ private Minecraft survival server at **play.jodcraft.world**.

Built with Next.js 15, TypeScript and plain CSS. No UI framework on the public pages.

---

## The public site

One page, done as a frontier period piece: dark walnut and leather bands alternating with aged parchment, torn paper edges between them, film grain over everything, brass rules and engraved corner ornaments. Rye wood type for the big words, Playfair Display for titles, Lora to read.

| Chapter | What it shows |
|---|---|
| Hero | A sepia screenshot with a slow drift and dust motes, behind a brass-framed poster: the wordmark, a lantern that only lights when the server is up, the address. |
| Camp | A telegraph panel with the live status and the eight crew as tintype portraits; colour means riding now (pinged once a minute). |
| Territory | The world map as a burnt-edged survey sheet with brass tacks; the rivers draw themselves as you arrive. Tack or name selects a claim and its photograph. Edited in the admin panel. |
| Postcards | The screenshot gallery as tintypes that go from sepia to colour on hover; a grid on desktop, a swipe strip on phones, with a lightbox. Managed in the admin panel. |
| Showdown | Quick Draw at high noon: three draws a game, a flash on the call, smoke and a bullet hole on the hit. Best time is kept in the browser. |
| Tallies | The leaderboard as a wanted board: posters for the top three, a ledger for the rest. |
| Provisions | The datapacks as a general-store price list. |
| Ride in | The server address as a hot cattle brand; tap to copy. |

`/crew` lists the crew, `/crew/<name>` is a member page with bio, stats, achievement stars, posts and screenshots. Members log in there with their crew token.

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
