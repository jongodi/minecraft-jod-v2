'use client';

import { createContext, useContext, type ReactNode } from 'react';

// The site ships with the Western design only. The old Matrix design is kept
// in the repo (components/, unused) in case it's revived later — the Theme
// type still names it so those files compile, but the theme never changes.
export type Theme = 'matrix' | 'western';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'western',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: 'western', setTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
