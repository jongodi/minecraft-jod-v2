'use client';

import { memo, useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Campfire, ChevronIcon } from './Bits';
import { Ridge } from './Mesa';
import { SERVER_IP, SITE_NAME } from './data';
import AmbienceToggle from '@/effects/AmbienceToggle';
import { useBackdropClose, useScrollLock } from './hooks';
import { YuleLad, seasonClass, useSeason } from './Season';
import type { Season } from '@/lib/season';

/* The duel lives behind the fire; nobody pays for it until they tap. */
const QuickDraw = dynamic(() => import('./QuickDraw'), { ssr: false });

/* The evening's doors are in the bar (and the hotbar at the foot of a
   phone), the crew's among them, so the footer does not post them a second
   time. The admin panel is the owner's tool, not a door for visitors: it
   rides in the small print. Not prefetched: every visitor who scrolled to
   the fire used to download the panel's code and stylesheet. */

/** The campfire: the last light. One band of ground at the foot of the page,
    the fire burning in the middle of it in a ring of stones, in front of the
    same mesas the evening opened over, its light pooled across the ground and
    on the foot of the rock. Tap the fire and the duel comes out. Climbing
    back to the sunset rewinds the sky on the way up, because the sky is
    scroll. */
function Footer({ season: initial }: { season?: Season } = {}) {
  const [duel, setDuel] = useState(false);
  const season = useSeason(initial);
  useScrollLock(duel);
  const backdrop = useBackdropClose(() => setDuel(false));

  useEffect(() => {
    if (!duel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDuel(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duel]);

  return (
    <footer id="campfire" className={`b-foot${seasonClass(season)}`}>
      {/* the camp: the fire in the middle of the band, standing on the ground,
          the way back up and the wind on the ground either side of it, the
          ridge behind lit at its foot by the fire */}
      <div className="b-foot__scene">
        <Ridge snow={season.snow} warm />
        <div className="b-wrap b-foot__inner">
          <Link href="/#top" className="b-btn b-btn--small b-foot__up">
            <ChevronIcon dir="up" className="b-foot__upchev" />
            Aftur í sólsetrið
          </Link>

          <div className="b-foot__camp">
            {/* the way into the duel: a short sign planted in the ground by the fire, so a thumb finds it without a pointer's tag */}
            <button type="button" className="b-foot__fire" onClick={() => setDuel(true)} aria-haspopup="dialog" aria-label="Einvígi: prófaðu viðbragðstímann">
              <Campfire stones />
              <span className="b-foot__sign" aria-hidden="true">Einvígi</span>
            </button>
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
