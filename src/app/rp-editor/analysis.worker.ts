// ─────────────────────────────────────────────────────────────────────────────
// Analysis Web Worker
//
// Decompresses the resource pack (and any datapacks), decodes textures for
// perceptual hashing, and runs the full dependency analysis — all off the main
// thread so the UI stays responsive on multi-hundred-MB packs. Progress is
// streamed back phase by phase.
// ─────────────────────────────────────────────────────────────────────────────

import { extractZip } from './engine/extract';
import { analyze } from './engine/analyze';
import type { DatapackInput, EngineInput } from './engine/types';

type InMsg = {
  type: 'analyze';
  packBuffer: ArrayBuffer;
  packName: string;
  datapacks: { name: string; buffer: ArrayBuffer }[];
};

// eslint-disable-next-line no-restricted-globals
const ctx: Worker = self as any;

ctx.onmessage = async (e: MessageEvent<InMsg>) => {
  const msg = e.data;
  if (msg?.type !== 'analyze') return;
  try {
    ctx.postMessage({ type: 'progress', phase: 'Decompressing pack', done: 0, total: 1 });
    const pack = await extractZip(msg.packBuffer, (done, total) =>
      ctx.postMessage({ type: 'progress', phase: 'Reading pack files', done, total }));

    const datapackInputs: DatapackInput[] = [];
    for (const dp of msg.datapacks) {
      ctx.postMessage({ type: 'progress', phase: `Reading datapack ${dp.name}`, done: 0, total: 1 });
      const extracted = await extractZip(dp.buffer);
      datapackInputs.push({ label: dp.name, files: extracted.rawFiles });
    }

    ctx.postMessage({ type: 'progress', phase: 'Analysing dependency graph', done: 1, total: 1 });
    const input: EngineInput = { files: pack.rawFiles, datapacks: datapackInputs };
    const analysis = analyze(input);

    ctx.postMessage({
      type: 'result',
      packName: msg.packName,
      fileData: pack.fileData,
      rawFiles: pack.rawFiles,
      analysis,
    });
  } catch (err: any) {
    ctx.postMessage({ type: 'error', message: err?.message ?? String(err) });
  }
};

export {};
