'use client';

import { memo } from 'react';
import Mesa from './Mesa';
import CopyAddress from './CopyAddress';
import StatusLantern from './StatusLantern';
import type { ServerState } from './hooks';

function Hero({ server }: { server: ServerState }) {
  return (
    <section id="top" className="b-hero" aria-label="Sólsetur">
      <div className="b-wrap b-hero__grid">
        <div>
          <h1 className="b-hero__mark">JOÐ</h1>
          <p className="b-hero__sub">Minecraft-heimur átta vina, frá sumrinu 2024.</p>
          <div className="b-hero__action"><CopyAddress /></div>
        </div>
        <div className="b-hero__side">
          <StatusLantern server={server} />
          <p className="b-hero__version">aðgangur með boði · útlitspakkinn sækist sjálfkrafa</p>
        </div>
      </div>
      <Mesa />
    </section>
  );
}

/* Memoised: the home page also re-renders on stats and on the active
   section, and this section reads neither. */
export default memo(Hero);
