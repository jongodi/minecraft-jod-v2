'use client';

// The crew, from the admin's side: who has a password of their own, how much
// hangs on each wall, and the sign-in links. A link is handed over in the
// group chat or scanned; it is good for a week and a handful of devices, and
// can be closed early. A member who forgets their password gets it cleared
// here and a fresh link.
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
      load();
    } catch (e) { setNotice(errText(e)); }
    finally { setBusy(null); }
  }

  async function close(url: string) {
    setNotice('');
    try { await api('/api/admin/crew', { method: 'DELETE', body: JSON.stringify({ url }) }); setNotice('✓ Tenglinum var lokað.'); load(); }
    catch (e) { setNotice(errText(e)); }
  }

  async function clearPassword(username: string) {
    if (!confirm(`Hreinsa lykilorð ${username}? Viðkomandi þarf þá nýjan innskráningartengil til að velja sér annað.`)) return;
    setNotice('');
    try { await api('/api/admin/crew', { method: 'DELETE', body: JSON.stringify({ username, password: null }) }); setNotice(`✓ Lykilorð ${username} var hreinsað.`); load(); }
    catch (e) { setNotice(errText(e)); }
  }

  async function copy(url: string) {
    try { await navigator.clipboard.writeText(url); setCopied(true); }
    catch { setCopied(false); }
  }

  return (
    <Panel title="Hópurinn" sub="Félagi kemst inn með eigin lykilorði, sem hann velur sér á veggnum, eða með innskráningartengli héðan. Tengill gildir í viku og fyrir nokkur tæki; tækið sem opnar hann er skráð inn í eitt ár.">
      <Notice text={notice} />
      {rows === null ? <p className="a-muted">Sæki hópinn…</p> : (
        <table className="a-table">
          <thead>
            <tr><th>Félagi</th><th>Lykilorð</th><th>Á veggnum</th><th>Opnir tenglar</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.username}>
                <td>
                  <a href={`/crew/${r.username}`} target="_blank" rel="noreferrer">{r.username}</a>
                  <div className="a-muted">síðast {when(r.lastEntry)}</div>
                </td>
                <td>
                  {r.hasPassword
                    ? <><span className="a-update--ok">valið</span> <Button tone="ghost" small onClick={() => clearPassword(r.username)}>Hreinsa</Button></>
                    : <span className="a-muted">ekkert enn{r.hasToken ? ', aðgangslykill í umhverfi' : ''}</span>}
                </td>
                <td className="a-muted">{r.entryCount} {r.entryCount === 1 ? 'færsla' : 'færslur'} · {r.photoCount} {r.photoCount === 1 ? 'mynd' : 'myndir'}</td>
                <td>
                  {r.invites.length === 0 ? <span className="a-muted">engir</span> : (
                    <ul className="a-invites">
                      {r.invites.map(inv => (
                        <li key={inv.url}>
                          <span className="a-muted">{inv.uses} af {inv.maxUses} notuð · til {when(inv.expiresAt)}</span>
                          <Button tone="ghost" small onClick={() => copy(inv.url)}>Afrita</Button>
                          <Button tone="ghost" small onClick={() => close(inv.url)}>Loka</Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td><Button small onClick={() => mint(r.username)} disabled={busy !== null}>{busy === r.username ? 'Bý til…' : 'Nýr tengill'}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="a-help">Gleymt lykilorð: hreinsaðu það hér og sendu nýjan tengil; félaginn velur sér annað á veggnum. Aðgangslyklar í umhverfisbreytum (<code>CREW_TOKEN_…</code>) virka áfram undir „Þetta er ég“.</p>

      {invite && (
        <Modal title={`Innskráningartengill fyrir ${invite.username}`} onClose={() => setInvite(null)} width="34rem">
          <div className="a-stack">
            <p className="a-help">Sendu {invite.username} tengilinn eða láttu skanna kóðann. Hann gildir til {when(invite.expiresAt)} og fyrir {invite.maxUses} tæki; hvert tæki sem opnar hann er skráð inn sem {invite.username} í eitt ár. Á veggnum getur {invite.username} svo valið sér lykilorð.</p>
            <div className="a-qr" dangerouslySetInnerHTML={{ __html: invite.svg }} aria-label="QR-kóði með tenglinum" />
            <input className="a-input a-input--data" readOnly value={invite.url} onFocus={e => e.target.select()} aria-label="Tengill" />
            <div className="a-inline">
              <Button tone="primary" small onClick={() => copy(invite.url)}>{copied ? 'Afritað' : 'Afrita tengil'}</Button>
              <Button tone="ghost" small onClick={() => setInvite(null)}>Loka</Button>
            </div>
          </div>
        </Modal>
      )}
    </Panel>
  );
}
