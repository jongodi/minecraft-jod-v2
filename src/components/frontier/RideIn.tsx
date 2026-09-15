'use client';

import { useRef } from 'react';
import { SERVER_IP } from './data';
import { useCopy } from './hooks';

/** The last stop: a saddle-leather patch with the ranch brand burnt into
    it and the address engraved on a brass plate riveted underneath. */
export default function RideIn() {
  const [copied, copy] = useCopy(SERVER_IP);
  const pressed = useRef(false);
  return (
    <section id="ride" className="j-sec">
      <div className="j-wrap" style={{ textAlign: 'center' }}>
        <p className="j-note j-note--big">Komdu inn</p>
        <p className="j-note">Nýleg Java-útgáfa af Minecraft. Vantar þig aðgang? Heyrðu í einhverju okkar</p>

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

          <button
            className={`j-plate${copied ? ' is-copied' : ''}`}
            onPointerDown={e => { if (e.pointerType !== 'touch' && e.button === 0) { pressed.current = true; copy(); } }}
            onClick={() => { if (!pressed.current) copy(); pressed.current = false; }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copy(); } }}
            aria-label="Afrita vistfang þjónsins"
          >
            <span className="j-plate__addr">{copied ? 'vistfang afritað' : SERVER_IP}</span>
            <span className="j-plate__hint">{copied ? 'límdu það nú inn í leikinn' : 'smelltu á plötuna til að afrita'}</span>
          </button>

          <p className="j-saddle__note">Opnaðu fjölspilun, bættu við þjóni og límdu vistfangið inn</p>
        </div>
      </div>
    </section>
  );
}
