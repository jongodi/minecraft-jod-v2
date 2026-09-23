'use client';

import './admin.css';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Mark } from '@/components/badlands/Bits';
import { Button } from '@/components/admin/ui';
import ServerPanel from '@/components/admin/ServerPanel';
import DatapacksPanel from '@/components/admin/DatapacksPanel';
import GalleryPanel from '@/components/admin/GalleryPanel';
import CrewPanel from '@/components/admin/CrewPanel';
import { confirmLeave, hasUnsaved } from '@/components/admin/unsaved';

const MapPanel = dynamic(() => import('@/components/admin/MapPanel'), { ssr: false });

const TABS = [
  { id: 'server',    label: 'Þjónn' },
  { id: 'datapacks', label: 'Gagnapakkar' },
  { id: 'gallery',   label: 'Myndasafn' },
  { id: 'map',       label: 'Landakort' },
  { id: 'crew',      label: 'Hópurinn' },
] as const;
type Tab = typeof TABS[number]['id'];

const isTab = (v: string): v is Tab => TABS.some(t => t.id === v);

/** The tab lives in the URL hash, so a reload or a shared link lands on the same one. */
function useHashTab(): [Tab, (t: Tab) => void] {
  const [tab, setTabState] = useState<Tab>('server');
  useEffect(() => {
    const read = () => { const h = window.location.hash.slice(1); if (isTab(h)) setTabState(h); };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  const setTab = useCallback((t: Tab) => { window.location.hash = t; setTabState(t); }, []);
  return [tab, setTab];
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useHashTab();
  /* The map editor holds work in progress (painted ground, moved pins) until
     it is saved, so once opened it stays mounted behind the other tabs rather
     than being thrown away by a click on one of them. With nothing unsaved it
     is loaded afresh on the way back, since the gallery tab links photos to
     places and writes the map too. */
  const [mapOpened, setMapOpened] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  useEffect(() => {
    if (tab !== 'map') return;
    setMapOpened(true);
    if (!hasUnsaved('map')) setMapKey(k => k + 1);
  }, [tab]);

  async function logout() {
    if (!confirmLeave()) return;
    await fetch('/api/admin/auth', { method: 'DELETE' }).catch(() => {});
    router.push('/admin/login');
    router.refresh();
  }
  const guardLeave = (e: React.MouseEvent) => { if (!confirmLeave()) e.preventDefault(); };

  return (
    <div className="a">
      <header className="a-bar">
        <div className="a-wrap a-bar__inner">
          <Link href="/" className="a-bar__mark" onClick={guardLeave}><Mark />JOÐ</Link>
          <span className="a-bar__title">Stjórnborð</span>
          <div className="a-bar__actions">
            <Link href="/" className="a-btn a-btn--ghost a-btn--small" onClick={guardLeave}>Forsíðan</Link>
            <Button tone="ghost" small onClick={logout}>Skrá út</Button>
          </div>
        </div>
      </header>

      <main className="a-wrap a-main">
        <nav className="a-tabs" aria-label="Hlutar stjórnborðs">
          {TABS.map(t => (
            <a key={t.id} href={`#${t.id}`} className={`a-tab${tab === t.id ? ' is-active' : ''}`} aria-current={tab === t.id ? 'page' : undefined} onClick={e => { e.preventDefault(); setTab(t.id); }}>
              {t.label}
            </a>
          ))}
        </nav>

        {tab === 'server'    && <ServerPanel />}
        {tab === 'datapacks' && <DatapacksPanel />}
        {tab === 'gallery'   && <GalleryPanel />}
        {mapOpened && <div hidden={tab !== 'map'}><MapPanel key={mapKey} /></div>}
        {tab === 'crew'      && <CrewPanel />}
      </main>
    </div>
  );
}
