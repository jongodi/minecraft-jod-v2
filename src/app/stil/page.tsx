import type { Metadata } from 'next';
import { Mark } from '@/components/brand/Mark';
import { Wordmark } from '@/components/brand/Wordmark';
import { FuseLoader } from '@/components/fuse/FuseLoader';
import { Gallery } from '@/components/gallery/Gallery';
import { WorldMap } from '@/components/map/WorldMap';
import { PackList } from '@/components/packs/PackList';
import { Footer } from '@/components/site/Footer';
import { Section } from '@/components/site/Section';
import { StatsTable } from '@/components/stats/StatsTable';
import { Hero } from '@/components/status/Hero';
import { GALLERY } from '@/data/gallery';
import { contrastRatio } from '@/lib/contrast';
import { playersLine, stateWord } from '@/lib/status/copy';
import type { ServerState, ServerStatus } from '@/lib/status/types';

export const metadata: Metadata = {
  title: 'Stíll, JOÐcraft',
  robots: { index: false },
};

const SAMPLE: ServerStatus = { state: 'online', players: ['stebbias', 'joenana'], checkedAt: '' };

const STATES: ServerState[] = ['online', 'offline', 'starting', 'unreachable', 'checking'];

const PALETTE = [
  { name: 'bg', hex: '#0F0E0C', role: 'Basalt. Svartur sandur, grunnurinn.' },
  { name: 'bg-2', hex: '#1A1815', role: 'Sami sandur, blautur. Sviðið og kortið.' },
  { name: 'line', hex: '#2C2925', role: 'Eina línan.' },
  { name: 'text', hex: '#EFE9DC', role: 'Rekaviður. Allur texti.' },
  { name: 'muted', hex: '#9A9184', role: 'Rekaviður í skugga.' },
  { name: 'accent', hex: '#F4A6C1', role: 'Kirsuberjatrén við gamla basið. Lampinn og afrita.' },
] as const;

const RAMP = [
  { role: 'state', cls: 'font-display text-state uppercase', text: 'Í gangi' },
  { role: 'h2', cls: 'font-display text-h2 uppercase', text: 'Öðruvísi en vanilla' },
  { role: 'figure', cls: 'num font-display text-figure', text: '1 234 567' },
  { role: 'name', cls: 'font-display text-name uppercase', text: 'Wabi-Sabi Structures' },
  { role: 'address', cls: 'font-display text-address', text: 'play.jodcraft.world' },
  { role: 'lead', cls: 'text-lead italic text-muted', text: 'stebbias, joenana og AmmaGaur inni' },
  { role: 'body', cls: 'text-body', text: 'Kæmi ný öxi hér, ykist þjófum nú bæði víl og ádrepa.' },
  { role: 'meta', cls: 'text-meta text-muted', text: 'Kæmi ný öxi hér, ykist þjófum nú bæði víl og ádrepa.' },
  { role: 'label', cls: 'font-label text-label uppercase', text: 'Staðan núna' },
] as const;

const SAMPLE_ROWS = [
  { username: 'stebbias', hours: 312, mobKills: 4810, deaths: 41, crafted: 12930, km: 188.4 },
  { username: 'joenana', hours: 245, mobKills: 2201, deaths: 63, crafted: 8412, km: 96.2 },
  { username: 'AmmaGaur', hours: 130, mobKills: 980, deaths: 12, crafted: 5320, km: 41.7 },
];

export default function StilPage() {
  return (
    <main>
      <Hero status={SAMPLE} shot={GALLERY[10]} />

      <Section id="pakkar" title="Öðruvísi en vanilla">
        <PackList />
      </Section>

      <Section id="myndir" title="Svona lítur það út" bleed>
        <Gallery shots={GALLERY} />
      </Section>

      <Section id="kortid" title="Kortið" bleed>
        <WorldMap shots={GALLERY} />
      </Section>

      <Section id="tolur" title="Tölurnar" line="Sýnishorn. Réttu tölurnar koma úr stats-skrám þjónsins.">
        <StatsTable rows={SAMPLE_ROWS} asOf="sýnishorni" />
      </Section>

      <Section id="kveikur" title="Kveikurinn" line="Kveikur á creeper brennur í 30 tikk. Ýttu áður en hann springur.">
        <FuseLoader />
      </Section>

      <Section id="stadan" title="Hin stöðuorðin">
        <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {STATES.map((s) => (
            <li key={s} className="border-t border-line pt-3">
              <p className="font-display text-figure uppercase">{stateWord(s)}</p>
              <p className="mt-1 text-meta italic text-muted">{playersLine(s, []) || '(engin lína)'}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="merki" title="Merkið">
        <div className="flex flex-wrap items-end gap-8">
          <Mark lamp="on" size={16} framed />
          <Mark lamp="on" size={32} framed />
          <Mark lamp="on" size={64} framed />
          <Mark lamp="off" size={64} framed />
          <span className="bg-text p-3"><Mark lamp="on" size={32} framed /></span>
        </div>
        <div className="mt-10 grid gap-6">
          <Wordmark lamp="on" height={64} />
          <Wordmark lamp="dim" height={64} />
          <Wordmark lamp="off" height={64} />
        </div>
      </Section>

      <Section id="litir" title="Litir">
        <ul>
          {PALETTE.map((c) => (
            <li key={c.name} className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line py-3">
              <span className="h-10 w-16 shrink-0 border border-line" style={{ background: c.hex }} />
              <span className="font-label text-label uppercase">{c.name}</span>
              <span className="num text-meta text-muted">{c.hex}</span>
              <span className="num text-meta text-muted">{contrastRatio(c.hex, '#0F0E0C').toFixed(1)}:1</span>
              <span className="w-full text-meta text-muted sm:ml-auto sm:w-auto sm:text-right">{c.role}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="letur" title="Letur">
        <ul>
          {RAMP.map((r) => (
            <li key={r.role} className="border-t border-line py-5">
              <p className="mb-2 font-label text-label uppercase text-muted">{r.role}</p>
              <p className={r.cls}>{r.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Footer />
    </main>
  );
}
