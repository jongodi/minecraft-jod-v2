import CopyAddress from './CopyAddress';
import { Lantern, Strata } from './Bits';
import { RIDE_STEPS } from './data';

/** Deep night: the trail in. Three markers, then the address again. */
export default function RideIn() {
  return (
    <section id="ride" className="b-sec b-sec--sky" aria-labelledby="ride-title">
      <Strata />
      <div className="b-wrap b-trail-sec">
        <h2 id="ride-title" className="b-title">Komdu inn</h2>
        <ol className="b-trail-list">
          {RIDE_STEPS.map((s, i) => (
            <li key={s.title} className="b-trail-step">
              <span className="b-trail-step__marker" aria-hidden="true">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
          <li className="b-trail-step">
            <span className="b-trail-step__marker" aria-hidden="true"><Lantern lit /></span>
            <h3>Hér er það</h3>
            <div className="b-trail-end"><CopyAddress hint="afritaðu og límdu inn undir fjölspilun" /></div>
          </li>
        </ol>
      </div>
    </section>
  );
}
