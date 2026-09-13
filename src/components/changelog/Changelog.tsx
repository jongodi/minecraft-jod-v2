import { CHANGELOG } from '@/data/changelog';
import { Section } from '@/components/site/Section';

const fmt = new Intl.DateTimeFormat('is-IS', { day: 'numeric', month: 'short', year: 'numeric' });

/** Newest first, one line each. Renders nothing while the list is empty. */
export function Changelog() {
  if (CHANGELOG.length === 0) return null;
  const sorted = [...CHANGELOG].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <Section id="breytingar" question="Hvað breyttist nýlega?" title="Breytingar">
      <ol>
        {sorted.map((c) => (
          <li key={`${c.date}-${c.line}`} className="grid grid-cols-[6rem_1fr] gap-4 border-t border-line py-3">
            <time dateTime={c.date} className="num font-label text-label uppercase text-muted">
              {fmt.format(new Date(c.date))}
            </time>
            <p className="text-body">{c.line}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
