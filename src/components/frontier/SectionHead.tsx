interface Props { kicker: string; title: string; lede?: string; children?: React.ReactNode }

/** Left-column heading for a section; sticks on desktop while the
    right column scrolls. Extra content (a status line, a legend)
    can be passed as children. */
export default function SectionHead({ kicker, title, lede, children }: Props) {
  return (
    <header className="f-cols__aside">
      <p className="f-head__kicker">{kicker}</p>
      <h2 className="f-head__title">{title}</h2>
      {lede && <p className="f-head__lede">{lede}</p>}
      {children}
    </header>
  );
}
