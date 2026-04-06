'use client';

import { useEffect, useState, useRef, useCallback, FormEvent } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { CrewProfile, CrewPost } from '@/lib/crew';
import type { PlayerStat, StatsResponse } from '@/app/api/stats/route';
import { formatDate, formatAge } from '@/lib/format';
import Lightbox from '@/components/Lightbox';

const mono  = "'JetBrains Mono', monospace";
const sans  = "'Space Grotesk', sans-serif";
const green = '#00ff41';

const STAT_LABELS: { key: keyof PlayerStat; label: string; format: (v: number) => string }[] = [
  { key: 'playTimeHours',  label: 'PLAYTIME',  format: v => `${v}h`  },
  { key: 'mobKills',       label: 'MOB KILLS', format: v => v.toLocaleString() },
  { key: 'deaths',         label: 'DEATHS',    format: v => v.toLocaleString() },
  { key: 'itemsCrafted',   label: 'CRAFTED',   format: v => v.toLocaleString() },
  { key: 'distanceWalked', label: 'WALKED',    format: v => `${(v / 100000).toFixed(1)} km` },
];

// ─── Achievement badges ───────────────────────────────────────────────────────

interface BadgeDef { id: string; label: string; category: string; check: (s: PlayerStat) => boolean }

const BADGE_DEFS: BadgeDef[] = [
  { id: 'played-10h',    label: 'Newbie',           category: 'playtime', check: s => s.playTimeHours  >= 10    },
  { id: 'played-100h',   label: 'Active Player',    category: 'playtime', check: s => s.playTimeHours  >= 100   },
  { id: 'played-500h',   label: 'MVP player!',      category: 'playtime', check: s => s.playTimeHours  >= 500   },
  { id: 'kills-100',     label: '100 Mob Kills',    category: 'kills',    check: s => s.mobKills       >= 100   },
  { id: 'kills-1k',      label: 'Mob Slayer',       category: 'kills',    check: s => s.mobKills       >= 1000  },
  { id: 'kills-5k',      label: 'Mob Butcher',      category: 'kills',    check: s => s.mobKills       >= 5000  },
  { id: 'walked-100km',  label: 'Map Explorer',     category: 'distance', check: s => s.distanceWalked >= 100 * 100_000 },
  { id: 'walked-500km',  label: 'World Traveller',  category: 'distance', check: s => s.distanceWalked >= 500 * 100_000 },
  { id: 'deaths-10',     label: 'Clumsy',           category: 'deaths',   check: s => s.deaths         >= 10    },
  { id: 'deaths-50',     label: 'Not So Lucky',     category: 'deaths',   check: s => s.deaths         >= 50    },
  { id: 'crafted-1k',    label: 'Crafter',          category: 'crafted',  check: s => s.itemsCrafted   >= 1000  },
  { id: 'pvp',           label: 'PvP',              category: 'pvp',      check: s => s.playerKills    >= 1     },
];

