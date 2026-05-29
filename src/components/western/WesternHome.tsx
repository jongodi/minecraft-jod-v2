'use client';

import '@/app/western.css';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useTheme } from '@/lib/theme';
import { DATAPACKS } from '@/data/datapacks';
import WesternMap from './WesternMap';

/* ─── static data ─────────────────────────────────────────────────────────── */
const CREW = ['stebbias','AmmaGaur','joenana','ingunnbirta','Gamla123','fafnir1994','IMlonely','eikibleiki'];
const HEAD = (name: string) => `https://mc-heads.net/head/${name}/128`;

const GALLERY_PLATES = [
  { src: '/screenshots/the-castle.png',    title: 'Goði Castle',       sub: 'far away lands',       size: 12 },
  { src: '/screenshots/spawn-hill.png',    title: 'Joð Ville',         sub: 'old base',             size: 8  },
  { src: '/screenshots/cherry-estate.png', title: 'Pink Estate',       sub: 'old base',             size: 4  },
  { src: '/screenshots/j-club.png',        title: 'J Club',            sub: 'secret underground',   size: 4  },
  { src: '/screenshots/mushroom-isle.png', title: 'Mushroom Isle',     sub: 'shroomy heaven',       size: 4  },
  { src: '/screenshots/the-hall.png',      title: 'Potions Tower',     sub: 'new base',             size: 4  },
  { src: '/screenshots/waterfront.png',    title: 'Venice',            sub: 'new base',             size: 5  },
  { src: '/screenshots/the-tavern.png',    title: 'City Hall',         sub: 'new base',             size: 7  },
  { src: '/screenshots/the-village.png',   title: 'The Village',       sub: 'new base',             size: 6  },
  { src: '/screenshots/balloon-island.png',title: 'Balloon Paradise',  sub: 'new base',             size: 6  },
  { src: '/screenshots/night-sky.png',     title: 'New Town',          sub: 'new base · closing plate', size: 12 },
];

const NAV_LINKS = [
  { no: '00.', label: 'HOME',       href: '#hero'      },
  { no: 'I.',  label: 'SERVER',     href: '#server'    },
  { no: 'II.', label: 'GALLERY',    href: '#gallery'   },
  { no: 'III.',label: 'MAP',        href: '#map'       },
  { no: 'IV.', label: 'DATAPACKS',  href: '#datapacks' },
  { no: 'V.',  label: 'QUICK DRAW', href: '#quickdraw' },
  { no: 'VI.', label: 'CREW',       href: '#stats'     },
  { no: 'VII.',label: 'SADDLE UP', href: '#join'  },
];

const STAT_TABS = [
  { id: 'playTimeHours',  label: 'PLAYTIME',  format: (v: number) => `${v}h`                         },
  { id: 'mobKills',       label: 'KILLS',     format: (v: number) => v.toLocaleString()               },
  { id: 'deaths',         label: 'DEATHS',    format: (v: number) => v.toLocaleString()               },
  { id: 'itemsCrafted',   label: 'CRAFTED',   format: (v: number) => v.toLocaleString()               },
  { id: 'distanceWalked', label: 'WALKED',    format: (v: number) => `${(v/100000).toFixed(1)} km`    },
] as const;

type StatKey = typeof STAT_TABS[number]['id'];

/* ─── cactus svg ─────────────────────────────────────────────────────────── */
const CactusSVG = () => (
  <svg viewBox="0 0 60 90" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="24" y="10" width="12" height="70" fill="#6B7A3F" stroke="#2A1410" strokeWidth="2"/>
    <rect x="12" y="30" width="12" height="8"  fill="#6B7A3F" stroke="#2A1410" strokeWidth="2"/>
    <rect x="6"  y="22" width="8"  height="22" fill="#6B7A3F" stroke="#2A1410" strokeWidth="2"/>
    <rect x="36" y="38" width="12" height="8"  fill="#6B7A3F" stroke="#2A1410" strokeWidth="2"/>
    <rect x="44" y="30" width="8"  height="22" fill="#6B7A3F" stroke="#2A1410" strokeWidth="2"/>
  </svg>
);

/* ─── section divider svg ────────────────────────────────────────────────── */
function SectionDivider() {
  return (
    <div className="w-section__divider">
      <svg viewBox="0 0 1200 30" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="15" x2="540" y2="15" stroke="#2A1410" strokeWidth="2"/>
        <line x1="660" y1="15" x2="1200" y2="15" stroke="#2A1410" strokeWidth="2"/>
        <g fill="#8C2D17" stroke="#2A1410" strokeWidth="1.5">
          <polygon points="600,2 608,15 600,28 592,15"/>
          <polygon points="582,8 590,15 582,22 574,15"/>
          <polygon points="618,8 626,15 618,22 610,15"/>
        </g>
      </svg>
    </div>
  );
}

