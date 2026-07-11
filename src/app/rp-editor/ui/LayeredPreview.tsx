'use client';

import { useEffect, useRef, useState } from 'react';

export interface PreviewLayer { key: string; label: string; dataUrl: string | null }

/**
 * Composites stacked item-model layers (layer0 at the bottom) into a single
 * pixelated preview, with per-layer visibility toggles — so you can see exactly
 * how an item renders with its overlay, and isolate a layer while editing.
 */
export function LayeredPreview({ layers, size = 240 }: { layers: PreviewLayer[]; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    let cancelled = false;
    const load = (l: PreviewLayer) => new Promise<{ key: string; img: HTMLImageElement | null }>((res) => {
      if (!l.dataUrl) return res({ key: l.key, img: null });
      const im = new Image();
      im.onload = () => res({ key: l.key, img: im });
      im.onerror = () => res({ key: l.key, img: null });
      im.src = l.dataUrl;
    });
    Promise.all(layers.map(load)).then((loaded) => {
      if (cancelled) return;
      const first = loaded.find((x) => x.img);
      const nw = first?.img?.width ?? 16, nh = first?.img?.height ?? 16;
      c.width = nw; c.height = nh;
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, nw, nh);
      for (const { key, img } of loaded) if (img && !hidden.has(key)) ctx.drawImage(img, 0, 0, nw, nh);
    });
    return () => { cancelled = true; };
  }, [layers, hidden]);

  const toggle = (k: string) => setHidden((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      <div style={{ width: size, height: size, background: 'repeating-conic-gradient(#0a0d13 0% 25%, #070a0f 0% 50%) 50% / 16px 16px', border: '1px solid var(--hair)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', imageRendering: 'pixelated', objectFit: 'contain' }} />
      </div>
      {layers.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {layers.map((l) => (
            <button key={l.key} className={`rp-btn sm${hidden.has(l.key) ? '' : ' active'}`}
              onClick={() => toggle(l.key)} title={hidden.has(l.key) ? 'Show layer' : 'Hide layer'}>
              {hidden.has(l.key) ? '○' : '●'} {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
