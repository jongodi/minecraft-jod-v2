// ─────────────────────────────────────────────────────────────────────────────
// Zip → normalized files (+ perceptual hashes)
//
// Runs in either a Web Worker or the window (createImageBitmap + OffscreenCanvas
// exist in both). Produces:
//   • fileData  — data URLs for images/audio, raw text for JSON/text (the UI's
//                 editable snapshot)
//   • rawFiles  — the engine's input: text for JSON, {w,h,hash,ahash} for images
//
// Exact-dup hash is FNV-1a over the decompressed file bytes (so identical files
// group together; identical *pixels* re-encoded differently do not — the report
// wording reflects that). aHash is an 8×8 grayscale average hash for near-dupes.
// ─────────────────────────────────────────────────────────────────────────────

import JSZip from 'jszip';
import type { RawFile } from './types';
import { classify } from './resloc';

export interface ExtractResult {
  fileData: Record<string, string>;
  rawFiles: RawFile[];
}

const IMG_EXT = /\.(png|jpg|jpeg)$/i;
const AUDIO_EXT = /\.(ogg|mp3|wav)$/i;
const TEXT_EXT = /\.(json|mcmeta|txt|md|mcfunction|fsh|vsh|glsl|properties|lang)$/i;

function fnv1a(bytes: Uint8Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  // Fold length in to reduce collisions across different-size identical prefixes.
  h ^= bytes.length;
  h = Math.imul(h, 0x01000193);
  return (h >>> 0).toString(16).padStart(8, '0');
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
  }
  // btoa exists in both window and worker global scope.
  return btoa(bin);
}

/** Compute an 8×8 average hash. Returns 16 hex chars, or '' if unsupported. */
async function aHash(blob: Blob): Promise<{ ahash: string; width: number; height: number }> {
  try {
    // eslint-disable-next-line no-undef
    if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') {
      return { ahash: '', width: 0, height: 0 };
    }
    const bmp = await createImageBitmap(blob);
    const width = bmp.width, height = bmp.height;
    const oc = new OffscreenCanvas(8, 8);
    const ctx = oc.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bmp, 0, 0, 8, 8);
    bmp.close?.();
    const { data } = ctx.getImageData(0, 0, 8, 8);
    const gray: number[] = [];
    let sum = 0;
    for (let i = 0; i < 64; i++) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3];
      // Composite over black so transparency is stable.
      const v = ((0.299 * r + 0.587 * g + 0.114 * b) * a) / 255;
      gray.push(v);
      sum += v;
    }
    const avg = sum / 64;
    let bits = '';
    for (let i = 0; i < 64; i++) bits += gray[i] >= avg ? '1' : '0';
    let hex = '';
    for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    return { ahash: hex, width, height };
  } catch {
    return { ahash: '', width: 0, height: 0 };
  }
}

export async function extractZip(
  buffer: ArrayBuffer,
  onProgress?: (done: number, total: number) => void,
): Promise<ExtractResult> {
  const zip = await JSZip.loadAsync(buffer);
  const entries: JSZip.JSZipObject[] = [];
  zip.forEach((_, entry) => { if (!entry.dir) entries.push(entry); });

  const fileData: Record<string, string> = {};
  const rawFiles: RawFile[] = [];
  let done = 0;
  const total = entries.length;

  // Small concurrency pool to overlap decompression + decode without exhausting memory.
  const POOL = 8;
  let idx = 0;
  async function worker() {
    while (idx < entries.length) {
      const entry = entries[idx++];
      const path = entry.name;
      const kind = classify(path);
      try {
        if (IMG_EXT.test(path)) {
          const bytes = await entry.async('uint8array');
          const ext = path.split('.').pop()!.toLowerCase();
          fileData[path] = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${bytesToBase64(bytes)}`;
          const hash = fnv1a(bytes);
          const { ahash, width, height } = await aHash(new Blob([bytes as unknown as BlobPart]));
          // Keep classify()'s kind: pack.png must stay pack_png, not texture.
          rawFiles.push({ path, kind, isImage: true, bytes: bytes.length,
            image: { width, height, hash, ahash } });
        } else if (AUDIO_EXT.test(path)) {
          const bytes = await entry.async('uint8array');
          const ext = path.split('.').pop()!.toLowerCase();
          fileData[path] = `data:audio/${ext};base64,${bytesToBase64(bytes)}`;
          rawFiles.push({ path, kind, isImage: false, bytes: bytes.length });
        } else if (TEXT_EXT.test(path)) {
          const text = await entry.async('string');
          fileData[path] = text;
          rawFiles.push({ path, kind, isImage: false, bytes: text.length, text });
        } else {
          // Unknown binary (unihex zips, ttf fonts, …) — carry the bytes as a data
          // URL so the file survives a round-trip through Export .zip unchanged.
          const bytes = await entry.async('uint8array');
          fileData[path] = `data:application/octet-stream;base64,${bytesToBase64(bytes)}`;
          rawFiles.push({ path, kind, isImage: false, bytes: bytes.length });
        }
      } catch {
        rawFiles.push({ path, kind, isImage: false, bytes: 0 });
      }
      done++;
      if (onProgress && (done % 16 === 0 || done === total)) onProgress(done, total);
    }
  }
  await Promise.all(Array.from({ length: Math.min(POOL, entries.length) }, worker));
  return { fileData, rawFiles };
}