/* ─── tumbleweed svg ─────────────────────────────────────────────────────── */
const TumbleWeedSVG = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="28" stroke="#8C2D17" strokeWidth="3" fill="rgba(180,120,60,0.18)"/>
    <line x1="4" y1="32" x2="60" y2="32" stroke="#5C3A28" strokeWidth="2" opacity="0.7"/>
    <line x1="32" y1="4" x2="32" y2="60" stroke="#5C3A28" strokeWidth="2" opacity="0.7"/>
    <line x1="12" y1="12" x2="52" y2="52" stroke="#5C3A28" strokeWidth="1.5" opacity="0.5"/>
    <line x1="52" y1="12" x2="12" y2="52" stroke="#5C3A28" strokeWidth="1.5" opacity="0.5"/>
    <circle cx="32" cy="32" r="8" stroke="#8C2D17" strokeWidth="2" fill="rgba(180,100,40,0.25)"/>
  </svg>
);

/* ─── bullet hole svg ────────────────────────────────────────────────────── */
const BulletHoleSVG = () => (
  <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="22" cy="22" r="8" fill="#1a0a04" stroke="#5C3A28" strokeWidth="1"/>
    {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
      const rad = deg * Math.PI / 180;
      const x1 = 22 + Math.cos(rad) * 9;
      const y1 = 22 + Math.sin(rad) * 9;
      const x2 = 22 + Math.cos(rad) * (14 + (i % 3) * 4);
      const y2 = 22 + Math.sin(rad) * (14 + (i % 3) * 4);
      return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5C3A28" strokeWidth="1.2" opacity="0.8"/>;
    })}
    <circle cx="22" cy="22" r="5" fill="#0d0402"/>
  </svg>
);

/* ─── quick draw state type ──────────────────────────────────────────────── */
type QDState = 'idle' | 'countdown' | 'draw' | 'result';

