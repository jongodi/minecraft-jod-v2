'use client';

// The crew, from the admin's side: who has a password of their own, how much
// hangs on each wall, each member's email address, and the sign-in links. A
// link is handed over in the group chat, scanned, or sent by post; it is good
// for a week and a handful of devices, and can be closed early. A member who
// forgets their password gets it cleared here and a fresh link.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { plural } from '@/lib/format';
import type { AdminCrewRow, InviteResponse } from '@/app/api/admin/crew/route';
import { Button, Field, Modal, Notice, Panel, Toggle, api, errText } from './ui';

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
  const [editing, setEditing] = useState<AdminCrewRow | null>(null);

  const load = useCallback(async () => {
    try { setRows(await api<AdminCrewRow[]>('/api/admin/crew')); }
    catch (e) { setNotice(errText(e)); setRows([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  /* a new link, shown with its QR code; with `send` it is mailed to the member too */
  async function mint(username: string, send = false) {
    setBusy(`${username}${send ? ':send' : ''}`); setNotice(''); setCopied(false);
    try {
      const res = await api<InviteResponse>('/api/admin/crew', { method: 'POST', body: JSON.stringify({ username, send }) });
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

  /* from the new link's dialog, the button itself says so; from a row, the notice at the top does */
  async function copy(url: string, fromRow = false) {
    try {
      await navigator.clipboard.writeText(url);
      if (fromRow) setNotice('✓ Tengillinn er afritaður.'); else setCopied(true);
    } catch {
      setCopied(false);
      setNotice(`✗ Vafrinn leyfði ekki að afrita. Tengillinn: ${url}`);
    }
  }

  return (
    <Panel title="Hópurinn" sub="Félagi kemst inn með eigin lykilorði, sem hann velur sér á veggnum, eða með innskráningartengli héðan. Tengill gildir í viku og fyrir nokkur tæki; tækið sem opnar hann er skráð inn í eitt ár.">
      <Notice text={notice} />
      {rows === null ? <p className="a-muted">Sæki hópinn…</p> : (
        <table className="a-table">
          <thead>
            <tr><th>Félagi</th><th>Nafn og netfang</th><th>Lykilorð</th><th>Á veggnum</th><th>Opnir tenglar</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.username}>
                <td>
                  <a href={`/crew/${r.username}`} target="_blank" rel="noreferrer">{r.username}</a>
                  <div className="a-muted">síðast {when(r.lastEntry)}</div>
                </td>
                <td>
                  {r.name ? <div className="a-crew__name">{r.name}</div> : <div className="a-muted">ekkert nafn, bréfin segja {r.username}</div>}
                  {r.email
                    ? <><span className="a-data">{r.email.address}</span>{!r.email.nights && <div className="a-muted">enginn póstur um spilakvöld</div>}</>
                    : <span className="a-muted">ekkert netfang</span>}
                  <div><Button tone="ghost" small onClick={() => setEditing(r)}>{r.email || r.name ? 'Breyta' : 'Setja inn'}</Button></div>
                </td>
                <td>
                  {r.hasPassword
                    ? <><span className="a-update--ok">valið</span> <Button tone="ghost" small onClick={() => clearPassword(r.username)}>Hreinsa</Button></>
                    : <span className="a-muted">ekkert enn{r.hasToken ? ', aðgangslykill í umhverfi' : ''}</span>}
                </td>
                <td className="a-muted">{r.entryCount} {plural(r.entryCount, 'færsla', 'færslur')} · {r.photoCount} {plural(r.photoCount, 'mynd', 'myndir')}</td>
                <td>
                  {r.invites.length === 0 ? <span className="a-muted">engir</span> : (
                    <ul className="a-invites">
                      {r.invites.map(inv => (
                        <li key={inv.url}>
                          <span className="a-muted">{inv.uses} af {inv.maxUses} notuð · til {when(inv.expiresAt)}</span>
                          <Button tone="ghost" small onClick={() => copy(inv.url, true)}>Afrita</Button>
                          <Button tone="ghost" small onClick={() => close(inv.url)}>Loka</Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td>
                  <div className="a-inline">
                    <Button small onClick={() => mint(r.username)} disabled={busy !== null}>{busy === r.username ? 'Bý til…' : 'Nýr tengill'}</Button>
                    {r.email && <Button small onClick={() => mint(r.username, true)} disabled={busy !== null} title={`Sendir nýjan tengil á ${r.email.address}`}>{busy === `${r.username}:send` ? 'Sendi…' : 'Senda í pósti'}</Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="a-help">Gleymt lykilorð: hreinsaðu það hér og sendu nýjan tengil; félaginn velur sér annað á veggnum. Sé netfang skráð getur félaginn líka beðið sjálfur um tengil í pósti undir „Þetta er ég“, og fær póst um spilakvöldin nema hann afþakki það. Bréfin kalla hvern og einn nafninu sem er skráð, annars notandanafninu. Aðgangslyklar í umhverfisbreytum (<code>CREW_TOKEN_…</code>) virka áfram undir „Þetta er ég“.</p>

      {editing && <ContactModal row={editing} onClose={() => setEditing(null)} onSaved={msg => { setEditing(null); setNotice(msg); load(); }} />}

      {invite && (
        <Modal title={`Innskráningartengill fyrir ${invite.username}`} onClose={() => setInvite(null)} width="34rem">
          <div className="a-stack">
            {invite.sentTo && <Notice text={`✓ Tengillinn var sendur á ${invite.sentTo}.`} />}
            <p className="a-help">{invite.sentTo ? 'Hann er líka hér, til að afrita eða skanna.' : `Sendu ${invite.username} tengilinn eða láttu skanna kóðann.`} Hann gildir til {when(invite.expiresAt)} og fyrir {invite.maxUses} tæki; hvert tæki sem opnar hann er skráð inn sem {invite.username} í eitt ár. Á veggnum getur {invite.username} svo valið sér lykilorð.</p>
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

/** A member's name and address, set or cleared by the admin, so a link can
    be mailed to someone who has never been in, and the letters call them by
    name. An empty field clears it. */
function ContactModal({ row, onClose, onSaved }: { row: AdminCrewRow; onClose: () => void; onSaved: (msg: string) => void }) {
  const [name, setName]       = useState(row.name ?? '');
  const [address, setAddress] = useState(row.email?.address ?? '');
  const [nights, setNights]   = useState(row.email?.nights ?? true);
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api('/api/admin/crew', { method: 'PUT', body: JSON.stringify({ username: row.username, name, email: address, nights }) });
      onSaved(`✓ Vistað fyrir ${row.username}.`);
    } catch (err) { setError(errText(err)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={`Nafn og netfang: ${row.username}`} onClose={onClose} width="30rem">
      <form className="a-stack" onSubmit={save}>
        <Field label="Nafn" help={`Það sem bréfin kalla ${row.username}, til dæmis fornafnið. Autt nafn: bréfin segja ${row.username}. Sést aðeins í pósti, ekki á vefnum.`}>
          <input className="a-input" value={name} onChange={e => setName(e.target.value)} placeholder={row.username} maxLength={40} autoComplete="off" autoFocus />
        </Field>
        <Field label="Netfang" help="Þangað fara innskráningartenglar og póstur um spilakvöld. Félaginn sér þetta og getur breytt því á veggnum sínum; aðrir sjá það ekki. Autt netfang: enginn póstur.">
          <input className="a-input" type="email" value={address} onChange={e => setAddress(e.target.value)} placeholder="nafn@dæmi.is" autoComplete="off" />
        </Field>
        <Toggle checked={nights} onChange={setNights} label="Póstur um spilakvöld" />
        <Notice text={error} />
        <div className="a-inline">
          <Button tone="primary" small type="submit" disabled={saving}>{saving ? 'Vista…' : 'Vista'}</Button>
          <Button tone="ghost" small onClick={onClose}>Hætta við</Button>
        </div>
      </form>
    </Modal>
  );
}
