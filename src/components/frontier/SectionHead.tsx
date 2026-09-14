interface Props { no: string; kicker: string; title: string; lede?: string }

export default function SectionHead({ no, kicker, title, lede }: Props) {
  return (
    <header className="f-head f-reveal">
      <p className="f-head__kicker f-label">{no} · {kicker}</p>
      <h2 className="f-head__title">{title}</h2>
      {lede && <p className="f-head__lede">{lede}</p>}
    </header>
  );
}
