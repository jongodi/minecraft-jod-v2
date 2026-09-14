'use client';

import Landscape from './Landscape';
import { SERVER_IP } from './data';
import { useCopy, type ServerState } from './hooks';

export default function Hero({ server }: { server: ServerState }) {
  const [copied, copy] = useCopy(SERVER_IP);
  const { online, players } = server;

  const status =
    online === null ? 'Checking the server' :
    online          ? (players === 0 ? 'Online, nobody on yet' : `Online, ${players} riding`) :
                      'Offline right now';

  return (
    <section id="top" className="f-hero">
      <Landscape online={online} />

      <div className="f-wrap f-hero__content">
        <p className="f-hero__pre f-label">
          <span>Est. 2024</span>
          <span>Java Edition</span>
          <span>Whitelist only</span>
        </p>
        <h1 className="f-hero__mark">JO<span className="eth">Ð</span></h1>
        <p className="f-hero__line">
          A private survival world for eight friends, running since 2024.
          Custom datapacks and a resource pack of our own.
        </p>
        <div className="f-hero__actions">
          <button className={`f-btn${copied ? ' is-copied' : ''}`} onClick={copy}>
            {copied ? 'Address copied' : `Copy ${SERVER_IP}`}
          </button>
          <a href="#camp" className="f-chip f-label">
            <span className={`f-lamp${online === null ? '' : online ? ' is-on' : ' is-off'}`} />
            {status}
          </a>
        </div>
      </div>

      <a href="#camp" className="f-hero__scroll f-label">Down the trail ↓</a>
    </section>
  );
}