function AchievementBadges({ stat }: { stat: PlayerStat }) {
  // Keep only the highest earned tier per category (badges are ordered low→high)
  const topPerCategory = new Map<string, BadgeDef>();
  for (const b of BADGE_DEFS) {
    if (b.check(stat)) topPerCategory.set(b.category, b);
  }
  const earned = Array.from(topPerCategory.values());
  if (earned.length === 0) return null;

  return (
    <div style={{ marginBottom: '3rem' }}>
      <p style={{ fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.25em', color: green, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
        ACHIEVEMENTS
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {earned.map(b => (
          <span
            key={b.id}
            style={{
              fontFamily:    mono,
              fontSize:      '0.5rem',
              letterSpacing: '0.12em',
              color:         '#f0a500',
              background:    'rgba(240,165,0,0.06)',
              border:        '1px solid rgba(240,165,0,0.25)',
              padding:       '0.25rem 0.55rem',
              textTransform: 'uppercase',
            }}
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Login modal ─────────────────────────────────────────────────────────────

function LoginModal({ username, onSuccess, onClose }: { username: string; onSuccess: () => void; onClose: () => void }) {
  const [token,   setToken]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/crew/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, token }),
      });
      if (res.ok) { onSuccess(); onClose(); }
      else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? 'Invalid token.');
      }
    } catch { setError('Network error — try again.'); }
    finally   { setLoading(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', padding: '2rem', width: '100%', maxWidth: '340px' }}>
        <p style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.3em', color: green, marginBottom: '1.5rem', textTransform: 'uppercase' }}>LOGIN AS {username}</p>
        <input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="Your crew token..." autoFocus
          style={{ width: '100%', background: '#111', border: `1px solid ${error ? '#ff4466' : '#2a2a2a'}`, color: '#f0f0f0', fontFamily: mono, fontSize: '0.8rem', padding: '0.5rem 0.7rem', outline: 'none', boxSizing: 'border-box', marginBottom: error ? '0.3rem' : '1rem' }} />
        {error && <p style={{ fontFamily: mono, fontSize: '0.6rem', color: '#ff4466', marginBottom: '0.8rem' }}>{error}</p>}
        <button type="submit" disabled={loading || !token} style={{ width: '100%', background: token && !loading ? green : '#1a1a1a', color: token && !loading ? '#080808' : '#333', border: 'none', fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.2em', padding: '0.6rem', cursor: token && !loading ? 'pointer' : 'not-allowed', textTransform: 'uppercase' }}>
          {loading ? 'CHECKING...' : 'LOGIN →'}
        </button>
      </form>
    </div>
  );
}

// ─── Profile page ─────────────────────────────────────────────────────────────

export default function CrewProfilePage({ params }: { params: { username: string } }) {
  const { username } = params;

  const [profile,       setProfile]       = useState<CrewProfile | null>(null);
  const [session,       setSession]       = useState<string | null>(null);
  const [showLogin,     setShowLogin]     = useState(false);
  const [editingBio,    setEditingBio]    = useState(false);
  const [bioText,       setBioText]       = useState('');
  const [newPost,       setNewPost]       = useState('');
  const [posting,       setPosting]       = useState(false);
  const [postError,     setPostError]     = useState('');
  const [bioError,      setBioError]      = useState('');
  const [photoError,    setPhotoError]    = useState('');
  const [playerStats,   setPlayerStats]   = useState<PlayerStat | null>(null);
  const [statsMeta,     setStatsMeta]     = useState<{ source: string; cachedAt: string | null } | null>(null);
  // Post editing
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editText,      setEditText]      = useState('');
  const [editSaving,    setEditSaving]    = useState(false);
  // Photo lightbox
  const [lightboxIdx,   setLightboxIdx]   = useState<number | null>(null);

  const fileRef  = useRef<HTMLInputElement>(null);
  const isOwner  = !!session && session.toLowerCase() === username.toLowerCase();

  async function loadProfile() {
    const res = await fetch(`/api/crew/${username}`);
    if (res.ok) {
      const p = await res.json() as CrewProfile;
      setProfile(p);
      setBioText(p.bio);
    }
  }

  async function checkSession() {
    try {
      const res = await fetch('/api/crew/me');
      if (res.ok) {
        const { username: loggedIn } = await res.json() as { username: string | null };
        if (loggedIn) { setSession(loggedIn); localStorage.setItem('jod_crew_user', loggedIn); }
        else          { setSession(null);     localStorage.removeItem('jod_crew_user'); }
      }
    } catch {
      const stored = localStorage.getItem('jod_crew_user');
      if (stored) setSession(stored);
    }
  }

  useEffect(() => {
    loadProfile();
    checkSession();
    fetch('/api/stats')
      .then(r => r.json())
      .then((data: StatsResponse) => {
        const row = data.players.find(p => p.username.toLowerCase() === username.toLowerCase());
        setPlayerStats(row ?? null);
        setStatsMeta({ source: data.source, cachedAt: data.cachedAt });
      })
      .catch(() => {});
  // Intentionally re-runs only when username changes — fetch functions are defined
  // inline and don't need to be listed; adding them would cause an infinite loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  function onLoginSuccess() { checkSession(); loadProfile(); }
  async function logout() { await fetch('/api/crew/auth', { method: 'DELETE' }); setSession(null); localStorage.removeItem('jod_crew_user'); }

  async function saveBio() {
    setBioError('');
    const res = await fetch(`/api/crew/${username}/bio`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bio: bioText }) });
    if (res.ok) { setProfile(p => p ? { ...p, bio: bioText } : p); setEditingBio(false); }
    else { const data = await res.json().catch(() => ({})) as { error?: string }; setBioError(data.error ?? 'Failed to save bio.'); }
  }

  async function submitPost(e: FormEvent) {
    e.preventDefault();
    if (!newPost.trim()) return;
    setPosting(true); setPostError('');
    try {
      const res = await fetch(`/api/crew/${username}/posts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: newPost }) });
      if (res.ok) { const post = await res.json() as CrewPost; setProfile(p => p ? { ...p, posts: [post, ...p.posts] } : p); setNewPost(''); }
      else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        if (res.status === 401) { setPostError('Session expired — please log in again.'); setSession(null); localStorage.removeItem('jod_crew_user'); }
        else                    { setPostError(data.error ?? 'Failed to post — try again.'); }
      }
    } catch { setPostError('Network error — try again.'); }
    finally   { setPosting(false); }
  }

  async function deletePost(id: string) {
    const res = await fetch(`/api/crew/${username}/posts/${id}`, { method: 'DELETE' });
    if (res.ok) setProfile(p => p ? { ...p, posts: p.posts.filter(post => post.id !== id) } : p);
  }

  function startEditPost(post: CrewPost) { setEditingPostId(post.id); setEditText(post.text); }
  function cancelEditPost()              { setEditingPostId(null); setEditText(''); }

  async function saveEditPost(id: string) {
    if (!editText.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/crew/${username}/posts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: editText }) });
      if (res.ok) {
        const updated = await res.json() as CrewPost;
        setProfile(p => p ? { ...p, posts: p.posts.map(post => post.id === id ? updated : post) } : p);
        cancelEditPost();
      }
    } catch { /* non-fatal */ }
    finally   { setEditSaving(false); }
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`/api/crew/${username}/photos`, { method: 'POST', body: fd });
      if (res.ok) { const photo = await res.json(); setProfile(p => p ? { ...p, photos: [photo, ...p.photos] } : p); }
      else { const data = await res.json().catch(() => ({})) as { error?: string }; setPhotoError(data.error ?? 'Upload failed.'); }
    } catch { setPhotoError('Network error — upload failed.'); }
    if (fileRef.current) fileRef.current.value = '';
  }

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const prevPhoto     = useCallback(() => setLightboxIdx(i => i !== null && profile ? (i - 1 + profile.photos.length) % profile.photos.length : null), [profile]);
  const nextPhoto     = useCallback(() => setLightboxIdx(i => i !== null && profile ? (i + 1) % profile.photos.length : null), [profile]);

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

      {/* Photo lightbox */}
      {lightboxIdx !== null && (
        <Lightbox
          photos={profile.photos.map(p => ({ src: p.filename, title: p.caption || undefined }))}
          currentIndex={lightboxIdx}
          onClose={closeLightbox}
          onPrev={prevPhoto}
          onNext={nextPhoto}
        />
      )}

      {/* Back + auth controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <Link href="/crew" style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.2em', color: green, textDecoration: 'none', textTransform: 'uppercase' }}>
          ← CREW
        </Link>
        <div style={{ flex: 1 }} />
        {isOwner ? (
          <button onClick={logout} style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', background: 'none', color: '#ff4466', border: '1px solid #ff446633', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>LOGOUT</button>
        ) : (
          <button onClick={() => setShowLogin(true)} style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', background: 'none', color: '#444', border: '1px solid #2a2a2a', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>EDIT PROFILE</button>
        )}
      </div>

      {/* Profile header */}
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', marginBottom: '3rem', flexWrap: 'wrap' }}>
        <div style={{ width: '96px', height: '96px', flexShrink: 0, border: '1px solid #2a2a2a', overflow: 'hidden', imageRendering: 'pixelated' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://crafatar.com/renders/head/${username}?size=96&overlay`} alt={username}
            style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
            onError={e => { (e.target as HTMLImageElement).src = `https://mc-heads.net/head/${username}/128`; }} />
        </div>

        <div style={{ flex: 1 }}>
          <motion.h1
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            style={{ fontFamily: sans, fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: '#f0f0f0', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}
          >
            {profile.username}
          </motion.h1>

          {editingBio && isOwner ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '480px' }}>
              <textarea value={bioText} onChange={e => setBioText(e.target.value)} maxLength={500} rows={3}
                style={{ background: '#111', border: '1px solid #2a2a2a', color: '#ccc', fontFamily: mono, fontSize: '0.7rem', padding: '0.5rem', outline: 'none', resize: 'vertical', lineHeight: 1.6 }} />
              {bioError && <p style={{ fontFamily: mono, fontSize: '0.55rem', color: '#ff4466' }}>{bioError}</p>}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={saveBio} style={{ fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: green + '22', color: green, border: `1px solid ${green}44`, padding: '0.3rem 0.7rem', cursor: 'pointer' }}>SAVE</button>
                <button onClick={() => { setEditingBio(false); setBioError(''); }} style={{ fontFamily: mono, fontSize: '0.55rem', background: 'none', color: '#444', border: '1px solid #2a2a2a', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>✕</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <p style={{ fontFamily: mono, fontSize: '0.7rem', color: profile.bio ? '#666' : '#2a2a2a', lineHeight: 1.6, fontStyle: profile.bio ? 'normal' : 'italic' }}>
                {profile.bio || 'No bio yet.'}
              </p>
              {isOwner && (
                <button onClick={() => setEditingBio(true)} style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', color: '#2a2a2a', border: '1px solid #1a1a1a', padding: '0.2rem 0.5rem', cursor: 'pointer', flexShrink: 0 }}>EDIT BIO</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {(playerStats || statsMeta?.source === 'unavailable') && (
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <p style={{ fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.25em', color: green, textTransform: 'uppercase' }}>STATS</p>
            {statsMeta?.source === 'cached' && statsMeta.cachedAt && (
              <span style={{ fontFamily: mono, fontSize: '0.45rem', color: '#333', letterSpacing: '0.1em' }}>LAST UPDATED {formatAge(statsMeta.cachedAt).toUpperCase()}</span>
            )}
          </div>
          {playerStats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1px', background: '#1a1a1a', maxWidth: '640px' }}>
              {STAT_LABELS.map(({ key, label, format }) => (
                <div key={key} style={{ background: '#0d0d0d', padding: '0.75rem 1rem' }}>
                  <p style={{ fontFamily: sans, fontSize: '1.1rem', fontWeight: 700, color: '#f0f0f0', marginBottom: '0.15rem' }}>{format(playerStats[key] as number)}</p>
                  <p style={{ fontFamily: mono, fontSize: '0.45rem', color: '#333', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontFamily: mono, fontSize: '0.55rem', color: '#2a2a2a', fontStyle: 'italic' }}>No stat data yet.</p>
          )}
        </div>
      )}

      {/* Achievement badges */}
      {playerStats && <AchievementBadges stat={playerStats} />}

      {/* Posts */}
      <div style={{ maxWidth: '640px', marginBottom: '3rem' }}>
        <p style={{ fontFamily: mono, fontSize: '0.6rem', letterSpacing: '0.25em', color: green, textTransform: 'uppercase', marginBottom: '1rem' }}>UPDATES</p>

        {isOwner && (
          <form onSubmit={submitPost} style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <textarea value={newPost} onChange={e => { setNewPost(e.target.value); setPostError(''); }} placeholder="What's happening on the server..." maxLength={1000} rows={2}
              style={{ background: '#111', border: `1px solid ${postError ? '#ff4466' : '#2a2a2a'}`, color: '#ccc', fontFamily: mono, fontSize: '0.7rem', padding: '0.6rem', outline: 'none', resize: 'vertical', lineHeight: 1.5 }} />
            {postError && <p style={{ fontFamily: mono, fontSize: '0.55rem', color: '#ff4466' }}>{postError}</p>}
            <button type="submit" disabled={posting || !newPost.trim()} style={{ alignSelf: 'flex-end', fontFamily: mono, fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', background: newPost.trim() ? green + '22' : 'none', color: newPost.trim() ? green : '#333', border: `1px solid ${newPost.trim() ? green + '44' : '#1a1a1a'}`, padding: '0.35rem 0.8rem', cursor: newPost.trim() ? 'pointer' : 'not-allowed' }}>
              {posting ? 'POSTING...' : 'POST →'}
            </button>
          </form>
        )}

        {profile.posts.length === 0 ? (
          <p style={{ fontFamily: mono, fontSize: '0.6rem', color: '#2a2a2a', fontStyle: 'italic' }}>
            {isOwner ? 'Nothing posted yet — share what\'s happening on the server.' : 'No posts yet.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#1a1a1a' }}>
            {profile.posts.map(post => (
              <div key={post.id} style={{ background: '#0d0d0d', padding: '0.8rem 1rem' }}>
                {editingPostId === post.id ? (
                  /* Inline edit mode */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <textarea value={editText} onChange={e => setEditText(e.target.value)} maxLength={1000} rows={3}
                      autoFocus
                      style={{ background: '#111', border: '1px solid #2a2a2a', color: '#ccc', fontFamily: mono, fontSize: '0.7rem', padding: '0.5rem', outline: 'none', resize: 'vertical', lineHeight: 1.5 }} />
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => saveEditPost(post.id)} disabled={editSaving || !editText.trim()}
                        style={{ fontFamily: mono, fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: green + '22', color: green, border: `1px solid ${green}44`, padding: '0.25rem 0.6rem', cursor: 'pointer' }}>
                        {editSaving ? 'SAVING...' : 'SAVE'}
                      </button>
                      <button onClick={cancelEditPost} style={{ fontFamily: mono, fontSize: '0.5rem', background: 'none', color: '#444', border: '1px solid #2a2a2a', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>✕</button>
                    </div>
                  </div>
                ) : (
                  /* Display mode */
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: mono, fontSize: '0.7rem', color: '#ccc', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{post.text}</p>
                      <p style={{ fontFamily: mono, fontSize: '0.5rem', color: '#2a2a2a', marginTop: '0.4rem', letterSpacing: '0.1em' }}>{formatDate(post.createdAt)}</p>
                    </div>
                    {isOwner && (
                      <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                        <button onClick={() => startEditPost(post)} title="Edit post"
                          style={{ fontFamily: mono, fontSize: '0.5rem', background: 'none', color: '#2a2a2a', border: 'none', cursor: 'pointer', padding: '0.2rem' }}>
                          edit
                        </button>
                        <button onClick={() => deletePost(post.id)}
                          style={{ fontFamily: mono, fontSize: '0.5rem', background: 'none', color: '#2a2a2a', border: 'none', cursor: 'pointer', padding: '0.2rem' }}>
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photos */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
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
        {photoError && <p style={{ fontFamily: mono, fontSize: '0.55rem', color: '#ff4466', marginBottom: '0.75rem' }}>{photoError}</p>}

        {profile.photos.length === 0 ? (
          <p style={{ fontFamily: mono, fontSize: '0.6rem', color: '#2a2a2a', fontStyle: 'italic' }}>
            {isOwner ? 'No screenshots yet — upload some to show off your builds.' : 'No photos yet.'}
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
            {profile.photos.map((photo, idx) => (
              <div
                key={photo.id}
                onClick={() => setLightboxIdx(idx)}
                style={{ aspectRatio: '16/9', overflow: 'hidden', border: '1px solid #1a1a1a', background: '#0d0d0d', position: 'relative', cursor: 'pointer' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.filename} alt={photo.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s ease' }}
                  onMouseEnter={e => { (e.target as HTMLImageElement).style.transform = 'scale(1.04)'; }}
                  onMouseLeave={e => { (e.target as HTMLImageElement).style.transform = 'scale(1)'; }} />
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
