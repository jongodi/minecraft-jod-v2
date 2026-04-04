'use client';

import { useEffect, useState, use, useRef, FormEvent } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { CrewProfile, CrewPost } from '@/lib/crew';

const mono = "'JetBrains Mono', monospace";
const sans = "'Space Grotesk', sans-serif";
const green = '#00ff41';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Login modal ─────────────────────────────────────────────────────────────

function LoginModal({
  username,
  onSuccess,
  onClose,
}: { username: string; onSuccess: () => void; onClose: () => void }) {
  const [token,   setToken]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/crew/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, token }),
      });
      if (res.ok) { onSuccess(); onClose(); }
      else setError('Invalid token.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', padding: '2rem', width: '100%', maxWidth: '340px' }}>
        <p style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.3em', color: green, marginBottom: '1.5rem', textTransform: 'uppercase' }}>
          LOGIN AS {username}
        </p>
        <input
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Your crew token..."
          autoFocus
          style={{ width: '100%', background: '#111', border: `1px solid ${error ? '#ff4466' : '#2a2a2a'}`, color: '#f0f0f0', fontFamily: mono, fontSize: '0.8rem', padding: '0.5rem 0.7rem', outline: 'none', boxSizing: 'border-box', marginBottom: error ? '0.3rem' : '1rem' }}
        />
        {error && <p style={{ fontFamily: mono, fontSize: '0.6rem', color: '#ff4466', marginBottom: '0.8rem' }}>{error}</p>}
        <button type="submit" disabled={loading || !token} style={{ width: '100%', background: token && !loading ? green : '#1a1a1a', color: token && !loading ? '#080808' : '#333', border: 'none', fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.2em', padding: '0.6rem', cursor: token && !loading ? 'pointer' : 'not-allowed', textTransform: 'uppercase' }}>
          {loading ? 'CHECKING...' : 'LOGIN →'}
        </button>
      </form>
    </div>
  );
}

// ─── Profile page ─────────────────────────────────────────────────────────────

