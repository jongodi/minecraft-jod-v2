import type { Metadata } from 'next';
import { TITLE_TEMPLATE } from '@/components/badlands/data';

/* The roll call is drawn in the browser, so its title is set here; a wall's
   own page (./[username]) names its member instead. A layout's title replaces
   the one above it, template and all, so the site's suffix is given again. */
export const metadata: Metadata = {
  title: { default: 'Hópurinn', template: TITLE_TEMPLATE },
  description: 'Átta vinir á JOÐ, hvert með sinn vegg: kynningu, tölur úr leiknum, miða og myndir.',
};

export default function CrewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
