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
      <div className="f-wrap">
        <SectionHead
          no="01"
          kicker="Camp"
          title="Who's at camp"
          lede="The server is pinged once a minute. Anyone with a lit frame is on right now; tap a head to see their page."
        />

        <div className="f-camp">
          <div className="f-sign f-reveal">
            <div className="f-sign__top f-label">
              <span>{SERVER_IP}</span>
              <span className={`f-lamp${online === null ? '' : online ? ' is-on' : ' is-off'}`} />
            </div>
            <div className={`f-sign__word${online === null ? '' : online ? ' is-on' : ' is-off'}`}>
              {online === null ? 'Pinging' : online ? 'Online' : 'Offline'}
            </div>
            <div className="f-sign__grid">
              <div>
                <div className="f-sign__k f-label">On now</div>
                <div className="f-sign__v">{online ? players : 0} <small>/ {max}</small></div>
              </div>
              <div>
                <div className="f-sign__k f-label">Crew riding</div>
                <div className="f-sign__v">{riding}{guests > 0 && <small> +{guests} guest{guests === 1 ? '' : 's'}</small>}</div>
              </div>
              <div>
                <div className="f-sign__k f-label">Edition</div>
                <div className="f-sign__v">Java</div>
              </div>
              <div>
                <div className="f-sign__k f-label">Access</div>
                <div className="f-sign__v">Whitelist</div>
              </div>
            </div>
            <p className="f-sign__foot">
              {online === null ? 'Waiting on the first ping.' :
               online ? `Last ping ${ago || 'just now'}.` :
               `Nobody can join while it's down. Last ping ${ago || 'just now'}.`}
            </p>
          </div>

          <div className="f-reveal">
            <div className="f-riders__head f-label">
              <span><strong>{CREW.length}</strong> in the crew</span>
              <span><strong>{online ? riding : 0}</strong> riding</span>
            </div>
            <div className="f-crew">
              {CREW.map(name => {
                const on = !!online && lower.includes(name.toLowerCase());
                return (
                  <Link key={name} href={`/crew/${name}`} className={`f-rider${on ? ' is-riding' : ''}`}>
                    <span className="f-rider__frame"><PlayerHead name={name} size={128} /></span>
                    <span className="f-rider__name">{name}</span>
                    <span className="f-rider__tag f-label">{on ? 'Riding' : 'Away'}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
