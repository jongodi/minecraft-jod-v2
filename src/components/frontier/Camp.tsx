'use client';

import Link from 'next/link';
import PlayerHead from './PlayerHead';
import SectionHead from './SectionHead';
import { TornEdge } from './Ornaments';
import { CREW, SERVER_IP } from './data';
import { useAgo, type ServerState } from './hooks';

export default function Camp({ server }: { server: ServerState }) {
  const { online, players, max, list, checkedAt } = server;
  const ago = useAgo(checkedAt);
  const lower = list.map(n => n.toLowerCase());
  const riding = CREW.filter(n => lower.includes(n.toLowerCase())).length;
  const guests = Math.max(0, players - riding);

  return (
    <section id="camp" className="f-band f-band--paper">
      <TornEdge side="top" />
      <div className="f-wrap f-band__inner">
        <SectionHead
          kicker="Chapter I · Camp"
          title="Who's at camp"
          lede="The server is pinged once a minute. Portraits in colour are riding right now."
        />

        <div className="f-camp">
          <div className="f-telegraph">
            <div className="f-telegraph__head">
              <span>Telegraph · {SERVER_IP}</span>
              <span className={`f-dot${online === null ? '' : online ? ' is-on' : ' is-off'}`} style={{ marginRight: 0 }} />
            </div>
            <div className={`f-telegraph__word${online === null ? '' : online ? ' is-on' : ' is-off'}`}>
              {online === null ? 'Pinging' : online ? 'Online' : 'Offline'}
            </div>
            <dl className="f-telegraph__rows">
              <dt>Riding</dt>
              <dd>{online ? players : 0} of {max}{guests > 0 && <span style={{ color: 'var(--ink-3)' }}>, {guests} not in the crew</span>}</dd>
              <dt>Edition</dt><dd>Java, any recent version</dd>
              <dt>Access</dt><dd>Whitelist, by invitation</dd>
              <dt>Last ping</dt><dd>{checkedAt ? (ago || 'just now') : '—'}</dd>
            </dl>
            <p className="f-telegraph__foot">
              {online === null ? 'Waiting on the wire.' : online ? 'The gate is open.' : 'Nobody can ride in while the camp is dark.'}
            </p>
          </div>

          <div className="f-tintypes">
            {CREW.map(name => {
              const on = !!online && lower.includes(name.toLowerCase());
              return (
                <Link key={name} href={`/crew/${name}`} className={`f-tintype${on ? ' is-riding' : ''}`} title={name}>
                  <span className="f-tintype__frame"><PlayerHead name={name} size={128} /></span>
                  <span className="f-tintype__name">{name}</span>
                  <span className="f-tintype__tag">{on ? 'Riding' : 'Away'}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <TornEdge side="bottom" />
    </section>
  );
}
