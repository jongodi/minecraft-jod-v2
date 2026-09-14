'use client';

import '@/app/frontier.css';
import { useEffect, useState, useRef, useCallback, use, type FormEvent, type ChangeEvent } from 'react';
import Link from 'next/link';
import type { CrewProfile, CrewPost } from '@/lib/crew';
import type { PlayerStat, StatsResponse } from '@/app/api/stats/route';
import { formatDate } from '@/lib/format';
import TrailNav from '@/components/frontier/TrailNav';
import Footer from '@/components/frontier/Footer';
import PlayerHead from '@/components/frontier/PlayerHead';
import Lightbox from '@/components/frontier/Lightbox';
import { Star } from '@/components/frontier/Ornaments';
import { PAGE_LINKS, STAT_TABS } from '@/components/frontier/data';

// ─── Badges: the highest earned tier per category ─────────────────────────────

interface BadgeDef { id: string; label: string; category: string; check: (s: PlayerStat) => boolean }

const BADGE_DEFS: BadgeDef[] = [
  { id: 'played-10h',   label: 'Newbie',          category: 'playtime', check: s => s.playTimeHours  >= 10    },
  { id: 'played-100h',  label: 'Active player',   category: 'playtime', check: s => s.playTimeHours  >= 100   },
  { id: 'played-500h',  label: 'MVP',             category: 'playtime', check: s => s.playTimeHours  >= 500   },
  { id: 'kills-100',    label: '100 mob kills',   category: 'kills',    check: s => s.mobKills       >= 100   },
  { id: 'kills-1k',     label: 'Mob slayer',      category: 'kills',    check: s => s.mobKills       >= 1000  },
  { id: 'kills-5k',     label: 'Mob butcher',     category: 'kills',    check: s => s.mobKills       >= 5000  },
  { id: 'walked-100km', label: 'Map explorer',    category: 'distance', check: s => s.distanceWalked >= 100 * 100_000 },
  { id: 'walked-500km', label: 'World traveller', category: 'distance', check: s => s.distanceWalked >= 500 * 100_000 },
  { id: 'deaths-10',    label: 'Clumsy',          category: 'deaths',   check: s => s.deaths         >= 10    },
  { id: 'deaths-50',    label: 'Not so lucky',    category: 'deaths',   check: s => s.deaths         >= 50    },
  { id: 'crafted-1k',   label: 'Crafter',         category: 'crafted',  check: s => s.itemsCrafted   >= 1000  },
  { id: 'pvp',          label: 'PvP',             category: 'pvp',      check: s => s.playerKills    >= 1     },
];

function earnedBadges(stat: PlayerStat): BadgeDef[] {
  const top = new Map<string, BadgeDef>();
  for (const b of BADGE_DEFS) if (b.check(stat)) top.set(b.category, b);
  return Array.from(top.values());
}

