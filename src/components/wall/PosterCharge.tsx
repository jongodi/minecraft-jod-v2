import type { Posted } from './bounty';

/* What a wanted poster says a member is wanted for, under their name: the
   alias of a charge they are the outlaw of, in red, or their place on it;
   the charge; and the bounty, their number on it in its own unit. One
   component for the roll call's posters (RollCall.tsx) and the member's own
   on their wall (Wall.tsx): when the wall printed the bounty by itself it
   lost the charge above it, and 'Verðlaun 4' read as a reward of four. */
export default function PosterCharge({ p }: { p: Posted }) {
  return (
    <>
      {p.alias !== null
        ? <span className="b-poster__alias">„{p.alias}“</span>
        : p.place !== null && <span className="b-poster__place">{p.place}. sæti</span>}
      <span className="b-poster__charge">{p.charge}</span>
      <span className="b-poster__bounty"><span className="b-poster__reward">Verðlaun</span> <span className="b-poster__val">{p.bounty}</span></span>
    </>
  );
}