/* ─── main component ─────────────────────────────────────────────────────── */
export default function WesternHome() {
  const { setTheme } = useTheme();

  /* server status */
  const [online, setOnline]       = useState<boolean | null>(null);
  const [players, setPlayers]     = useState(0);
  const [maxPlayers, setMaxPlayers] = useState(20);
  const [onlineList, setOnlineList] = useState<string[]>([]);

  /* stats */
  const [statsData, setStatsData] = useState<Record<string, Record<string, number>>>({});
  const [statsTab, setStatsTab]   = useState<StatKey>('playTimeHours');

  /* copy state */
  const [copied, setCopied]       = useState(false);
  const [copiedJoin, setCopiedJoin] = useState(false);

  /* night mode */
  const [night, setNight]         = useState(false);

  /* quick draw */
  const [qdState, setQdState]     = useState<QDState>('idle');
  const [qdResult, setQdResult]   = useState('');
  const [qdTime, setQdTime]       = useState(0);
  const [qdBest, setQdBest]       = useState<number | null>(null);
  const qdTimer    = useRef<ReturnType<typeof setTimeout>>();
  const qdStart    = useRef(0);
  const qdFired    = useRef(false);

  /* refs for effects */
  const joinRef    = useRef<HTMLElement>(null);
  const statsRef   = useRef<HTMLDivElement>(null);
  const tumbRef    = useRef<HTMLDivElement>(null);
  const wrapRef    = useRef<HTMLDivElement>(null);

  /* ── fetch server status ─────────────────────────────────────────── */
  useEffect(() => {
    fetch('/api/server-status')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setOnline(data.online ?? false);
        setPlayers(data.players?.online ?? 0);
        setMaxPlayers(data.players?.max ?? 20);
        setOnlineList((data.players?.list ?? []).map((p: {name: string}) => p.name));
      })
      .catch(() => setOnline(false));
  }, []);

  /* ── fetch stats ─────────────────────────────────────────────────── */
  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.players) return;
        const record: Record<string, Record<string, number>> = {};
        for (const p of data.players as Array<Record<string, number> & { username: string }>) {
          const { username, ...stats } = p;
          record[username] = stats;
        }
        setStatsData(record);
      })
      .catch(() => {});
  }, []);

  /* ── tumbleweed ──────────────────────────────────────────────────── */
  useEffect(() => {
    const roll = () => {
      const el = tumbRef.current;
      if (!el) return;
      el.classList.remove('is-rolling');
      void el.offsetWidth;
      el.classList.add('is-rolling');
    };
    const id = setInterval(roll, 22000);
    const t0 = setTimeout(roll, 4000);
    return () => { clearInterval(id); clearTimeout(t0); };
  }, []);

  /* ── dust particles ──────────────────────────────────────────────── */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const field = document.createElement('div');
    field.className = 'w-dust-field';
    wrap.appendChild(field);
    for (let i = 0; i < 18; i++) {
      const d = document.createElement('div');
      d.className = 'w-dust';
      d.style.setProperty('--x',     `${Math.random() * 100}%`);
      d.style.setProperty('--dur',   `${12 + Math.random() * 14}s`);
      d.style.setProperty('--delay', `${-Math.random() * 20}s`);
      d.style.setProperty('--dx',    `${(Math.random() - 0.5) * 120}px`);
      field.appendChild(d);
    }
    return () => field.remove();
  }, []);

  /* ── bullet holes on click ───────────────────────────────────────── */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('a,button,input,select,textarea,[data-no-shoot]')) return;
      const hole = document.createElement('div');
      hole.className = 'w-bullet-hole';
      hole.style.left = `${e.clientX}px`;
      hole.style.top  = `${e.clientY}px`;
      hole.style.setProperty('--r', `${(Math.random() - 0.5) * 40}deg`);
      hole.innerHTML = `<svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="22" cy="22" r="8" fill="#1a0a04" stroke="#5C3A28" stroke-width="1"/>
        ${[0,30,60,90,120,150,180,210,240,270,300,330].map((deg,i) => {
          const rad = deg * Math.PI / 180;
          const x1 = 22 + Math.cos(rad) * 9; const y1 = 22 + Math.sin(rad) * 9;
          const x2 = 22 + Math.cos(rad) * (14 + (i%3)*4); const y2 = 22 + Math.sin(rad) * (14 + (i%3)*4);
          return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#5C3A28" stroke-width="1.2" opacity="0.8"/>`;
        }).join('')}
        <circle cx="22" cy="22" r="5" fill="#0d0402"/>
      </svg>`;
      document.body.appendChild(hole);
      wrapRef.current?.classList.add('w-shake');
      setTimeout(() => wrapRef.current?.classList.remove('w-shake'), 400);
      setTimeout(() => hole.remove(), 8000);
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  /* ── scroll reveal ───────────────────────────────────────────────── */
  useEffect(() => {
    const els = document.querySelectorAll('.w-reveal');
    if (!els.length) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-in'); });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  /* ── saloon doors ────────────────────────────────────────────────── */
  useEffect(() => {
    const el = joinRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) el.classList.add('doors-open');
    }, { threshold: 0.25 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* ── stats bar animate ───────────────────────────────────────────── */
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.querySelectorAll<HTMLElement>('.w-row__barfill').forEach((bar, i) => {
          setTimeout(() => { bar.style.transform = `scaleX(${bar.dataset.fill || 0})`; }, i * 80);
        });
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [statsData, statsTab]);

  /* ── copy IP ─────────────────────────────────────────────────────── */
  const copyIP = useCallback((isJoin = false) => {
    navigator.clipboard.writeText('play.jodcraft.world').catch(() => {});
    if (isJoin) {
      setCopiedJoin(true);
      setTimeout(() => setCopiedJoin(false), 2200);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  }, []);

  /* ── quick draw logic ────────────────────────────────────────────── */
  const qdBegin = () => {
    if (qdState !== 'idle') return;
    setQdState('countdown');
    qdFired.current = false;
    const delay = 1800 + Math.random() * 2200;
    qdTimer.current = setTimeout(() => {
      setQdState('draw');
      qdStart.current = performance.now();
    }, delay);
  };

  const qdFire = () => {
    if (qdState === 'countdown') {
      clearTimeout(qdTimer.current);
      setQdResult('TOO SOON, OUTLAW');
      setQdState('result');
      return;
    }
    if (qdState !== 'draw' || qdFired.current) return;
    qdFired.current = true;
    const ms = Math.round(performance.now() - qdStart.current);
    setQdTime(ms);
    setQdBest(prev => prev === null || ms < prev ? ms : prev);
    const rank =
      ms < 200 ? 'SHERIFF — LIGHTNING FAST' :
      ms < 400 ? 'WAGON MASTER — QUICK' :
      ms < 700 ? 'OUTLAW — DECENT' :
                 'GREENHORN — SLOW';
    setQdResult(rank);
    setQdState('result');
  };

  const qdReset = () => { setQdState('idle'); setQdResult(''); setQdTime(0); };

  /* ── stats leaderboard data ──────────────────────────────────────── */
  const tab = STAT_TABS.find(t => t.id === statsTab)!;
  const sortedStats = Object.entries(statsData)
    .map(([name, s]) => ({ name, val: (s[statsTab] as number) ?? 0 }))
    .sort((a, b) => b.val - a.val)
    .slice(0, 10);
  const maxVal = sortedStats[0]?.val ?? 1;

  const rankClass = (rank: number) =>
    rank === 1 ? 'is-1' : rank === 2 ? 'is-2' : rank === 3 ? 'is-3' : '';

  /* ── render ──────────────────────────────────────────────────────── */
  return (
    <div ref={wrapRef} className={`w${night ? ' is-night' : ''}`}>

      {/* TUMBLEWEED */}
      <div ref={tumbRef} className="w-tumbleweed"><TumbleWeedSVG /></div>

      {/* ══ NAV ══════════════════════════════════════════════════════ */}
      <header className="w-nav" data-no-shoot="">
        <div className="w-nav__inner">
          <a className="w-nav__brand" href="#hero">
            <div className="w-nav__brand-mark">JO<span className="eth">Ð</span></div>
            <div className="w-nav__brand-sub">★ FRONTIER OUTPOST ★</div>
          </a>

          <nav className="w-nav__links">
            {NAV_LINKS.map(l => (
              <a key={l.href} className="w-nav__link" href={l.href}>
                <span className="w-nav__link-no">{l.no}</span>{l.label}
              </a>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="w-nav__ip">
              <span className="w-nav__ip-dot" />
              play.jodcraft.world
            </div>
            <button
              className="w-nav__toggle"
              onClick={() => setTheme('matrix')}
              data-no-shoot=""
            >
              ⟵ MATRIX
            </button>
            <button
              className="w-nav__toggle"
              onClick={() => setNight(n => !n)}
              data-no-shoot=""
            >
              {night ? '☀ DAY' : '☾ NIGHT'}
            </button>
          </div>
        </div>
      </header>

      {/* ══ HERO — WANTED POSTER ════════════════════════════════════ */}
      <section id="hero" className="w-hero">
        <div className="w-hero__rays" aria-hidden="true" />

        <article className="w-hero__poster">
          <span className="w-hero__corner tl"><span className="w-hero__corner-star" /></span>
          <span className="w-hero__corner tr"><span className="w-hero__corner-star" /></span>
          <span className="w-hero__corner bl"><span className="w-hero__corner-star" /></span>
          <span className="w-hero__corner br"><span className="w-hero__corner-star" /></span>

          <div className="w-hero__inner">
            <div className="w-hero__top">
              <div className="w-hero__top-pre">★ EST. MMXXIV · NEW WORLD ★</div>
              <div className="w-hero__top-tag">
                <span className="star" />
                <span>Private Minecraft Server — Java Edition</span>
                <span className="star" />
              </div>
            </div>

            <h1 className="w-hero__mark">JO<span className="eth">Ð</span></h1>
            <p className="w-hero__sub">A <em>Private Survival</em> Outpost on the Frontier</p>

            <div className="w-hero__bounty">
              <span className="w-hero__bounty-rule" />
              <span className="w-hero__bounty-amt">— SADDLE&nbsp;UP&nbsp;— <small>OR HEAD ON HOME</small></span>
              <span className="w-hero__bounty-rule" />
            </div>

            <div className="w-hero__body">
              <div className="w-hero__photo">
                <div className="w-hero__photo-plate">PLATE I</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/screenshots/night-sky.png" alt="JOÐ at dusk" />
                <div className="w-hero__photo-cap">Night sky over the homestead</div>
              </div>

              <div className="w-hero__right">
                <div className="w-hero__quote">
                  Custom Datapacks &amp; a hand-rolled Resource Pack — built by the crew, for the crew.
                  A frontier carved out of vanilla Minecraft.
                  <span className="w-hero__quote-attr">— The JOÐ Wagonmaster, summer of &apos;24</span>
                </div>

                <button
                  className={`w-copybox${copied ? ' is-copied' : ''}`}
                  onClick={() => copyIP(false)}
                  data-no-shoot=""
                >
                  <span className="w-copybox__top">
                    <span>Server Address — Java</span>
                    <span>{copied ? '✓ COPIED' : '★ COPY ★'}</span>
                  </span>
                  <span className="w-copybox__ip">
                    <span className="w-copybox__ip-pre">$</span>
                    <span>play.jodcraft.world</span>
                  </span>
                  <span className="w-copybox__hint">Tip yer hat &amp; click to copy</span>
                </button>
              </div>
            </div>

            <div className="w-hero__stats">
              <div>
                <div className="w-hero__stats-k">Outlaws</div>
                <div className="w-hero__stats-v">
                  {online === null ? '—' : players.toString().padStart(2, '0')}
                  <span style={{ fontSize: '0.5em', color: 'var(--ink-soft)' }}>/{maxPlayers}</span>
                </div>
              </div>
              <div>
                <div className="w-hero__stats-k">Datapacks</div>
                <div className="w-hero__stats-v">{DATAPACKS.length}</div>
              </div>
              <div>
                <div className="w-hero__stats-k">Est.</div>
                <div className="w-hero__stats-v">2024</div>
              </div>
              <div>
                <div className="w-hero__stats-k">Edition</div>
                <div className="w-hero__stats-v" style={{ fontSize: 'clamp(18px,2.5vw,32px)' }}>JAVA</div>
              </div>
            </div>

            <div className="w-hero__foot">
              <span><span className="star" /> SCROLL DOWN THE TRAIL <span className="star" /></span>
              <span>VOL. II · CHAPTER I → VII</span>
              <span>WHITELIST REQUIRED <span className="star" /></span>
            </div>
          </div>
        </article>
      </section>

      {/* ══ BAND + TICKER ═══════════════════════════════════════════ */}
      <div className="w-band" />
      <div className="w-ticker" aria-hidden="true">
        {/* Top row — scrolls left */}
        <div className="w-ticker__row">
          <div className="w-ticker__track">
            {[...Array(4)].flatMap(() =>
              ['SURVIVAL','COMMUNITY','CUSTOM DATAPACKS','CUSTOM RESOURCE PACK','PLAY.JODCRAFT.WORLD','SINCE 2024'].map((item, i) => (
                <span key={`${item}-${i}`} className="w-ticker__item">
                  {item}<span className="w-ticker__sep" />
                </span>
              ))
            )}
          </div>
        </div>
        {/* Bottom row — scrolls right */}
        <div className="w-ticker__row w-ticker__row--alt">
          <div className="w-ticker__track">
            {[...Array(4)].flatMap(() =>
              ['PRIVATE SERVER','WHITELIST ONLY','JAVA EDITION','JOD · 2024','PLAY.JODCRAFT.WORLD','INVITE ONLY'].map((item, i) => (
                <span key={`${item}-${i}`} className="w-ticker__item">
                  {item}<span className="w-ticker__sep" />
                </span>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="w-band" />

      {/* ══ I — SERVER STATUS ═══════════════════════════════════════ */}
      <section id="server" className="w-section w-section--paper">
        <header className="w-section__head w-reveal">
          <div className="w-section__chapter">
            <span className="w-section__chapter-line" />
            <span>Chapter I · The Outpost</span>
            <span className="w-section__chapter-line" />
          </div>
          <h2 className="w-section__title">Server Status</h2>
          <p className="w-section__sub">A telegraph from the homestead — live ping refreshes every minute.</p>
        </header>
        <SectionDivider />

        <div className="w-server">
          {/* Status panel */}
          <div className="w-server__panel w-reveal">
            <div className="w-server__brand">★ Telegram from Joðville ★</div>
            <div className={`w-server__word${online === false ? ' offline' : ''}`}>
              {online === null ? 'CHECKING' : online ? 'ONLINE' : 'OFFLINE'}
            </div>
            <div className="w-server__telegraph">
              <span>UPLINK</span>
              <span className="w-server__telegraph-dots">
                <span /><span /><span className="dash" /><span />
              </span>
              <span>· EXAROTON · {online ? 'OK' : 'DOWN'}</span>
            </div>
            <div className="w-server__meta">
              <div>
                <div className="w-server__meta-k">Address</div>
                <div className="w-server__meta-v" style={{ fontSize: '18px', fontFamily: "'Special Elite',monospace" }}>
                  play.jodcraft.world
                </div>
              </div>
              <div>
                <div className="w-server__meta-k">Players</div>
                <div className="w-server__meta-v players">
                  {players} <small>/ {maxPlayers}</small>
                </div>
              </div>
              <div>
                <div className="w-server__meta-k">Edition</div>
                <div className="w-server__meta-v">Java</div>
              </div>
              <div>
                <div className="w-server__meta-k">Status</div>
                <div className="w-server__meta-v" style={{ color: online ? 'var(--cactus)' : 'var(--burnt)', fontSize: '18px' }}>
                  {online === null ? '...' : online ? 'RUNNING' : 'STOPPED'}
                </div>
              </div>
            </div>
          </div>

          {/* Crew roster */}
          <div className="w-roster w-reveal">
            <div className="w-roster__head">
              <div className="w-roster__title">The Crew</div>
              <div className="w-roster__count">★ {CREW.length} RIDERS · {onlineList.length} IN GAME ★</div>
            </div>
            <div className="w-crew-grid">
              {CREW.map(name => {
                const isOnline = onlineList.includes(name);
                return (
                  <Link key={name} href={`/crew/${name}`} className={`w-crew${isOnline ? '' : ' is-offline'}`}>
                    <div className="w-crew__frame">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="w-crew__avatar"
                        src={HEAD(name)}
                        alt={name}
                        width={50} height={50}
                        onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                      />
                      {isOnline && <span className="w-crew__star" />}
                    </div>
                    <div className="w-crew__name">{name}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ══ II — GALLERY ═════════════════════════════════════════════ */}
      <section id="gallery" className="w-section w-section--paper">
        <header className="w-section__head w-reveal">
          <div className="w-section__chapter">
            <span className="w-section__chapter-line" />
            <span>Chapter II · The Country</span>
            <span className="w-section__chapter-line" />
          </div>
          <h2 className="w-section__title">The World</h2>
          <p className="w-section__sub">Eleven photographic plates from the frontier — etched, fixed, and pasted in.</p>
        </header>
        <SectionDivider />

        <div className="w-gallery">
          <div className="w-gallery__grid">
            {GALLERY_PLATES.map((p, idx) => (
              <div key={idx} className={`w-plate size-${p.size} w-reveal`}>
                <div className="w-plate__photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.title} />
                  <div className="w-plate__no">
                    {idx === 0 ? `Plate 0${idx+1} / ${GALLERY_PLATES.length}` :
                     idx === GALLERY_PLATES.length - 1 ? `Plate ${idx+1} / ${GALLERY_PLATES.length}` :
                     `${idx+1} / ${GALLERY_PLATES.length}`}
                  </div>
                </div>
                <div className="w-plate__cap">
                  <div className="w-plate__title">{p.title}</div>
                  <div className="w-plate__sub">{p.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="w-gallery__foot">★ Screenshots from JOÐ — play.jodcraft.world ★</p>
        </div>
      </section>

      {/* ══ III — MAP ════════════════════════════════════════════════ */}
      <section id="map" className="w-section w-map">
        <header className="w-section__head w-reveal">
          <div className="w-section__chapter" style={{ color: 'var(--paper)' }}>
            <span className="w-section__chapter-line" />
            <span>Chapter III · The Territory</span>
            <span className="w-section__chapter-line" />
          </div>
          <h2 className="w-section__title">The Realm</h2>
          <p className="w-section__sub" style={{ color: 'var(--cream)' }}>
            A surveyor&apos;s chart of every claim and outpost — click a pin to explore.
          </p>
        </header>

        <WesternMap />
      </section>

      {/* ══ IV — DATAPACKS ═══════════════════════════════════════════ */}
      <section id="datapacks" className="w-section w-section--paper">
        <header className="w-section__head w-reveal">
          <div className="w-section__chapter">
            <span className="w-section__chapter-line" />
            <span>Chapter IV · The Arsenal</span>
            <span className="w-section__chapter-line" />
          </div>
          <h2 className="w-section__title">Datapacks</h2>
          <p className="w-section__sub">The bounty board of custom rules and frontier tech loaded on the server.</p>
        </header>
        <SectionDivider />

        <div className="w-packs-wrap">
          <div className="w-packs-status w-reveal">
            <span>
              <span className="w-packs-status__dot" style={{ background: 'var(--cactus)' }} />
              {DATAPACKS.length} PACKS ACTIVE
            </span>
            <span>·</span>
            <span>MINECRAFT 1.21</span>
            <span>·</span>
            <span>JAVA EDITION</span>
          </div>

          <div className="w-packs">
            {DATAPACKS.map((dp, idx) => (
              <div key={dp.id} className="w-pack w-reveal">
                <div className="w-pack__brand" aria-hidden="true" />
                <div className="w-pack__top">
                  <span className="w-pack__cat" data-cat={dp.category}>{dp.category}</span>
                  <span className="w-pack__id">#{String(idx + 1).padStart(2, '0')}</span>
                </div>
                <div className="w-pack__name">{dp.name}</div>
                <div className="w-pack__desc">{dp.description}</div>
                <div className="w-pack__bot">
                  <span className="w-pack__ver">{dp.currentVersion ? `v${dp.currentVersion}` : '—'}</span>
                  <span className="w-pack__status ok">ACTIVE</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ V — QUICK DRAW ═══════════════════════════════════════════ */}
      <section id="quickdraw" className="w-section w-section--ink">
        <header className="w-section__head w-reveal">
          <div className="w-section__chapter">
            <span className="w-section__chapter-line" />
            <span>Chapter V · The Showdown</span>
            <span className="w-section__chapter-line" />
          </div>
          <h2 className="w-section__title">Quick Draw</h2>
          <p className="w-section__sub" style={{ color: 'var(--cream)' }}>
            A test of nerve &amp; trigger finger — wait for the star, then fire.
          </p>
        </header>

        <div className="w-quickdraw">
          <div className="w-quickdraw__stage">
            <div className="w-quickdraw__pre">FRONTIER REFLEXES — TEST YOUR DRAW</div>
            <h3 className="w-quickdraw__hd">Quick Draw</h3>
            <p className="w-quickdraw__rule">
              {qdState === 'idle'      && 'Press the button below. Wait for the ★ target. Draw fast.'}
              {qdState === 'countdown' && 'Hold steady, outlaw... wait for it...'}
              {qdState === 'draw'      && 'DRAW NOW !!!'}
              {qdState === 'result'    && qdResult}
            </p>

            {/* Arena */}
            <div className="w-quickdraw__arena" onClick={qdFire} data-no-shoot="" style={{ cursor: qdState === 'draw' ? 'crosshair' : 'default' }}>
              <div className="w-quickdraw__horizon" />
              <div className="w-quickdraw__sun" />

              {/* Cactuses */}
              <div className="w-quickdraw__cactus c1"><CactusSVG /></div>
              <div className="w-quickdraw__cactus c2"><CactusSVG /></div>
              <div className="w-quickdraw__cactus c3"><CactusSVG /></div>
              <div className="w-quickdraw__cactus c4"><CactusSVG /></div>

              {/* Target star */}
              <div
                className={`w-quickdraw__target${qdState === 'draw' ? ' is-up' : ''}`}
                onClick={e => { e.stopPropagation(); qdFire(); }}
              />

              {/* Overlay text for countdown */}
              {qdState === 'countdown' && (
                <div className="w-quickdraw__overlay">...</div>
              )}

              {/* State badge */}
              <div className="w-quickdraw__overlay--state">
                {qdState === 'idle'      && 'HOLSTER'}
                {qdState === 'countdown' && 'WAITING'}
                {qdState === 'draw'      && '★ DRAW ★'}
                {qdState === 'result'    && `${qdTime}ms`}
              </div>

              {qdBest !== null && (
                <div className="w-quickdraw__overlay--best">BEST: {qdBest}ms</div>
              )}
            </div>

            {/* Button */}
            {qdState === 'idle' && (
              <button className="w-quickdraw__btn" onClick={qdBegin} data-no-shoot="">
                ★ DRAW ★
              </button>
            )}
            {qdState === 'countdown' && (
              <button className="w-quickdraw__btn" onClick={qdFire} data-no-shoot="" style={{ background: 'var(--ink-soft)' }}>
                FIRE (too soon = foul)
              </button>
            )}
            {qdState === 'draw' && (
              <button className="w-quickdraw__btn" onClick={qdFire} data-no-shoot="" style={{ background: 'var(--cactus)', animation: 'none' }}>
                ★ FIRE ★
              </button>
            )}
            {qdState === 'result' && (
              <button className="w-quickdraw__btn" onClick={qdReset} data-no-shoot="">
                DRAW AGAIN
              </button>
            )}

            {/* Readout */}
            <div className="w-quickdraw__readout">
              <div>
                <div className="w-quickdraw__readout-k">Last Draw</div>
                <div className="w-quickdraw__readout-v">{qdTime > 0 ? `${qdTime}ms` : '—'}</div>
              </div>
              <div>
                <div className="w-quickdraw__readout-k">Best</div>
                <div className="w-quickdraw__readout-v">{qdBest !== null ? `${qdBest}ms` : '—'}</div>
              </div>
              <div>
                <div className="w-quickdraw__readout-k">Rank</div>
                <div className={`w-quickdraw__readout-v ${
                  qdResult.includes('SHERIFF') ? 'rank-sheriff' :
                  qdResult.includes('WAGON')   ? 'rank-wagon'   :
                  qdResult.includes('OUTLAW')  ? 'rank-outlaw'  :
                  qdResult.includes('GREEN')   ? 'rank-greenhorn' : ''
                }`}>
                  {qdResult.includes('SHERIFF') ? 'SHERIFF' :
                   qdResult.includes('WAGON')   ? 'WAGON MASTER' :
                   qdResult.includes('OUTLAW')  ? 'OUTLAW' :
                   qdResult.includes('GREEN')   ? 'GREENHORN' : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="w-band w-band--ink" />

      {/* ══ VI — STATS / LEADERBOARD ══════════════════════════════════ */}
      <section id="stats" className="w-section w-section--paper">
        <header className="w-section__head w-reveal">
          <div className="w-section__chapter">
            <span className="w-section__chapter-line" />
            <span>Chapter VI · The Tallies</span>
            <span className="w-section__chapter-line" />
          </div>
          <h2 className="w-section__title">The Crew</h2>
          <p className="w-section__sub">Who rode hardest? The frontier scoreboard — refreshed every day.</p>
        </header>
        <SectionDivider />

        <div className="w-stats-wrap" ref={statsRef}>
          {/* Tabs */}
          <div className="w-stats__tabs">
            {STAT_TABS.map(t => (
              <button
                key={t.id}
                className={`w-stats__tab${statsTab === t.id ? ' is-active' : ''}`}
                onClick={() => setStatsTab(t.id)}
                data-no-shoot=""
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Board */}
          <div className="w-stats__board">
            {sortedStats.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', fontFamily: "'IM Fell English',serif", fontStyle: 'italic', color: 'var(--ink-soft)' }}>
                No tallies yet, partner.
              </div>
            ) : (
              sortedStats.map(({ name, val }, idx) => (
                <div key={name} className={`w-row ${rankClass(idx + 1)}`}>
                  <div className="w-row__rank">{idx + 1}</div>
                  <div className="w-row__name">{name}</div>
                  <div className="w-row__bar">
                    <div
                      className="w-row__barfill"
                      data-fill={maxVal > 0 ? val / maxVal : 0}
                      style={{ transform: 'scaleX(0)' }}
                    />
                  </div>
                  <div className="w-row__val">{tab.format(val)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ══ VII — JOIN ═══════════════════════════════════════════════ */}
      <section
        id="join"
        className="w-join w-section"
        ref={joinRef as React.RefObject<HTMLElement>}
      >
        {/* Glowing sun */}
        <div className="w-join__sun" aria-hidden="true" />

        {/* Saloon doors */}
        <div className="w-join__doors" aria-hidden="true">
          <div className="w-join__door left" />
          <div className="w-join__door right" />
        </div>

        {/* Sheriff star stamps */}
        <div className="w-join__stamp s1">WHITELIST REQUIRED</div>
        <div className="w-join__stamp s2">JAVA ONLY</div>

        <div className="w-join__inner">
          <div className="w-join__chapter">SADDLE UP</div>
          <h2 className="w-join__title">Ride In</h2>

          <button
            className={`w-join__ip${copiedJoin ? ' is-copied' : ''}`}
            onClick={() => copyIP(true)}
            data-no-shoot=""
          >
            {copiedJoin ? '★ COPIED ★' : 'play.jodcraft.world'}
          </button>

          <div className="w-join__sub">Click the address above to copy</div>

          <div className="w-join__cta" onClick={() => copyIP(true)} style={{ cursor: 'pointer' }} data-no-shoot="">
            ★ COPY SERVER ADDRESS ★
          </div>

          <div className="w-join__note">
            <span className="star" />
            <span>Java Edition · Whitelisted · Invite Only</span>
            <span className="star" />
          </div>
        </div>
      </section>

      <div className="w-band" />

      {/* ══ FOOTER ════════════════════════════════════════════════════ */}
      <footer className="w-foot">
        <div className="w-foot__mark">JO<span className="eth">Ð</span></div>
        <nav className="w-foot__nav">
          {NAV_LINKS.map(l => (
            <a key={l.href} href={l.href}>{l.label.replace(' ', ' ')}</a>
          ))}
        </nav>
        <div className="w-foot__att">
          PRIVATE · SINCE 2024<br />
          play.jodcraft.world
        </div>
      </footer>

    </div>
  );
}
