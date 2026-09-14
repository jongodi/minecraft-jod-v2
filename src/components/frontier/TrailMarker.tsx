'use client';

import type { NavLink } from './data';

/** Desktop-only wayfinding down the left edge: one tick per section,
    the current one filled in. */
export default function TrailMarker({ links, activeId }: { links: NavLink[]; activeId: string | null }) {
  return (
    <nav className="f-trail" aria-label="Page sections">
      {links.filter(l => l.id).map(l => (
        <a key={l.id} href={l.href} className={`f-trail__tick${activeId === l.id ? ' is-active' : ''}`}>
          <span className="f-label">{l.label}</span>
        </a>
      ))}
    </nav>
  );
}
