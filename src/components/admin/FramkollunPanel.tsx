'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MyndavelView } from '@/app/api/admin/myndavel/route';
import { Button, Notice, Panel, api, errText } from './ui';

const REFRESH_MS = 60_000;
/* heard from within this long, Framköllun is running: it speaks every five minutes */
const FRESH_MS = 12 * 60_000;

const TROUBLE: Record<string, string> = {
  stuck: 'mynd hefur verið í framköllun í meira en tíu mínútur',
  blind: 'hún nær ekki að lesa biðröðina á þjóninum',
  waiting: 'mynd hefur beðið eftir vefnum klukkustundum saman',
};

/** "fyrir 3 mín.", "fyrir 2 klst.", "fyrir 4 dögum" */
function ago(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60_000));
  if (min < 1) return 'rétt í þessu';
  if (min < 60) return `fyrir ${min} mín.`;
  const h = Math.round(min / 60);
  if (h < 48) return `fyrir ${h} klst.`;
  return `fyrir ${Math.round(h / 24)} dögum`;
}

/** The Myndavél's chain from the game to the board: how Framköllun on the NAS
    last said it was doing, and how many photos wait on the game server. */
export default function FramkollunPanel() {
  const [view, setView] = useState<MyndavelView | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setView(await api<MyndavelView>('/api/admin/myndavel'));
      setError('');
    } catch (e) {
      setError(errText(e, 'Ekki tókst að sækja stöðu Framköllunar.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const s = view?.status ?? null;
  const age = view && s ? Date.parse(view.now) - Date.parse(s.at) : null;
  const fresh = age !== null && age < FRESH_MS;
  const state = !view ? null
    : !s ? { label: 'Ekkert heyrst', tone: 'offline' as const }
    : !fresh ? { label: 'Þögul', tone: 'offline' as const }
    : s.ok ? { label: 'Í gangi', tone: 'online' as const }
    : { label: 'Vandræði', tone: 'busy' as const };
  /* photos lie on the server and nobody is taking them: the one thing that needs a person */
  const stuck = !!view && (view.waiting ?? 0) > 0 && !fresh;

  return (
    <Panel
      title="Framköllun"
      sub="Myndavélin: myndir úr leiknum framkallast á NAS-inu og fara þaðan á vegginn. Framköllun lætur vita af sér á fimm mínútna fresti."
      tools={<Button tone="ghost" small onClick={load} disabled={loading || refreshing}>{refreshing && !loading ? 'Athuga…' : 'Endurhlaða'}</Button>}
    >
      {loading ? <p className="a-muted">Sæki stöðu Framköllunar</p> : error ? <Notice text={error} /> : view && state && (
        <div className="a-stack">
          <div className="a-facts">
            <span className={`a-status a-status--${state.tone}`}>{state.label}</span>
            <div className="a-fact"><span className="a-fact__k">Síðast heyrt</span><span className="a-fact__v">{age !== null ? ago(age) : 'aldrei'}</span></div>
            <div className="a-fact"><span className="a-fact__k">Bíða á þjóninum</span><span className="a-fact__v">{view.waiting ?? 'óvíst'}</span></div>
            {s && <div className="a-fact"><span className="a-fact__k">Á leið á vefinn</span><span className="a-fact__v">{s.outbox}</span></div>}
            {s && <div className="a-fact"><span className="a-fact__k">Lagðar til hliðar</span><span className="a-fact__v">{s.failed + s.skipped}</span></div>}
            {s?.lastDevelopMs != null && <div className="a-fact"><span className="a-fact__k">Síðasta framköllun</span><span className="a-fact__v">{(s.lastDevelopMs / 1000).toLocaleString('is-IS', { maximumFractionDigits: 1 })} sek.</span></div>}
            {s && fresh && <div className="a-fact"><span className="a-fact__k">Stjórnborð þjónsins</span><span className="a-fact__v">{s.console ? 'heyrist' : 'heyrist ekki'}</span></div>}
          </div>
          {!view.connected && <Notice tone="warn" text="MYNDAVEL_INGEST_SECRET er ekki stilltur, svo vefurinn tekur ekki við myndum úr leiknum." />}
          {stuck && <Notice tone="err" text={`✗ ${view.waiting} ${view.waiting === 1 ? 'mynd bíður' : 'myndir bíða'} á þjóninum og Framköllun hefur ekki látið heyra í sér. Athugaðu hvort hún sé í gangi á NAS-inu.`} />}
          {s && fresh && !s.ok && <Notice tone="warn" text={`Framköllun er í vandræðum: ${(s.troubleCode && TROUBLE[s.troubleCode]) ?? s.trouble ?? 'eitthvað er að'}.`} />}
          {s && fresh && s.developing && <p className="a-muted">Framkallar mynd núna.</p>}
          {s && s.oldestWaitingMin >= 30 && <p className="a-muted">Elsta myndin hefur beðið eftir vefnum í {s.oldestWaitingMin} mín.</p>}
          {s?.lastError && <p className="a-muted">Síðasta villa ({ago(Date.parse(view.now) - Date.parse(s.lastError.at))}): {s.lastError.what}</p>}
        </div>
      )}
    </Panel>
  );
}
