import type { Metadata } from 'next';
import Image from 'next/image';
import { Mark } from '@/components/brand/Mark';
import { Wordmark } from '@/components/brand/Wordmark';
import { StatusPanel } from '@/components/status/StatusPanel';
import { MotionSamples } from '@/components/stil/MotionSamples';
import { contrastRatio } from '@/lib/contrast';
import type { ServerStatus } from '@/lib/status/types';

export const metadata: Metadata = {
  title: 'Stíll, JOÐcraft',
  robots: { index: false },
};

const PANGRAM = 'Kæmi ný öxi hér, ykist þjófum nú bæði víl og ádrepa.';

const PALETTE = [
  { name: 'bg', hex: '#0B1120', role: 'Jörð og himinn. Grunnur alls.' },
  { name: 'surface', hex: '#121A2C', role: 'Snjór í skugga. Spjöld og raðir.' },
  { name: 'surface-2', hex: '#1A2439', role: 'Næsta lag upp. Reitir inni í spjaldi.' },
  { name: 'line', hex: '#263250', role: 'Eina línan. Hárlína milli hluta.' },
  { name: 'text', hex: '#EEF1F7', role: 'Snjór. Allur texti.' },
  { name: 'muted', hex: '#97A2BE', role: 'Snjór í rökkri. Aukatexti, slökkt lampi.' },
  { name: 'accent', hex: '#F0B25A', role: 'Ljósið í glugganum. Kveikt lampi, afrita-hnappur.' },
  { name: 'accent-deep', hex: '#D89A3E', role: 'Sama ljós, ýtt á.' },
] as const;

const TYPE_RAMP = [
  { role: 'display', cls: 'font-display text-display', note: 'Young Serif · nafnið og stöðuorðið' },
  { role: 'h2', cls: 'font-display text-h2', note: 'Young Serif · fyrirsagnir hluta' },
  { role: 'figure', cls: 'font-display text-figure num', note: 'Young Serif · tölur sem eru gögn' },
  { role: 'lead', cls: 'text-lead font-medium', note: 'Instrument Sans 500 · lína undir stöðu' },
  { role: 'body', cls: 'text-body', note: 'Instrument Sans 400 · meginmál, 16 px lágmark' },
  { role: 'meta', cls: 'text-meta text-muted', note: 'Instrument Sans 400 · dagsetningar, útgáfur' },
  { role: 'label', cls: 'text-label font-semibold text-muted', note: 'Instrument Sans 600 · merkimiðar, hnappar' },
] as const;

const STATES: Array<{ label: string; status: ServerStatus }> = [
  { label: 'Í gangi, fólk inni', status: { state: 'online', players: ['stebbias', 'joenana', 'AmmaGaur'], checkedAt: '' } },
  { label: 'Í gangi, enginn inni (algengast)', status: { state: 'online', players: [], checkedAt: '' } },
  { label: 'Slökkt', status: { state: 'offline', players: [], checkedAt: '' } },
  { label: 'Er að ræsa', status: { state: 'starting', players: [], checkedAt: '' } },
  { label: 'Náði ekki sambandi', status: { state: 'unreachable', players: [], checkedAt: '' } },
  { label: 'Athuga (fyrsta hleðsla)', status: { state: 'checking', players: [], checkedAt: '' } },
];

const SPACING = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-line py-12 lg:grid-cols-12">
      <h2 className="font-display text-h2 lg:col-span-3">{title}</h2>
      <div className="lg:col-span-9">{children}</div>
    </section>
  );
}

