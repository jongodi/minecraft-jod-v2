'use client';

import { useEffect, type ReactNode } from 'react';

/* The small vocabulary every admin panel is built from. */

export function Panel({ title, sub, tools, children }: { title: string; sub?: ReactNode; tools?: ReactNode; children: ReactNode }) {
  return (
    <section className="a-panel">
      <div className="a-panel__head">
        <div>
          <h2 className="a-panel__title">{title}</h2>
          {sub && <p className="a-panel__sub">{sub}</p>}
        </div>
        {tools && <div className="a-panel__tools">{tools}</div>}
      </div>
      {children}
    </section>
  );
}

type Tone = 'default' | 'primary' | 'ghost' | 'danger';
export function Button({ tone = 'default', small, icon, on, className, type = 'button', ...rest }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; small?: boolean; icon?: boolean; on?: boolean }) {
  const cls = ['a-btn', tone !== 'default' ? `a-btn--${tone}` : '', small ? 'a-btn--small' : '', icon ? 'a-btn--icon' : '', on ? 'is-on' : '', className ?? ''].filter(Boolean).join(' ');
  return <button type={type} className={cls} {...rest} />;
}

export function Field({ label, help, children }: { label: string; help?: ReactNode; children: ReactNode }) {
  return (
    <label className="a-field">
      <span className="a-label">{label}</span>
      {children}
      {help && <span className="a-help">{help}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; disabled?: boolean }) {
  return (
    <label className="a-toggle">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span className="a-toggle__box" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

/** A status line. Messages starting with a check mark read as success, with a cross as failure. */
export function Notice({ text, tone }: { text: string; tone?: 'ok' | 'err' | 'warn' }) {
  if (!text) return null;
  const t = tone ?? (text.startsWith('✓') ? 'ok' : text.startsWith('✗') ? 'err' : undefined);
  return <p className={`a-notice${t ? ` a-notice--${t}` : ''}`} role="status" aria-live="polite">{text}</p>;
}

export function Modal({ title, onClose, width, children, foot }: { title: string; onClose: () => void; width?: string; children: ReactNode; foot?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="a-modal" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="a-modal__box" style={width ? ({ '--w': width } as React.CSSProperties) : undefined} onClick={e => e.stopPropagation()}>
        <div className="a-modal__head">
          <h3 className="a-modal__title">{title}</h3>
          <Button tone="ghost" small icon onClick={onClose} aria-label="Loka">✕</Button>
        </div>
        {children}
        {foot && <div className="a-modal__foot">{foot}</div>}
      </div>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) { return <kbd className="a-kbd">{children}</kbd>; }

/** Fetch JSON and turn any failure into an Icelandic message. */
export async function api<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { cache: 'no-store', ...init, headers: { ...(init?.body && typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}), ...(init?.headers ?? {}) } });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* not json */ }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error
      ?? (res.status === 401 ? 'Innskráningin er útrunnin. Skráðu þig inn aftur.' : res.status === 413 ? 'Skráin er of stór fyrir þjóninn.' : `Villa ${res.status}`);
    throw new Error(msg);
  }
  return data as T;
}
export const errText = (e: unknown, fallback = 'Villa í nettengingu') => `✗ ${e instanceof Error && e.message ? e.message : fallback}`;
