# JOÐcraft

The website for JOÐcraft, a private Icelandic survival Minecraft server for a
few friends, at [jodcraft.world](https://jodcraft.world). Players join at
`play.jodcraft.world`.

The site answers seven questions and nothing else: is the server on and who
is in, how do I join, what is different from vanilla, what changed recently,
what does it look like, what is the world, and is there something to play
with while I decide. Everything on it is in Icelandic. The design is argued
for in [DESIGN.md](DESIGN.md).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npx tsc --noEmit     # type-check
npm run lint
npm test             # unit tests, Node's own runner
npm run build && npm start
```

Node 22.6 or newer (the tests use Node's TypeScript stripping). No database,
no storage, no build-time network beyond npm: the fonts are committed under
`src/fonts`.

## Configuration

Copy `.env.local.example` to `.env.local`.

| Variable | What it does |
|---|---|
| `EXAROTON_API_KEY` | Token from exaroton.com. Enables status with the player list, and the stats table. |
| `EXAROTON_SERVER_ID` | Optional. Saves one API call per check. |
| `EXAROTON_SERVER_HOST` | Optional. Hostname used by the public ping fallback. Defaults to `stebbias.exaroton.me`. |
| `NEXT_PUBLIC_SITE_URL` | Optional. Public URL for Open Graph links. Defaults to `https://jodcraft.world`. |

Without a token the status comes from `api.mcsrvstat.us` and the stats
section does not render.

## Editing content

Everything the site says lives in `src/data`. No component needs to change.

| File | What is in it |
|---|---|
| `server.ts` | Name, address, version string, tagline, resource pack line, the list of players. |
| `datapacks.ts` | One entry per datapack: name, Icelandic blurb (eight words at most), installed version, Modrinth slug. |
| `changelog.ts` | Date plus one line per change, newest first. The section appears as soon as the list has an entry. |
| `gallery.ts` | One entry per screenshot in `public/screenshots`: file, size, title, place, Icelandic alt text, desktop column span, map pin. |
| `places.ts` | The map: places with drawing coordinates and label side, regions, the river, the sea. Not world coordinates. |

To add a screenshot: put a webp in `public/screenshots`, add an entry to
`gallery.ts` with its real pixel size, and, if it is a new place, a pin in
`places.ts`.

## Where the data comes from

| Data | Source | Cached | When it fails |
|---|---|---|---|
| Status, who is in | Exaroton API, else `api.mcsrvstat.us` | 30 s on the server, polled every 60 s by the page | State becomes "Ekkert svar", the lamp goes grey, the page keeps polling |
| Player heads | `mc-heads.net/head/<name>` | browser cache | A bone square with the player's initial |
| Stats | Exaroton file API reading `world/players/stats/*.json`, names via Mojang | 5 min (names 1 day) | The section is left out |
| Everything else | `src/data` and `public/screenshots` | build | |

The page is regenerated at most once a minute. If a regeneration fails the
last good page keeps serving.

## When the status API changes

All Exaroton reading is in two files: `src/lib/status/server.ts` (status)
and `src/lib/stats/server.ts` (stats). The status file maps Exaroton's
numeric status codes to the site's five states in `stateFromCode`; the
public state type and the Icelandic words for it are in `src/lib/status`.
Change the fetch, keep the `ServerStatus` shape, and nothing downstream
notices. `/api/status` is what the browser polls and returns that same shape.

## Routes

| Route | What |
|---|---|
| `/` | The site |
| `/stil` | The design system rendered: mark, palette, type, every state, the sections with sample data. Not indexed. |
| `/rp-editor` | The resource pack analyser and editor, a tool for the pack author. English, desktop only, kept as is. |
| `/api/status` | JSON the page polls |

## Repository rules

TypeScript strict with no `any` outside `src/app/rp-editor`. Tokens are
declared once in `src/app/globals.css` and named in `tailwind.config.ts`.
No em dash anywhere in the repo. CI type-checks, lints, tests and builds
every push. Unit tests sit next to the pure modules they cover
(`*.test.ts`); the RP editor has none and is out of scope for the lint
rules on `any`.

## Deploying

Any Node host or Vercel. Set the variables above, run `npm run build`, serve
with `npm start`. The home page is regenerated at most once a minute and
`/api/status` is dynamic, so the host must run the Node server, not a static
export.
