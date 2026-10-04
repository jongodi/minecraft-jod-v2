import type { Metadata } from 'next';

/* A tool for one person: named in the tab, kept out of search results. */
export const metadata: Metadata = {
  title: 'Stjórnborð',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
