'use client';

import { SERVER_IP } from './data';
import { useCopy } from './hooks';

export default function RideIn() {
  const [copied, copy] = useCopy(SERVER_IP);
  return (
    <section id="ride" className="j-sec">
      <div className="j-wrap" style={{ textAlign: 'center' }}>
        <p className="j-note j-note--big">Ride in</p>
        <p className="j-note">Java Edition, any recent version. not on the whitelist yet? ask one of us</p>

        <div className="j-patch">
          <button className={`j-brand${copied ? ' is-copied' : ''}`} onClick={copy} aria-label="Copy the server address">
            <svg viewBox="0 0 400 400" aria-hidden="true">
              <g className="j-brand__glow"><circle className="j-brand__ring" cx="200" cy="200" r="182" strokeWidth="6" /></g>
              <circle className="j-brand__ring" cx="200" cy="200" r="182" strokeWidth="5" />
              <circle className="j-brand__ring" cx="200" cy="200" r="168" strokeWidth="2" strokeDasharray="4 10" />
              <path d="M200 46 l6 14 15 1 -11 10 3 15 -13 -8 -13 8 3 -15 -11 -10 15 -1 z" fill="currentColor" />
              <path d="M200 354 l6 -14 15 -1 -11 -10 3 -15 -13 8 -13 -8 3 15 -11 10 15 1 z" fill="currentColor" />
            </svg>
            <span className="j-brand__text">{copied ? 'Copied' : SERVER_IP}</span>
            <span className="j-brand__hint">{copied ? 'branded' : 'tap to copy'}</span>
          </button>
          <p className="j-patch__note">paste it into Multiplayer → Add Server</p>
        </div>
      </div>
    </section>
  );
}
