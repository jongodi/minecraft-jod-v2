'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function RpEditorButton() {
  const [hov, setHov] = useState(false);
  const pathname = usePathname();

  if (pathname === '/rp-editor') return null;

  return (
    <div className="hidden md:block">
    <Link href="/rp-editor" style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        data-cursor="hover"
        style={{
          position:      'fixed',
          bottom:        '2rem',
          right:         '2rem',
          zIndex:        50,
          display:       'flex',
          alignItems:    'center',
          gap:           '0.6rem',
          background:    'var(--bg-elevated)',
          border:        `1px solid ${hov ? 'var(--accent)' : 'var(--border)'}`,
          padding:       '0.65rem 1rem',
          fontFamily:    'var(--font-mono)',
          fontSize:      '0.6rem',
          color:         hov ? 'var(--accent)' : 'var(--muted)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase' as const,
          transition:    'border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease',
          boxShadow:     hov
            ? '0 0 28px rgba(var(--accent-rgb),0.18), inset 0 0 20px rgba(var(--accent-rgb),0.04)'
            : '0 4px 24px rgba(0,0,0,0.6)',
          cursor:        'none',
        }}
      >
        {/* 2×2 pixel-grid icon — evokes a texture atlas */}
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
          <rect x="0.6" y="0.6" width="4.8" height="4.8" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="7.6" y="0.6" width="4.8" height="4.8" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="0.6" y="7.6" width="4.8" height="4.8" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="7.6" y="7.6" width="4.8" height="4.8" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
        RP EDITOR
        {/* Pulse dot */}
        <span
          style={{
            width:        5,
            height:       5,
            borderRadius: '50%',
            background:   hov ? 'var(--accent)' : 'var(--faint)',
            border:       `1px solid ${hov ? 'var(--accent)' : 'var(--border-strong)'}`,
            transition:   'background 0.3s ease, border-color 0.3s ease',
            flexShrink:   0,
          }}
        />
      </div>
    </Link>
    </div>
  );
}
