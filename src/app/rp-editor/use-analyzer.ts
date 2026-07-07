'use client';

// ─────────────────────────────────────────────────────────────────────────────
// useAnalyzer — drives the analysis worker, with a main-thread fallback.
//
// The worker does the heavy one-time work (decompress + decode + analyse). After
// edits, the page re-runs analyze() synchronously on the cached rawFiles, which
// is fast because the decode is already done. This hook only owns the initial
// (worker) pass.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalysisResult, DatapackInput, RawFile } from './engine/types';

export interface AnalyzerResult {
  packName: string;
  fileData: Record<string, string>;
  rawFiles: RawFile[];
  datapacks: DatapackInput[];
  analysis: AnalysisResult;
}

export interface AnalyzerState {
  status: 'idle' | 'running' | 'done' | 'error';
  phase: string;
  progress: number;
  result: AnalyzerResult | null;
  error: string | null;
}

const IDLE: AnalyzerState = { status: 'idle', phase: '', progress: 0, result: null, error: null };

export function useAnalyzer() {
  const [state, setState] = useState<AnalyzerState>(IDLE);
  const workerRef = useRef<Worker | null>(null);

  const ensureWorker = (): Worker | null => {
    if (workerRef.current) return workerRef.current;
    if (typeof Worker === 'undefined') return null;
    try {
      const w = new Worker(new URL('./analysis.worker.ts', import.meta.url));
      workerRef.current = w;
      return w;
    } catch {
      return null;
    }
  };

  const run = useCallback(async (packFile: File, datapackFiles: File[]) => {
    setState({ status: 'running', phase: 'Loading zip', progress: 0, result: null, error: null });
    let packBuffer: ArrayBuffer;
    let datapacks: { name: string; buffer: ArrayBuffer }[];
    try {
      packBuffer = await packFile.arrayBuffer();
      datapacks = await Promise.all(
        datapackFiles.map(async (f) => ({ name: f.name, buffer: await f.arrayBuffer() })),
      );
    } catch (e: any) {
      setState({ status: 'error', phase: '', progress: 0, result: null, error: e?.message ?? 'Could not read the file.' });
      return;
    }

    const w = ensureWorker();
    if (w) {
      w.onmessage = (e: MessageEvent<any>) => {
        const m = e.data;
        if (m.type === 'progress') {
          setState((s) => ({ ...s, phase: m.phase, progress: m.total ? m.done / m.total : s.progress }));
        } else if (m.type === 'result') {
          setState({ status: 'done', phase: 'Complete', progress: 1,
            result: { packName: m.packName, fileData: m.fileData, rawFiles: m.rawFiles, datapacks: m.datapacks ?? [], analysis: m.analysis },
            error: null });
        } else if (m.type === 'error') {
          setState({ status: 'error', phase: '', progress: 0, result: null, error: m.message });
        }
      };
      w.onerror = (e) => {
        setState({ status: 'error', phase: '', progress: 0, result: null, error: e.message || 'Worker failed.' });
      };
      const transfer = [packBuffer, ...datapacks.map((d) => d.buffer)];
      w.postMessage({ type: 'analyze', packBuffer, packName: packFile.name, datapacks }, transfer);
      return;
    }

    // ── Fallback: main thread ──────────────────────────────────────────────────
    try {
      const { extractZip } = await import('./engine/extract');
      const { analyze } = await import('./engine/analyze');
      const pack = await extractZip(packBuffer, (done, total) =>
        setState((s) => ({ ...s, phase: 'Reading pack files', progress: total ? done / total : 0 })));
      const dps = [];
      for (const d of datapacks) {
        const ex = await extractZip(d.buffer);
        dps.push({ label: d.name, files: ex.rawFiles });
      }
      setState((s) => ({ ...s, phase: 'Analysing dependency graph' }));
      const analysis = analyze({ files: pack.rawFiles, datapacks: dps });
      setState({ status: 'done', phase: 'Complete', progress: 1,
        result: { packName: packFile.name, fileData: pack.fileData, rawFiles: pack.rawFiles, datapacks: dps, analysis },
        error: null });
    } catch (e: any) {
      setState({ status: 'error', phase: '', progress: 0, result: null, error: e?.message ?? 'Analysis failed.' });
    }
  }, []);

  const reset = useCallback(() => setState(IDLE), []);

  useEffect(() => () => { workerRef.current?.terminate(); workerRef.current = null; }, []);

  return { state, run, reset };
}
