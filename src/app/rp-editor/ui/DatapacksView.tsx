'use client';

import { useMemo, useRef, useState } from 'react';
import type { AnalysisResult } from '../engine/types';
import { itemDefLocToPath, fontLocToPath } from '../engine/resloc';
import { Glass } from './Glass';
import { Chip } from './bits';

export function DatapacksView({
  analysis, onAddDatapacks, onOpen,
}: {
  analysis: AnalysisResult;
  onAddDatapacks: (files: File[]) => void;
  onOpen: (p: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  // Resolve each datapack ref against the pack graph for the coverage table.
  const rows = useMemo(() => {
    return analysis.datapackRefs.map((r) => {
      let target: string | null = null;
      if (r.via === 'item_model') target = itemDefLocToPath(r.value);
      else if (r.via === 'font') target = fontLocToPath(r.value);
      const resolved = target ? !!analysis.nodes[target] : r.via === 'custom_model_data';
      return { ...r, target, resolved };
    });
  }, [analysis.datapackRefs, analysis.nodes]);

  const itemDefs = analysis.byKind.item_definition;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const zips = Array.from(files).filter((f) => f.name.endsWith('.zip'));
    if (zips.length) onAddDatapacks(zips);
  };

  return (
    <div className="rp-scroll">
      <div className="rp-sh">
        <span className="rp-label">04 — Datapacks</span>
        <h2>Coverage</h2>
      </div>

      {/* Add datapacks */}
      <Glass
        className={`rp-drop${drag ? ' drag' : ''}`}
        style={{ marginBottom: 24 }}
        onClick={() => inputRef.current?.click()}
      >
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--ink)', marginBottom: 6 }}>
            {analysis.datapacks.length > 0 ? 'Add more datapacks' : 'Add your datapacks to complete the picture'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--ink-dim)', lineHeight: 1.6, maxWidth: 520, margin: '0 auto' }}>
            Drop datapack <b>.zip</b> files here. The editor scans functions, loot tables, recipes and advancements for
            <code> item_model</code>, <code> custom_model_data</code> and <code> font</code> references, then resolves them
            through this pack — so a texture used only by a datapack is never mis-flagged as unused.
          </div>
          <input ref={inputRef} type="file" accept=".zip" multiple style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
        </div>
      </Glass>

      {analysis.datapacks.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
          {analysis.datapacks.map((d) => <Chip key={d} tone="used">{d}</Chip>)}
        </div>
      )}

      {/* Side-by-side: pack item models vs datapack invocations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Glass style={{ padding: 18 }}>
          <div className="rp-label" style={{ marginBottom: 12 }}>Item definitions in the pack ({itemDefs.length})</div>
          {itemDefs.length === 0 ? (
            <div style={{ fontSize: '0.7rem', color: 'var(--ink-dim)' }}>This pack uses no 1.21.4+ item definitions.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
              {itemDefs.map((p) => {
                const n = analysis.nodes[p];
                const invoked = n?.datapackRefs.length ? 'used' : n?.verdict === 'used' ? 'used' : 'review';
                return (
                  <div key={p} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.68rem' }}>
                    <Chip tone={invoked === 'used' ? 'used' : 'warning'}>{invoked === 'used' ? (n?.datapackRefs.length ? 'datapack' : 'vanilla') : 'orphan'}</Chip>
                    <a className="src" style={{ color: 'var(--accent)', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => onOpen(p)}>{p.replace(/^assets\/[^/]+\/items\//, '').replace(/\.json$/, '')}</a>
                  </div>
                );
              })}
            </div>
          )}
        </Glass>

        <Glass style={{ padding: 18 }}>
          <div className="rp-label" style={{ marginBottom: 12 }}>Datapack references ({rows.length})</div>
          {rows.length === 0 ? (
            <div style={{ fontSize: '0.7rem', color: 'var(--ink-dim)' }}>No item_model / custom_model_data / font references found in the loaded datapacks.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
              {rows.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: '0.68rem' }}>
                  <Chip tone={r.resolved ? 'used' : 'error'}>{r.via.replace('_', ' ')}</Chip>
                  <span style={{ color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.value}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--ink-faint)', flexShrink: 0 }}>{r.pack}</span>
                </div>
              ))}
            </div>
          )}
        </Glass>
      </div>
    </div>
  );
}
