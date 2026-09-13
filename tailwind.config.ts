import type { Config } from 'tailwindcss';

// Every value here points at a custom property declared in src/app/globals.css.
// Tokens are defined once, there; this file only names them for utilities.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: 'var(--bg)',
      surface: 'var(--surface)',
      'surface-2': 'var(--surface-2)',
      line: 'var(--line)',
      text: 'var(--text)',
      muted: 'var(--muted)',
      accent: 'var(--accent)',
      'accent-deep': 'var(--accent-deep)',
      'accent-ink': 'var(--accent-ink)',
    },
    fontFamily: {
      display: ['var(--font-display)', 'Georgia', 'serif'],
      body: ['var(--font-body)', 'system-ui', 'sans-serif'],
    },
    fontSize: {
      display: ['clamp(3rem, 9vw, 7rem)', { lineHeight: '0.92', letterSpacing: '-0.015em' }],
      h2: ['clamp(1.75rem, 1rem + 2.2vw, 2.5rem)', { lineHeight: '1.1', letterSpacing: '-0.005em' }],
      figure: ['1.5rem', { lineHeight: '1' }],
      lead: ['1.25rem', { lineHeight: '1.35' }],
      body: ['1rem', { lineHeight: '1.55' }],
      meta: ['0.875rem', { lineHeight: '1.45', letterSpacing: '0.005em' }],
      label: ['0.8125rem', { lineHeight: '1.2', letterSpacing: '0.02em' }],
    },
    borderRadius: {
      none: '0',
      DEFAULT: 'var(--radius)',
      full: '9999px',
    },
    extend: {
      spacing: {
        gutter: 'var(--gutter)',
      },
      maxWidth: {
        site: '90rem',
      },
      transitionDuration: {
        feedback: 'var(--t-feedback)',
        panel: 'var(--t-panel)',
        survey: 'var(--t-survey)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
      },
    },
  },
  plugins: [],
};

export default config;
