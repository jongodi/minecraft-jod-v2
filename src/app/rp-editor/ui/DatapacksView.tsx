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
        <span className="rp-label">04 — Gagnapakkar</span>
        <h2>Umfang</h2>
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
            {analysis.datapacks.length > 0 ? 'Bæta við fleiri gagnapökkum' : 'Bættu gagnapökkunum þínum við til að fá heildarmyndina'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--ink-dim)', lineHeight: 1.6, maxWidth: 520, margin: '0 auto' }}>
            Slepptu <b>.zip</b>-skrám gagnapakka hér. Ritillinn leitar að tilvísunum í
            <code> item_model</code>, <code> custom_model_data</code> og <code> font</code> í aðgerðum, fengjatöflum, uppskriftum og afrekum.
            Hann rekur þær svo í gegnum pakkann til að finna áferðir sem aðeins gagnapakki notar.
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
          <div className="rp-label" style={{ marginBottom: 12 }}>Hlutaskilgreiningar í pakkanum ({itemDefs.length})</div>
          {itemDefs.length === 0 ? (
            <div style={{ fontSize: '0.7rem', color: 'var(--ink-dim)' }}>Þessi pakki notar ekki hlutaskilgreiningar úr útgáfu 1.21.4 eða nýrri.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
              {itemDefs.map((p) => {
                const n = analysis.nodes[p];
                const invoked = n?.datapackRefs.length ? 'used' : n?.verdict === 'used' ? 'used' : 'review';
                return (
                  <div key={p} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.68rem' }}>
                    <Chip tone={invoked === 'used' ? 'used' : 'warning'}>{invoked === 'used' ? (n?.datapackRefs.length ? 'gagnapakki' : 'upprunalegt') : 'án tilvísana'}</Chip>
                    <a className="src" style={{ color: 'var(--accent)', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => onOpen(p)}>{p.replace(/^assets\/[^/]+\/items\//, '').replace(/\.json$/, '')}</a>
                  </div>
                );
              })}
            </div>
          )}
        </Glass>

        <Glass style={{ padding: 18 }}>
          <div className="rp-label" style={{ marginBottom: 12 }}>Tilvísanir gagnapakka ({rows.length})</div>
          {rows.length === 0 ? (
            <div style={{ fontSize: '0.7rem', color: 'var(--ink-dim)' }}>Engar tilvísanir í item_model, custom_model_data eða font fundust í gagnapökkunum sem voru opnaðir.</div>
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
