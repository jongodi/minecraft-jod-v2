'use client';

// Póstur: every letter the site sends, as it will arrive, with made-up words.
// Each letter wears one of two looks (Sólsetur or Varðeldur), chosen here and
// kept from then on, and a test of any of them can be sent to any address.
// What the letters say is in src/lib/email-copy.ts.
import { useCallback, useEffect, useState } from 'react';
import type { AdminMailResponse } from '@/app/api/admin/email/route';
import type { MailKind } from '@/lib/email-copy';
import type { Theme } from '@/lib/email-design';
import { Button, Field, Notice, Panel, Toggle, api, errText } from './ui';

const TO_KEY = 'jod-admin-mail-test-to';

export default function EmailPanel() {
  const [data, setData]     = useState<AdminMailResponse | null>(null);
  const [to, setTo]         = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy]     = useState<string | null>(null);
  /* Gmail and Outlook show no fonts of their own; this shows the letters as they do */
  const [plain, setPlain]   = useState(false);

  const load = useCallback(async () => {
    try { setData(await api<AdminMailResponse>('/api/admin/email')); }
    catch (e) { setNotice(errText(e)); }
  }, []);
  useEffect(() => {
    load();
    try { setTo(localStorage.getItem(TO_KEY) ?? ''); } catch { /* no storage */ }
  }, [load]);

  const themeName = (t: Theme) => data?.themes.find(x => x.id === t)?.name ?? t;

  function rememberTo(v: string) {
    setTo(v);
    try { localStorage.setItem(TO_KEY, v); } catch { /* no storage */ }
  }

  async function choose(kind: MailKind, theme: Theme) {
    setNotice('');
    setData(d => d && { ...d, mails: d.mails.map(m => (m.kind === kind ? { ...m, theme } : m)) });
    try { await api('/api/admin/email', { method: 'PUT', body: JSON.stringify({ kind, theme }) }); }
    catch (e) { setNotice(errText(e)); load(); }
  }

  async function test(kind: MailKind, theme: Theme, name: string) {
    setBusy(kind); setNotice('');
    try {
      await api('/api/admin/email', { method: 'POST', body: JSON.stringify({ kind, theme, to }) });
      setNotice(`✓ Prufa af „${name}“ var send á ${to.trim()}.`);
    } catch (e) { setNotice(errText(e)); }
    finally { setBusy(null); }
  }

  return (
    <Panel title="Póstur" sub="Bréfin sem vefurinn sendir, eins og þau berast, með tilbúnum orðum. Veldu útlit fyrir hvert bréf; það gildir strax um næsta bréf sem fer. Orðin sjálf eru í src/lib/email-copy.ts.">
      <Notice text={notice} />
      <div className="a-mail__tools">
        <div className="a-mail__to">
        <Field label="Senda prufu á" help={data && !data.canSend ? 'Póstur er ekki tengdur hér (RESEND_API_KEY vantar); prufur fara aðeins frá vefnum sjálfum.' : 'Prufan fer með [Prufa] fremst í efnislínunni.'}>
          <input className="a-input" type="email" value={to} onChange={e => rememberTo(e.target.value)} placeholder="nafn@dæmi.is" autoComplete="email" />
        </Field>
        </div>
        <Toggle checked={plain} onChange={setPlain} label="Sýna eins og Gmail (án letur vefsins; myndin efst helst eins)" />
      </div>

      {data === null ? <p className="a-muted">Sæki bréfin…</p> : (
        <div className="a-mail">
          {data.mails.map(m => (
            <section key={m.kind} className="a-mail__item" aria-label={m.name}>
              <div className="a-mail__head">
                <div>
                  <h3 className="a-mail__name">{m.name}</h3>
                  <p className="a-help">{m.when}</p>
                </div>
                <div className="a-inline" role="group" aria-label={`Útlit: ${m.name}`}>
                  {data.themes.map(t => (
                    <Button key={t.id} small on={m.theme === t.id} aria-pressed={m.theme === t.id} onClick={() => choose(m.kind, t.id)}>{t.name}</Button>
                  ))}
                </div>
              </div>
              <p className="a-mail__subject"><span className="a-muted">Efni</span> {m.subject}</p>
              <p className="a-mail__pre"><span className="a-muted">Forsýn</span> {m.preheader}</p>
              <iframe className="a-mail__frame" title={`${m.name}: ${themeName(m.theme)}`} src={`/api/admin/email?kind=${m.kind}&theme=${m.theme}${plain ? '&fonts=0' : ''}`} loading="lazy" sandbox="allow-popups allow-popups-to-escape-sandbox" />
              <div className="a-inline">
                <Button small tone="primary" onClick={() => test(m.kind, m.theme, m.name)} disabled={busy !== null || !data.canSend || !to.trim()}>
                  {busy === m.kind ? 'Sendi…' : `Senda prufu (${themeName(m.theme)})`}
                </Button>
              </div>
            </section>
          ))}
        </div>
      )}
    </Panel>
  );
}
