'use client';

import Dust from './Dust';
import { Corner, Divider, Lantern } from './Ornaments';
import { SERVER_IP } from './data';
import { useCopy, type ServerState } from './hooks';

export default function Hero({ server }: { server: ServerState }) {
  const [copied, copy] = useCopy(SERVER_IP);
  const { online, players } = server;

  const status =
    online === null ? 'Raising the camp…' :
    online ? (players === 0 ? 'Camp is lit, nobody in yet' : `Camp is lit, ${players} riding`) :
    'Camp is dark tonight';

  return (
    <section id="top" className="f-hero">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="f-hero__bg" src="/screenshots/the-castle.webp" alt="" aria-hidden="true" fetchPriority="high" />
      <div className="f-hero__shade" aria-hidden="true" />
      <Dust />

      <article className="f-poster">
        <Corner className="f-corner f-corner--tl" />
        <Corner className="f-corner f-corner--tr" />
        <Corner className="f-corner f-corner--bl" />
        <Corner className="f-corner f-corner--br" />

        <p className="f-poster__est">Est. MMXXIV · Java Edition</p>
        <h1 className="f-poster__mark">JOÐ</h1>
        <p className="f-poster__line">A private survival world on the frontier</p>
        <Divider className="f-poster__orn" />
        <p className="f-poster__body">
          Eight friends, one map, no resets since the summer of 2024. Our own datapacks and
          resource pack. Whitelist by invitation.
        </p>

        <p className="f-poster__status">
          <Lantern lit={!!online} />
          <span>{status}</span>
        </p>

        <div className="f-poster__addr">
          <code>{SERVER_IP}</code>
          <button className={`f-btn f-btn--small${copied ? ' is-copied' : ''}`} onClick={copy}>
            {copied ? 'Copied' : 'Copy address'}
          </button>
        </div>
      </article>

      <a href="#camp" className="f-hero__scroll">Down the trail ↓</a>
    </section>
  );
}
