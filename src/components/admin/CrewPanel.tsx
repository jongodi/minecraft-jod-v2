'use client';

// The crew, from the admin's side: who has a token set, how much hangs on
// each wall, and a one-time sign-in link for any member. The link (or its
// QR code) is handed over in the group chat; opening it signs that phone or
// computer in for a year, and the key is spent.
import { useCallback, useEffect, useState } from 'react';
import type { AdminCrewRow, InviteResponse } from '@/app/api/admin/crew/route';
import { Button, Modal, Notice, Panel, api, errText } from './ui';

function when(iso: string | null): string {
  if (!iso) return 'ekkert enn';
  return new Date(iso).toLocaleDateString('is-IS', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CrewPanel() {
  const [rows, setRows]     = useState<AdminCrewRow[] | null>(null);
  const [notice, setNotice] = useState('');
  const [invite, setInvite] = useState<(InviteResponse & { username: string }) | null>(null);
  const [busy, setBusy]     = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try { setRows(await api<AdminCrewRow[]>('/api/admin/crew')); }
    catch (e) { setNotice(errText(e)); setRows([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function mint(username: string) {
    setBusy(username); setNotice(''); setCopied(false);
    try {
      const res = await api<InviteResponse>('/api/admin/crew', { method: 'POST', body: JSON.stringify({ username }) });
      setInvite({ ...res, username });
    } catch (e) { setNotice(errText(e)); }
    finally { setBusy(null); }
  }

  async function copy() {
    if (!invite) return;
    try { await navigator.clipboard.writeText(invite.url); setCopied(true); }
    catch { setCopied(false); }
  }

  return (
    <Panel title="Hópurinn" sub="Innskráningartenglar fyrir veggina. Hver tengill gildir í viku, virkar einu sinni, og tækið sem opnar hann er skráð inn í eitt ár.">
      <Notice text={notice} />
      {rows === null ? <p className="a-muted">Sæki hópinn…</p> : (
        <table className="a-table">
          <thead>
            <tr><th>Félagi</th><th>Aðgangslykill</th><th>Á veggnum</th><th>Síðast</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.username}>
                <td><a href={`/crew/${r.username}`} target="_blank" rel="noreferrer">{r.username}</a></td>
                <td className={r.hasToken ? 'a-update--ok' : 'a-muted'}>{r.hasToken ? 'stilltur' : 'enginn'}</td>
                <td className="a-muted">{r.entryCount} {r.entryCount === 1 ? 'færsla' : 'færslur'} · {r.photoCount} {r.photoCount === 1 ? 'mynd' : 'myndir'}</td>
                <td className="a-muted">{when(r.lastEntry)}</td>
                <td><Button small onClick={() => mint(r.username)} disabled={busy !== null}>{busy === r.username ? 'Bý til…' : 'Búa til innskráningartengil'}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="a-help">Aðgangslyklar í umhverfisbreytum (<code>CREW_TOKEN_…</code>) virka áfram sem varaleið undir „Þetta er ég“ á veggnum.</p>

      {invite && (
        <Modal title={`Innskráningartengill fyrir ${invite.username}`} onClose={() => setInvite(null)} width="34rem">
          <div className="a-stack">
            <p className="a-help">Sendu {invite.username} tengilinn eða láttu skanna kóðann. Hann gildir til {when(invite.expiresAt)} og virkar einu sinni; sá sem opnar hann er skráður inn sem {invite.username}.</p>
            <div className="a-qr" dangerouslySetInnerHTML={{ __html: invite.svg }} aria-label="QR-kóði með tenglinum" />
            <input className="a-input a-input--data" readOnly value={invite.url} onFocus={e => e.target.select()} aria-label="Tengill" />
            <div className="a-inline">
              <Button tone="primary" small onClick={copy}>{copied ? 'Afritað' : 'Afrita tengil'}</Button>
              <Button tone="ghost" small onClick={() => setInvite(null)}>Loka</Button>
            </div>
          </div>
        </Modal>
      )}
    </Panel>
  );
}
