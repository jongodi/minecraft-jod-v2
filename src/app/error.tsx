'use client';

import { useEffect } from 'react';
import OffTrail from '@/components/badlands/OffTrail';

/* A page that threw while it was being drawn. The words stay in the site's
   voice; the one action draws it again, and the bar and the fire keep the
   ways home where they always are. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <OffTrail
      title="Ljósið slokknaði"
      actions={<button type="button" className="b-btn b-btn--solid" onClick={reset}>Reyna aftur</button>}
    >
      Eitthvað fór úrskeiðis meðan síðan var teiknuð. Reyndu aftur, eða farðu aftur í sólsetrið og komdu síðar.
    </OffTrail>
  );
}
