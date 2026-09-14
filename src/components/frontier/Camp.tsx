'use client';

import Link from 'next/link';
import PlayerHead from './PlayerHead';
import SectionHead from './SectionHead';
import { CREW, SERVER_IP } from './data';
import { useAgo, type ServerState } from './hooks';

export default function Camp({ server }: { server: ServerState }) {
  const { online, players, max, list, checkedAt } = server;
  const ago = useAgo(checkedAt);
  const lower = list.map(n => n.toLowerCase());
  const riding = CREW.filter(n => lower.includes(n.toLowerCase())).length;
  const guests = Math.max(0, players - riding);

  return (
    <section id="camp" className="f-section">
      <div className="f-wrap f-cols">
        <SectionHead
          kicker="Camp"
          title="Who's on"
          lede="The server is pinged once a minute. Faces in colour are on right now."
        >
          <p className="f-status-line">
            <span className={`f-dot${online === null ? '' : online ? ' is-on' : ' is-off'}`} />
            {online === null ? 'Pinging…' : online ? 'Up' : 'Down'}
            {checkedAt && <span className="f-muted"> · checked {ago || 'just now'}</span>}
          </p>
        </SectionHead>

        <div>
          <div className="f-heads">
            {CREW.map(name => {
              const on = !!online && lower.includes(name.toLowerCase());
              return (
                <Link key={name} href={`/crew/${name}`} className={`f-head-card${on ? ' is-on' : ''}`} title={name}>
                  <PlayerHead name={name} size={128} />
                  <span className="f-head-card__name">{name}</span>
                  {on && <span className="f-head-card__tag">on now</span>}
                </Link>
              );
            })}
          </div>

          <dl className="f-dl" style={{ marginTop: '2rem' }}>
            <dt>Address</dt><dd>{SERVER_IP}</dd>
            <dt>Playing</dt>
            <dd>{online ? players : 0} <small>of {max}</small>{guests > 0 && <small>, {guests} not in the crew</small>}</dd>
            <dt>Edition</dt><dd>Java, any recent version</dd>
            <dt>Access</dt><dd>Whitelist, by invitation</dd>
          </dl>
        </div>
      </div>
    </section>
  );
}
