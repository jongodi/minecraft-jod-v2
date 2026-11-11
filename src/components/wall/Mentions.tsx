import { Fragment } from 'react';
import Link from 'next/link';
import { sameUser, splitMentions } from '@/lib/crew-types';
import { splitLinks } from '@/lib/note-links';

/** A plain run of a note with every address in it drawn as a link
    (src/lib/note-links.ts): shown without its scheme and cut short, so a
    long one does not fill the sign, and leading where it was written to. The
    site's own pages open here; any other opens in a tab of its own, told
    nothing about where it was linked from. */
function Linked({ text }: { text: string }) {
  const parts = splitLinks(text);
  if (parts.length === 1 && typeof parts[0] === 'string') return <>{text}</>;
  return (
    <>
      {parts.map((p, i) => typeof p === 'string' ? <Fragment key={i}>{p}</Fragment>
        : p.own !== null ? <Link key={i} href={p.own || '/'} className="w-link" title={p.href}>{p.label}</Link>
        : <a key={i} href={p.href} className="w-link" title={p.href} target="_blank" rel="noopener noreferrer nofollow ugc">{p.label}</a>)}
    </>
  );
}

/** A note's words with every @member drawn as a link to their wall; the one
    looking, when it is them, in the lantern's light, so a call by name is
    seen at a glance. Addresses in it are links too (Linked). */
export default function Mentions({ text, me }: { text: string; me: string | null | undefined }) {
  const parts = splitMentions(text);
  return (
    <>
      {parts.map((p, i) => typeof p === 'string' ? <Linked key={i} text={p} /> : (
        <Link key={i} href={`/crew/${p.name}`} className={`w-mention${sameUser(p.name, me) ? ' is-me' : ''}`}>{p.raw}</Link>
      ))}
    </>
  );
}
