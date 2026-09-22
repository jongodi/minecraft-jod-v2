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

export const BLOB_DIR = 'bluemap-data';
export const PACK_DIR = `${BLOB_DIR}/packs`;
/* under the size Vercel suggests a single upload stay below (100 MB) */
export const PACK_BYTES = 64 * 1024 * 1024;

/** Lays `files` (in their order) into packs of at most `limit` bytes; a file
    larger than that gets a pack of its own. Answers the pack names and, for
    each file in the same order, [pack, offset, length]. */
export function planPacks(files, sizeOf, version, limit = PACK_BYTES) {
  const names = [];
  const at = [];
  let offset = 0;
  for (const rel of files) {
    const size = sizeOf(rel);
    if (!names.length || (offset > 0 && offset + size > limit)) {
      names.push(`${PACK_DIR}/${version}-${names.length}.pack`);
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

/** The manifest as it is written to src/lib/bluemap-snapshot.json: two-space
    JSON, with each file's [pack, offset, length] on a line of its own. */
export function manifestText(manifest) {
  return JSON.stringify(manifest, null, 2).replace(/\[\s+(\d+),\s+(\d+),\s+(\d+)\s+\]/g, '[$1, $2, $3]') + '\n';
}
