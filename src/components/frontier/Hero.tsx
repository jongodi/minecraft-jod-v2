'use client';

import { SERVER_IP } from './data';
import { useCopy, type ServerState } from './hooks';

export default function Hero({ server }: { server: ServerState }) {
  const [copied, copy] = useCopy(SERVER_IP);
  const { online, players } = server;

  return (
    <section id="top" className="f-hero">
      <div className="f-wrap">
        <p className="f-hero__eyebrow">Private Minecraft survival server · Java Edition · since 2024</p>
        <h1 className="f-hero__title"><em>JOÐ</em> is a survival world for eight friends.</h1>
        <p className="f-hero__dek">
          One map, no resets, running since the summer of 2024. We use our own datapacks and
          resource pack. The whitelist is by invitation.
        </p>

        <div className="f-hero__meta">
          <span>
            <span className={`f-dot${online === null ? '' : online ? ' is-on' : ' is-off'}`} />
            {online === null ? 'Checking the server…' :
             online ? (players === 0 ? 'Server is up, nobody on yet' : `Server is up, ${players} playing`) :
             'Server is down right now'}
          </span>
          <span className="f-hero__addr">
            <code>{SERVER_IP}</code>
            <button className={`f-btn f-btn--small${copied ? ' is-copied' : ''}`} onClick={copy}>
              {copied ? 'Copied' : 'Copy address'}
            </button>
          </span>
        </div>

        <figure className="f-hero__photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/screenshots/the-castle.webp" alt="Goði Castle seen from the water, with hills behind it" fetchPriority="high" />
          <figcaption className="f-cap">
            <i>Goði Castle, in the far away lands.</i>
            <span>Every picture on this page is a screenshot from the server.</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
