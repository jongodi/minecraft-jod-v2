'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_LINKS = [
  { label: 'SERVER',    href: '/#server'    },
  { label: 'GALLERY',   href: '/#gallery'   },
  { label: 'MAP',       href: '/#map'       },
  { label: 'DATAPACKS', href: '/#datapacks' },
  { label: 'CREW',      href: '/crew'       },
  { label: 'RP EDITOR', href: '/rp-editor'  },
];

export default function NavHeader() {
  const pathname             = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState('');

  const hidden = pathname.startsWith('/rp-editor') || pathname.startsWith('/admin');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (pathname !== '/') return;
    const sections = ['hero', 'server', 'gallery', 'map', 'datapacks', 'stats'];
    const observers: IntersectionObserver[] = [];
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveId(id); },
        { threshold: 0.25 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [pathname]);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  function isActive(href: string) {
    if (href === '/crew') return pathname === '/crew' || pathname.startsWith('/crew/');
    if (href.startsWith('/#')) return pathname === '/' && activeId === href.slice(2);
    return pathname === href || pathname.startsWith(href + '/');
  }

  if (hidden) return null;

  return (
    <>
      {menuOpen && (
        <div
          onClick={closeMenu}
          style={{
            position:   'fixed',
            inset:      0,
            zIndex:     998,
            background: 'rgba(6,8,12,0.7)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      <header
        style={{
          position:       'fixed',
          top:            0,
          left:           0,
          right:          0,
          height:         '52px',
          zIndex:         999,
          display:        'flex',
          alignItems:     'center',
          padding:        '0 clamp(1rem, 4vw, 2rem)',
          gap:            '2rem',
          background:     scrolled || menuOpen ? 'rgba(6,8,12,0.96)' : 'rgba(6,8,12,0)',
          backdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
          borderBottom:   scrolled ? '1px solid #1c2030' : '1px solid transparent',
          transition:     'background 0.4s ease, backdrop-filter 0.4s ease, border-color 0.4s ease',
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <span
            style={{
              fontFamily:    "'Space Grotesk', sans-serif",
              fontSize:      '1.05rem',
              fontWeight:    900,
              color:         '#00ff41',
              letterSpacing: '-0.04em',
              lineHeight:    1,
            }}
          >
            JOD
          </span>
        </Link>

        {/* Desktop nav */}
        <nav
          className="nav-desktop"
          style={{ display: 'flex', gap: '0', alignItems: 'center', flex: 1 }}
        >
          {NAV_LINKS.map(link => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontFamily:     "'JetBrains Mono', monospace",
                  fontSize:       '0.5rem',
                  letterSpacing:  '0.22em',
                  textTransform:  'uppercase',
                  color:          active ? '#00ff41' : '#505770',
                  textDecoration: 'none',
                  padding:        '0.35rem 0.65rem',
                  borderBottom:   `1px solid ${active ? '#00ff41' : 'transparent'}`,
                  transition:     'color 0.2s ease, border-color 0.2s ease',
                }}
                onMouseEnter={e => {
                  if (!active) e.currentTarget.style.color = '#dde1ec';
                }}
                onMouseLeave={e => {
                  if (!active) e.currentTarget.style.color = '#505770';
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Server IP — desktop only */}
        <span
          className="nav-ip"
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.45rem',
            letterSpacing: '0.14em',
            color:         '#1e2230',
            display:       'none',
            flexShrink:    0,
          }}
        >
          play.jodcraft.world
        </span>

        {/* Hamburger — mobile only */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Toggle navigation menu"
          className="nav-hamburger"
          style={{
            marginLeft:     'auto',
            background:     'none',
            border:         'none',
            display:        'none',
            flexDirection:  'column',
            gap:            '5px',
            padding:        '6px',
          }}
        >
          {[0, 1, 2].map(i => (
            <span
              key={i}
              style={{
                display:         'block',
                width:           '20px',
                height:          '1px',
                background:      menuOpen ? '#00ff41' : '#505770',
                transformOrigin: 'center',
                transform:       menuOpen
                  ? i === 0 ? 'translateY(6px) rotate(45deg)'
                  : i === 1 ? 'scaleX(0)'
                  : 'translateY(-6px) rotate(-45deg)'
                  : 'none',
                transition:      'transform 0.25s ease, background 0.2s',
              }}
            />
          ))}
        </button>
      </header>

      {/* Mobile menu */}
      <div
        className="nav-mobile-menu"
        style={{
          position:      'fixed',
          top:           '52px',
          left:          0,
          right:         0,
          zIndex:        997,
          background:    'rgba(6,8,12,0.98)',
          borderBottom:  '1px solid #1c2030',
          transform:     menuOpen ? 'translateY(0)' : 'translateY(-8px)',
          opacity:       menuOpen ? 1 : 0,
          transition:    'transform 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease',
          pointerEvents: menuOpen ? 'auto' : 'none',
          padding:       '0.75rem 0 1.25rem',
        }}
      >
        {NAV_LINKS.map(link => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                display:        'block',
                fontFamily:     "'JetBrains Mono', monospace",
                fontSize:       '0.65rem',
                letterSpacing:  '0.25em',
                textTransform:  'uppercase',
                color:          active ? '#00ff41' : '#505770',
                textDecoration: 'none',
                padding:        '0.65rem clamp(1rem, 4vw, 2rem)',
                borderLeft:     `2px solid ${active ? '#00ff41' : 'transparent'}`,
                transition:     'color 0.2s, border-color 0.2s',
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      <style>{`
        @media (min-width: 640px) {
          .nav-desktop   { display: flex !important; }
          .nav-ip        { display: block !important; }
          .nav-hamburger { display: none !important; }
          .nav-mobile-menu { display: none !important; }
        }
        @media (max-width: 639px) {
          .nav-desktop   { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  );
}
