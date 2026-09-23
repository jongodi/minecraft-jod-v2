'use client';

import '../admin.css';
import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mark } from '@/components/badlands/Bits';
import { Button, Field, Notice } from '@/components/admin/ui';

/* Only a path on this site. The middleware sets `next` to the page that sent
   the admin here, but anyone can write a link with their own: a
   javascript: value would run with the admin's fresh session, and an
   https:// or //host value would leave the site with it. */
function safeNext(v: string | null): string {
  return v && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : '/admin';
}

function LoginForm() {
  const next = safeNext(useSearchParams().get('next'));
  const inputRef = useRef<HTMLInputElement>(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
      if (res.ok) { window.location.href = next; return; }
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(`✗ ${data.error ?? 'Aðgangslykillinn er ekki réttur.'}`);
      setToken('');
      inputRef.current?.focus();
    } catch {
      setError('✗ Nettenging brást. Reyndu aftur.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="a a-login">
      <form className="a-panel a-login__box" onSubmit={submit}>
        <div className="a-login__mark">
          <Mark />
          <div>
            <p className="a-panel__title">Stjórnborð</p>
            <p className="a-muted">JOÐ, play.jodcraft.world</p>
          </div>
        </div>
        <div className="a-stack">
          <Field label="Aðgangslykill">
            <input ref={inputRef} className="a-input" type="password" value={token} onChange={e => setToken(e.target.value)} autoComplete="current-password" />
          </Field>
          <Notice text={error} />
          <Button type="submit" tone="primary" disabled={loading || !token}>{loading ? 'Staðfesti' : 'Skrá inn'}</Button>
        </div>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
