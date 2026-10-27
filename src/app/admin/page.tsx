'use client';

import './admin.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Mark } from '@/components/badlands/Bits';
import { Button } from '@/components/admin/ui';
import ServerPanel from '@/components/admin/ServerPanel';
import MapSyncPanel from '@/components/admin/MapSyncPanel';
import MapBasesPanel from '@/components/admin/MapBasesPanel';
import DatapacksPanel from '@/components/admin/DatapacksPanel';
import GalleryPanel from '@/components/admin/GalleryPanel';
import CrewPanel from '@/components/admin/CrewPanel';
import EmailPanel from '@/components/admin/EmailPanel';
import { confirmLeave, hasUnsaved } from '@/components/admin/unsaved';

const MapPanel = dynamic(() => import('@/components/admin/MapPanel'), { ssr: false });

const TABS = [
  { id: 'server',    label: 'Þjónn' },
  { id: 'datapacks', label: 'Gagnapakkar' },
  { id: 'gallery',   label: 'Myndasafn' },
  { id: 'map',       label: 'Landakort' },
  { id: 'crew',      label: 'Hópurinn' },
  { id: 'mail',      label: 'Póstur' },
] as const;
type Tab = typeof TABS[number]['id'];

const isTab = (v: string): v is Tab => TABS.some(t => t.id === v);

/** The tab lives in the URL hash, so a reload or a shared link lands on the same one.
    Back and Forward move between the tabs too, and ask first, as a click on a
    tab does, when the panel being left has unsaved work; told to stay, the
    address goes back to that panel's tab. */
function useHashTab(): [Tab, (t: Tab) => void] {
  const [tab, setTabState] = useState<Tab>('server');
  const shown = useRef<Tab>('server');
  useEffect(() => {
    const read = (e?: HashChangeEvent) => {
      const h = window.location.hash.slice(1);
      if (!isTab(h) || h === shown.current) return;
      /* the map keeps its work behind the other tabs; every other panel goes with its tab */
      if (e && shown.current !== 'map' && !confirmLeave([shown.current])) { history.pushState(null, '', `#${shown.current}`); return; }
      shown.current = h;
      setTabState(h);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  const setTab = useCallback((t: Tab) => { shown.current = t; window.location.hash = t; setTabState(t); }, []);
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
          <h1 className="a-bar__title">Stjórnborð</h1>
          <div className="a-bar__actions">
            <Link href="/" className="a-btn a-btn--ghost a-btn--small" onClick={guardLeave}>Forsíðan</Link>
            <Button tone="ghost" small onClick={logout}>Skrá út</Button>
          </div>
        </div>
      </header>

      <main id="efni" className="a-wrap a-main">
        <nav className="a-tabs" aria-label="Hlutar stjórnborðs">
          {TABS.map(t => (
            <a key={t.id} href={`#${t.id}`} className={`a-tab${tab === t.id ? ' is-active' : ''}`} aria-current={tab === t.id ? 'page' : undefined} onClick={e => {
                e.preventDefault();
                /* every panel but the map's goes away with its tab, and its unsaved work with it */
                if (t.id !== tab && tab !== 'map' && !confirmLeave([tab])) return;
                setTab(t.id);
              }}>
              {t.label}
            </a>
          ))}
        </nav>

        {tab === 'server'    && <><ServerPanel /><MapSyncPanel /><MapBasesPanel /></>}
        {tab === 'datapacks' && <DatapacksPanel />}
        {tab === 'gallery'   && <GalleryPanel />}
        {mapOpened && <div hidden={tab !== 'map'}><MapPanel key={mapKey} /></div>}
        {tab === 'crew'      && <CrewPanel />}
        {tab === 'mail'      && <EmailPanel />}
      </main>
    </div>
  );
}
