'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MapConfig } from '@/lib/map-types';
import type { MapVersionInfo } from '@/lib/map-history';
import MapEditor from './MapEditor';
import { Button, Modal, Notice, Panel, api, errText } from './ui';
import { hasUnsaved } from './unsaved';

const when = (iso: string) => {
  const d = new Date(iso);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - day.getTime()) / 86400000);
  const time = d.toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit' });
  if (days === 0) return `í dag kl. ${time}`;
  if (days === 1) return `í gær kl. ${time}`;
  return `${d.toLocaleDateString('is-IS', { day: 'numeric', month: 'short' })} kl. ${time}`;
};

export default function MapPanel() {
  const [config, setConfig] = useState<MapConfig | null>(null);
  const [error, setError] = useState('');
  /* a restore loads the editor afresh */
  const [editorKey, setEditorKey] = useState(0);
  const [history, setHistory] = useState(false);

  useEffect(() => {
    api<MapConfig>('/api/admin/map').then(setConfig).catch(e => setError(errText(e, 'Ekki tókst að sækja kortið.')));
  }, []);

  const restored = useCallback((cfg: MapConfig) => {
    setConfig(cfg);
    setEditorKey(k => k + 1);
    setHistory(false);
  }, []);

  return (
    <Panel
      title="Landakort"
      sub="Það sem þú sérð hér er það sem gestir sjá. Dragðu staði og svæði til, smelltu til að breyta þeim, og vistaðu þegar þú ert sátt."
      tools={<Button tone="ghost" small onClick={() => setHistory(true)}>Saga</Button>}
    >
      {error ? <Notice text={error} /> : config ? <MapEditor key={editorKey} initialConfig={config} /> : <p className="a-muted">Sæki kortið</p>}
      {history && <MapHistory onClose={() => setHistory(false)} onRestored={restored} />}
    </Panel>
  );
}

/** The last saves, newest first; any but the newest can be restored. */
function MapHistory({ onClose, onRestored }: { onClose: () => void; onRestored: (cfg: MapConfig) => void }) {
  const [versions, setVersions] = useState<MapVersionInfo[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api<{ versions: MapVersionInfo[] }>('/api/admin/map/history')
      .then(r => setVersions(r.versions))
      .catch(e => setError(errText(e, 'Ekki tókst að sækja söguna.')));
  }, []);

  async function restore(v: MapVersionInfo) {
    const ask = hasUnsaved('map')
      ? `Endurheimta kortið eins og það var ${when(v.at)}? Óvistaðar breytingar í ritlinum glatast. Núverandi kort fer í söguna, svo þetta má taka til baka.`
      : `Endurheimta kortið eins og það var ${when(v.at)}? Núverandi kort fer í söguna, svo þetta má taka til baka.`;
    if (!confirm(ask)) return;
    setBusy(v.id); setError('');
    try {
      const r = await api<{ config: MapConfig }>('/api/admin/map/history', { method: 'POST', body: JSON.stringify({ id: v.id }) });
      onRestored(r.config);
    } catch (e) {
      setError(errText(e));
      setBusy(null);
    }
  }

  return (
    <Modal title="Saga kortsins" onClose={onClose} width="40rem">
      <p className="a-help">Síðustu 30 vistanir, nýjust efst. Endurheimt vistast sem ný útgáfa, svo hana má líka taka til baka.</p>
      <Notice text={error} />
      {!versions && !error && <p className="a-muted">Sæki söguna</p>}
      {versions && versions.length === 0 && <p className="a-muted">Engin saga enn. Hún byrjar við næstu vistun.</p>}
      {versions && versions.length > 0 && (
        <div className="a-rows">
          {versions.map((v, i) => (
            <div key={v.id} className="a-row a-row--history">
              <span className="a-row__meta">{when(v.at)}</span>
              <span className="a-row__name a-row__name--wrap">{v.summary}</span>
              <span className="a-row__actions">
                {i === 0
                  ? <span className="a-muted">Núna</span>
                  : <Button small tone="ghost" disabled={busy !== null} onClick={() => restore(v)}>{busy === v.id ? 'Endurheimti' : 'Endurheimta'}</Button>}
              </span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
