'use client';

import Image from 'next/image';
import { Header } from '@/components/site/Header';
import type { Shot } from '@/data/gallery';
import { SERVER } from '@/data/server';
import { playersLine, stateWord } from '@/lib/status/copy';
import { useStatus } from '@/lib/status/store';
import { lampFor, type ServerStatus } from '@/lib/status/types';
import { CopyAddress } from './CopyAddress';
import { Roster } from './Roster';

interface HeroProps {
  initial: ServerStatus;
  shot: Shot;
}

/**
 * The first screen answers the first two questions and nothing else: is it
 * on, who is in, how do I join. One screenshot is the ground; the state word
 * is the headline of the visit. Client component because the state word,
 * the lamp and the roster follow the live status.
 */
export function Hero({ initial, shot }: HeroProps) {
  const status = useStatus(initial);
  const lamp = lampFor(status.state);
  const line = playersLine(status.state, status.players);
  return (
    <section className="relative flex min-h-svh flex-col" aria-label="Staðan og vistfangið">
      <Image
        src={shot.src}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[60%_45%]"
      />
      <div className="hero-veil absolute inset-0" aria-hidden="true" />
      <Header lamp={lamp} />
      <h1 className="sr-only">JOÐcraft</h1>
      <div className="relative mt-auto grid items-end gap-x-6 gap-y-8 px-gutter pb-safe-b lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="font-label text-label uppercase">Staðan núna</p>
          <p className="mt-[0.2em] font-display text-state uppercase" aria-live="polite">
            {stateWord(status.state)}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Roster online={status.state === 'online' ? status.players : []} />
            {line && <p className="text-lead italic text-muted">{line}</p>}
          </div>
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <p className="mb-4 max-w-sm text-body text-muted">
            {SERVER.tagline} {SERVER.version}.
          </p>
          <CopyAddress address={SERVER.address} />
        </div>
      </div>
    </section>
  );
}
