'use client';

import { useEffect, useState } from 'react';
import type { MapConfig } from '@/lib/map-types';
import MapEditor from './MapEditor';
import { Notice, Panel, api, errText } from './ui';

export default function MapPanel() {
  const [config, setConfig] = useState<MapConfig | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<MapConfig>('/api/admin/map').then(setConfig).catch(e => setError(errText(e, 'Ekki tókst að sækja kortið.')));
  }, []);

  return (
    <Panel title="Landakort" sub="Það sem þú sérð hér er það sem gestir sjá. Dragðu staði og svæði til, smelltu til að breyta þeim, og vistaðu þegar þú ert sátt.">
      {error ? <Notice text={error} /> : config ? <MapEditor initialConfig={config} /> : <p className="a-muted">Sæki kortið</p>}
    </Panel>
  );
}
