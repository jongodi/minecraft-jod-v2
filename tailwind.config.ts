import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#080808',
        accent: '#00ff41',
        'accent-dim': '#00cc33',
        card: '#111111',
        border: '#1a1a1a',
        text: '#f0f0f0',
        muted: '#666666',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        glitch: 'glitch 6s infinite',
        'scroll-x': 'scroll-x 30s linear infinite',
        'chevron-bounce': 'chevron-bounce 1.5s ease-in-out infinite',
        'cursor-ring': 'cursor-ring 0.15s ease-out',
      },
      keyframes: {
        'scroll-x': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'chevron-bounce': {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '50%': { transform: 'translateY(8px)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
