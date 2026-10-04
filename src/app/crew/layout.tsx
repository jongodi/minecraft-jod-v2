import type { Metadata } from 'next';

/* The roll call is drawn in the browser, so its title is set here; a wall's
   own page (./[username]) names its member instead. */
export const metadata: Metadata = {
  title: 'Hópurinn · JOÐ',
  description: 'Átta vinir á JOÐ, hvert með sinn vegg: kynningu, tölur úr leiknum, miða og myndir.',
};

export default function CrewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
