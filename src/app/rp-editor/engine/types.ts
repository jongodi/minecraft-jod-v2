// ─────────────────────────────────────────────────────────────────────────────
// JOÐcraft Pack Editor — analysis engine types
//
// The engine is pure, framework-agnostic TypeScript. It takes a normalized
// snapshot of a resource pack (and optional datapacks) and produces a full
// dependency graph plus an evidence-backed verdict for every asset.
//
// Design principle: NEVER guess. Every verdict carries the evidence that
// produced it. "Safe to remove" is the highest bar and requires proof that
// nothing — the RP graph, a vanilla-override path, or any datapack — points
// at the asset. When in doubt, the verdict is "review", never "remove".
// ─────────────────────────────────────────────────────────────────────────────

/** A parsed `namespace:path` resource location. */
export interface ResLoc {
  namespace: string;
  path: string;
}

/** Every kind of file the engine understands. */
export type AssetKind =
  | 'texture'
  | 'texture_meta'   // *.png.mcmeta animation/villager metadata
  | 'model'
  | 'blockstate'
  | 'item_definition' // 1.21.4+ assets/<ns>/items/*.json
  | 'font'
  | 'particle'
  | 'atlas'
  | 'equipment'      // 1.21.2+ assets/<ns>/equipment/*.json
  | 'sound'          // *.ogg
  | 'sounds_json'
  | 'lang'
  | 'shader'
  | 'pack_meta'      // pack.mcmeta
  | 'pack_png'       // pack.png
  | 'text'
  | 'other';

/**
 * The verdict tier for an asset. Ordered from most to least actionable.
 * Only `safe-remove` is ever offered as a deletion suggestion.
 */
export type Verdict =
  | 'error'       // broken / malformed / orphaned — needs a fix
  | 'used'        // reachable from the graph, a datapack, or a vanilla path
  | 'review'      // no static reference found, but a dynamic one may exist
  | 'safe-remove';// provably unreferenced — nothing points at it anywhere

/** Severity used for findings and UI cues. */
export type Severity = 'error' | 'warning' | 'cleanup' | 'info';

/** How confident we are in a verdict. */
export type Confidence = 'certain' | 'high' | 'medium' | 'low';

/**
 * A single piece of evidence. Provenance ("referenced by X") and
 * anti-provenance ("no reference found; here's what we checked") are both
 * evidence — the trail is what makes a verdict trustworthy.
 */
export interface Evidence {
  kind:
    | 'referenced-by'     // another asset points here (positive)
    | 'references'        // this asset points at another
    | 'vanilla-override'  // sits at a vanilla path → overrides a default
    | 'atlas-source'      // pulled into an atlas by a directory/single source
    | 'convention'        // used-by-convention (blockstate name, lang, default font…)
    | 'datapack'          // a datapack command/table references this
    | 'no-reference'      // nothing found (anti-provenance)
    | 'ambiguity'         // a source we cannot see past (plugin, macro, dynamic)
    | 'missing-target'    // this asset points at something that doesn't exist
    | 'note';
  /** Human-readable, specific. No generic filler. */
  detail: string;
  /** The file this evidence originates from, if any (clickable in the UI). */
  source?: string;
  /** A resource location or path this evidence concerns. */
  ref?: string;
}

/** A node in the dependency graph — one real file in the pack. */
export interface AssetNode {
  path: string;          // zip-relative path, canonical key
  kind: AssetKind;
  loc?: ResLoc;          // resource location, when meaningful
  namespace?: string;
  bytes?: number;
  /** Paths this node references (outgoing edges), deduped. */
  refs: string[];
  /** Paths that reference this node (incoming edges), deduped. */
  usedBy: string[];
  /** External (datapack) references pointing at this node. */
  datapackRefs: DatapackRef[];
  verdict: Verdict;
  confidence: Confidence;
  evidence: Evidence[];
  /** For images: parsed metadata. */
  image?: { width: number; height: number; hash?: string; ahash?: string };
  /** True when this asset sits at a path that overrides a vanilla default. */
  vanillaOverride?: boolean;
  /** Parse error message, when the file is malformed JSON. */
  parseError?: string;
}

