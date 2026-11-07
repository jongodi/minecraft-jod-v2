'use client';

import { useEffect } from 'react';

/** On to the wall, scrolled to the sign. The page's own script makes the hop
    as the page is read; this is for a visit from inside the site, where a
    script React puts on the page in the browser is never run. */
export default function SignRedirect({ href }: { href: string }) {
  useEffect(() => { window.location.replace(href); }, [href]);
  return null;
}
