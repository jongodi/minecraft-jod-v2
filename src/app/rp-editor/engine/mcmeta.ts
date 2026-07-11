// ─────────────────────────────────────────────────────────────────────────────
// pack.mcmeta parsing + Minecraft version inference
//
// pack_format is the version handshake. We map it to a human version label and,
// more importantly, to which item-model system the pack targets:
//   • legacy-overrides — models/item/*.json with `overrides` + predicates
//   • item-definition  — assets/<ns>/items/*.json (introduced in 1.21.4 / fmt 46)
//
// The engine ALSO detects the system by file presence downstream; this is the
// declared intent, used for messaging and mismatch warnings.
// ─────────────────────────────────────────────────────────────────────────────

import type { PackMetaInfo } from './types';

/**
 * Resource-pack format → version label. Ranges are the released Java versions
 * a given format is valid for. Verified against the Minecraft Wiki pack-format
 * table (1.21.4 = 46, 1.21.5 = 55 confirmed July 2026).
 */
const FORMAT_TABLE: Array<{ fmt: number; label: string }> = [
  { fmt: 1, label: '1.6.1–1.8.9' },
  { fmt: 2, label: '1.9–1.10.2' },
  { fmt: 3, label: '1.11–1.12.2' },
  { fmt: 4, label: '1.13–1.14.4' },
  { fmt: 5, label: '1.15–1.16.1' },
  { fmt: 6, label: '1.16.2–1.16.5' },
  { fmt: 7, label: '1.17–1.17.1' },
  { fmt: 8, label: '1.18–1.18.2' },
  { fmt: 9, label: '1.19–1.19.2' },
  { fmt: 12, label: '1.19.3' },
  { fmt: 13, label: '1.19.4' },
  { fmt: 15, label: '1.20–1.20.1' },
  { fmt: 18, label: '1.20.2' },
  { fmt: 22, label: '1.20.3–1.20.4' },
  { fmt: 32, label: '1.20.5–1.20.6' },
  { fmt: 34, label: '1.21–1.21.1' },
  { fmt: 42, label: '1.21.2–1.21.3' },
  { fmt: 46, label: '1.21.4' },
  { fmt: 55, label: '1.21.5' },
  { fmt: 63, label: '1.21.6' },
  { fmt: 64, label: '1.21.7–1.21.8' },
  { fmt: 69, label: '1.21.9–1.21.10' },
  { fmt: 75, label: '1.21.11' },
  { fmt: 84, label: '26.1–26.1.2' },
  { fmt: 88, label: '26.2' },
];

/** First format that uses the assets/<ns>/items/ item-definition system. */
export const ITEM_DEFINITION_FORMAT = 46;

export function versionLabel(fmt: number): string {
  // Exact match first.
  const exact = FORMAT_TABLE.find((r) => r.fmt === fmt);
  if (exact) return exact.label;
  // Below the oldest we track.
  if (fmt < FORMAT_TABLE[0].fmt) return 'pre-1.6';
  // Above the newest we track — report as newer than the last known.
  const last = FORMAT_TABLE[FORMAT_TABLE.length - 1];
  if (fmt > last.fmt) return `newer than ${last.label} (fmt ${fmt})`;
  // Between two known formats (a transitional snapshot number).
  let below = FORMAT_TABLE[0];
  for (const r of FORMAT_TABLE) {
    if (r.fmt <= fmt) below = r;
    else break;
  }
  return `~${below.label} (fmt ${fmt})`;
}

function itemSystemFor(fmt: number | undefined): PackMetaInfo['itemSystem'] {
  if (fmt == null) return 'unknown';
  return fmt >= ITEM_DEFINITION_FORMAT ? 'item-definition' : 'legacy-overrides';
}

/**
 * Parse pack.mcmeta text. Tolerant: collects errors rather than throwing so the
 * rest of the analysis can proceed even when the meta is malformed.
 */
export function parsePackMeta(
  text: string | undefined,
  namespaces: string[],
): PackMetaInfo {
  const info: PackMetaInfo = {
    found: text != null,
    itemSystem: 'unknown',
    overlays: [],
    hasCustomNamespace: namespaces.some((n) => n !== 'minecraft' && n !== 'realms'),
    namespaces,
    errors: [],
  };
  if (text == null) {
    info.errors.push('pack.mcmeta not found — the pack will not load in-game.');
    return info;
  }
  let json: any;
  try {
    json = JSON.parse(text);
  } catch (e: any) {
    info.errors.push(`pack.mcmeta is not valid JSON — ${e.message}`);
    return info;
  }
  const pack = json?.pack;
  if (!pack || typeof pack !== 'object') {
    info.errors.push('pack.mcmeta is missing its required "pack" object.');
    return info;
  }
  // Since 1.21.9 (format 69) the single pack_format was replaced by a
  // min_format / max_format pair, each a number or a [major, minor] array.
  // pack_format is still accepted for older packs. Read whichever is present.
  const asMajor = (v: any): number | undefined => {
    if (typeof v === 'number') return v;
    if (Array.isArray(v) && typeof v[0] === 'number') return v[0];
    return undefined;
  };
  const minF = asMajor(pack.min_format);
  const maxF = asMajor(pack.max_format);
  const legacy = asMajor(pack.pack_format);
  // The pack's "target" is the newest format it declares support for.
  const primary = maxF ?? legacy ?? minF;
  if (primary != null) {
    info.packFormat = primary;
    info.itemSystem = itemSystemFor(primary);
    if (minF != null && maxF != null && minF !== maxF) {
      info.versionLabel = `${versionLabel(minF)} → ${versionLabel(maxF)}`;
      info.supportedFormats = { min: minF, max: maxF };
    } else {
      info.versionLabel = versionLabel(primary);
    }
  } else {
    info.errors.push('pack.mcmeta declares no pack_format, min_format, or max_format.');
  }
  // supported_formats can also appear as a number, [min,max], or {min_inclusive,max_inclusive}.
  const sf = pack.supported_formats;
  if (!info.supportedFormats) {
    if (Array.isArray(sf) && sf.length === 2 && sf.every((x) => typeof x === 'number')) {
      info.supportedFormats = { min: sf[0], max: sf[1] };
    } else if (sf && typeof sf === 'object' && typeof sf.min_inclusive === 'number') {
      info.supportedFormats = { min: sf.min_inclusive, max: sf.max_inclusive ?? sf.min_inclusive };
    } else if (typeof sf === 'number') {
      info.supportedFormats = { min: sf, max: sf };
    }
  }
  if (pack.description === undefined) {
    info.errors.push('pack.mcmeta has no "description" — the pack shows a blank line in the selection menu.');
  } else {
    info.description = typeof pack.description === 'string'
      ? pack.description
      : JSON.stringify(pack.description);
  }
  // Overlays: `overlays.entries[].directory` add versioned asset roots.
  const entries = json?.overlays?.entries;
  if (Array.isArray(entries)) {
    for (const e of entries) {
      if (e && typeof e.directory === 'string') info.overlays.push(e.directory);
    }
  }
  return info;
}
