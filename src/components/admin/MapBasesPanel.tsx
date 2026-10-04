'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MapBasesRun, MapBasesState } from '@/app/api/admin/map-bases/route';
import { Button, Notice, Panel, Toggle, api, errText } from './ui';

/* Sends the base maps to the site (the "Map bases" GitHub Action), one or
   all of them, and follows its runs. While a run is under way the list is
   checked every ten seconds. */

const WATCH_MS = 10_000;

const when = (iso: string) =>
  new Date(iso).toLocaleString('is-IS', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toLocaleString('is-IS', { maximumFractionDigits: bytes < 10 * 1024 * 1024 ? 1 : 0 })} MB`;

function runState(run: MapBasesRun): { label: string; tone: 'online' | 'offline' | 'busy' } {
  if (run.status === 'queued' || run.status === 'waiting' || run.status === 'pending' || run.status === 'requested') return { label: 'Í biðröð', tone: 'busy' };
  if (run.status !== 'completed') return { label: 'Sendir', tone: 'busy' };
  if (run.conclusion === 'success') return { label: 'Lokið', tone: 'online' };
  if (run.conclusion === 'cancelled') return { label: 'Hætt við', tone: 'offline' };
  return { label: 'Mistókst', tone: 'offline' };
}

export default function MapBasesPanel() {
  const [state, setState] = useState<MapBasesState | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  /* which start is being sent: a base's id, or 'all' */
  const [starting, setStarting] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [force, setForce] = useState(false);

  const load = useCallback(async () => {
    try {
      setState(await api<MapBasesState>('/api/admin/map-bases'));
      setError('');
    } catch (e) {
      setError(errText(e, 'Ekki tókst að sækja stöðu grunnkortanna.'));
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

  const names = new Map(state?.bases.map(b => [b.id, b.name]) ?? []);

  async function start(ids: string[]) {
    setStarting(ids.length === 1 ? ids[0] : 'all'); setMsg('');
    try {
      const { offline } = await api<{ offline?: boolean }>('/api/admin/map-bases', { method: 'POST', body: JSON.stringify({ bases: ids, force }) });
      setMsg(`✓ Sending ræst${offline ? ' af slökktum þjóni' : ''}. Hvert kort er borið saman við afritið á vefnum og aðeins sent ef það hefur breyst; nýtt afrit birtist á vefnum skömmu eftir að henni lýkur.`);
      /* GitHub lists a new run a moment after it is asked for one */
      setTimeout(load, 4000);
    } catch (e) {
      setMsg(errText(e));
    } finally {
      setStarting(null);
    }
  }

  return (
    <Panel
      title="Grunnkortin"
      sub="Kort hinna stöðvanna, hvert á sinni síðu á vefnum (/kort/…). Kortin eru fryst á þjóninum; eftir að eitt er teiknað upp á nýtt er það sent hingað."
      tools={<Button tone="ghost" small onClick={load} disabled={loading}>Endurhlaða</Button>}
    >
      {loading ? <p className="a-muted">Sæki stöðu grunnkortanna</p> : error ? <Notice text={error} /> : state && (
        <div className="a-stack">
          <div className="a-rows" aria-label="Grunnkortin">
            {state.bases.map(b => (
              <div key={b.id} className="a-row a-row--base">
                <span className="a-row__name">{b.name}</span>
                <span className="a-row__meta">
                  {b.syncedAt ? `á vefnum síðan ${when(b.syncedAt)} · ${b.files.toLocaleString('is-IS')} skrár · ${mb(b.bytes)}` : 'ekki á vefnum enn'}
                </span>
                <span className="a-row__actions">
                  {b.syncedAt && <a className="a-btn a-btn--ghost a-btn--small" href={`/kort/${b.id}`} target="_blank" rel="noreferrer">Skoða</a>}
                  <Button small onClick={() => start([b.id])} disabled={starting !== null || running}>
                    {starting === b.id ? 'Sendi' : 'Senda'}
                  </Button>
                </span>
              </div>
            ))}
          </div>
          <div className="a-inline">
            <Button tone="primary" onClick={() => start([])} disabled={starting !== null || running}>
              {starting === 'all' ? 'Sendi' : running ? 'Sending í gangi' : 'Senda öll grunnkortin'}
            </Button>
          </div>
          <div className="a-field">
            <Toggle checked={force} onChange={setForce} disabled={starting !== null || running} label="Senda þótt ekkert hafi breyst" />
            <span className="a-help">
              Þjónninn má vera slökktur. Keyrslan er þá merkt svo og skráin á GitHub segir hve lengi hvert skref tók, svo bera megi tímann saman við keyrslu meðan hann er í gangi. Kort sem hefur ekki breyst er hvorki sótt né sent. Til að teikna kort upp á nýtt: npm run map:bases -- --refresh &lt;id&gt;, bíða þar til teikningunni lýkur, svo --freeze, og senda það svo héðan. Gamla afritið er fjarlægt sjálfkrafa þegar það nýja er komið á vefinn.
            </span>
          </div>
          <Notice text={msg} />
          {state.runs.length > 0 && (
            <div className="a-rows" aria-label="Síðustu sendingar">
              {state.runs.map(run => {
                const st = runState(run);
                const which = run.bases ? run.bases.map(id => names.get(id) ?? id).join(', ') : 'öll';
                return (
                  <div key={run.id} className="a-row a-row--sync">
                    <span className={`a-status a-status--${st.tone}`}>{st.label}</span>
                    <span className="a-row__meta">{when(run.createdAt)} · {which}{run.forced && ', þótt ekkert hefði breyst'}{run.offline && ', af slökktum þjóni'}</span>
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
