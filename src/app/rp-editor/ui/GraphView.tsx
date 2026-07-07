'use client';

import { useMemo, useState } from 'react';
import type { AnalysisResult, AssetNode } from '../engine/types';
import { verdictTone } from './bits';

const KIND_SHORT: Record<string, string> = {
  texture: 'TEX', model: 'MDL', blockstate: 'BST', item_definition: 'ITEM',
  font: 'FONT', particle: 'PTL', equipment: 'EQP', atlas: 'ATLAS', sound: 'SND',
};

function short(path: string) {
  return path.replace(/^assets\/[^/]+\//, '').replace(/\.(json|png)$/i, '');
}

function toneColor(node: AssetNode | undefined): string {
  if (!node) return 'var(--ink-faint)';
  const t = verdictTone(node.verdict);
  return t === 'error' ? 'var(--sev-error)' : t === 'warning' ? 'var(--sev-warning)' : t === 'used' ? 'var(--sev-used)' : 'var(--sev-info)';
}

export function GraphView({ analysis, onOpen }: { analysis: AnalysisResult; onOpen: (p: string) => void }) {
  // Sensible default focus: a blockstate, else an item def, else the most-connected model.
  const defaultFocus = useMemo(() => {
    const cand = analysis.byKind.blockstate[0] ?? analysis.byKind.item_definition[0] ?? analysis.byKind.model[0] ?? analysis.byKind.texture[0];
    return cand ?? null;
  }, [analysis.byKind]);

  const [focus, setFocus] = useState<string | null>(defaultFocus);
  const [q, setQ] = useState('');

  const searchResults = useMemo(() => {
    if (!q.trim()) return [];
    const s = q.toLowerCase();
    return Object.keys(analysis.nodes).filter((p) => p.toLowerCase().includes(s)).slice(0, 30);
  }, [q, analysis.nodes]);

  const node = focus ? analysis.nodes[focus] : null;

  // Build columns: dependents (usedBy, 1 hop) | focus | dependencies (refs, up to 2 hops).
  const graph = useMemo(() => {
    if (!node) return null;
    const CAP = 18;
    const dependents = node.usedBy.slice(0, CAP);
    const deps1 = node.refs.slice(0, CAP);
    const deps2set = new Set<string>();
    for (const d of deps1) for (const dd of analysis.nodes[d]?.refs ?? []) deps2set.add(dd);
    const deps2 = [...deps2set].filter((d) => !deps1.includes(d)).slice(0, CAP);
    return { dependents, deps1, deps2,
      moreDependents: Math.max(0, node.usedBy.length - dependents.length),
      moreDeps: Math.max(0, node.refs.length - deps1.length) };
  }, [node, analysis.nodes]);

  const W = 900, colGap = 250, rowH = 34;
  const layout = useMemo(() => {
    if (!graph || !node) return null;
    const cols = [
      { x: 40, items: graph.dependents, more: graph.moreDependents },
      { x: 40 + colGap, items: [focus!], more: 0 },
      { x: 40 + colGap * 2, items: graph.deps1, more: graph.moreDeps },
      { x: 40 + colGap * 3, items: graph.deps2, more: 0 },
    ];
    const pos = new Map<string, { x: number; y: number }>();
    const height = Math.max(...cols.map((c) => c.items.length)) * rowH + 60;
    cols.forEach((c) => {
      const colH = c.items.length * rowH;
      const y0 = (height - colH) / 2;
      c.items.forEach((it, i) => pos.set(it + '@' + c.x, { x: c.x, y: y0 + i * rowH + 16 }));
    });
    return { cols, pos, height };
  }, [graph, node, focus]);

  if (!node || !graph || !layout) {
    return <div className="rp-scroll"><div style={{ color: 'var(--ink-faint)' }}>Nothing to graph yet.</div></div>;
  }

  const nodeW = 200, nodeH = 26;
  const edge = (x1: number, y1: number, x2: number, y2: number) =>
    `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;

  const focusPos = layout.pos.get(focus! + '@' + (40 + colGap))!;

  return (
    <div className="rp-scroll">
      <div className="rp-sh">
        <span className="rp-label">05 — Graph</span>
        <h2>Dependency trace</h2>
      </div>

      <div className="rp-filters">
        <input className="rp-search" placeholder="Focus on a file…" value={q} onChange={(e) => setQ(e.target.value)} />
        {searchResults.length > 0 && (
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 4, left: 0, zIndex: 30, background: 'var(--bg-card)', border: '1px solid var(--hair-strong)', borderRadius: 8, maxHeight: 240, overflowY: 'auto', minWidth: 320, boxShadow: '0 14px 40px -12px rgba(0,0,0,0.6)' }}>
              {searchResults.map((p) => (
                <div key={p} style={{ padding: '6px 10px', fontSize: '0.65rem', color: 'var(--ink-dim)', cursor: 'pointer', borderBottom: '1px solid var(--hair)' }}
                  onClick={() => { setFocus(p); setQ(''); }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>{short(p)}</div>
              ))}
            </div>
          </div>
        )}
        <span style={{ fontSize: '0.65rem', color: 'var(--ink-faint)' }}>Click any node to refocus · double-click to open</span>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--hair)', borderRadius: 12, background: 'rgba(0,0,0,0.15)' }}>
        <svg width={W + colGap} height={layout.height} style={{ display: 'block', minWidth: W }}>
          {/* column labels */}
          {[['Depended on by', 40], ['Focus', 40 + colGap], ['Directly uses', 40 + colGap * 2], ['Transitively', 40 + colGap * 3]].map(([lbl, x]) => (
            <text key={lbl as string} x={(x as number) + nodeW / 2} y={16} textAnchor="middle" fill="var(--ink-faint)" style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{lbl}</text>
          ))}
          {/* edges: dependents -> focus */}
          {graph.dependents.map((d) => {
            const p = layout.pos.get(d + '@40'); if (!p) return null;
            return <path key={'e1' + d} d={edge(40 + nodeW, p.y + nodeH / 2, focusPos.x, focusPos.y + nodeH / 2)} stroke="var(--hair-strong)" fill="none" strokeWidth={1} />;
          })}
          {/* edges: focus -> deps1 */}
          {graph.deps1.map((d) => {
            const p = layout.pos.get(d + '@' + (40 + colGap * 2)); if (!p) return null;
            return <path key={'e2' + d} d={edge(focusPos.x + nodeW, focusPos.y + nodeH / 2, p.x, p.y + nodeH / 2)} stroke="rgba(var(--accent-rgb),0.35)" fill="none" strokeWidth={1.2} />;
          })}
          {/* edges: deps1 -> deps2 */}
          {graph.deps1.map((d1) => (analysis.nodes[d1]?.refs ?? []).filter((d2) => graph.deps2.includes(d2)).map((d2) => {
            const p1 = layout.pos.get(d1 + '@' + (40 + colGap * 2)); const p2 = layout.pos.get(d2 + '@' + (40 + colGap * 3));
            if (!p1 || !p2) return null;
            return <path key={'e3' + d1 + d2} d={edge(p1.x + nodeW, p1.y + nodeH / 2, p2.x, p2.y + nodeH / 2)} stroke="var(--hair)" fill="none" strokeWidth={1} />;
          }))}
          {/* nodes */}
          {layout.cols.flatMap((c) => c.items.map((it) => {
            const p = layout.pos.get(it + '@' + c.x)!;
            const n = analysis.nodes[it];
            const isFocus = it === focus;
            return (
              <g key={it + c.x} transform={`translate(${p.x},${p.y})`} style={{ cursor: 'pointer' }}
                onClick={() => setFocus(it)} onDoubleClick={() => onOpen(it)}>
                <rect width={nodeW} height={nodeH} rx={6} fill={isFocus ? 'rgba(var(--accent-rgb),0.14)' : 'rgba(var(--text-rgb),0.03)'}
                  stroke={isFocus ? 'var(--accent)' : toneColor(n)} strokeWidth={isFocus ? 1.5 : 1} strokeOpacity={isFocus ? 1 : 0.5} />
                <text x={8} y={nodeH / 2 + 3} fill={toneColor(n)} style={{ fontSize: 8, fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>{KIND_SHORT[n?.kind ?? ''] ?? '·'}</text>
                <text x={40} y={nodeH / 2 + 3} fill="var(--ink-dim)" style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)' }}>
                  {short(it).length > 24 ? '…' + short(it).slice(-23) : short(it)}
                </text>
              </g>
            );
          }))}
          {/* "more" hints */}
          {graph.moreDependents > 0 && <text x={40 + nodeW / 2} y={layout.height - 12} textAnchor="middle" fill="var(--ink-faint)" style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}>+{graph.moreDependents} more dependents</text>}
          {graph.moreDeps > 0 && <text x={40 + colGap * 2 + nodeW / 2} y={layout.height - 12} textAnchor="middle" fill="var(--ink-faint)" style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}>+{graph.moreDeps} more</text>}
        </svg>
      </div>

      <div style={{ marginTop: 12, fontSize: '0.7rem', color: 'var(--ink-dim)' }}>
        Tracing <b style={{ color: 'var(--ink)' }}>{short(focus!)}</b> — {node.usedBy.length} dependent{node.usedBy.length !== 1 ? 's' : ''}, {node.refs.length} direct dependenc{node.refs.length !== 1 ? 'ies' : 'y'}.
        <button className="rp-btn sm" style={{ marginLeft: 10 }} onClick={() => onOpen(focus!)}>Open in editor</button>
      </div>
    </div>
  );
}
