// The game's own advancements, as the walls name them: every advancement a
// version of Minecraft ships (no recipes, no tab roots), its frame (task, goal
// or challenge) and its title and description in the game's own Icelandic.
// Written to src/lib/advancements.json, which src/lib/advancements.ts reads.
//
//   npm run advancements            the latest release
//   npm run advancements -- 26.3    a version of your choosing
//
// Run it when the server moves to a new version, so new advancements have a
// name. Everything is fetched from Mojang: the server jar for the
// advancements' shapes (the client jar no longer carries the game's data) and
// the asset index for the Icelandic language file. Nothing is kept but the JSON.
import { writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const MANIFEST = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const OUT = fileURLToPath(new URL('../src/lib/advancements.json', import.meta.url));
/* the tabs as the game's advancement screen orders them */
const TABS = ['story', 'nether', 'end', 'adventure', 'husbandry'];

const want = process.argv[2];
const manifest = await json(MANIFEST);
const id = want ?? manifest.latest.release;
const entry = manifest.versions.find(v => v.id === id);
if (!entry) fail(`Útgáfan ${id} fannst ekki hjá Mojang.`);
const version = await json(entry.url);

console.log(`Sæki ${id}: þjóninn (${Math.round(version.downloads.server.size / 1e6)} MB) og íslenskuna…`);
const [server, index] = await Promise.all([bytes(version.downloads.server.url), json(version.assetIndex.url)]);
const lang = index.objects['minecraft/lang/is_is.json'];
if (!lang) fail('Íslenskan fannst ekki í skrá leiksins.');
const is = await json(`https://resources.download.minecraft.net/${lang.hash.slice(0, 2)}/${lang.hash}`);

/* the server jar is a launcher holding the real jar under META-INF/versions/<id>/ */
const outer = readZip(server);
const inner = [...outer.keys()].find(n => /^META-INF\/versions\/[^/]+\/server-[^/]+\.jar$/.test(n));
const jar = inner ? readZip(outer.get(inner)()) : outer;

const PREFIX = 'data/minecraft/advancement/';
const defs = new Map();
for (const [name, read] of jar) {
  if (!name.startsWith(PREFIX) || !name.endsWith('.json') || name.startsWith(`${PREFIX}recipes/`)) continue;
  defs.set(`minecraft:${name.slice(PREFIX.length, -5)}`, JSON.parse(read().toString('utf8')));
}
if (defs.size === 0) fail('Engin afrek fundust í jar-skránni.');

/* each tab in tree order, parents before their children, as the screen reads */
const children = new Map();
for (const [key, def] of defs) {
  if (!def.parent) continue;
  if (!children.has(def.parent)) children.set(def.parent, []);
  children.get(def.parent).push(key);
}
const list = [];
const missing = [];
for (const tab of TABS) {
  const queue = [...(children.get(`minecraft:${tab}/root`) ?? [])].sort();
  while (queue.length) {
    const key = queue.shift();
    const def = defs.get(key);
    queue.push(...(children.get(key) ?? []).sort());
    if (!def.display) continue;
    const title = is[def.display.title?.translate];
    const description = is[def.display.description?.translate];
    if (!title) { missing.push(key); continue; }
    list.push({
      id: key,
      tab,
      frame: def.display.frame ?? 'task',
      title,
      description: description ?? '',
      ...(def.display.hidden ? { hidden: true } : {}),
    });
  }
}

writeFileSync(OUT, `${JSON.stringify({ version: id, list }, null, 2)}\n`);
console.log(`${list.length} afrek úr ${id} skrifuð í src/lib/advancements.json.`);
if (missing.length) console.warn(`Án íslensks heitis, sleppt: ${missing.join(', ')}`);

// ─── fetching ────────────────────────────────────────────────────────────────

async function json(url) { return JSON.parse((await bytes(url)).toString('utf8')); }

async function bytes(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(300_000) });
  if (!res.ok) fail(`${url} svaraði ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ─── a zip, read from memory ─────────────────────────────────────────────────
/* Just enough of the format for Mojang's jars: the central directory (with
   its ZIP64 record, which a jar of this many files may need), and entries
   stored or deflated. Returns name → a function that reads the entry. */

function readZip(buf) {
  let end = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) fail('Ekki zip-skrá.');
  let count = buf.readUInt16LE(end + 10);
  let at = buf.readUInt32LE(end + 16);
  if (count === 0xffff || at === 0xffffffff) {
    const locator = end - 20;
    if (buf.readUInt32LE(locator) !== 0x07064b50) fail('ZIP64-skrá án vísis.');
    const record = Number(buf.readBigUInt64LE(locator + 8));
    count = Number(buf.readBigUInt64LE(record + 32));
    at = Number(buf.readBigUInt64LE(record + 48));
  }
  const entries = new Map();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(at) !== 0x02014b50) fail('Skemmd efnisskrá í zip.');
    const method = buf.readUInt16LE(at + 10);
    let size = buf.readUInt32LE(at + 20);
    const nameLen = buf.readUInt16LE(at + 28);
    const extraLen = buf.readUInt16LE(at + 30);
    const commentLen = buf.readUInt16LE(at + 32);
    let local = buf.readUInt32LE(at + 42);
    const name = buf.toString('utf8', at + 46, at + 46 + nameLen);
    /* ZIP64 sizes and offsets live in the extra field, in this order, only where the plain field is full */
    if (size === 0xffffffff || local === 0xffffffff) {
      let x = at + 46 + nameLen;
      const xEnd = x + extraLen;
      while (x < xEnd) {
        const tag = buf.readUInt16LE(x), len = buf.readUInt16LE(x + 2);
        if (tag === 0x0001) {
          let p = x + 4;
          if (buf.readUInt32LE(at + 24) === 0xffffffff) p += 8;
          if (size === 0xffffffff) { size = Number(buf.readBigUInt64LE(p)); p += 8; }
          if (local === 0xffffffff) local = Number(buf.readBigUInt64LE(p));
        }
        x += 4 + len;
      }
    }
    entries.set(name, () => {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const raw = buf.subarray(start, start + size);
      if (method === 0) return raw;
      if (method === 8) return inflateRawSync(raw);
      fail(`Óþekkt þjöppun (${method}) á ${name}.`);
    });
    at += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
