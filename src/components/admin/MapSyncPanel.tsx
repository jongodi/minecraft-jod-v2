'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MapSyncRun, MapSyncState } from '@/app/api/admin/map-sync/route';
import { MAP_POSTER } from '@/components/badlands/data';
import { Button, Notice, Panel, api, errText } from './ui';

/* Starts the map copy (the "Map sync" GitHub Action) and follows its runs.
   While a run is under way the list is checked every ten seconds. */

const WATCH_MS = 10_000;

const when = (iso: string) =>
  new Date(iso).toLocaleString('is-IS', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function runState(run: MapSyncRun): { label: string; tone: 'online' | 'offline' | 'busy' } {
  if (run.status === 'queued' || run.status === 'waiting' || run.status === 'pending' || run.status === 'requested') return { label: 'Í biðröð', tone: 'busy' };
  if (run.status !== 'completed') return { label: 'Afritar', tone: 'busy' };
  if (run.conclusion === 'success') return { label: 'Lokið', tone: 'online' };
  if (run.conclusion === 'cancelled') return { label: 'Hætt við', tone: 'offline' };
  return { label: 'Mistókst', tone: 'offline' };
}

export default function MapSyncPanel() {
  const [state, setState] = useState<MapSyncState | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      setState(await api<MapSyncState>('/api/admin/map-sync'));
      setError('');
    } catch (e) {
      setError(errText(e, 'Ekki tókst að sækja stöðu afritunarinnar.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const running = state?.runs.some(r => r.status !== 'completed') ?? false;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => { if (!document.hidden) load(); }, WATCH_MS);
    return () => clearInterval(id);
  }, [running, load]);

  async function start() {
    setStarting(true); setMsg('');
    try {
      const { offline } = await api<{ offline?: boolean }>('/api/admin/map-sync', { method: 'POST' });
      setMsg(`✓ Afritun ræst${offline ? ' af slökktum þjóni' : ''}. Hún tekur yfirleitt nokkrar mínútur; hafi kortið breyst birtist nýja afritið á vefnum skömmu eftir að henni lýkur.`);
      /* GitHub lists a new run a moment after it is asked for one */
      setTimeout(load, 4000);
    } catch (e) {
      setMsg(errText(e));
    } finally {
      setStarting(false);
    }
  }

  return (
    <Panel
      title="Þrívíddarkortið"
      sub="Afritar kortið af þjóninum yfir á vefinn. Hafi BlueMap engu breytt síðan síðast er ekkert gert."
      tools={<Button tone="ghost" small onClick={load} disabled={loading}>Endurhlaða</Button>}
    >
      {loading ? <p className="a-muted">Sæki stöðu afritunarinnar</p> : error ? <Notice text={error} /> : state && (
        <div className="a-stack">
          <div className="a-facts">
            <div className="a-fact">
              <span className="a-fact__k">Afritið á vefnum</span>
              <span className="a-fact__v">{state.syncedAt ? when(state.syncedAt) : 'ekkert enn'}</span>
            </div>
          </div>
          {/* the still the home page opens on; each copy that changes the map takes a new one */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="a-poster" src={MAP_POSTER} alt="Kyrrmyndin af kortinu sem forsíðan opnar á" width={1920} height={1080} loading="lazy" />
          <div className="a-inline">
            <Button tone="primary" onClick={start} disabled={starting || running}>
              {starting ? 'Sendi' : running ? 'Afritun í gangi' : 'Afrita kortið núna'}
            </Button>
          </div>
          <p className="a-help">
            Þjónninn má vera slökktur: skrárnar koma jafn hratt af honum og meðan hann er í gangi. Það sem ræður hraðanum er hve oft Exaroton leyfir að spurt sé.
          </p>
          <Notice text={msg} />
          {state.runs.length > 0 && (
            <div className="a-rows" aria-label="Síðustu afritanir">
              {state.runs.map(run => {
                const st = runState(run);
                return (
                  <div key={run.id} className="a-row a-row--sync">
                    <span className={`a-status a-status--${st.tone}`}>{st.label}</span>
                    <span className="a-row__meta">{when(run.createdAt)}{run.offline && ', af slökktum þjóni'}</span>
                    <span className="a-row__actions">
                      <a className="a-btn a-btn--ghost a-btn--small" href={run.url} target="_blank" rel="noreferrer">Skoða á GitHub</a>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
