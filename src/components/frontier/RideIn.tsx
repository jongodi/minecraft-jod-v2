'use client';

import { SERVER_IP } from './data';
import { useCopy } from './hooks';

export default function RideIn() {
  const [copied, copy] = useCopy(SERVER_IP);
  return (
    <section id="ride" className="f-ride">
      <div className="f-wrap">
        <p className="f-head__kicker">Ride in</p>
        <h2 className="f-ride__title" style={{ marginTop: '0.5rem' }}>Add the server</h2>
        <button className={`f-ride__addr${copied ? ' is-copied' : ''}`} onClick={copy} aria-label="Copy the server address">
          {copied ? 'Copied' : SERVER_IP}
        </button>
        <p className="f-ride__note">
          Java Edition, any recent version. If you&apos;re not on the whitelist yet, ask someone in the crew.
        </p>
      </div>
    </section>
  );
}