/** A reference extracted from a datapack that reaches into the RP. */
export interface DatapackRef {
  /** Which datapack (pack root label). */
  pack: string;
  /** File inside the datapack. */
  file: string;
  /** The reference kind. */
  via: 'item_model' | 'custom_model_data' | 'font' | 'sound' | 'texture' | 'model';
  /** The raw value found. */
  value: string;
  /** Extra context (e.g. the base item for a legacy custom_model_data). */
  context?: string;
}

/** A broken texture reference inside a model (kept for the fix UI). */
export interface BrokenRef {
  modelPath: string;
  key: string;
  value: string;
  /** Why it's broken: the custom namespace has no such asset. */
  reason: string;
}

/** A resolved model → its effective texture set, with the parent chain. */
export interface ModelResolution {
  path: string;
  /** Full parent chain of resource locations, nearest-first. */
  parentChain: string[];
  /** Parent that terminated the chain in vanilla (e.g. item/generated). */
  vanillaParent?: string;
  /** Parent reference that could not be resolved (broken). */
  brokenParent?: string;
  /** Effective texture variables after merging the chain, resolved. */
  textures: Array<{
    key: string;
    value: string;
    status: 'found' | 'vanilla' | 'broken' | 'unresolved-var';
    resolvedPath?: string;
  }>;
  parseError?: string;
}

/** A custom_model_data collision (same base item + value, two targets). */
export interface CmdCollision {
  baseItem: string;
  value: string | number;
  /** The competing definitions. */
  entries: Array<{ source: string; model: string }>;
  system: 'legacy-overrides' | 'item-definition';
}

/** A group of duplicate / near-duplicate textures. */
export interface DuplicateGroup {
  kind: 'exact' | 'near';
  /** aHash distance for near-dupes. */
  distance?: number;
  members: string[];
}

/** A single finding shown in the report. */
export interface Finding {
  id: string;
  severity: Severity;
  category: string;         // short slug, e.g. 'broken-reference'
  title: string;
  detail: string;
  path?: string;            // primary file the finding concerns
  refs?: string[];          // related paths
  evidence: Evidence[];
  confidence: Confidence;
  /** Plain statement of what happens if the user acts (esp. removals). */
  consequence?: string;
  /** For fixable broken refs: the model + key to patch. */
  fix?: BrokenRef;
}

/** pack.mcmeta parse result + inferred Minecraft version context. */
export interface PackMetaInfo {
  found: boolean;
  packFormat?: number;
  supportedFormats?: { min: number; max: number } | number[];
  description?: string;
  /** Inferred MC version label, e.g. "1.21.4". */
  versionLabel?: string;
  /** Which item-model system this format implies. */
  itemSystem: 'legacy-overrides' | 'item-definition' | 'unknown';
  /** Detected overlay directories from the `overlays` block. */
  overlays: string[];
  hasCustomNamespace: boolean;
  namespaces: string[];
  errors: string[];
}

/** The complete analysis output. */
export interface AnalysisResult {
  meta: PackMetaInfo;
  /** Every asset node, keyed by path. */
  nodes: Record<string, AssetNode>;
  /** Convenience path lists by kind. */
  byKind: Record<AssetKind, string[]>;
  /** Model resolutions, keyed by model path. */
  models: Record<string, ModelResolution>;
  /** All findings, pre-sorted (errors → cleanup → info). */
  findings: Finding[];
  /** Broken references still eligible for the fix UI. */
  brokenRefs: BrokenRef[];
  cmdCollisions: CmdCollision[];
  duplicates: DuplicateGroup[];
  datapackRefs: DatapackRef[];
  /** Names of datapacks that were analyzed alongside the RP. */
  datapacks: string[];
  /** Summary counts for the overview. */
  summary: {
    files: number;
    textures: number;
    models: number;
    used: number;
    review: number;
    safeRemove: number;
    errors: number;
    warnings: number;
    reclaimableBytes: number;
  };
  /** Sources of uncertainty the engine cannot see past (shown honestly). */
  blindSpots: string[];
}

/** Normalized per-file snapshot the engine consumes (produced by the worker). */
export interface RawFile {
  path: string;
  kind: AssetKind;
  isImage: boolean;
  bytes: number;
  text?: string;             // present for text/JSON files
  image?: { width: number; height: number; hash: string; ahash: string };
}

/** A datapack snapshot: a label plus its files. */
export interface DatapackInput {
  label: string;
  files: RawFile[];
}

/** The full engine input. */
export interface EngineInput {
  files: RawFile[];
  datapacks: DatapackInput[];
}
