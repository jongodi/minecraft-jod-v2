'use client';

import { Arrow, Pin, Stamp, Tape, Under } from './Bits';
import { Signpost } from './TrailNav';
import { HOME_LINKS, SERVER_IP } from './data';
import { useAgo, useCopy, type ServerState } from './hooks';

export default function Hero({ server, activeId }: { server: ServerState; activeId: string | null }) {
  const [copied, copy] = useCopy(SERVER_IP);
  const { online, players, checkedAt } = server;
  const ago = useAgo(checkedAt);

  return (
    <section id="top" className="j-sec j-hero">
      <div className="j-wrap j-hero__grid">
        <div>
          <h1 className="j-hero__mark">JOÐ</h1>
          <p className="j-note j-note--big j-hero__sub">a private survival world, since summer &rsquo;24</p>
          <Under />
          <p className="j-hero__body">
            Eight friends, one map, no resets. We run our own datapacks and resource pack,
            and the whitelist is by invitation. This page is where we keep track of the place.
          </p>
          <div className="j-hero__meta">
            <Stamp r={-6} onClick={copy} copied={copied}>{copied ? 'Copied' : SERVER_IP}</Stamp>
            <span className="j-note">
              <Arrow flip /> tap the stamp to copy the address
            </span>
          </div>
          <a href="#camp" className="j-hero__scroll j-note j-note--faint">the trail starts here <Arrow /></a>
        </div>

        <div>
          <Signpost links={HOME_LINKS} activeId={activeId} />

          <figure className="j-print j-hero__print">
            <Tape at="tl" />
            <Tape at="br" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/screenshots/the-castle.webp" alt="Goði Castle seen from the water" fetchPriority="high" />
            <figcaption className="j-print__cap">Goði Castle, the far away lands. Every picture here is from the server.</figcaption>
          </figure>

          <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'flex-end' }}>
            <div className="j-slip" style={{ '--r': '2deg' } as React.CSSProperties}>
              <Pin red style={{ top: -6, left: '50%', marginLeft: -7 }} />
              <div className="j-slip__head"><span>Telegram</span><span>{checkedAt ? (ago || 'just now') : '…'}</span></div>
              <div className={`j-slip__word${online === null ? '' : online ? ' is-on' : ' is-off'}`}>
                {online === null ? 'Pinging the camp' : online ? 'Camp is lit' : 'Camp is dark'}
              </div>
              <div className="j-slip__row">
                {online === null ? 'waiting on the wire…' : online ? (players === 0 ? 'nobody in yet, gate is open' : `${players} riding right now`) : 'nobody can ride in tonight'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
