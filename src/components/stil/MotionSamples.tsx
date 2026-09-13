'use client';

import { useState } from 'react';

/** Client component: the three motion classes need a click to show. */
export function MotionSamples() {
  const [pressed, setPressed] = useState(false);
  const [open, setOpen] = useState(false);
  const [drawn, setDrawn] = useState(false);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="rounded border border-line bg-surface p-6">
        <p className="text-label text-muted">Viðbragð, 150 ms</p>
        <button
          type="button"
          onClick={() => setPressed((v) => !v)}
          className={`mt-3 min-h-11 rounded px-4 text-label font-semibold transition-colors duration-feedback ease-out ${
            pressed ? 'bg-accent-deep text-accent-ink' : 'bg-accent text-accent-ink'
          }`}
        >
          {pressed ? 'Afritað' : 'Afrita'}
        </button>
      </div>

      <div className="rounded border border-line bg-surface p-6">
        <p className="text-label text-muted">Spjald, 250 ms</p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-3 min-h-11 rounded border border-line px-4 text-label font-semibold"
          aria-expanded={open}
        >
          {open ? 'Loka' : 'Opna'}
        </button>
        <div
          className={`mt-3 rounded bg-surface-2 p-3 text-meta transition-[opacity,transform] duration-panel ease-out ${
            open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
          }`}
          aria-hidden={!open}
        >
          Goði Castle, langt í burtu
        </div>
      </div>

      <div className="rounded border border-line bg-surface p-6">
        <p className="text-label text-muted">Mæling, 1200 ms, einu sinni</p>
        <button
          type="button"
          onClick={() => setDrawn((v) => !v)}
          className="mt-3 min-h-11 rounded border border-line px-4 text-label font-semibold"
        >
          {drawn ? 'Aftur' : 'Teikna'}
        </button>
        <svg viewBox="0 0 200 60" className="mt-3 w-full" aria-hidden="true">
          <path
            d="M4 44 C 40 10, 70 60, 110 30 S 170 20, 196 40"
            fill="none"
            className="stroke-text"
            strokeWidth="1.5"
            strokeDasharray="320"
            style={{
              strokeDashoffset: drawn ? 0 : 320,
              transition: 'stroke-dashoffset var(--t-survey) var(--ease-out)',
            }}
          />
          <circle cx="110" cy="30" r="3" className={`fill-accent transition-opacity duration-panel ease-out ${drawn ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: drawn ? '1100ms' : '0ms' }} />
        </svg>
      </div>
    </div>
  );
}
