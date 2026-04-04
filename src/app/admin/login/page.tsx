'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const next         = searchParams.get('next') ?? '/admin';
  const inputRef     = useRef<HTMLInputElement>(null);

  const [token,   setToken]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token }),
      });
      if (res.ok) {
        router.push(next);
        router.refresh();
      } else {
        setError('Invalid token.');
        setToken('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Network error — try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight:      '100vh',
      background:     '#080808',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      fontFamily:     "'JetBrains Mono', monospace",
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width:     '100%',
          maxWidth:  '360px',
          padding:   '2rem',
          border:    '1px solid #1a1a1a',
          background: '#0d0d0d',
        }}
      >
        <p style={{ fontSize: '0.55rem', letterSpacing: '0.35em', color: '#00ff41', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
          JOD ADMIN
        </p>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.8rem', fontWeight: 900, color: '#f0f0f0', letterSpacing: '-0.03em', marginBottom: '2rem' }}>
          ACCESS
        </h1>

        <label style={{ display: 'block', fontSize: '0.55rem', letterSpacing: '0.2em', color: '#444', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
          Admin Token
        </label>
        <input
          ref={inputRef}
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Enter token..."
          autoComplete="current-password"
          style={{
            width:        '100%',
            background:   '#111',
            border:       `1px solid ${error ? '#ff4466' : '#2a2a2a'}`,
            color:        '#f0f0f0',
            fontFamily:   "'JetBrains Mono', monospace",
            fontSize:     '0.8rem',
            padding:      '0.6rem 0.8rem',
            outline:      'none',
            boxSizing:    'border-box',
            marginBottom: error ? '0.4rem' : '1.5rem',
          }}
        />
        {error && (
          <p style={{ fontSize: '0.6rem', color: '#ff4466', marginBottom: '1rem', letterSpacing: '0.05em' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !token}
          style={{
            width:         '100%',
            background:    token && !loading ? '#00ff41' : '#1a1a1a',
            color:         token && !loading ? '#080808' : '#333',
            border:        'none',
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.65rem',
            letterSpacing: '0.2em',
            padding:       '0.7rem',
            cursor:        token && !loading ? 'pointer' : 'not-allowed',
            textTransform: 'uppercase',
            transition:    'all 0.2s ease',
          }}
        >
          {loading ? 'VERIFYING...' : 'ENTER →'}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