export default function StilPage() {
  return (
    <main className="mx-auto max-w-site px-gutter pb-24 pt-8">
      <header className="flex flex-wrap items-end justify-between gap-4 pb-12">
        <Wordmark lamp="on" height={36} title="JOÐcraft" />
        <p className="text-meta text-muted">Stíll. Ekki síða, bara hlutirnir sem síðan er gerð úr.</p>
      </header>

      <Section title="Merki">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-label text-muted">Á dökku, 16 / 32 / 64</p>
            <div className="mt-3 flex items-end gap-6">
              <Mark lamp="on" size={16} framed />
              <Mark lamp="on" size={32} framed />
              <Mark lamp="on" size={64} framed />
              <Mark lamp="off" size={64} framed />
            </div>
          </div>
          <div>
            <p className="text-label text-muted">Á ljósu, 16 / 32 / 64</p>
            <div className="mt-3 flex items-end gap-6 rounded bg-text p-4">
              <Mark lamp="on" size={16} framed />
              <Mark lamp="on" size={32} framed />
              <Mark lamp="on" size={64} framed />
              <Mark lamp="off" size={64} framed />
            </div>
          </div>
        </div>
        <div className="mt-10 grid gap-6">
          <div>
            <p className="text-label text-muted">Kveikt</p>
            <Wordmark lamp="on" height={56} />
          </div>
          <div>
            <p className="text-label text-muted">Er að ræsa</p>
            <Wordmark lamp="dim" height={56} />
          </div>
          <div>
            <p className="text-label text-muted">Slökkt</p>
            <Wordmark lamp="off" height={56} />
          </div>
        </div>
        <p className="mt-6 max-w-prose text-body text-muted">
          Þverstrikið sem gerir D að Ð er eina ljósið í merkinu. Það lýsir þegar þjónninn er í gangi.
        </p>
      </Section>

      <Section title="Litir">
        <ul className="grid gap-3 sm:grid-cols-2">
          {PALETTE.map((c) => (
            <li key={c.name} className="flex items-center gap-4 rounded border border-line bg-surface p-3">
              <span className="h-12 w-12 shrink-0 rounded border border-line" style={{ background: c.hex }} />
              <div className="min-w-0">
                <p className="text-label font-semibold">
                  {c.name} <span className="num font-normal text-muted">{c.hex}</span>
                </p>
                <p className="text-meta text-muted">{c.role}</p>
                <p className="num text-meta text-muted">
                  {contrastRatio(c.hex, '#0B1120').toFixed(1)}:1 á bg · {contrastRatio(c.hex, '#121A2C').toFixed(1)}:1 á surface
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Letur">
        <ul className="grid gap-8">
          {TYPE_RAMP.map((t) => (
            <li key={t.role}>
              <p className="text-label text-muted">
                {t.role} · {t.note}
              </p>
              <p className={`mt-2 ${t.cls}`}>{t.role === 'figure' ? '1 234 567 890' : PANGRAM}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Bil og lög">
        <p className="text-label text-muted">Bilkvarði, px</p>
        <ul className="mt-3 flex flex-wrap items-end gap-3">
          {SPACING.map((s) => (
            <li key={s} className="flex flex-col items-center gap-2">
              <span className="w-3 bg-muted" style={{ height: s }} />
              <span className="num text-meta text-muted">{s}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-label text-muted">Þrjú lög, ein hárlína, engir skuggar. Ein rúnnun, 6 px.</p>
        <div className="mt-3 rounded border border-line bg-surface p-6">
          <div className="rounded bg-surface-2 p-6">
            <p className="text-meta text-muted">bg → surface → surface-2</p>
          </div>
        </div>
      </Section>

      <Section title="Staða">
        <div className="grid gap-6 md:grid-cols-2">
          {STATES.map((s) => (
            <div key={s.label}>
              <p className="mb-2 text-label text-muted">{s.label}</p>
              <StatusPanel status={s.status} address="play.jodcraft.world" version="Paper 26.2" />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Raðir og töflur">
        <p className="text-label text-muted">Pakki: nafn og átta orð mest</p>
        <ul className="mt-3 divide-y divide-line rounded border border-line bg-surface">
          <li className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-3">
            <span className="font-semibold">Waystones</span>
            <span className="text-meta text-muted">Vegsteinar til að ferðast hratt</span>
          </li>
          <li className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-3">
            <span className="font-semibold">LY Graves</span>
            <span className="text-meta text-muted">Gröf við dauða, dótið geymist</span>
          </li>
        </ul>

        <p className="mt-8 text-label text-muted">Tafla: tölur í lining, tabular</p>
        <div className="mt-3 overflow-x-auto rounded border border-line bg-surface">
          <table className="num w-full text-meta">
            <thead className="text-label text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-semibold">Leikmaður</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Klst.</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Dauðsföll</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">km</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <tr>
                <td className="px-4 py-3">stebbias</td>
                <td className="px-4 py-3 text-right">312</td>
                <td className="px-4 py-3 text-right">41</td>
                <td className="px-4 py-3 text-right">188,4</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-8 text-label text-muted">Mynd: næst án ramma, alt-texti á íslensku</p>
        <figure className="mt-3 max-w-md">
          <Image
            src="/screenshots/the-castle.webp"
            alt="Goði Castle, steinkastali á hæð með turnum, séður úr fjarska"
            width={1920}
            height={1009}
            sizes="(min-width: 768px) 448px, 100vw"
            className="rounded"
          />
          <figcaption className="mt-2 flex justify-between text-meta text-muted">
            <span className="text-text">Goði Castle</span>
            <span>langt í burtu</span>
          </figcaption>
        </figure>
      </Section>

      <Section title="Hreyfing">
        <MotionSamples />
        <p className="mt-6 max-w-prose text-body text-muted">
          Þrír flokkar og ekkert annað hreyfist: viðbragð við snertingu, spjald sem opnast, og kortið sem teiknar sig einu sinni.
        </p>
      </Section>
    </main>
  );
}
