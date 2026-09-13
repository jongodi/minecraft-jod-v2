import type { Config } from 'tailwindcss';

// Every value here names a custom property declared in src/app/globals.css.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: 'var(--bg)',
      'bg-2': 'var(--bg-2)',
      line: 'var(--line)',
      text: 'var(--text)',
      muted: 'var(--muted)',
      accent: 'var(--accent)',
      'accent-ink': 'var(--accent-ink)',
    },
    fontFamily: {
      display: ['var(--font-display)', 'Impact', 'Arial Narrow', 'sans-serif'],
      label: ['var(--font-label)', 'Arial', 'sans-serif'],
      body: ['var(--font-body)', 'Georgia', 'serif'],
    },
    fontSize: {
      state: ['clamp(5.5rem, 26vw, 15rem)', { lineHeight: '0.86', letterSpacing: '-0.01em' }],
      h2: ['clamp(3rem, 9vw, 6rem)', { lineHeight: '0.9', letterSpacing: '-0.005em' }],
      figure: ['2.5rem', { lineHeight: '0.9' }],
      name: ['1.5rem', { lineHeight: '1' }],
      address: ['clamp(1.5rem, 6.4vw, 2rem)', { lineHeight: '1', letterSpacing: '-0.01em' }],
      lead: ['1.25rem', { lineHeight: '1.35' }],
      body: ['1.0625rem', { lineHeight: '1.55' }],
      meta: ['0.9375rem', { lineHeight: '1.45' }],
      label: ['0.75rem', { lineHeight: '1.2', letterSpacing: '0.14em' }],
    },
    borderRadius: {
      none: '0',
    },
    extend: {
      spacing: {
        gutter: 'var(--gutter)',
        'safe-t': 'max(1.25rem, env(safe-area-inset-top))',
        'safe-b': 'max(1.5rem, env(safe-area-inset-bottom))',
      },
      aspectRatio: {
        photo: '16 / 9',
        stage: '4 / 5',
      },
      maxWidth: {
        site: '96rem',
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
