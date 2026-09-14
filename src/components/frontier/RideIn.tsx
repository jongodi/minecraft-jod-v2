'use client';

import { SERVER_IP } from './data';
import { useCopy } from './hooks';

export default function RideIn() {
  const [copied, copy] = useCopy(SERVER_IP);
  return (
    <section id="ride" className="f-ride">
      <div className="f-wrap f-reveal">
        <p className="f-head__kicker f-label" style={{ justifyContent: 'center' }}>07 · Ride in</p>
        <h2 className="f-ride__title">Add the server</h2>
        <button className={`f-ride__ip${copied ? ' is-copied' : ''}`} onClick={copy}>
          {copied ? 'Copied' : SERVER_IP}
        </button>
        <p className="f-ride__note">
          Java Edition, any recent version. The whitelist is by invitation, ask someone in the crew.
        </p>
      </div>
    </section>
  );
}