// ─── Login ────────────────────────────────────────────────────────────────────

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
        setError(data.error ?? 'That token is not right.');
      }
    } catch { setError('Network error, try again.'); }
    finally   { setLoading(false); }
  }

  return (
    <div className="f-modal" onClick={onClose} role="dialog" aria-modal="true" aria-label="Log in">
      <form className="f-modal__box" onSubmit={submit} onClick={e => e.stopPropagation()}>
        <p className="f-modal__title">Log in as {username}</p>
        <p className="f-modal__sub">Your crew token is set by whoever runs the server.</p>
        <input
          type="password"
          className={`f-input${error ? ' is-error' : ''}`}
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Crew token"
          autoFocus
          autoComplete="current-password"
        />
        {error && <p className="f-err">{error}</p>}
        <div className="f-modal__actions">
          <button type="submit" className="f-btn" disabled={loading || !token}>{loading ? 'Checking…' : 'Log in'}</button>
          <button type="button" className="f-btn f-btn--ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CrewProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);

  const [profile,       setProfile]       = useState<CrewProfile | null>(null);
  const [notFound,      setNotFound]      = useState(false);
  const [session,       setSession]       = useState<string | null>(null);
  const [showLogin,     setShowLogin]     = useState(false);
  const [editingBio,    setEditingBio]    = useState(false);
  const [bioText,       setBioText]       = useState('');
  const [bioError,      setBioError]      = useState('');
  const [newPost,       setNewPost]       = useState('');
  const [posting,       setPosting]       = useState(false);
  const [postError,     setPostError]     = useState('');
  const [photoError,    setPhotoError]    = useState('');
  const [uploading,     setUploading]     = useState(false);
  const [playerStats,   setPlayerStats]   = useState<PlayerStat | null>(null);
  const [statsMeta,     setStatsMeta]     = useState<{ source: string; cachedAt: string | null } | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editText,      setEditText]      = useState('');
  const [editSaving,    setEditSaving]    = useState(false);
  const [lightboxIdx,   setLightboxIdx]   = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const isOwner = !!session && session.toLowerCase() === username.toLowerCase();

  async function loadProfile() {
    const res = await fetch(`/api/crew/${username}`);
    if (res.ok) {
      const p = await res.json() as CrewProfile;
      setProfile(p);
      setBioText(p.bio);
    } else if (res.status === 404) {
      setNotFound(true);
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
  // The fetch helpers close over `username`; re-running on it alone is what we want.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  function onLoginSuccess() { checkSession(); loadProfile(); }
  async function logout() {
    await fetch('/api/crew/auth', { method: 'DELETE' });
    setSession(null);
    localStorage.removeItem('jod_crew_user');
  }

  async function saveBio() {
    setBioError('');
    const res = await fetch(`/api/crew/${username}/bio`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bio: bioText }),
    });
    if (res.ok) { setProfile(p => p ? { ...p, bio: bioText } : p); setEditingBio(false); }
    else { const data = await res.json().catch(() => ({})) as { error?: string }; setBioError(data.error ?? 'Could not save the bio.'); }
  }

  async function submitPost(e: FormEvent) {
    e.preventDefault();
    if (!newPost.trim()) return;
    setPosting(true);
    setPostError('');
    try {
      const res = await fetch(`/api/crew/${username}/posts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: newPost }),
      });
      if (res.ok) {
        const post = await res.json() as CrewPost;
        setProfile(p => p ? { ...p, posts: [post, ...p.posts] } : p);
        setNewPost('');
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setPostError(data.error ?? 'Could not post.');
      }
    } catch { setPostError('Network error, try again.'); }
    finally   { setPosting(false); }
  }

  async function deletePost(id: string) {
    if (!confirm('Delete this post?')) return;
    const res = await fetch(`/api/crew/${username}/posts/${id}`, { method: 'DELETE' });
    if (res.ok) setProfile(p => p ? { ...p, posts: p.posts.filter(post => post.id !== id) } : p);
  }

  function startEditPost(post: CrewPost) { setEditingPostId(post.id); setEditText(post.text); }
  function cancelEditPost() { setEditingPostId(null); setEditText(''); }

  async function saveEditPost(id: string) {
    if (!editText.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/crew/${username}/posts/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: editText }),
      });
      if (res.ok) {
        const updated = await res.json() as CrewPost;
        setProfile(p => p ? { ...p, posts: p.posts.map(post => post.id === id ? updated : post) } : p);
        cancelEditPost();
      }
    } finally { setEditSaving(false); }
  }

  async function uploadPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`/api/crew/${username}/photos`, { method: 'POST', body: fd });
      if (res.ok) { const photo = await res.json(); setProfile(p => p ? { ...p, photos: [photo, ...p.photos] } : p); }
      else { const data = await res.json().catch(() => ({})) as { error?: string }; setPhotoError(data.error ?? 'Upload failed.'); }
    } catch { setPhotoError('Network error, the upload did not go through.'); }
    finally { setUploading(false); }
    if (fileRef.current) fileRef.current.value = '';
  }

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const prevPhoto     = useCallback(() => setLightboxIdx(i => i !== null && profile ? (i - 1 + profile.photos.length) % profile.photos.length : null), [profile]);
  const nextPhoto     = useCallback(() => setLightboxIdx(i => i !== null && profile ? (i + 1) % profile.photos.length : null), [profile]);

  const badges = playerStats ? earnedBadges(playerStats) : [];

  return (
    <>
      <div className="f-grain" aria-hidden="true" />
      <TrailNav links={PAGE_LINKS} />
      <main className="f-band f-band--paper">
        <div className="f-wrap f-page">
          <Link href="/crew" className="f-back">← All crew</Link>

          {notFound ? (
            <p className="f-empty">No one by the name {username} on the whitelist.</p>
          ) : !profile ? (
            <p className="f-note">Loading {username}…</p>
          ) : (
            <>
              <section className="f-profile">
                <div className="f-profile__head"><PlayerHead name={profile.username} size={128} /></div>
                <div>
                  <div className="f-profile__top">
                    <div>
                      <div className="f-profile__wanted">Wanted · rider of the JOÐ</div>
                      <h1 className="f-profile__name">{profile.username}</h1>
                    </div>
                    {isOwner ? (
                      <button className="f-btn f-btn--ghost f-btn--small" onClick={logout}>Log out</button>
                    ) : (
                      <button className="f-btn f-btn--ghost f-btn--small" onClick={() => setShowLogin(true)}>This is me</button>
                    )}
                  </div>

                  {editingBio && isOwner ? (
                    <div className="f-profile__biorow">
                      <textarea
                        className={`f-textarea${bioError ? ' is-error' : ''}`}
                        value={bioText}
                        onChange={e => setBioText(e.target.value)}
                        maxLength={280}
                        placeholder="A line or two about you"
                        style={{ flex: '1 1 18rem' }}
                      />
                      <div className="f-inline">
                        <button className="f-btn f-btn--small" onClick={saveBio}>Save</button>
                        <button className="f-btn f-btn--ghost f-btn--small" onClick={() => { setEditingBio(false); setBioError(''); setBioText(profile.bio); }}>Cancel</button>
                      </div>
                      {bioError && <p className="f-err" style={{ width: '100%' }}>{bioError}</p>}
                    </div>
                  ) : (
                    <div className="f-profile__biorow">
                      <p className={`f-profile__bio${profile.bio ? '' : ' is-empty'}`}>
                        {profile.bio || (isOwner ? 'You have not written a bio yet.' : 'No bio yet.')}
                      </p>
                      {isOwner && <button className="f-btn f-btn--ghost f-btn--small" onClick={() => setEditingBio(true)}>Edit bio</button>}
                    </div>
                  )}

                  {playerStats && (
                    <>
                      <dl className="f-stats">
                        {STAT_TABS.map(t => (
                          <div key={t.id} className="f-stat">
                            <dt className="f-stat__k">{t.label}</dt>
                            <dd className="f-stat__v">{t.unit(playerStats[t.id])}</dd>
                          </div>
                        ))}
                      </dl>
                      {badges.length > 0 && (
                        <ul className="f-badges" aria-label="Achievements">
                          {badges.map(b => <li key={b.id} className="f-badge"><Star className="f-star" />{b.label}</li>)}
                        </ul>
                      )}
                      {statsMeta?.source === 'cached' && statsMeta.cachedAt && (
                        <p className="f-note">The server is down; these numbers are from {formatDate(statsMeta.cachedAt)}.</p>
                      )}
                    </>
                  )}
                </div>
              </section>

              {/* posts */}
              <section className="f-block">
                <div className="f-block__head">
                  <h2 className="f-block__title">Posts{profile.posts.length > 0 && <small>{profile.posts.length}</small>}</h2>
                </div>

                {isOwner && (
                  <form className="f-compose" onSubmit={submitPost}>
                    <textarea
                      className={`f-textarea${postError ? ' is-error' : ''}`}
                      value={newPost}
                      onChange={e => setNewPost(e.target.value)}
                      maxLength={500}
                      placeholder="What's happening on the server?"
                    />
                    <div className="f-compose__row">
                      <span className="f-compose__count">{newPost.length} / 500</span>
                      <button type="submit" className="f-btn f-btn--small" disabled={posting || !newPost.trim()}>{posting ? 'Posting…' : 'Post'}</button>
                    </div>
                    {postError && <p className="f-err">{postError}</p>}
                  </form>
                )}

                {profile.posts.length === 0 ? (
                  <p className="f-empty">{isOwner ? 'Nothing posted yet. Write the first one above.' : 'No posts yet.'}</p>
                ) : (
                  <ul className="f-feed">
                    {profile.posts.map(post => (
                      <li key={post.id} className="f-post f-post--plain">
                        {editingPostId === post.id ? (
                          <div>
                            <textarea className="f-textarea" value={editText} onChange={e => setEditText(e.target.value)} maxLength={500} autoFocus />
                            <div className="f-inline" style={{ marginTop: '0.6rem' }}>
                              <button className="f-btn f-btn--small" onClick={() => saveEditPost(post.id)} disabled={editSaving || !editText.trim()}>{editSaving ? 'Saving…' : 'Save'}</button>
                              <button className="f-btn f-btn--ghost f-btn--small" onClick={cancelEditPost}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="f-post__text" style={{ marginTop: 0 }}>{post.text}</p>
                            <div className="f-post__meta" style={{ marginTop: '0.5rem' }}>
                              <span>{formatDate(post.createdAt)}</span>
                              {isOwner && (
                                <span className="f-post__actions">
                                  <button onClick={() => startEditPost(post)}>Edit</button>
                                  <button onClick={() => deletePost(post.id)}>Delete</button>
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* photos */}
              <section className="f-block">
                <div className="f-block__head">
                  <h2 className="f-block__title">Screenshots{profile.photos.length > 0 && <small>{profile.photos.length}</small>}</h2>
                  {isOwner && (
                    <>
                      <input ref={fileRef} type="file" accept="image/*" onChange={uploadPhoto} style={{ display: 'none' }} id="crew-photo-upload" />
                      <label htmlFor="crew-photo-upload" className="f-btn f-btn--ghost f-btn--small" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
                        {uploading ? 'Uploading…' : 'Upload'}
                      </label>
                    </>
                  )}
                </div>
                {photoError && <p className="f-err" style={{ marginBottom: '0.75rem' }}>{photoError}</p>}

                {profile.photos.length === 0 ? (
                  <p className="f-empty">{isOwner ? 'No screenshots yet. Upload a few of your builds.' : 'No screenshots yet.'}</p>
                ) : (
                  <div className="f-shots">
                    {profile.photos.map((photo, idx) => (
                      <button key={photo.id} className="f-shot" onClick={() => setLightboxIdx(idx)} aria-label={photo.caption || `Screenshot ${idx + 1}`}>
                        <span className="f-photo__frame" style={{ display: 'block' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo.filename} alt={photo.caption || ''} loading="lazy" style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover' }} />
                        </span>
                        {photo.caption && <span className="f-shot__cap">{photo.caption}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />

      {showLogin && <LoginModal username={username} onSuccess={onLoginSuccess} onClose={() => setShowLogin(false)} />}
      {lightboxIdx !== null && profile && (
        <Lightbox
          photos={profile.photos.map(p => ({ src: p.filename, title: p.caption || undefined, sub: formatDate(p.uploadedAt) }))}
          index={lightboxIdx}
          onClose={closeLightbox}
          onPrev={prevPhoto}
          onNext={nextPhoto}
        />
      )}
    </>
  );
}
