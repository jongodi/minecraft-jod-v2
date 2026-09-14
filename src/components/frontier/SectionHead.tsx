import { Divider } from './Ornaments';

interface Props { kicker: string; title: string; lede?: string }

export default function SectionHead({ kicker, title, lede }: Props) {
  return (
    <header className="f-head">
      <p className="f-head__kicker">{kicker}</p>
      <h2 className="f-head__title">{title}</h2>
      <Divider className="f-head__orn" />
      {lede && <p className="f-head__lede">{lede}</p>}
    </header>
  );
}
