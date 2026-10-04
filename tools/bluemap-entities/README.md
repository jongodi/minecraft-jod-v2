# BlueMap Entities, patched for the server

A patched build of [BlueMap Entities](https://github.com/BlueMap-Minecraft/BlueMapEntities) (the BlueMap addon that draws mobs on the map) for the Paper server on Minecraft 26.3.

| file | what it is |
|------|------------|
| `BlueMapEntities-1.5-jod.jar` | the addon, goes in `plugins/BlueMap/packs/` on the server |
| `patches/0001-jod-animals-box-scale.patch` | the changes, on top of upstream commit `d863297` |
| `build.sh` | clones upstream, applies the patch, builds with Gradle |

## What the patch changes

1. **Only inside a box.** Entities are drawn only if their block position (as F3 shows it) is inside the box in `bluemap-entities.properties`, next to the jar. The file is created with these defaults if it is missing: x -6975 to -6869, y 60 to 90, z -8878 to -8793, all bounds included. It applies to every BlueMap map.
2. **Only animals.** Passive and neutral animals: armadillo, axolotl, bat, bee, camel, camel husk, cat, chicken, cod, cow, dolphin, donkey, fox, frog, glow squid, goat, happy ghast, horse, llama, mooshroom, mule, nautilus, ocelot, panda, parrot, pig, polar bear, pufferfish, rabbit, salmon, sheep, skeleton horse, sniffer, squid, strider, tadpole, trader llama, tropical fish, turtle, wolf, zombie horse and zombie nautilus. This follows how the game types its mobs: hoglins count as hostile, while allays, villagers, wandering traders and golems are not animals. Props are not drawn: boats, minecarts, armor stands, item frames, paintings, cushions and the rest. The list is `Animals.java` in the patch.
3. **Real size.** Each mob is drawn at the final value of its `minecraft:scale` attribute, read from the entity's saved `attributes` list (`base`, then `add_value`, `add_multiplied_base` and `add_multiplied_total` modifiers, clamped to 0.0625 to 16, the same calculation as the game). This format is unchanged in 26.3.

## Install

Needs BlueMap 5.24 or newer (the first release that reads 26.3 worlds); 5.28 is the latest. `/bluemap version` shows yours.

1. Stop the server. A new addon jar is only loaded on a full restart, not by `/bluemap reload`.
2. Remove any other BlueMap Entities jar from `plugins/BlueMap/packs/`: two addons with the same id stop BlueMap from loading addons at all.
3. Put `BlueMapEntities-1.5-jod.jar` in `plugins/BlueMap/packs/` (not in `plugins/`).
4. Start the server. The console says `Rendering only animals inside x -6975..-6869, y 60..90, z -8878..-8793 (.../plugins/BlueMap/packs/bluemap-entities.properties)`, and the file is created.
5. Redraw the box: `/bluemap force-update world -6922 -8836 70`. If the map was drawn with the unpatched addon before, redraw all of it instead (`/bluemap force-update world`), so the entities outside the box disappear too.
6. Copy the map to the website as usual (Map sync).

After editing `bluemap-entities.properties`: `/bluemap reload` (the full one; `reload light` keeps the old box), then `force-update` both the old and the new box.

## Build

The workflow `.github/workflows/bluemap-entities.yml` runs `build.sh` whenever the patch or the script changes, or from Actions → BlueMap Entities → Run workflow, and commits the jar here. It generates the entity models from the Minecraft 26.3 client jar, which needs Mojang and Fabric downloads, and runs the patch's tests.

To change the patch: clone upstream, check out `d863297`, `git am --keep-cr patches/*.patch`, commit your changes on top, and replace the patch with `git format-patch -1`. To move to a newer upstream, rebase onto it and update `UPSTREAM_COMMIT` in `build.sh`.
