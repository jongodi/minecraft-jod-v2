// The map copy goes to Vercel Blob as a few large packs, not a thousand small
// files. Every file uploaded counts against the store's monthly allowance of
// uploads (the Hobby plan's "advanced operations"), and a map sync that sent
// each tile on its own used most of a month's allowance in one go. A pack is
// the files laid end to end, byte for byte; the manifest says where each file
// starts and how long it is, and the site reads a file back out of its pack
// with an HTTP range request. Nothing is recompressed or changed on the way,
// so the viewer gets exactly the files BlueMap wrote.
//
// Packs are named by the sync's version and never overwritten, so the store's
// own cache can keep them, and the deployment still live while a new copy is
// uploaded keeps reading its own packs.
//
// The base maps (npm run map:bases -- --upload) are packed the same way, each
// under a folder of its own in bluemap-bases/, outside bluemap-data/: map:sync
// only ever lists and cleans up bluemap-data/, so it never sees them, and
// map:bases only ever lists bluemap-bases/<id>/.

//
// A copy's version is in every address the viewer reads it under, so a file
// at an address is never anything else, and the browser and the CDN keep it
// for a year. A new copy has a new version, but most of its files are the
// same as the copy before (a sync after a few builds redraws a few dozen of a
// thousand tiles), so each file keeps the version it was first sent under for
// as long as its bytes stay the same (`since` in the manifest, told by `sums`)
// and the viewer reads the map's detailed tiles at those addresses: a new copy
// sends visitors back only for the tiles that changed.

import { createHash } from 'node:crypto';

export const BLOB_DIR = 'bluemap-data';
export const PACK_DIR = `${BLOB_DIR}/packs`;
export const BASES_DIR = 'bluemap-bases';
/** Where one base map's packs go. */
export const basePackDir = (id) => `${BASES_DIR}/${id}`;
/* under the size Vercel suggests a single upload stay below (100 MB) */
export const PACK_BYTES = 64 * 1024 * 1024;

/** Lays `files` (in their order) into packs of at most `limit` bytes; a file
    larger than that gets a pack of its own. Answers the pack names (under
    `dir`) and, for each file in the same order, [pack, offset, length]. */
export function planPacks(files, sizeOf, version, limit = PACK_BYTES, dir = PACK_DIR) {
  const names = [];
  const at = [];
  let offset = 0;
  for (const rel of files) {
    const size = sizeOf(rel);
    if (!names.length || (offset > 0 && offset + size > limit)) {
      names.push(`${dir}/${version}-${names.length}.pack`);
      offset = 0;
    }
    at.push([names.length - 1, offset, size]);
    offset += size;
  }
  return { names, at };
}

/** The bytes of pack `p`: its files, end to end. */
export function packBody(files, plan, p, read) {
  const parts = [];
  let expected = 0;
  files.forEach((rel, i) => {
    const [pack, offset, size] = plan.at[i];
    if (pack !== p) return;
    const body = read(rel);
    if (body.length !== size || offset !== expected) {
      throw new Error(`${rel} breyttist á meðan pakkinn var settur saman. Keyrðu skipunina aftur.`);
    }
    parts.push(body);
    expected += size;
  });
  return Buffer.concat(parts, expected);
}

/** The blobs a manifest reads: its packs, or one blob per file for a copy made before packs. */
export function blobsOf(manifest) {
  if (!manifest?.blob || !Array.isArray(manifest.files)) return [];
  return manifest.packs?.names ?? manifest.files.map((rel) => `${BLOB_DIR}/${rel}`);
}

/** A short fingerprint of a file's bytes, kept in the manifest (`sums`) so the
    next copy can tell which files are the same without the bytes at hand. */
export function sumOf(body) {
  return createHash('sha256').update(body).digest('hex').slice(0, 16);
}

/* map:sync's own rule (scripts/sync-map.mjs): tiles and the texture atlas
   change size whenever they are redrawn */
const SIZE_TELLS = /^maps\/[^/]+\/(tiles\/|textures\.json)/;

/** For each of `files`, with its `sums`, the version it is read under: the
    version the same bytes were first sent under, or this copy's `version`
    for a file that is new or changed. `previous` is the manifest this copy
    replaces. One written before sums were kept can only say a tile is the
    same by its size (as map:sync itself decides what to fetch), and is asked
    only about tiles and the texture atlas; anything else starts afresh. */
export function sinceOf(files, sums, sizeOf, previous, version) {
  const was = previous?.version ?? null;
  const prevFiles = Array.isArray(previous?.files) ? previous.files : [];
  const index = new Map(prevFiles.map((rel, i) => [rel, i]));
  const parallel = (list) => Array.isArray(list) && list.length === prevFiles.length;
  const prevSums = parallel(previous?.sums) ? previous.sums : null;
  const prevSince = parallel(previous?.since) ? previous.since : null;
  const prevAt = parallel(previous?.packs?.at) ? previous.packs.at : null;
  return files.map((rel, i) => {
    const j = index.get(rel);
    if (!was || j === undefined) return version;
    const kept = prevSince?.[j] ?? was;
    if (prevSums) return prevSums[j] === sums[i] ? kept : version;
    return SIZE_TELLS.test(rel) && prevAt?.[j]?.[2] === sizeOf(rel) ? kept : version;
  });
}

/** The manifest as it is written to src/lib/bluemap-snapshot.json (and a base
    map's to src/lib/map-bases/<id>.json): two-space JSON, with each file's
    [pack, offset, length] on a line of its own. */
export function manifestText(manifest) {
  return JSON.stringify(manifest, null, 2).replace(/\[\s+(\d+),\s+(\d+),\s+(\d+)\s+\]/g, '[$1, $2, $3]') + '\n';
}
