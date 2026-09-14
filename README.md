# JOÐ: Minecraft server website

Website for the JOÐ private Minecraft survival server at **play.jodcraft.world**.

Built with Next.js 15, TypeScript and plain CSS. No UI framework on the public pages.

---

## The public site

One long sheet of aged paper, laid out like a trail journal: photographs taped on at an angle, a telegram pinned to the page, the address as a rubber stamp, notes handwritten in the margins, and a dashed trail that draws itself down the page as you scroll. Rye wood type for the big words, Caveat for the handwriting, Lora for the reading. Fonts are self-hosted from `@fontsource`.

| Stop | What it shows |
|---|---|
| First page | The wordmark, a taped screenshot, a wooden signpost to the sections, and a pinned telegram with the live status. The stamp copies the address. |
| Camp | The eight crew as portraits pegged on a rope. Colour and an IN stamp mean riding now (pinged once a minute). |
| Territory | The world map as a burnt-edged survey sheet with brass tacks; the selected claim's photo is taped over its corner. Edited in the admin panel. |
| Postcards | The screenshot gallery as an album of polaroids, sepia until you hover, with a lightbox. Managed in the admin panel. |
| Showdown | Quick Draw at high noon on a leather patch: three draws, a flash on the call, smoke and a bullet hole on the hit. Best time is kept in the browser. |
| Tallies | The leaderboard as a wanted board on wooden planks: posters for the top three, a lined ledger for the rest. |
| Provisions | The datapacks printed on a store receipt. |
| Ride in | The address burnt into a leather patch; tap to copy. |

`/crew` is the roll call, `/crew/<name>` a pinned poster with bio, tallies, achievement stars, posts and screenshots. Members log in there with their crew token.

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
