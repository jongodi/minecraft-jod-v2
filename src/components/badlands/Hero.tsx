'use client';

import { memo, useEffect, useState } from 'react';
import Mesa, { Rider } from './Mesa';
import { Moon, Sun } from './Bits';
import CopyAddress from './CopyAddress';
import StatusLantern from './StatusLantern';
import { NightLine } from './NightLine';
import { isLive, type ServerState } from './hooks';
import type { Season } from '@/lib/season';
import type { PlayNightResponse } from '@/app/api/playnight/route';
import { YuleLad, useMoonPhase } from './Season';
import { CREW } from './data';
import { useRoster } from './roster';

/* The title screen's splash: what the game tilts in yellow over its logo,
   one line picked at random each time the title screen comes up. These are
   facts about this world, in the game's exclaiming voice; what is true
   tonight (who is in, a night planned) is picked first when there is any.
   It pops as it comes, as the game's swells, once rather than for as long
   as the page is open; a press brings the next, so every fact can be read.
   None repeats the line printed just above the name (eight friends, since
   2024, by invitation): a splash is a fact the visitor has not read yet. */
const SPLASHES = ['Aldrei endurræst!', 'Eigin gagnapakkar!', 'Útlitspakki fylgir!', 'Heimurinn í þrívídd!', 'Badlands við sólsetur!', 'Með armadillo!'];
/* the hotbar's keys, one to a door (AddressBar.tsx), said only where there is likely a keyboard to press them on */
const KEYS_SPLASH = 'Ýttu á 1, 2 eða 3!';

const shuffled = <T,>(a: T[]): T[] => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
};

/* What is true tonight stands in the round as itself, and is said as it
   stands when it comes up: the count of who is in was written once from the
   page's first answer, which can be hours old, and said "3 inni núna!" all
   evening to a page whose lantern had long since gone dark. */
const INSIDE = 'inside';
const PLANNED = 'planned';

function Splash({ inside, planned, live }: { inside: number; planned: boolean; live: boolean }) {
  /* picked in the browser, once: a pick in the server's markup would differ
     from the browser's. The first as the game picks it, the rest in a
     shuffled round, so a press never brings the same line twice running. */
  const [lines, setLines] = useState<string[] | null>(null);
  const [at, setAt] = useState(0);
  useEffect(() => {
    const tonight = [
      ...(live && inside > 0 ? [INSIDE] : []),
      ...(planned ? [PLANNED] : []),
    ];
    const keys = window.matchMedia('(hover: hover) and (pointer: fine)').matches ? [KEYS_SPLASH] : [];
    const all = [INSIDE, PLANNED, ...SPLASHES, ...keys];
    const first = shuffled(tonight.length > 0 && Math.random() < 0.6 ? tonight : [...SPLASHES, ...keys])[0];
    setLines([first, ...shuffled(all.filter(l => l !== first))]);
  // the title screen picks once, as the game does
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!lines) return null;
  /* tonight's lines only while they are true, the count as it stands */
  const shown = lines.filter(l => (l !== INSIDE || (live && inside > 0)) && (l !== PLANNED || planned));
  const pick = shown[at % shown.length];
  const line = pick === INSIDE ? `${inside} inni núna!` : pick === PLANNED ? 'Spilakvöld á dagskrá!' : pick;
  return (
    <span className="b-hero__splash">
      <button type="button" className="b-hero__splashbtn" onClick={() => setAt(v => v + 1)}>
        {/* keyed, so each line pops as it comes */}
        <span key={at} className="b-hero__splashword">{line}</span>
      </button>
    </span>
  );
}

/* On a phone the crew who are in climb the name: one on the O, one on the
   Ð, their name tags in the sky over them, and a count for the rest. The
   plateau at the name's feet stood them in front of the O's window. One who
   comes in while the page is looked at climbs up onto the letter; one who
   goes out climbs down. */
function Climbers({ names, known }: { names: string[]; known: boolean }) {
  const { roster, settle } = useRoster(names, known);
  if (roster.length === 0) return null;
  const shown = roster.slice(0, 2);
  const more = names.length - shown.filter(r => r.phase !== 'going').length;
  return (
    <div className="b-hero__climbers">
      {shown.map(r => <Rider key={r.name} name={r.name} phase={r.phase} onWalked={settle} className="b-hero__climber" />)}
      {more > 0 && <span className="b-nametag b-hero__more">+{more}</span>}
    </div>
  );
}

function Hero({ server, season, nights, packs }: { server: ServerState; season: Season; nights?: PlayNightResponse; packs: number }) {
  /* someone's home: the server is up and somebody is in it */
  const home = server.online === true && server.players > 0;
  const lower = server.list.map(n => n.toLowerCase());
  const inside = server.online ? CREW.filter(n => lower.includes(n.toLowerCase())) : [];
  /* the names are a live answer, so a change in them is someone coming or going (isLive) */
  const known = isLive(server);
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
          is above it, on the dark of the upper sky: one line of what this is,
          then the address and the server's lantern side by side. */}
      <div className="b-wrap b-hero__stage">
        {/* the counters of the O and the Ð are windows, lit while someone is in (badlands.css) */}
        <h1 className={`b-hero__mark${home ? ' is-home' : ''}`}>
          JOÐ
          <span className="b-hero__window b-hero__window--o" aria-hidden="true" />
          <span className="b-hero__window b-hero__window--eth" aria-hidden="true" />
          {/* tonight's moon, rising from behind the J as the sun sets on the other side */}
          {moon !== null && <Moon phase={moon} className="b-hero__moon" />}
        </h1>
        <Climbers names={inside} known={known} />
        {/* a phone's sun: in the open sky between the words and the name, so no line above it ever crosses it (badlands.css) */}
        <div className="b-hero__sun" aria-hidden="true"><Sun /></div>
        <div className="b-hero__lead">
          {/* one line says what this is and who it is for; the resource pack is the shelf's to mention */}
          <p className="b-hero__sub">Minecraft-heimur átta vina, frá sumrinu 2024. Aðgangur með boði.</p>
          <div className="b-hero__action">
            <CopyAddress />
            <div className="b-hero__side">
              <StatusLantern server={server} packs={packs} />
              <NightLine initial={nights} />
              <YuleLad season={season} spot="hero" />
            </div>
          </div>
        </div>
        {/* after the address and the lantern in the page's order, so the one
            action comes first to the keyboard; drawn over the Ð all the same */}
        <Splash inside={inside.length} planned={(nights?.nights ?? []).some(n => n.phase !== 'over')} live={known} />
      </div>
      <Mesa snow={season.snow} halloween={season.halloween} heads={inside} known={known} />
      <YuleLad season={season} spot="mesa" />
    </section>
  );
}

/* Memoised: the home page also re-renders when the lit door and the open
   room change, and this section reads neither. */
export default memo(Hero);
