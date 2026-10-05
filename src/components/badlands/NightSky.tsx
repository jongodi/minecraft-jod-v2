import { Stars } from './Bits';
import { Ridge } from './Mesa';

/** The evening an hour on, behind the top of the crew's own pages: the night
    sky with the same tiled stars the home page's sky comes out in, and the
    far ridge the evening opened over, dark now, along its foot. The roll call
    and the walls are the same place as the home page's room, so they hang in
    the same night rather than on a bare black page. Static: nothing here
    moves, and it is drawn on the server with the page. */
export default function NightSky() {
  return (
    <div className="b-nightsky" aria-hidden="true">
      <Stars className="b-nightsky__stars" />
      <Ridge />
    </div>
  );
}
