'use client';

import { useEffect } from 'react';

/** On to the wall, scrolled to the sign; the link under it is for a browser without script. */
export default function SignRedirect({ href }: { href: string }) {
  useEffect(() => { window.location.replace(href); }, [href]);
  return null;
}
