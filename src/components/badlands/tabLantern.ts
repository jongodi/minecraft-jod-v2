'use client';

import { useEffect } from 'react';
import { CREW } from './data';
import type { ServerState } from './hooks';

/* The tab's lantern. On a play night the site waits in a background tab
   while the others come in; the tab says what the hero's lantern says, so
   nobody has to switch to it to see. While the server is on, the tab's icon
   is a lit lantern, and the title carries how many of the crew are in:
   "(3) JOÐcraft". When the server is off the icon is JOÐ's own mark again,
   since off is how the tab spends most of its life and the mark is the
   site's name. Safari keeps the icon it first read, so there only the count
   shows.

   The status hook (hooks.ts) asks every few minutes while the tab is in the
   background, so the lantern lights without the tab being looked at. */

/* 16 units, two screen pixels each at 32 px: a lantern on a notched plate of
   night, so it reads on a light tab strip and a dark one. The frame in the
   strata's white, the glass in the lantern's amber, the flame in the sun's. */
const LIT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
<path fill="#15100D" d="M1 0h14v1h1v14h-1v1H1v-1H0V1h1z"/>
<path fill="#D1B2A1" d="M7 1h2v1h1v1h2v2h-1v6h1v3H4v-3h1V5H4V3h2V2h1zM7 2v1h2V2z"/>
<path fill="#F2A63B" d="M6 5h4v6H6z"/>
<path fill="#F4D394" d="M7 7h2v3H7z"/>
</svg>`;
const LIT = `data:image/svg+xml,${encodeURIComponent(LIT_SVG)}`;
const COUNT = /^\(\d+\) /;

function icons(): HTMLLinkElement[] {
  return Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
}

/** The mark back on every icon, and the count off the title. */
function putOut(): void {
  if (COUNT.test(document.title)) document.title = document.title.replace(COUNT, '');
  for (const link of icons()) {
    if (link.dataset.unlit === undefined) continue;
    link.href = link.dataset.unlit;
    if (link.dataset.unlitType) link.type = link.dataset.unlitType; else link.removeAttribute('type');
    delete link.dataset.unlit;
    delete link.dataset.unlitType;
  }
}

export function useTabLantern({ online, list }: ServerState): void {
  const lit = online === true;
  const count = lit ? CREW.filter(n => list.some(p => p.toLowerCase() === n.toLowerCase())).length : 0;

  useEffect(() => {
    const apply = () => {
      const bare = document.title.replace(COUNT, '');
      const title = count > 0 ? `(${count}) ${bare}` : bare;
      if (document.title !== title) document.title = title;
      for (const link of icons()) {
        if (!lit) continue;
        if (link.dataset.unlit === undefined) {
          link.dataset.unlit = link.getAttribute('href') ?? '';
          link.dataset.unlitType = link.getAttribute('type') ?? '';
        }
        if (link.getAttribute('href') !== LIT) { link.href = LIT; link.type = 'image/svg+xml'; }
      }
      if (!lit && icons().some(l => l.dataset.unlit !== undefined)) putOut();
    };
    apply();
    /* A page change writes its own title (and may write the icons again):
       the count goes back on. Only the head's text and its children are
       watched, so the icons' own addresses changing here do not wake it. */
    const watch = new MutationObserver(apply);
    watch.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => watch.disconnect();
  }, [lit, count]);

  /* a page without the bar (the admin tool) gets the mark and its own title back */
  useEffect(() => putOut, []);
}
