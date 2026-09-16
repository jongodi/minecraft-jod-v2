'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Notice, Panel, api, errText } from './ui';

interface ServerInfo {
  name: string; status: number; address?: string; motd?: string;
  players?: { count: number; max: number; list?: string[] };
  software?: { name: string; version: string };
  ram?: number;
}

const REFRESH_MS = 30_000;
/* Exaroton status codes */
const STATUS: Record<number, { label: string; tone: 'online' | 'offline' | 'busy' }> = {
  0: { label: 'Slökkt', tone: 'offline' }, 1: { label: 'Í gangi', tone: 'online' }, 2: { label: 'Ræsist', tone: 'busy' },
  3: { label: 'Stöðvast', tone: 'busy' }, 4: { label: 'Endurræsist', tone: 'busy' }, 5: { label: 'Vistar', tone: 'busy' },
  6: { label: 'Hleður', tone: 'busy' }, 7: { label: 'Hrundi', tone: 'offline' }, 8: { label: 'Bíður', tone: 'busy' }, 10: { label: 'Undirbýr', tone: 'busy' },
};
const ACTIONS = [
  { id: 'start',   label: 'Ræsa',       confirm: null },
  { id: 'restart', label: 'Endurræsa',  confirm: 'Endurræsa þjóninn? Allir sem eru inni detta út í nokkrar mínútur.' },
  { id: 'stop',    label: 'Stöðva',     confirm: 'Stöðva þjóninn? Allir sem eru inni detta út.' },
] as const;

export default function ServerPanel() {
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      setInfo(await api<ServerInfo>('/api/admin/server/info'));
      setError('');
      setCheckedAt(new Date());
    } catch (e) {
      setError(errText(e, 'Ekki tókst að sækja upplýsingar um þjóninn. Athugaðu EXAROTON_API_KEY.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  async function run(action: typeof ACTIONS[number]) {
    if (action.confirm && !confirm(action.confirm)) return;
    setActing(action.id); setMsg('');
    try {
      await api(`/api/admin/server/${action.id}`, { method: 'POST' });
      setMsg(`✓ Beiðni send: ${action.label.toLowerCase()}. Staðan uppfærist á næstu sekúndum.`);
      setTimeout(load, 3000);
      setTimeout(load, 10000);
    } catch (e) {
      setMsg(errText(e));
    } finally {
      setActing(null);
    }
  }

  const st = info ? (STATUS[info.status] ?? { label: `Staða ${info.status}`, tone: 'busy' as const }) : null;
  const busy = st?.tone === 'busy';

  return (
    <Panel
      title="Þjónninn"
      sub={checkedAt ? `Exaroton. Síðast athugað ${checkedAt.toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}, uppfærist á hálfrar mínútu fresti.` : 'Exaroton'}
      tools={<Button tone="ghost" small onClick={load} disabled={loading}>Endurhlaða</Button>}
    >
      {loading ? <p className="a-muted">Sæki upplýsingar um þjóninn</p> : error ? <Notice text={error} /> : info && st && (
        <div className="a-stack">
          <div className="a-facts">
            <span className={`a-status a-status--${st.tone}`}>{st.label}</span>
            {info.address && <div className="a-fact"><span className="a-fact__k">Vistfang</span><span className="a-fact__v">{info.address}</span></div>}
            {info.players && <div className="a-fact"><span className="a-fact__k">Inni</span><span className="a-fact__v">{info.players.count} / {info.players.max}</span></div>}
            {info.software && <div className="a-fact"><span className="a-fact__k">Hugbúnaður</span><span className="a-fact__v">{info.software.name} {info.software.version}</span></div>}
            {info.ram && <div className="a-fact"><span className="a-fact__k">Minni</span><span className="a-fact__v">{info.ram} GB</span></div>}
          </div>
          {info.players?.list && info.players.list.length > 0 && (
            <div className="a-tags" aria-label="Leikmenn inni">{info.players.list.map(n => <span key={n} className="a-tag">{n}</span>)}</div>
          )}
          <div className="a-inline">
            {ACTIONS.map(a => (
              <Button key={a.id} tone={a.id === 'stop' ? 'danger' : a.id === 'start' ? 'primary' : 'default'} disabled={!!acting || busy || (a.id === 'start' ? st.tone === 'online' : st.tone === 'offline')} onClick={() => run(a)}>
                {acting === a.id ? 'Sendi' : a.label}
              </Button>
            ))}
          </div>
          <Notice text={msg} />
        </div>
      )}
    </Panel>
  );
}
