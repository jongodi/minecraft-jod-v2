import { Changelog } from '@/components/changelog/Changelog';
import { FuseLoader } from '@/components/fuse/FuseLoader';
import { Gallery } from '@/components/gallery/Gallery';
import { WorldMap } from '@/components/map/WorldMap';
import { PackList } from '@/components/packs/PackList';
import { Footer } from '@/components/site/Footer';
import { Section } from '@/components/site/Section';
import { StatsTable } from '@/components/stats/StatsTable';
import { Hero } from '@/components/status/Hero';
import { StatusPoller } from '@/components/status/StatusPoller';
import { DATAPACKS } from '@/data/datapacks';
import { GALLERY } from '@/data/gallery';
import { SERVER } from '@/data/server';
import { getStats } from '@/lib/stats/server';
import { getStatus } from '@/lib/status/server';

/** The page is rebuilt at most once a minute; the status keeps polling on the client. */
export const revalidate = 60;

const HERO_SHOT = GALLERY[GALLERY.length - 1];

export default async function Home() {
  const [status, stats] = await Promise.all([getStatus(), getStats()]);

  return (
    <>
      <a href="#efni" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-text focus:px-4 focus:py-2 focus:font-label focus:text-label focus:uppercase focus:text-accent-ink">
        Beint í efni
      </a>
      <StatusPoller initial={status} />
      <Hero initial={status} shot={HERO_SHOT} />
      <main id="efni">
        <Section
          id="pakkar"
          question="Hvað er öðruvísi en vanilla?"
          title="Pakkarnir"
          figure={{ value: String(DATAPACKS.length), unit: 'datapakkar' }}
        >
          <PackList />
        </Section>

        <Changelog />

        <Section
          id="myndir"
          question="Hvernig lítur það út?"
          title="Myndir"
          figure={{ value: String(GALLERY.length), unit: 'myndir úr heiminum' }}
          bleed
        >
          <Gallery shots={GALLERY} />
        </Section>

        <Section id="kortid" question="Hvar er hvað?" title="Kortið" bleed>
          <WorldMap shots={GALLERY} />
        </Section>

        {stats.rows.length > 0 && (
          <Section
            id="tolur"
            question="Hver hefur spilað mest?"
            title="Tölurnar"
            figure={{ value: String(SERVER.players.length), unit: 'leikmenn' }}
          >
            <StatsTable rows={stats.rows} asOf={stats.asOf} />
          </Section>
        )}

        <Section
          id="kveikur"
          question="Eitthvað að dunda á meðan?"
          title="Kveikurinn"
          figure={{ value: '30', unit: 'tikk á kveiknum' }}
          line="Kveikur á creeper brennur í 30 tikk, eina og hálfa sekúndu. Ýttu áður en hann springur."
        >
          <FuseLoader />
        </Section>
      </main>
      <Footer initial={status} />
    </>
  );
}
