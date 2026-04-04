'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_LINKS = [
  { label: 'SERVER',    href: '/#hero'      },
  { label: 'GALLERY',   href: '/#gallery'   },
  { label: 'MAP',       href: '/#map'       },
  { label: 'DATAPACKS', href: '/#datapacks' },
  { label: 'RP EDITOR', href: '/rp-editor'  },
];

export default function NavHeader() {
  const pathname   = usePathname();
  const [scrolled, setScrolled]     = useState(false);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [activeId, setActiveId]     = useState('');

  // Track scroll for background opacity
  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 32); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Track active section via IntersectionObserver (home page only)
  useEffect(() => {
    if (pathname !== '/') return;
    const sections = ['hero', 'gallery', 'map', 'datapacks'];
    const observers: IntersectionObserver[] = [];

    sections.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveId(id); },
        { threshold: 0.3 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, [pathname]);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Close menu on outside click
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  function isActive(href: string) {
    if (href.startsWith('/#')) return pathname === '/' && activeId === href.slice(2);
    return pathname === href || pathname.startsWith(href + '/');
  }

  const mono = "'JetBrains Mono', monospace";
  const sans = "'Space Grotesk', sans-serif";
  const green = '#00ff41';

  return (
    <>
      {/* Overlay for mobile menu */}
      {menuOpen && (
        <div
          onClick={closeMenu}
          style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(0,0,0,0.6)' }}
        />
      )}

      <header
        style={{
          position:         'fixed',
          top:              0,
          left:             0,
          right:            0,
          height:           '48px',
          zIndex:           999,
          display:          'flex',
          alignItems:       'center',
          padding:          '0 clamp(1rem, 4vw, 2rem)',
          gap:              '1.5rem',
          background:       scrolled || menuOpen
            ? 'rgba(8,8,8,0.96)'
            : 'rgba(8,8,8,0.0)',
          backdropFilter:   scrolled ? 'blur(12px)' : 'none',
          borderBottom:     scrolled ? '1px solid #1a1a1a' : '1px solid transparent',
          transition:       'background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease',
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: sans, fontSize: '1.1rem', fontWeight: 900, color: green, letterSpacing: '-0.03em' }}>
            JOD
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav
          style={{
            display:    'flex',
            gap:        '0.1rem',
            alignItems: 'center',
            flex:       1,
          }}
          className="nav-desktop"
        >
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontFamily:    mono,
                fontSize:      '0.52rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color:         isActive(link.href) ? green : '#444',
                textDecoration: 'none',
                padding:       '0.3rem 0.6rem',
                borderBottom:  `1px solid ${isActive(link.href) ? green : 'transparent'}`,
                transition:    'color 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ccc')}
              onMouseLeave={e => (e.currentTarget.style.color = isActive(link.href) ? green : '#444')}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Server IP — desktop only */}
        <span
          style={{
            fontFamily:    mono,
            fontSize:      '0.5rem',
            letterSpacing: '0.15em',
            color:         '#2a2a2a',
            display:       'none',
          }}
          className="nav-ip"
        >
          play.jodcraft.world
        </span>

        {/* Hamburger — mobile only */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Toggle menu"
          className="nav-hamburger"
          style={{
            marginLeft:  'auto',
            background:  'none',
            border:      'none',
            cursor:      'pointer',
            display:     'none',
            flexDirection: 'column',
            gap:         '5px',
            padding:     '4px',
          }}
        >
          {[0, 1, 2].map(i => (
            <span
              key={i}
              style={{
                display:       'block',
                width:         '20px',
                height:        '1px',
                background:    menuOpen ? green : '#666',
                transformOrigin: 'center',
                transform:     menuOpen
                  ? i === 0 ? 'translateY(6px) rotate(45deg)'
                  : i === 1 ? 'scaleX(0)'
                  : 'translateY(-6px) rotate(-45deg)'
                  : 'none',
                transition:    'transform 0.25s ease, background 0.2s',
              }}
            />
          ))}
        </button>
      </header>

      {/* Mobile slide-down menu */}
      <div
        style={{
          position:    'fixed',
          top:         '48px',
          left:        0,
          right:       0,
          zIndex:      997,
          background:  'rgba(8,8,8,0.98)',
          borderBottom: '1px solid #1a1a1a',
          transform:   menuOpen ? 'translateY(0)' : 'translateY(-100%)',
          opacity:     menuOpen ? 1 : 0,
          transition:  'transform 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease',
          pointerEvents: menuOpen ? 'auto' : 'none',
          padding:     '1rem 0',
        }}
        className="nav-mobile-menu"
      >
        {NAV_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMenuOpen(false)}
            style={{
              display:       'block',
              fontFamily:    mono,
              fontSize:      '0.7rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color:         isActive(link.href) ? green : '#555',
              textDecoration: 'none',
              padding:       '0.7rem clamp(1rem, 4vw, 2rem)',
              borderLeft:    `2px solid ${isActive(link.href) ? green : 'transparent'}`,
              transition:    'color 0.2s, border-color 0.2s',
            }}
          >
            {link.label}
          </Link>
        ))}
        <div style={{ height: '0.5rem' }} />
      </div>

      {/* Responsive CSS — in a style tag */}
      <style>{`
        @media (min-width: 640px) {
          .nav-desktop { display: flex !important; }
          .nav-ip      { display: block !important; }
          .nav-hamburger { display: none !important; }
          .nav-mobile-menu { display: none !important; }
        }
        @media (max-width: 639px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  );
}
