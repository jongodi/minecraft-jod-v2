import Link from 'next/link';
import { sameUser, splitMentions } from '@/lib/crew-types';

/** A note's words with every @member drawn as a link to their wall; the one
    looking, when it is them, in the lantern's light, so a call by name is
    seen at a glance. */
export default function Mentions({ text, me }: { text: string; me: string | null | undefined }) {
  const parts = splitMentions(text);
  if (parts.length === 1 && typeof parts[0] === 'string') return <>{text}</>;
  return (
    <>
      {parts.map((p, i) => typeof p === 'string' ? p : (
        <Link key={i} href={`/crew/${p.name}`} className={`w-mention${sameUser(p.name, me) ? ' is-me' : ''}`}>{p.raw}</Link>
      ))}
    </>
  );
}
