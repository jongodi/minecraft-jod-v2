// ─────────────────────────────────────────────────────────────────────────────
// Applying fixes
//
// A fix replaces every string value equal to `from` with `to` inside one JSON
// file. This is structural (walks the parsed tree, only touches string values),
// never a blind text substitution, so it can't corrupt keys or partial matches.
// Because `from` is a concrete resource location, every occurrence in the file
// refers to the same target — replacing all of them is exactly right.
// ─────────────────────────────────────────────────────────────────────────────

export function replaceRefsInJson(
  jsonText: string,
  repl: Array<{ from: string; to: string }>,
): { text: string; applied: number } {
  let json: any;
  try { json = JSON.parse(jsonText); } catch { return { text: jsonText, applied: 0 }; }
  const map = new Map(repl.map((r) => [r.from, r.to]));
  let applied = 0;
  const walk = (node: any): any => {
    if (typeof node === 'string') {
      if (map.has(node)) { applied++; return map.get(node)!; }
      return node;
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      const o: Record<string, any> = {};
      for (const k of Object.keys(node)) o[k] = walk(node[k]);
      return o;
    }
    return node;
  };
  const out = walk(json);
  if (applied === 0) return { text: jsonText, applied: 0 };
  return { text: JSON.stringify(out, null, 2), applied };
}
