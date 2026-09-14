'use client';

import { SERVER_IP } from './data';
import { useCopy } from './hooks';

/** The last stop: a saddle-leather patch with the ranch brand burnt into
    it and the address engraved on a brass plate riveted underneath. */
export default function RideIn() {
  const [copied, copy] = useCopy(SERVER_IP);
  return (
    <section id="ride" className="j-sec">
      <div className="j-wrap" style={{ textAlign: 'center' }}>
        <p className="j-note j-note--big">Ride in</p>
        <p className="j-note">Java Edition, any recent version. not on the whitelist yet? ask one of us</p>

        <div className="j-saddle">
          <span className="j-rivet" style={{ top: 18, left: 18 }} aria-hidden="true" />
          <span className="j-rivet" style={{ top: 18, right: 18 }} aria-hidden="true" />
          <span className="j-rivet" style={{ bottom: 18, left: 18 }} aria-hidden="true" />
          <span className="j-rivet" style={{ bottom: 18, right: 18 }} aria-hidden="true" />

          <div className="j-brandmark" aria-hidden="true">
            <svg viewBox="0 0 200 200">
              <circle className="j-brandmark__ember" cx="100" cy="100" r="86" />
              <circle className="j-brandmark__ring" cx="100" cy="100" r="86" />
              <circle className="j-brandmark__rim" cx="100" cy="100" r="86" />
            </svg>
            <span className="j-brandmark__text">JOÐ</span>
          </div>

          <button className={`j-plate${copied ? ' is-copied' : ''}`} onClick={copy} aria-label="Copy the server address">
            <span className="j-plate__addr">{copied ? 'copied to clipboard' : SERVER_IP}</span>
            <span className="j-plate__hint">{copied ? 'now paste it in the game' : 'tap the plate to copy'}</span>
          </button>

          <p className="j-saddle__note">Multiplayer, then Add Server, then paste</p>
        </div>
      </div>
    </section>
  );
}
