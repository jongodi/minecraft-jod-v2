'use client';

import SectionHead from './SectionHead';
import { SERVER_IP } from './data';
import { useCopy } from './hooks';

export default function RideIn() {
  const [copied, copy] = useCopy(SERVER_IP);
  return (
    <section id="ride" className="f-band f-band--pitch f-ride">
      <div className="f-wrap">
        <SectionHead
          kicker="Chapter VII · Ride in"
          title="Add the server"
          lede="Java Edition, any recent version. If you're not on the whitelist yet, ask someone in the crew."
        />

        <button className={`f-brand${copied ? ' is-copied' : ''}`} onClick={copy} aria-label="Copy the server address">
          <svg viewBox="0 0 400 400" aria-hidden="true">
            <g className="f-brand__glow">
              <circle className="f-brand__ring" cx="200" cy="200" r="182" strokeWidth="6" />
            </g>
            <circle className="f-brand__ring" cx="200" cy="200" r="182" strokeWidth="5" />
            <circle className="f-brand__ring" cx="200" cy="200" r="168" strokeWidth="2" strokeDasharray="4 10" />
            <path d="M200 46 l6 14 15 1 -11 10 3 15 -13 -8 -13 8 3 -15 -11 -10 15 -1 z" fill="currentColor" />
            <path d="M200 354 l6 -14 15 -1 -11 -10 3 -15 -13 8 -13 -8 3 15 -11 10 15 1 z" fill="currentColor" />
          </svg>
          <span className="f-brand__text">{copied ? 'Copied' : SERVER_IP}</span>
          <span className="f-brand__hint">{copied ? 'branded' : 'tap to copy'}</span>
        </button>
        <p className="f-ride__note">The brand is hot. Paste it into Multiplayer → Add Server.</p>
      </div>
    </section>
  );
}
