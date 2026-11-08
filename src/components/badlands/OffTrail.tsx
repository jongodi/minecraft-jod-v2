'use client';

import '@/app/badlands.css';
import AddressBar from './AddressBar';
import Footer from './Footer';
import NightSky from './NightSky';
import { Stray, type StrayProps } from './LostScreen';
import { PAGE_LINKS } from './data';

/** Off the trail, as the game says it: the death screen. The world stands
    still under a veil of red, the title in the slab cut from the strata like
    the name, what happened in a line under it, the score the game always
    shows (nothing, here), and the ways back stacked in the middle of the
    screen, as the game stacks Respawn over Title Screen. The night is the
    roll call's and the walls', so the world behind the veil is still the
    badlands, and the bar and the fire stay where they always are. Used by
    the lost-connection screen as it is, and by the 404 and a page that broke
    on the way (error.tsx) through LostScreen, which fetches it only when one
    of them is drawn. */
export default function OffTrail(props: StrayProps) {
  return (
    <div className="b b-died">
      <AddressBar links={PAGE_LINKS} always />
      <NightSky />
      <div className="b-died__veil" aria-hidden="true" />
      <Stray {...props} />
      <Footer />
    </div>
  );
}
