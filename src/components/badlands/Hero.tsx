'use client';

import { memo } from 'react';
import Mesa from './Mesa';
import { Moon, Sun } from './Bits';
import ServerRow from './ServerRow';
import { NightLine } from './NightLine';
import type { ServerState } from './hooks';
import type { Season } from '@/lib/season';
import type { PlayNightResponse } from '@/app/api/playnight/route';
import { YuleLad, useMoonPhase } from './Season';
import { CREW } from './data';

function Hero({ server, season, nights }: { server: ServerState; season: Season; nights?: PlayNightResponse }) {
  /* someone's home: the server is up and somebody is in it */
  const home = server.online === true && server.players > 0;
  const lower = server.list.map(n => n.toLowerCase());
  const inside = server.online ? CREW.filter(n => lower.includes(n.toLowerCase())) : [];
  const moon = useMoonPhase();
  return (
    <section id="top" className="b-hero" aria-label="Sólsetur">
      {/* the afterglow: the last of the sunset held on the horizon behind the
          ridges, after the night has taken the top of the sky (badlands.css) */}
      <div className="b-hero__glow" aria-hidden="true" />
      {/* A title card over the land: the name stands at the foot of the sunset
          among the mesas, the far ridge behind its letters and the near ones
          in front of their feet, and rises out of them as the evening falls
          (the ridges sink with the scroll; badlands.css). What a player needs
          is above it, on the dark of the upper sky: the server's row. */}
      <div className="b-wrap b-hero__stage">
        {/* the counters of the O and the Ð are windows, lit while someone is in (badlands.css) */}
        <h1 className={`b-hero__mark${home ? ' is-home' : ''}`}>
          JOÐ
          <span className="b-hero__window b-hero__window--o" aria-hidden="true" />
          <span className="b-hero__window b-hero__window--eth" aria-hidden="true" />
          {/* tonight's moon, rising from behind the J as the sun sets on the other side */}
          {moon !== null && <Moon phase={moon} className="b-hero__moon" />}
        </h1>
        {/* a phone's sun: in the open sky between the words and the name, so no line above it ever crosses it (badlands.css) */}
        <div className="b-hero__sun" aria-hidden="true"><Sun /></div>
        <div className="b-hero__lead">
          {/* What a player needs, in the shape the game shows a server: the row
              from the multiplayer screen, with the address to copy, the sentence
              as its message of the day, the count and the bars; the state in
              words under it. Then the next play night. */}
          <ServerRow server={server} />
          <div className="b-hero__under">
            <NightLine initial={nights} />
            <YuleLad season={season} spot="hero" />
          </div>
        </div>
      </div>
      <Mesa snow={season.snow} halloween={season.halloween} heads={inside} />
      <YuleLad season={season} spot="mesa" />
    </section>
  );
}

/* Memoised: the home page also re-renders on stats and on the active
   section, and this section reads neither. */
export default memo(Hero);
