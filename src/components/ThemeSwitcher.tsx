'use client';

import { useTheme, type Theme } from '@/lib/theme';

const THEMES: { id: Theme; label: string }[] = [
  { id: 'matrix',  label: 'MATRIX'  },
  { id: 'western', label: 'WESTERN' },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      style={{
        display:      'flex',
        border:       '1px solid var(--border)',
        overflow:     'hidden',
        flexShrink:   0,
        transition:   'border-color 0.25s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-strong)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
    >
      {THEMES.map(({ id, label }) => {
        const active = theme === id;
        return (
          <button
            key={id}
            onClick={() => setTheme(id)}
            data-cursor="hover"
            style={{
              fontFamily:     'var(--font-mono)',
              fontSize:       '0.42rem',
              letterSpacing:  '0.18em',
              textTransform:  'uppercase',
              color:          active ? 'var(--bg)' : 'var(--muted)',
              background:     active ? 'var(--accent)' : 'transparent',
              border:         'none',
              padding:        '0.3rem 0.7rem',
              cursor:         'pointer',
              transition:     'background 0.25s ease, color 0.25s ease',
              whiteSpace:     'nowrap',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
