#!/usr/bin/env bash
# Builds the patched BlueMap Entities addon with Gradle: upstream at UPSTREAM_COMMIT plus patches/*.patch,
# entity models generated from the Minecraft 26.3 client jar, tests included.
# The jar lands next to this script. Needs JDK 25 and network access to Mojang, Fabric, BlueMap, Paper and
# NeoForge (the "BlueMap Entities" GitHub workflow has both and runs this).
set -euo pipefail

UPSTREAM=https://github.com/BlueMap-Minecraft/BlueMapEntities
UPSTREAM_COMMIT=d86329724954aebb2e0a08bc87ba5d727ce7d741

here="$(cd "$(dirname "$0")" && pwd)"
# gradle names the jar after this folder
work="${RUNNER_TEMP:-$(mktemp -d)}/BlueMapEntities"

rm -rf "$work"
git clone --quiet "$UPSTREAM" "$work"
git -C "$work" checkout --quiet "$UPSTREAM_COMMIT"
git -C "$work" -c user.name=build -c user.email=build@localhost am --quiet --keep-cr "$here"/patches/*.patch

cd "$work"
./gradlew --no-daemon --stacktrace :generator:generateEntityModels
./gradlew --no-daemon --stacktrace build

head -n 1 generator/build/generation-report.txt || true

jar="$(ls build/libs/*.jar | grep -v -e '-sources\.jar$' -e '-all\.jar$')"
models="$(unzip -l "$jar" | grep -c 'assets/minecraft/models/entity/.*\.json$' || true)"
echo "$(basename "$jar"): $models entity models"
if [ "$models" -lt 500 ]; then
  echo "Too few entity models, the generator did not run properly." >&2
  exit 1
fi

# the scale attribute's range in the client the models came from, for the record
for client in $(find ~/.gradle/caches "$work/.gradle" -path '*26.3*' -name '*.jar' -size +5M 2>/dev/null); do
  if unzip -l "$client" | grep -q 'net/minecraft/world/entity/ai/attributes/Attributes.class'; then
    echo "minecraft:scale in $(basename "$client"):"
    javap -c -p -constants -cp "$client" net.minecraft.world.entity.ai.attributes.Attributes 2>/dev/null \
      | grep -A 6 'attribute.name.scale' || true
    break
  fi
done

rm -f "$here"/BlueMapEntities-*.jar
cp "$jar" "$here/"
echo "Built $here/$(basename "$jar")"
