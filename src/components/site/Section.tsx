interface SectionProps {
  id: string;
  title: string;
  /** One line, fifteen words at most. Most sections do not need it. */
  line?: string;
  /** Let the content run edge to edge (gallery, map). */
  bleed?: boolean;
  children: React.ReactNode;
}

/**
 * The margin spine: on desktop the heading stands alone in the left five
 * columns and the content takes the other seven. On phones it stacks.
 */
export function Section({ id, title, line, bleed = false, children }: SectionProps) {
  return (
    <section id={id} className="mx-auto max-w-site scroll-mt-6 pt-16 md:pt-24">
      <div className="grid min-w-0 gap-x-6 gap-y-8 px-gutter lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 className="font-display text-h2 uppercase">{title}</h2>
          {line && <p className="mt-4 max-w-xs text-body text-muted">{line}</p>}
        </div>
        {!bleed && <div className="min-w-0 lg:col-span-7">{children}</div>}
      </div>
      {bleed && <div className="mt-8">{children}</div>}
    </section>
  );
}
