'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import ThemeSwitcher from '@/components/ThemeSwitcher';

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
            zIndex:     996,
            background: 'rgba(var(--bg-rgb), 0.5)',
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
          gap:            '1.5rem',
          background:     scrolled || menuOpen ? 'rgba(var(--bg-rgb), 0.96)' : 'rgba(var(--bg-rgb), 0)',
          backdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
          borderBottom:   scrolled ? '1px solid var(--border)' : '1px solid transparent',
          transition:     'background 0.4s ease, backdrop-filter 0.4s ease, border-color 0.4s ease',
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <span
            style={{
              fontFamily:    'var(--font-display)',
              fontSize:      '1.05rem',
              fontWeight:    900,
              color:         'var(--accent)',
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
                  fontFamily:     'var(--font-mono)',
                  fontSize:       '0.5rem',
                  letterSpacing:  '0.22em',
                  textTransform:  'uppercase',
                  color:          active ? 'var(--accent)' : 'var(--muted)',
                  textDecoration: 'none',
                  padding:        '0.35rem 0.65rem',
                  borderBottom:   `1px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  transition:     'color 0.2s ease, border-color 0.2s ease',
                }}
                onMouseEnter={e => {
                  if (!active) e.currentTarget.style.color = 'var(--text)';
                }}
                onMouseLeave={e => {
                  if (!active) e.currentTarget.style.color = 'var(--muted)';
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Theme switcher — desktop */}
        <div className="nav-theme-switcher">
          <ThemeSwitcher />
        </div>

        {/* Server IP — desktop only */}
        <span
          className="nav-ip"
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '0.45rem',
            letterSpacing: '0.14em',
            color:         'var(--faint)',
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
                background:      menuOpen ? 'var(--accent)' : 'var(--muted)',
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
          background:    'var(--bg)',
          borderBottom:  '1px solid var(--border)',
          transform:     menuOpen ? 'translateY(0)' : 'translateY(-12px)',
          opacity:       menuOpen ? 1 : 0,
          transition:    'transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease',
          pointerEvents: menuOpen ? 'auto' : 'none',
          padding:       '0.5rem 0 1rem',
        }}
      >
        {NAV_LINKS.map((link, i) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                display:        'flex',
                alignItems:     'center',
                gap:            '1rem',
                fontFamily:     'var(--font-display)',
                fontSize:       '1.05rem',
                fontWeight:     700,
                letterSpacing:  '-0.01em',
                textTransform:  'uppercase',
                color:          active ? 'var(--accent)' : 'var(--text)',
                textDecoration: 'none',
                padding:        '0.7rem clamp(1.25rem, 5vw, 2rem)',
                borderLeft:     `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                transition:     'color 0.2s, border-color 0.2s',
              }}
            >
              <span style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.5rem',
                letterSpacing: '0.1em',
                color:         active ? 'var(--accent)' : 'var(--border-strong)',
                fontWeight:    400,
                minWidth:      '1.4rem',
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              {link.label}
            </Link>
          );
        })}

        {/* Theme switcher in mobile menu */}
        <div style={{
          margin:     '0.75rem clamp(1.25rem, 5vw, 2rem) 0',
          paddingTop: '0.75rem',
          borderTop:  '1px solid var(--border)',
        }}>
          <ThemeSwitcher />
        </div>

        {/* Server IP at bottom */}
        <div style={{
          margin:        '0.5rem clamp(1.25rem, 5vw, 2rem) 0',
          paddingTop:    '0.75rem',
          borderTop:     '1px solid var(--border)',
          fontFamily:    'var(--font-mono)',
          fontSize:      '0.5rem',
          letterSpacing: '0.18em',
          color:         'var(--border-strong)',
          textTransform: 'uppercase',
        }}>
          play.jodcraft.world
        </div>
      </div>

      <style>{`
        @media (min-width: 640px) {
          .nav-desktop        { display: flex !important; }
          .nav-ip             { display: block !important; }
          .nav-hamburger      { display: none !important; }
          .nav-mobile-menu    { display: none !important; }
          .nav-theme-switcher { display: flex !important; }
        }
        @media (max-width: 639px) {
          .nav-desktop        { display: none !important; }
          .nav-hamburger      { display: flex !important; }
          .nav-theme-switcher { display: none !important; }
        }
      `}</style>
    </>
  );
}
