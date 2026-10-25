# Myndavél: Phase 0 audit

25 October 2026. Read and confirm only; no code changed anywhere.

## What this audit could reach

This pass ran in a cloud session that had the site repo (`minecraft-jod-v2`) and nothing else from the desktop. What it read, and where from:

| Source | Used for | How |
|---|---|---|
| `minecraft-jod-v2` | board, storage, auth, member identity, Blob, exaroton client, `/heimskort` | read in full where it mattered |
| Vanilla 26.3 data (recipes, item tags, default item components, registries) | recipe clash, base item | the `misode/mcmeta` `26.3-summary` mirror, generated from the official 26.3 jar (version.json sha1 `96c00d95a313...`) |
| Paper source, `main` branch (`mcVersion=26.3`, `channel=STABLE`) | Dialog API status, Java version | raw source files |
| exaroton API client (`exaroton` 2.0.2 on npm) | what the API can do: files, commands, websocket streams | its README |

What it could **not** reach, so every answer below that depends on it is marked "confirm first":

- The `jodcraft` repo (CLAUDE.md, packs.json, `tools/`, the shipped datapacks and Kubbaheimur). Attaching it was refused in this session. The desktop session had started the pack-side clash and tag checks; they need finishing there or in a session that has the repo.
- The NAS (no shell access from here).
- The Dagskrá repo (`textavarp`), the NAS compose reference.
- exaroton's support pages and Paper's docs and Javadoc hosts (blocked from this session's network).

## 1. Board storage and member identity

**Where posts live.** Taflan (`/taflan`, `src/app/taflan/page.tsx`) is built on every request by `readBoard()` in `src/lib/board.ts`, which gathers items from several stores. A member's own posts are entries on their wall:

- One JSON document per member in Redis at `crew:profile:<username lowercased>` (`src/lib/crew.ts`), shape `CrewProfile` with `entries: CrewEntry[]` (`src/lib/crew-types.ts`). Writes go through a compare-and-set Lua script, so two writers cannot clobber a wall. Without `REDIS_URL` it falls back to JSON files in `src/data/profiles` (dev only).
- Pictures are in Vercel Blob under `crew/<username>/<uuid>.<ext>` (`src/lib/blob-store.ts`). The store may be public or private; private blobs are served through `/api/blob/...` with `crew/` already on the allow list.
- The board shows the newest 60 posts whatever their age, plus 60 days of everything else (`POSTS_KEEP`, `BOARD_DAYS`). A wall holds at most 400 entries (`LIMITS.entries`; the 401st is refused with a 409).
- Authors already delete their own posts: `DELETE /api/crew/[username]/entries/[id]` checks the session owns the wall and removes the entry's pictures from Blob (`removePhotos`).
- The daily sweep (`src/lib/crew-sweep.ts`) deletes pictures under `crew/<user>/` that no wall names after three days. A photo pinned as an entry is named by its wall, so the sweep keeps it.
- Prints are drawn through `next/image` (`src/components/badlands/photo.ts`), so photos would reuse the existing image path and add no new kind of cost.

**Member to Minecraft UUID.** A member's site username *is* their Minecraft name: the crew is the fixed list `CREW_USERNAMES` (8 names) in `src/lib/crew-types.ts`. Sessions are a random id in a cookie, `crew-session:<id>` in Redis, holding the username. UUIDs come from `crewUuids()` in `src/lib/stats.ts`: Mojang's profile lookup for each crew name, kept a day in Redis under `mojang:uuids`, and stored only when every name resolved. Advancements and stats already use it to find `world/players/.../<uuid>.json`.

So the ingest route maps the snapshot's author UUID to a username with `crewUuids()` and refuses any UUID that is not on the crew. Caveat: if a member renames their Minecraft account, `CREW_USERNAMES` still needs a hand edit (true for everything on the site today).

**Proposed shape for photo posts (decide before Phase 3).** Make a photo a `CrewEntry` on the author's wall with one print in `photos` and a new optional field, the way `bounty` and `poll` already make post kinds:

```ts
shot?: { jobId: string; takenAt: string; spot: { dim: string; x: number; y: number; z: number } | null }
```

The caption goes in `entry.text` (limit 1000, so the dialog's 300 fits; a print's own caption is capped at 200, so it should not go there). `jobId` makes ingest idempotent: a retried request finds the entry and answers with it instead of posting twice. `spot` is only stored when the toggle was on.

What this gets for free: the author's delete, lanterns, replies, reactions, the door's new count, the "Myndir" filter (it already counts posts with prints) and the sweep. The alternative, a separate `BoardItem` kind with its own Redis key, would need its own delete, its own new count and its own sweep rule. I recommend the entry.

**`/heimskort`.** It is a redirect to `/bluemap/index.html` (`next.config.mjs`), and the site already deep links into the viewer with a hash (`MAP_START_VIEW = 'world:-6890:57:-8919:...'` in `src/components/badlands/data.ts`). A "Sjá á korti" link would be `/heimskort#world:<x>:<y>:<z>:...`; browsers carry the hash through the redirect. Checking "inside the mapped area" against the synced copy (`src/lib/bluemap-snapshot.json`) is Phase 3 work.

## 2. Transport: B, the queue folder through the exaroton API

**Chosen: B.** The plugin writes each finished snapshot to a queue folder in its own data folder. Framköllun on the NAS picks it up through the exaroton API, renders it, posts it to the site, then deletes it from the queue. Nothing on the game server makes a network call.

Why B over A:

- **No new public hostname.** Under A the NAS would need a tunnel hostname reachable from exaroton, with its own HMAC gate. Under B the NAS only makes outbound calls (exaroton and jodcraft.world), so Framköllun needs no hostname at all and nothing new is exposed.
- **No dependency on exaroton egress.** I could not confirm from exaroton's own docs that plugins may make outbound HTTPS calls (their pages were unreachable from this session). There are hints that they can: BlueMap runs on the server and normally fetches the client jar from Mojang. But a probe plugin means deploying to live, which needs a go-ahead. B makes the question moot.
- **No polling, still fast.** The exaroton API has a websocket with a console stream that sends an event for every new console line, and a status stream. Framköllun stays subscribed. When the plugin finishes writing a snapshot it logs one line (for example `[Myndavél] í framköllun: <jobId>`). Framköllun reacts to that line, downloads the file through the file API, and deletes it once the site has the post.
- **Durable by construction.** The snapshot is a file on the server's disk until Framköllun deletes it. The plugin writes to `<id>.tmp` and renames, so a half-written file is never fetched. On every websocket (re)connect, and when the status stream says the server is stopping, Framköllun lists the queue folder once to catch anything it missed. The file API also works while the server is stopped (`scripts/sync-map.mjs` relies on that). Losing the network for a minute, or an hour, loses nothing.
- **The ready message works.** The exaroton API can run a server command (REST, or over the same websocket). When the site answers with the post's URL, Framköllun runs a console-only command such as `myndavel komin <jobId> <path>`. If the author is online, the plugin sends "Myndin þín er komin á vefinn." with the link. The plugin needs no "ready" check at all, so it runs nothing while waiting.

What B costs:

- The NAS holds an exaroton API key. As far as I know exaroton keys are account wide (start, stop, files). It lives only in the NAS `.env`. Whether it is the site's key or a second one is an open question.
- Framköllun sees every console line while subscribed. It must match only its own marker line and log nothing else.
- exaroton rate limits apply, but a photo costs about three calls (download, delete, and sometimes a list), far below what `map:sync` already does.
- HMAC on hop 1 still applies: the plugin signs each snapshot file with a key from its config, and Framköllun refuses any file that fails the check. Hop 2 is an HMAC-signed POST to the site.
- The queue needs a cap so a dead NAS cannot fill the server's disk (proposal: at most 50 files, about 150 MB at the 3 MB ceiling; past that the shutter says the camera is busy and the paper is not spent).

## 3. Paper 26.3: Dialog API and Java

- **Paper 26.3 is on the stable channel** (`gradle.properties` on Paper `main`: `mcVersion=26.3`, `apiVersion=26.3`, `channel=STABLE`). The Javadoc index lists `26.3.build.209-stable`. The live server's exact build is to confirm (exaroton panel).
- **Java 25.** Paper builds with `languageVersion = 25` and `release = 25`, so the plugin targets Java 25 with `api-version: 26.3`.
- **Dialog API: not experimental on 26.3.** In 1.21.11, `Dialog.create(...)` and the `registry.data.dialog.type` package were marked `@Experimental`. On 26.3 neither `Dialog`, `DialogBase`, `DialogInput`, `TextDialogInput`, `ActionButton` nor `DialogAction` carries an experimental marker; they are `@ApiStatus.NonExtendable` only.
- What the design needs is all there: `Dialog.create(...)` at runtime (no bootstrap registry needed); `DialogBase.builder(title).canCloseWithEscape(true).afterAction(...)`; `DialogInput.text("lysing", label).maxLength(300).multiline(MultilineOptions.create(maxLines, height))`; `DialogInput.bool("kort", label)` with initial `false`; `ActionButton.builder(label).action(DialogAction.customClick(callback, options))`, where the callback receives the input values.
- **Closing counts as Henda.** Using the two-button confirmation type with "Henda" as its "no" button should make Escape run Henda (vanilla behaviour for that type; verify in Phase 1). A close that sends nothing (disconnect, another screen opening over it) is handled on the server: an unanswered capture is discarded on quit and after a timeout (proposal: 5 minutes). The paper is spent in every case.

## 4. NAS (confirm first)

None of this could be checked from here. Please run on the NAS and paste the output:

```sh
ls -l /dev/dri
lspci | grep -iE 'vga|3d|display'
lscpu | grep -E 'Model name|^CPU\(s\)'
free -h
zfs list -o name,mountpoint
docker info --format '{{.ServerVersion}} {{.OperatingSystem}}'
```

- **GPU or iGPU via `/dev/dri`:** decides the renderer in Phase 2. With `/dev/dri`, headless GL on the iGPU. Without it, the same pipeline on Mesa's multithreaded software rasterizer (llvmpipe). The 60 s budget then rests on CPU cores, so the core count matters.
- **CPU, RAM:** sets the container's memory limit and the render time estimate.
- **Dataset path:** for the render cache (Mojang assets, skins) and the job log. I will not guess one.
- **Tunnel hostname:** not needed under transport B.
- **Reference compose:** Dagskrá's `compose.yaml` (repo `textavarp`) was not reachable here; Phase 2 should follow it and the gvn-stack rules (pinned `node:24-alpine`, non-root, healthcheck, memory limit, `.env` never committed).

## 5. Pack formats for 26.3

From the official 26.3 `version.json` (release 15 September 2026):

| | Format |
|---|---|
| Data pack | **121** (minor 0), so `"min_format": 121, "max_format": 121` |
| Resource pack | **97.1**, so `"min_format": [97, 1], "max_format": [97, 1]` |

These match what the desktop session read from the cached 26.3 jar. **Confirm first:** that `packs.json` and the repo's existing `pack.mcmeta` files declare the same and in the same style; the new `JOD Myndavél` pack follows the repo, not this table.

## 6. Recipe and base item

**Recipe** ` R ` / `CGC` / `CCC` (C copper ingot, G glass pane, R redstone dust).

- **Vanilla 26.3: no clash.** Checked against all 1,202 shaped and shapeless crafting recipes, with tags expanded and mirrored shapes included. The nearest shapes, none of which can match: copper chestplate `X X/XXX/XXX`, copper chest `###/#X#/###` (chest in the middle), copper bulb ` C /CBC/ R ` (copper blocks, blaze rod), and the stained glass panes `###/#$#/###`.
- **Special recipes** (repair, map extending, firework, banner and shield, dye, transmute, imbue, decorated pot) are code driven and do not take this grid.
- **Server packs: confirm first.** The check against JOÐ's own datapacks and the third-party ones on the server (`src/data/datapacks.ts` lists MVP, Banner Flags, Call of the King, Colored Name Teams, Dungeons & Taverns, Ghast Mayhem, Holographic Tags, LY Graves, Show Player Health, Better Mineshaft, MC Paint, Waystones, Vanilla Refresh and Wabi-Sabi Structures) needs the ZIPs from the `jodcraft` repo or the server. The desktop session had begun it.
- **Cost:** 5 copper, 1 glass pane and 1 redstone is an early-game recipe. It fits "earned through play" if paper as film is the running cost; say if it should cost more.

**Base item: `minecraft:recovery_compass`.** One line: in 26.3 it is a plain item with no use or place behaviour, is not an ingredient in any vanilla recipe, is not fuel, and its only tag (`minecraft:compasses`) is referenced by no vanilla data, while the clock, the other candidate, is in `minecraft:piglin_loved`, so piglins would grab a dropped Myndavél.

How the candidates screened against the 26.3 data:

| Candidate | Places a block | Ingredient in | Tags | Verdict |
|---|---|---|---|---|
| `recovery_compass` | no | nothing | `compasses` (unused by vanilla data) | **chosen** |
| `clock` | no | nothing | `piglin_loved` | piglins pick it up |
| `compass` | no | map, recovery compass | `compasses`, `enchantable/vanishing` | is an ingredient; lodestone use |
| `trial_key` | no | nothing | none | opens vaults on right-click |
| `echo_shard`, `disc_fragment_5`, `nautilus_shell`, `heart_of_the_sea`, `armadillo_scute` | no | one recipe each | | are ingredients |
| `knowledge_book` | no | nothing | `bookshelf_books` | right-click consumes it |
| `structure_void` | yes | | | placeable |

Notes for Phase 1:

- Vanilla crafting matches ingredients by item type, not components. With a base that is no ingredient, a Myndavél cannot be eaten by any vanilla recipe.
- **Confirm first:** that no JOÐ or third-party pack uses `recovery_compass` or `#minecraft:compasses` (the desktop session was tracing this).
- The result carries `max_stack_size: 1`, `item_name: "Myndavél"`, `custom_data: {jod:{myndavel:1b}}` and `item_model: "jod:myndavel"` (model id to match Kubbaheimur's naming).
- The recovery compass's default rarity is uncommon, so the name shows in yellow. Keep that as a quiet "special item" cue, or set `rarity: "common"` for white.
- The plugin recognises the Myndavél by `custom_data` only, never by item type.
- "Paper" should mean plain `minecraft:paper` with no `custom_data`, so a pack's paper-based item (a waystone scroll, say) is never used as film.

## 7. Source locations

Accept the proposal: `plugins/jod-myndavel/` (Gradle wrapper inside it, Java 25 toolchain) and `services/framkollun/` (Node 24 + TypeScript, `compose.yaml`, `.env.example`, `SNAPSHOT.md`, `fixtures/`) in the `jodcraft` repo. The site work (ingest route, `shot` entries, board rendering) lives in `minecraft-jod-v2`.

**Confirm first:** that `tools/build.py`, lint and rpcheck walk only the pack folders, so two non-pack folders do not trip them. The repo's CLAUDE.md decides.

This audit sits in `minecraft-jod-v2/docs/myndavel/` for now because that was the only repo this session could write to. It should move to `jodcraft/docs/myndavel/` next to the later phase notes.

## Snapshot budget, a first estimate

To check before Phase 1, not a measurement:

- Minecraft's FOV 70 is vertical, so about 102 degrees across at 16:9. Within R = 8 chunks that is roughly 70 to 80 loaded chunks in the frustum.
- Sun shadows can fall into view from chunks outside the frustum, so the margin should lean towards the sun. Count on about 120 chunks.
- `getChunkSnapshot` on the main thread at roughly 0.1 to 0.3 ms per chunk gives 12 to 36 ms in total, which is 8 to 24 ticks at 1.5 ms per slice, or 0.4 to 1.2 s. The 1 s budget is tight at the top end.
- Levers if it is: clip the Y range per chunk before copying, trim the shadow margin, or default R to 6. Phase 1 measures it with spark.
- Size: about 10 visible sections per chunk, palette packed at 4 to 6 bits a block, plus sky and block light nibbles, then gzip. That comes to roughly 0.5 to 1.5 MB, inside the 3 MB cap. Shipping the server's own light arrays is cheap and more accurate than recomputing sky light on the NAS.
- Heap: full chunk copies at about 160 KB each, so about 20 MB for 120 chunks, under the 50 MB cap.
- Skins: put each player's `textures` profile property (the skin URL) in the snapshot. Framköllun then downloads the PNG by URL and caches it, with no Mojang profile lookups, and the photo shows the skin as it was.

## Decided by Jón Goði (25 October 2026)

- **Phase 1 runs in a new desktop session**, where the `jodcraft` repo, the Docker smoke server and the cached 26.3 jar are. This cloud session could not build or test it: it had Java 21 only, no Paper API (PaperMC's Maven repo blocked), no Docker daemon and no `jodcraft` repo.
- **In flight means shutter to snapshot on disk.** A capture counts towards the limit of 2 only until its snapshot is written; the dialog then waits holding nothing. An unanswered dialog is discarded after 5 minutes and when the player quits, and the paper stays spent.
- **The recipe stays as proposed:** ` R ` / `CGC` / `CCC`, with paper as film the running cost.
- **Fixtures are synthesized on the smoke server.** Snapshots are taken there and synthetic players added; nothing touches live in Phase 1.

## Still open for Jón Goði

1. Photo posts as `CrewEntry` with a `shot` field (recommended), or a separate board kind? Needed by Phase 3.
2. The exaroton API key on the NAS: reuse the site's key, or make a second one if exaroton allows it? Needed by Phase 3.
3. Queue cap of 50 snapshots on the server's disk. Fine?
4. Myndavél name colour: yellow (the recovery compass's default) or white?
5. The live Paper build number.

## Confirm first (nothing invented)

- NAS: `/dev/dri`, CPU, RAM, dataset path (section 4).
- Ingest route path on jodcraft.world. Proposal: `/api/myndavel`, under the site's existing `api/` naming. Not created.
- Env var names. Proposal: `MYNDAVEL_HMAC_KEY` in the plugin config and the NAS `.env` for hop 1; `MYNDAVEL_INGEST_SECRET` in the NAS `.env` and Vercel env vars for hop 2; `EXAROTON_API_KEY` and `EXAROTON_SERVER_ID` in the NAS `.env`.
- The plugin's console marker line and command name (`myndavel komin`).
- Pack formats as the repo declares them; the pack-side recipe and tag checks; the repo tools ignoring the two new folders.
- Blob headroom under the $1 cap. A photo is at most 700 KB plus one `put`. The map packs share the store, so check the current month's usage before Phase 3.

Phase 0 is done. Phase 1 has the go-ahead and starts in a new desktop session. Its first steps: finish the pack-side recipe and tag checks, and copy this file to `jodcraft/docs/myndavel/`.