export default function CrewProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [profile,    setProfile]    = useState<CrewProfile | null>(null);
  const [session,    setSession]    = useState<string | null>(null); // logged-in username
  const [showLogin,  setShowLogin]  = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText,    setBioText]    = useState('');
  const [newPost,    setNewPost]    = useState('');
  const [posting,    setPosting]    = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isOwner = session?.toLowerCase() === username.toLowerCase();

  async function loadProfile() {
    const res = await fetch(`/api/crew/${username}`);
    if (res.ok) {
      const p = await res.json() as CrewProfile;
      setProfile(p);
      setBioText(p.bio);
    }
  }

  // Check if already logged in via cookie by calling a protected endpoint
  async function checkSession() {
    const res = await fetch('/api/crew/auth', { method: 'DELETE' });
    // We just want to know if the session is valid — don't actually log out
    // Instead call the bio endpoint with an empty patch to test auth
    if (res.ok) {
      // Re-fetch to check
    }
    // Just try the current session state from local memory
  }

  useEffect(() => {
    loadProfile();
    // Try to detect if user is logged in by checking localStorage fallback
    const stored = localStorage.getItem('jod_crew_user');
    if (stored) setSession(stored);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  function onLoginSuccess() {
    setSession(username);
    localStorage.setItem('jod_crew_user', username);
    loadProfile();
  }

  async function logout() {
    await fetch('/api/crew/auth', { method: 'DELETE' });
    setSession(null);
    localStorage.removeItem('jod_crew_user');
  }

  async function saveBio() {
    const res = await fetch(`/api/crew/${username}/bio`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ bio: bioText }),
    });
    if (res.ok) {
      setProfile(p => p ? { ...p, bio: bioText } : p);
      setEditingBio(false);
    }
  }

  async function submitPost(e: FormEvent) {
    e.preventDefault();
    if (!newPost.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/crew/${username}/posts`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text: newPost }),
    });
    if (res.ok) {
      const post = await res.json() as CrewPost;
      setProfile(p => p ? { ...p, posts: [post, ...p.posts] } : p);
      setNewPost('');
    }
    setPosting(false);
  }

  async function deletePost(id: string) {
    const res = await fetch(`/api/crew/${username}/posts/${id}`, { method: 'DELETE' });
    if (res.ok) setProfile(p => p ? { ...p, posts: p.posts.filter(post => post.id !== id) } : p);
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/crew/${username}/photos`, { method: 'POST', body: fd });
    if (res.ok) {
      const photo = await res.json();
      setProfile(p => p ? { ...p, photos: [photo, ...p.photos] } : p);
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  // Suppress lint – checkSession is unused intentionally above
  void checkSession;

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: mono, fontSize: '0.7rem', color: '#333', letterSpacing: '0.2em' }}>LOADING...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080808', padding: 'clamp(5rem, 12vw, 9rem) clamp(1.5rem, 6vw, 5rem)' }}>
      {showLogin && <LoginModal username={username} onSuccess={onLoginSuccess} onClose={() => setShowLogin(false)} />}

      {/* Back + auth controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <Link href="/crew" style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.2em', color: '#00ff41', textDecoration: 'none', textTransform: 'uppercase' }}>
          ← CREW
        </Link>
        <div style={{ flex: 1 }} />
        {isOwner ? (
          <button onClick={logout} style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', background: 'none', color: '#ff4466', border: '1px solid #ff446633', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>
            LOGOUT
          </button>
        ) : (
          <button onClick={() => setShowLogin(true)} style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', background: 'none', color: '#444', border: '1px solid #2a2a2a', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>
            EDIT PROFILE
          </button>
        )}
      </div>

      {/* Profile header */}
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', marginBottom: '3rem', flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{ width: '96px', height: '96px', flexShrink: 0, border: '1px solid #2a2a2a', overflow: 'hidden', imageRendering: 'pixelated' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://crafatar.com/renders/head/${username}?size=96&overlay`}
            alt={username}
            style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://mc-heads.net/head/${username}/128`;
            }}
          />
        </div>

        {/* Name + bio */}
        <div style={{ flex: 1 }}>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontFamily: sans, fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: '#f0f0f0', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}
          >
            {profile.username}
          </motion.h1>

          {editingBio && isOwner ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '480px' }}>
              <textarea
                value={bioText}
                onChange={e => setBioText(e.target.value)}
                maxLength={500}
                rows={3}
                style={{ background: '#111', border: '1px solid #2a2a2a', color: '#ccc', fontFamily: mono, fontSize: '0.7rem', padding: '0.5rem', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={saveBio} style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: green + '22', color: green, border: `1px solid ${green}44`, padding: '0.3rem 0.7rem', cursor: 'pointer' }}>SAVE</button>
                <button onClick={() => setEditingBio(false)} style={{ fontFamily: mono, fontSize: '0.55rem', background: 'none', color: '#444', border: '1px solid #2a2a2a', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>✕</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <p style={{ fontFamily: mono, fontSize: '0.7rem', color: profile.bio ? '#666' : '#2a2a2a', lineHeight: 1.6, fontStyle: profile.bio ? 'normal' : 'italic' }}>
                {profile.bio || 'No bio yet.'}
              </p>
              {isOwner && (
                <button onClick={() => setEditingBio(true)} style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', color: '#2a2a2a', border: '1px solid #1a1a1a', padding: '0.2rem 0.5rem', cursor: 'pointer', flexShrink: 0 }}>
                  EDIT BIO
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Posts */}
      <div style={{ maxWidth: '640px', marginBottom: '3rem' }}>
        <p style={{ fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.25em', color: green, textTransform: 'uppercase', marginBottom: '1rem' }}>
          UPDATES
        </p>

        {/* Post form */}
        {isOwner && (
          <form onSubmit={submitPost} style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <textarea
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
              placeholder="What's happening on the server..."
              maxLength={1000}
              rows={2}
              style={{ background: '#111', border: '1px solid #2a2a2a', color: '#ccc', fontFamily: mono, fontSize: '0.7rem', padding: '0.6rem', outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
            />
            <button type="submit" disabled={posting || !newPost.trim()} style={{ alignSelf: 'flex-end', fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', background: newPost.trim() ? green + '22' : 'none', color: newPost.trim() ? green : '#333', border: `1px solid ${newPost.trim() ? green + '44' : '#1a1a1a'}`, padding: '0.35rem 0.8rem', cursor: newPost.trim() ? 'pointer' : 'not-allowed' }}>
              {posting ? 'POSTING...' : 'POST →'}
            </button>
          </form>
        )}

        {profile.posts.length === 0 ? (
          <p style={{ fontFamily: mono, fontSize: '0.6rem', color: '#2a2a2a', fontStyle: 'italic' }}>No posts yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#1a1a1a' }}>
            {profile.posts.map(post => (
              <div key={post.id} style={{ background: '#0d0d0d', padding: '0.8rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: mono, fontSize: '0.7rem', color: '#ccc', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{post.text}</p>
                  <p style={{ fontFamily: mono, fontSize: '0.5rem', color: '#2a2a2a', marginTop: '0.4rem', letterSpacing: '0.1em' }}>{formatDate(post.createdAt)}</p>
                </div>
                {isOwner && (
                  <button onClick={() => deletePost(post.id)} style={{ fontFamily: mono, fontSize: '0.5rem', background: 'none', color: '#2a2a2a', border: 'none', cursor: 'pointer', padding: '0.2rem', flexShrink: 0 }}>✕</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photos */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <p style={{ fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.25em', color: green, textTransform: 'uppercase' }}>
            PHOTOS {profile.photos.length > 0 && `(${profile.photos.length})`}
          </p>
          {isOwner && (
            <>
              <input ref={fileRef} type="file" accept="image/*" onChange={uploadPhoto} style={{ display: 'none' }} id="crew-photo-upload" />
              <label htmlFor="crew-photo-upload" style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', border: `1px solid ${green}33`, color: green, padding: '0.25rem 0.6rem', cursor: 'pointer', background: green + '08' }}>
                + UPLOAD
              </label>
            </>
          )}
        </div>

        {profile.photos.length === 0 ? (
          <p style={{ fontFamily: mono, fontSize: '0.6rem', color: '#2a2a2a', fontStyle: 'italic' }}>No photos yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
            {profile.photos.map(photo => (
              <div key={photo.id} style={{ aspectRatio: '16/9', overflow: 'hidden', border: '1px solid #1a1a1a', background: '#0d0d0d', position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.filename} alt={photo.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {photo.caption && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', padding: '0.3rem 0.5rem' }}>
                    <p style={{ fontFamily: mono, fontSize: '0.5rem', color: '#ccc' }}>{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
