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
        bg:     '#03050A',
        bg2:    '#060A14',
        gold:   '#F5A623',
        purple: '#8B5CF6',
        teal:   '#06B6D4',
        text:   '#F0EAD6',
        muted:  '#4B5563',
        border: 'rgba(255,255,255,0.07)',
        card:   'rgba(8,14,28,0.88)',
      },
      fontFamily: {
        cinzel:   ['Cinzel', 'serif'],
        playfair: ['Playfair Display', 'serif'],
        sans:     ['Inter', 'sans-serif'],
        mono:     ['JetBrains Mono', 'monospace'],
      },
      animation: {
        ticker:          'ticker-scroll 45s linear infinite',
        'chevron-bounce':'chevron-bounce 2s ease-in-out infinite',
        'glow-pulse':    'glow-pulse 2.2s ease-out infinite',
        float:           'float 6s ease-in-out infinite',
      },
      keyframes: {
        'ticker-scroll': {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'chevron-bounce': {
          '0%, 100%': { transform: 'translateX(-50%) translateY(0)',    opacity: '0.4' },
          '50%':       { transform: 'translateX(-50%) translateY(10px)', opacity: '1'   },
        },
        'glow-pulse': {
          '0%':   { transform: 'scale(1)',   opacity: '0.6' },
          '100%': { transform: 'scale(3.2)', opacity: '0'   },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)'  },
          '50%':       { transform: 'translateY(-14px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
