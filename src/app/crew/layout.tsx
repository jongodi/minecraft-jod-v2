import type { Metadata } from 'next';
import { SITE_NAME, TITLE_TEMPLATE } from '@/components/badlands/data';

/* The roll call's title is set here, beside its page; a wall's own page
   (./[username]) names its member instead. A layout's title replaces
   the one above it, template and all, so the site's suffix is given again.
   It is named as the door that leads to it and the page's own heading are,
   Eftirlýst, so the tab and the history agree with both.
   The link card's words are its own too; the picture is the site's card
   (opengraph-image.tsx beside this), since an openGraph replaces the
   root's whole, picture and all. */
export const metadata: Metadata = {
  title: { default: 'Eftirlýst', template: TITLE_TEMPLATE },
  description: 'Átta vinir á JOÐ, hvert með sinn vegg: kynningu, tölur úr leiknum, miða og myndir.',
  openGraph: {
    title: 'Eftirlýst á JOÐ',
    description: 'Átta vinir á JOÐ, hvert með sitt eftirlýsingaspjald og sinn vegg.',
    type: 'website',
    locale: 'is_IS',
    siteName: SITE_NAME,
  },
};

export default function CrewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
