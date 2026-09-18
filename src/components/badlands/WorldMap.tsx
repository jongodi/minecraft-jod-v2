'use client';

import { useEffect, useRef, useState } from 'react';

/* BlueMap's own viewer, hung in the same wooden frame as the land map on the
   home page. It runs in an iframe so its three.js scene and its styles stay
   out of the page. */
export default function WorldMap() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    /* the frame can finish loading before hydration and miss onLoad */
    const doc = frame.current?.contentDocument;
    if (doc && doc.readyState === 'complete' && doc.URL !== 'about:blank') setReady(true);
  }, []);

  return (
    <div className="b-map__wrap">
      <div className="b-world">
        {!ready && <p className="b-empty b-world__wait">sæki kortið…</p>}
        <iframe
          ref={frame}
          src="/bluemap/index.html"
          title="Þrívíddarkort af heimasvæðinu"
          className={`b-world__view${ready ? ' is-ready' : ''}`}
          onLoad={() => setReady(true)}
          allow="fullscreen"
          allowFullScreen
        />
      </div>
    </div>
  );
}
