'use client';

import { startTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OffTrail from '@/components/badlands/OffTrail';

/* A page that threw while it was being drawn. The words stay in the site's
   voice; the one action draws it again, and the bar and the fire keep the
   ways home where they always are. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  const router = useRouter();
  /* reset() alone draws the page again from what the server already sent,
     which for a page that threw on the server is the same error; the page is
     asked for afresh, and the boundary lets go once the new one is in. */
  const retry = () => startTransition(() => { router.refresh(); reset(); });
  return (
    <OffTrail
      title="Ljósið slokknaði"
      cause="Eitthvað fór úrskeiðis meðan síðan var teiknuð."
      actions={<>
        <button type="button" className="b-btn b-btn--solid" onClick={retry}>Reyna aftur</button>
        <a href="/" className="b-btn">Titilskjár</a>
      </>}
    >
      Reyndu aftur, eða farðu aftur í sólsetrið og komdu síðar.
    </OffTrail>
  );
}
