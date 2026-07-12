// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator — the single entry point the worker (and fallbacks) call.
//
//   parse namespaces → parse pack.mcmeta → build the RP graph
//   → extract + resolve datapack references into the graph
//   → detect duplicates → compute verdicts + findings
//
// Pure and synchronous. No DOM, no framework. Deterministic for a given input.
// ─────────────────────────────────────────────────────────────────────────────

import type { AnalysisResult, EngineInput, Finding, DatapackRef, AssetNode } from './types';
import { namespaceOf, itemDefLocToPath, fontLocToPath, modelLocToPath } from './resloc';
import { parsePackMeta } from './mcmeta';
import { buildGraph, type Graph } from './graph';
import { extractDatapackRefs } from './datapack';
import { findDuplicates } from './duplicates';
import { computeAnalysis, compareFindings } from './verdict';

export function analyze(input: EngineInput): AnalysisResult {
  const files = input.files;

  // Namespaces present in the pack.
  const namespaces = [...new Set(
    files.map((f) => namespaceOf(f.path)).filter((n): n is string => !!n),
  )].sort();

  // pack.mcmeta.
  const metaFile = files.find((f) => f.kind === 'pack_meta');
  const meta = parsePackMeta(metaFile?.text, namespaces);

  // RP dependency graph.
  const graph = buildGraph(files);

  // Datapacks → external references → augment the graph with datapack roots.
  const { refs: datapackRefs, scanned } = extractDatapackRefs(input.datapacks);
  const extraFindings = resolveDatapackRefs(graph, datapackRefs);

  // Duplicate textures.
  const { groups: duplicates, nearCapped } = findDuplicates(graph.nodes);

  // Verdicts + findings.
  const result = computeAnalysis({
    graph, meta, duplicates, datapackRefs,
    datapacks: input.datapacks.map((d) => d.label),
  });

  // Prepend datapack-link findings (missing targets) and coverage notes.
  result.findings.unshift(...extraFindings);
  result.findings.sort(compareFindings);
  result.summary.errors = result.findings.filter((f) => f.severity === 'error').length;
  result.summary.warnings = result.findings.filter((f) => f.severity === 'warning').length;

  if (nearCapped) {
    result.blindSpots.push('Near-duplicate detection was skipped (too many textures for an exhaustive pixel comparison); exact duplicates are still reported.');
  }
  // Record datapack coverage in blind spots when a pack scanned zero relevant files.
  for (const [label, count] of Object.entries(scanned)) {
    if (count === 0) result.blindSpots.push(`Datapack "${label}" contained no functions, loot tables, recipes, or advancements to scan.`);
  }

  return result;
}

/**
 * Resolve datapack references to concrete RP entry points and root them.
 * Returns findings for references whose RP target is missing (broken link).
 */
function resolveDatapackRefs(graph: Graph, refs: DatapackRef[]): Finding[] {
  const findings: Finding[] = [];
  let fid = 0;
  const seenMissing = new Set<string>();

  const rootWithDatapack = (targetPath: string, ref: DatapackRef, reason: string): boolean => {
    const node = graph.nodes[targetPath];
    if (!node) return false;
    graph.roots.set(targetPath, { path: targetPath, kind: 'certain', reason });
    if (!node.datapackRefs.some((d) => d.via === ref.via && d.value === ref.value && d.file === ref.file)) {
      node.datapackRefs.push(ref);
    }
    return true;
  };

  for (const ref of refs) {
    if (ref.via === 'item_model') {
      const target = itemDefLocToPath(ref.value);
      const ok = rootWithDatapack(target, ref, `Invoked by a datapack item_model component (${ref.pack}).`);
      if (!ok) {
        const key = `im|${ref.value}`;
        if (!seenMissing.has(key)) {
          seenMissing.add(key);
          findings.push({
            id: `dp${fid++}`, severity: 'warning', category: 'datapack-missing-target',
            title: 'Datapack sets an item_model the pack does not provide',
            detail: `A datapack sets item_model = "${ref.value}", but the pack has no ${target}. In-game this item renders as the missing (magenta/black) model.`,
            path: ref.file, refs: [target], confidence: 'high',
            evidence: [{ kind: 'datapack', detail: `item_model = ${ref.value}`, source: `${ref.pack}: ${ref.file}` },
                       { kind: 'missing-target', detail: `Expected ${target}` }],
            consequence: 'Add the item definition to the pack, or fix the item_model value in the datapack.',
          });
        }
      }
    } else if (ref.via === 'font') {
      const target = fontLocToPath(ref.value);
      rootWithDatapack(target, ref, `Referenced by a datapack text component font (${ref.pack}).`);
      // A missing font falls back to default in-game — not an error, so no finding.
    } else if (ref.via === 'custom_model_data' && ref.context) {
      // Root the base item's entry point (item definition first, then legacy model).
      const itemDef = itemDefLocToPath(ref.context);
      const legacyItem = modelLocToPath(`item/${ref.context}`);
      const legacyBlock = modelLocToPath(`block/${ref.context}`);
      const rooted =
        rootWithDatapack(itemDef, ref, `Base item "${ref.context}" is given with custom_model_data by a datapack (${ref.pack}).`) ||
        rootWithDatapack(legacyItem, ref, `Base item "${ref.context}" is given with custom_model_data by a datapack (${ref.pack}).`) ||
        rootWithDatapack(legacyBlock, ref, `Base block "${ref.context}" is given with custom_model_data by a datapack (${ref.pack}).`);
      void rooted; // absence is fine: a vanilla base item without a pack override still renders vanilla.
    }
  }
  return findings;
}

