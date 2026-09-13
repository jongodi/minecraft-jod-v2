import { PlayerHead } from '@/components/status/PlayerHead';

export interface StatRow {
  username: string;
  hours: number;
  mobKills: number;
  deaths: number;
  crafted: number;
  km: number;
}

interface StatsTableProps {
  rows: StatRow[];
  /** When the numbers came from, or null when the server had none to give. */
  asOf: string | null;
}

const COLUMNS: Array<{ key: keyof Omit<StatRow, 'username'>; label: string; digits?: number }> = [
  { key: 'hours', label: 'Klst.' },
  { key: 'mobKills', label: 'Dráp' },
  { key: 'deaths', label: 'Dauðsföll' },
  { key: 'crafted', label: 'Smíðað' },
  { key: 'km', label: 'km', digits: 1 },
];

const fmt = new Intl.NumberFormat('is-IS');

/** One table, sorted by hours. Fun numbers, small footprint. */
export function StatsTable({ rows, asOf }: StatsTableProps) {
  if (rows.length === 0) {
    return <p className="text-body text-muted">Engar tölur núna. Þær koma þegar þjónninn svarar.</p>;
  }
  const sorted = [...rows].sort((a, b) => b.hours - a.hours);
  return (
    <div>
      <div className="w-full overflow-x-auto">
        <table className="num w-full text-meta">
          <thead>
            <tr className="border-b border-line font-label text-label uppercase text-muted">
              <th scope="col" className="py-3 pr-4 text-left font-normal">Leikmaður</th>
              {COLUMNS.map((c) => (
                <th key={c.key} scope="col" className="py-3 pl-4 text-right font-normal">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.username} className="border-b border-line">
                <th scope="row" className="py-2 pr-4 text-left font-normal">
                  <span className="flex items-center gap-3">
                    <PlayerHead name={r.username} size={28} />
                    <span className="font-display text-name uppercase">{r.username}</span>
                  </span>
                </th>
                {COLUMNS.map((c) => (
                  <td key={c.key} className="py-3 pl-4 text-right">
                    {c.digits ? r[c.key].toLocaleString('is-IS', { minimumFractionDigits: c.digits, maximumFractionDigits: c.digits }) : fmt.format(r[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {asOf && <p className="mt-3 font-label text-label uppercase text-muted">Tölur frá {asOf}</p>}
    </div>
  );
}
