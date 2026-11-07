'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Campfire, ChevronIcon } from './Bits';
import { Ridge } from './Mesa';
import { SERVER_IP, SITE_NAME } from './data';
import AmbienceToggle from '@/effects/AmbienceToggle';
import { useAway, useBackCloses, useBackdropClose, useScrollLock } from './hooks';
import { YuleLad, seasonClass, useSeason } from './Season';
import { usePlayNight } from './night';
import { signalOf } from './signal';
import type { Season } from '@/lib/season';
import type { PlayNightResponse } from '@/app/api/playnight/route';

/* The duel lives behind the fire; nobody pays for it until they tap. */
const QuickDraw = dynamic(() => import('./QuickDraw'), { ssr: false });

/* The evening's doors are in the bar (and the hotbar at the foot of a
   phone), the crew's among them, so the footer does not post them a second
   time. The admin panel is the owner's tool, not a door for visitors: it
   rides in the small print. Not prefetched: every visitor who scrolled to
   the fire used to download the panel's code and stylesheet. */

/** The duel's door: the fire, and the sign planted beside it, since a phone
    has no pointer to bring up a tooltip and the duel was found only by those
    who happened to tap the fire. On the day a fire is lit for, it stands on
    a hay bale and sends the signal up, as the far ridge's does in the hero
    (signal.ts), and the band keeps a taller stretch of sky for it. */
function FireDoor({ signal = false, onOpen }: { signal?: boolean; onOpen: () => void }) {
  return (
    <button type="button" className="b-foot__fire" onClick={onOpen} aria-haspopup="dialog" aria-label="Einvígi: prófaðu viðbragðstímann">
      <Campfire stones signal={signal} />
      <span className="b-foot__sign" aria-hidden="true"><span className="b-foot__board">Einvígi</span></span>
    </button>
  );
}
/* The home page's fire reads the nights the page already polls (night.ts),
   in a part of its own, so a poll redraws the fire and not the footer. The
   other pages' footers ask nothing. */
function NightFireDoor({ nights, onOpen }: { nights: PlayNightResponse; onOpen: () => void }) {
  const { state } = usePlayNight(nights);
  return <FireDoor signal={signalOf((state ?? nights).nights)} onOpen={onOpen} />;
}

/** The campfire: the last light. One band of ground at the foot of the page,
    the fire burning in the middle of it in a ring of stones, in front of the
    same mesas the evening opened over, its light pooled across the ground and
    on the foot of the rock. Tap the fire and the duel comes out. Climbing
    back to the sunset rewinds the sky on the way up, because the sky is
    scroll. `nights`, on the home page: the nights it was drawn with, so the
    fire knows the day of a fire. */
function Footer({ season: initial, nights }: { season?: Season; nights?: PlayNightResponse } = {}) {
  const [duel, setDuel] = useState(false);
  const season = useSeason(initial);
  useScrollLock(duel);
  const closeDuel = useCallback(() => setDuel(false), []);
  const openDuel = useCallback(() => setDuel(true), []);
  const backdrop = useBackdropClose(closeDuel);
  useBackCloses(duel, closeDuel);
  /* out of sight, the fire's frames and its smoke hold still (useAway) */
  const root = useRef<HTMLElement>(null);
  useAway(root);
  /* On the home page the way up leads to the page the visitor is already on,
     and a link in view is prefetched: every visit there spent a request on
     its own page. Everywhere else the home is the right guess. */
  const home = usePathname() === '/';

  useEffect(() => {
    if (!duel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDuel(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duel]);

  return (
    <footer ref={root} id="campfire" className={`b-foot${seasonClass(season)}`}>
      {/* the camp: the fire in the middle of the band, standing on the ground,
          the way back up and the wind on the ground either side of it, the
          ridge behind lit at its foot by the fire */}
      <div className="b-foot__scene">
        <Ridge snow={season.snow} warm />
        <div className="b-wrap b-foot__inner">
          <Link href="/#top" prefetch={home ? false : undefined} className="b-btn b-btn--small b-foot__up">
            <ChevronIcon dir="up" className="b-foot__upchev" />
            Aftur í sólsetrið
          </Link>

          <div className="b-foot__camp">
            {nights ? <NightFireDoor nights={nights} onOpen={openDuel} /> : <FireDoor onOpen={openDuel} />}
            <YuleLad season={season} spot="fire" />
          </div>

          <div className="b-foot__nav">
            <AmbienceToggle className="b-foot__sound" />
          </div>
        </div>
      </div>
      <div className="b-ground" aria-hidden="true" />
      {/* the small print, on the dark earth under the ground */}
      <div className="b-foot__credit">
        <p>{SITE_NAME}, frá 2024 · {SERVER_IP}</p>
        <p className="b-foot__small">Engin tengsl við Mojang eða Microsoft. <Link href="/admin" prefetch={false} className="b-foot__admin">Stjórnborð</Link></p>
      </div>

      {duel && (
        <div className="b-duelbox" role="dialog" aria-modal="true" aria-label="Einvígi" {...backdrop}>
          <div className="b-duelbox__in">
            <QuickDraw onClose={() => setDuel(false)} />
          </div>
        </div>
      )}
    </footer>
  );
}

export default memo(Footer);
