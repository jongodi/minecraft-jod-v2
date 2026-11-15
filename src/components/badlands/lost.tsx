'use client';

import { useEffect } from 'react';
import { toast } from './Toast';

/* What stands in for a part of the page whose code could not be fetched.
   The rooms, the album, the painted map, a print held up, the duel and the
   effects each come as a file of their own when first asked for
   (next/dynamic). A phone that had lost its signal, or a tab left open
   across a deploy, got no file, the import threw as the part was drawn, and
   the only thing there to catch it was the page's own error screen: one
   press on Myndir took the whole page away, an answer half typed with it,
   and since the failure is remembered the same press did it again after
   "Reyna aftur". Each import now falls back to one of these instead:

     dynamic(() => import('./Album').catch(lostLayer), { ssr: false })

   The import stays written out inside dynamic(), which is how Next knows
   which file the call is for. The failure is still remembered until the
   page is loaded anew, so each of these says to do that. */

/** In a room: a line where the room's content would be, with the way out. */
function LostRoom() {
  return (
    /* in the page's own gutters, as a room's content is, with the room's breathing room above and below */
    <div className="b-wrap" style={{ paddingBlock: 'var(--sp-6)' }}>
      <p className="b-note" role="alert">
        Náði ekki að sækja þetta. <button type="button" className="b-link" onClick={() => window.location.reload()}>Hlaða síðunni aftur</button>
      </p>
    </div>
  );
}

/** Over the page (the album, a print held up, the duel, the painted map):
    there is nothing to draw, so it takes itself down where it can and says
    so on a slip. */
function LostLayer({ onClose }: { onClose?: () => void }) {
  useEffect(() => {
    toast('Náði ekki að sækja þetta', 'hladdu síðunni aftur');
    onClose?.();
  }, [onClose]);
  return null;
}

/** An effect that did not come is simply not there. */
const Nothing = () => null;

/* Typed as never returning, so the import keeps the type of the module it
   names and each part keeps its own props: the stand-ins take none of them
   but onClose, which every layer that has one names the same. */
const standIn = (Part: unknown) => (() => ({ default: Part })) as unknown as () => never;

export const lostRoom = standIn(LostRoom);
export const lostLayer = standIn(LostLayer);
export const lostEffect = standIn(Nothing);
