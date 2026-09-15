'use client';

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Arrow, Pin, Stamp, Under } from './Bits';
import { Signpost } from './TrailNav';
import { HOME_LINKS, SERVER_IP } from './data';
import { useAgo, useCopy, type ServerState } from './hooks';

export default function Hero({ server, activeId }: { server: ServerState; activeId: string | null }) {
  const [copied, copy] = useCopy(SERVER_IP);
  const { online, players, checkedAt } = server;
  const ago = useAgo(checkedAt);
  const reduce = useReducedMotion();
  const pan = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, reduce ? 0 : 120]);

  return (
    <section id="top" className="j-sec j-hero">
      <div ref={pan} className="j-pan" aria-hidden="true">
        <motion.div className="j-pan__img" style={{ y }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/screenshots/the-castle.webp" alt="" fetchPriority="high" />
        </motion.div>
        <span className="j-pan__cap j-hand">Kastali Goða, séður frá vatninu. Allar myndirnar hér eru úr heiminum okkar.</span>
      </div>

      <div className="j-wrap j-hero__grid">
        <div className="j-hero__copy">
          <h1 className="j-hero__mark"><span>JOÐ</span></h1>
          <p className="j-note j-note--big j-hero__sub">Kubbaveröld, frá sumrinu 2024</p>
          <Under />
          <p className="j-hero__body">
            Átta vinir, einn heimur og ekkert verið að byrja upp á nýtt. Við erum með sérsmíðaða JOÐ gagnapakka og útlitspakka, og þú þarft boð til að komast inn. Hér höldum við utan um það sem er að gerast.
          </p>
          <div className="j-hero__meta">
            <Stamp r={-6} onClick={copy} copied={copied}>{copied ? 'Afritað' : SERVER_IP}</Stamp>
            <span className="j-note"><Arrow flip /> smelltu á stimpilinn til að afrita vistfangið</span>
          </div>
          <a href="#camp" className="j-hero__scroll j-note j-note--faint">leiðin byrjar hér <Arrow /></a>
        </div>

        <div className="j-hero__side">
          <Signpost links={HOME_LINKS} activeId={activeId} />
          <div className="j-slip" style={{ '--r': '2deg' } as React.CSSProperties}>
            <Pin red style={{ top: -6, left: '50%', marginLeft: -7 }} />
            <div className="j-slip__head"><span>Símskeyti</span><span>{checkedAt ? (ago || 'rétt í þessu') : '…'}</span></div>
            <div className={`j-slip__word${online === null ? '' : online ? ' is-on' : ' is-off'}`}>
              {online === null ? 'Athuga stöðuna' : online ? 'Kveikt á þjóninum' : 'Slökkt á þjóninum'}
            </div>
            <div className="j-slip__row">
              {online === null ? 'bíð eftir svari…' : online ? (players === 0 ? 'enginn inni enn, en það er opið' : `inni núna: ${players}`) : 'ekki hægt að tengjast í augnablikinu'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
