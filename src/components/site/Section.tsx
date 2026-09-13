interface SectionProps {
  id: string;
  /** The question this section answers, as a friend would ask it. */
  question: string;
  title: string;
  /** One true number for the margin: how many packs, pictures, players. */
  figure?: { value: string; unit: string };
  /** One line, fifteen words at most. Most sections do not need it. */
  line?: string;
  /** Let the content run edge to edge (gallery, map). */
  bleed?: boolean;
  children: React.ReactNode;
}

/**
 * The margin spine. A hairline runs the full width with the question on it,
 * then on desktop the heading and its one big number stand alone in the
 * left five columns while the content takes the other seven. On phones it
 * stacks, and the number sits beside the heading.
 */
export function Section({ id, question, title, figure, line, bleed = false, children }: SectionProps) {
  return (
    <section id={id} className="mx-auto max-w-site scroll-mt-6 pt-16 md:pt-24">
      <div className="mx-gutter border-t border-line pt-3">
        <p className="font-label text-label uppercase text-muted">{question}</p>
      </div>
      <div className="grid gap-x-6 gap-y-8 px-gutter pt-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-5">
          <h2 className="font-display text-h2 uppercase">{title}</h2>
          {figure && (
            <p className="mt-6 flex items-baseline gap-3 lg:mt-10 lg:block">
              <span className="num font-display text-state leading-none">{figure.value}</span>
              <span className="font-label text-label uppercase text-muted lg:mt-2 lg:block">{figure.unit}</span>
            </p>
          )}
          {line && <p className="mt-4 max-w-xs text-body text-muted">{line}</p>}
        </div>
        {!bleed && <div className="min-w-0 lg:col-span-7">{children}</div>}
      </div>
      {bleed && <div className="mt-8">{children}</div>}
    </section>
  );
}
