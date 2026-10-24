import type { NightSummary } from '@/lib/night-numbers';
import { formatNumber } from '@/lib/format';
import { AdvancementFrame } from '@/components/wall/Advancements';

/* Kvöldið í tölum: what the game counted of a play night
   (src/lib/night-numbers.ts), on a slip of paper torn off by the fire, under
   who came. The totals as a poster lists its rewards, each on one line, a
   run of dots, the number; then the night's own outlaws, under their alias
   in red as on the walls; then the advancements given that evening, each in
   the game's frame, with who was given it. On the embers the morning after,
   and in the annals once they have burnt out. */

const km = (cm: number) => `${formatNumber(cm / 100000, { max: 1, min: 1 })} km`;
const hours = (h: number) => `${formatNumber(h, { max: h < 10 ? 1 : 0 })} klst.`;
const VALUE = { deaths: formatNumber, mobKills: formatNumber, travelCm: km } as const;

export default function NightNumbers({ numbers }: { numbers: NightSummary }) {
  const totals = [
    { label: 'Í heiminum, öll saman', n: numbers.hours, value: hours(numbers.hours) },
    { label: 'Dauðsföll', n: numbers.deaths, value: formatNumber(numbers.deaths) },
    { label: 'Verur felldar', n: numbers.mobKills, value: formatNumber(numbers.mobKills) },
    { label: 'Á eigin fótum', n: numbers.travelCm, value: km(numbers.travelCm) },
  ].filter(row => row.n > 0);

  return (
    <section className="b-paper b-paper--torn b-tally" aria-label="Kvöldið í tölum">
      <p className="b-paper__kicker">Kvöldið í tölum</p>
      {totals.length > 0 && (
        <dl className="b-stats">
          {totals.map(row => (
            <div key={row.label} className="b-stat">
              <dt className="b-stat__k">{row.label}</dt>
              <dd className="b-stat__v">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {numbers.outlaws.length > 0 && (
        <dl className="b-stats">
          {numbers.outlaws.map(o => (
            <div key={o.charge} className="b-stat is-led">
              <dt className="b-stat__k"><b>„{o.nick}“</b><small>{o.username}</small></dt>
              <dd className="b-stat__v">{VALUE[o.charge](o.value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {numbers.advancements.length > 0 && (
        <div className="w-adv b-tally__adv">
          <p className="w-adv__head"><span className="b-paper__kicker">Afrek kvöldsins</span><span className="w-adv__count">{numbers.advancements.length}</span></p>
          <ol className="w-adv__list">
            {numbers.advancements.map(a => (
              <li key={`${a.username} ${a.title}`} className="w-adv__item">
                <AdvancementFrame frame={a.frame} />
                {/* what it asks is the game's own line, as on the walls */}
                <span className="w-adv__title b-tip" data-tip={a.description} tabIndex={a.description ? 0 : undefined}>{a.title}</span>
                <span className="w-adv__when">{a.username}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {/* the totals run from one daily copy to the next; the advancements are the evening's own, to the minute */}
      {totals.length + numbers.outlaws.length > 0 && <p className="b-tally__from">Úr daglegum tölum leiksins, fyrir og eftir kvöldið</p>}
    </section>
  );
}
