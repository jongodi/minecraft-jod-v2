'use client';

import { memo } from 'react';
import Mesa from './Mesa';
import CopyAddress from './CopyAddress';
import StatusLantern from './StatusLantern';
import { NightLine } from './NightLine';
import type { ServerState } from './hooks';
import type { Season } from '@/lib/season';
import type { PlayNightResponse } from '@/app/api/playnight/route';
import { YuleLad } from './Season';

function Hero({ server, season, nights }: { server: ServerState; season: Season; nights?: PlayNightResponse }) {
  return (
    <section id="top" className="b-hero" aria-label="Sólsetur">
      {/* A title card over the land: the name stands at the foot of the sunset
          among the mesas, the far ridge behind its letters and the near ones
          in front of their feet, and rises out of them as the evening falls
          (the ridges sink with the scroll; badlands.css). What a player needs
          is above it, on the dark of the upper sky: one line of what this is,
          then the address and the server's lantern side by side. */}
      <div className="b-wrap b-hero__stage">
        <h1 className="b-hero__mark">JOÐ</h1>
        <div className="b-hero__lead">
          {/* one line says what this is and who it is for; the resource pack is the shelf's to mention */}
          <p className="b-hero__sub">Minecraft-heimur átta vina, frá sumrinu 2024. Aðgangur með boði.</p>
          <div className="b-hero__action">
            <CopyAddress />
            <div className="b-hero__side">
              <StatusLantern server={server} />
              <NightLine initial={nights} />
              <YuleLad season={season} spot="hero" />
            </div>
          </div>
        </div>
      </div>
      <Mesa snow={season.snow} halloween={season.halloween} />
      <YuleLad season={season} spot="mesa" />
    </section>
  );
}

/* Memoised: the home page also re-renders on stats and on the active
   section, and this section reads neither. */
export default memo(Hero);
