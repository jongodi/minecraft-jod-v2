'use client';

import '@/app/badlands.css';
import '@/app/board.css';
import { useEffect, useState, useRef, useCallback, use, type FormEvent, type ChangeEvent } from 'react';
import Link from 'next/link';
import type { CrewProfile, CrewPost } from '@/lib/crew';
import type { PlayerStat, StatsResponse } from '@/app/api/stats/route';
import { formatDate } from '@/lib/format';
import AddressBar from '@/components/badlands/AddressBar';
import Footer from '@/components/badlands/Footer';
import PlayerHead from '@/components/badlands/PlayerHead';
import Lightbox from '@/components/badlands/Lightbox';
import { photoProps, PHOTO_SIZES } from '@/components/badlands/photo';
import { AnimatePresence } from 'framer-motion';
import { ArrowIcon, Star } from '@/components/badlands/Bits';
import { PAGE_LINKS, STAT_TABS } from '@/components/badlands/data';

// ─── Badges: the highest earned tier per category ─────────────────────────────

interface BadgeDef { id: string; label: string; category: string; check: (s: PlayerStat) => boolean }

const BADGE_DEFS: BadgeDef[] = [
  { id: 'played-10h',   label: 'Nýliði',          category: 'playtime', check: s => s.playTimeHours  >= 10    },
  { id: 'played-100h',  label: 'Fastagestur',   category: 'playtime', check: s => s.playTimeHours  >= 100   },
  { id: 'played-500h',  label: 'Lykilmaður',             category: 'playtime', check: s => s.playTimeHours  >= 500   },
  { id: 'kills-100',    label: '100 verur felldar',   category: 'kills',    check: s => s.mobKills       >= 100   },
  { id: 'kills-1k',     label: 'Skrímslabani',      category: 'kills',    check: s => s.mobKills       >= 1000  },
  { id: 'kills-5k',     label: 'Slátrarinn',     category: 'kills',    check: s => s.mobKills       >= 5000  },
  { id: 'walked-100km', label: 'Landkönnuður',    category: 'distance', check: s => s.distanceWalked >= 100 * 100_000 },
  { id: 'walked-500km', label: 'Heimsflakkari', category: 'distance', check: s => s.distanceWalked >= 500 * 100_000 },
  { id: 'deaths-10',    label: 'Hrakfallabálkur',          category: 'deaths',   check: s => s.deaths         >= 10    },
  { id: 'deaths-50',    label: 'Óheppinn',    category: 'deaths',   check: s => s.deaths         >= 50    },
  { id: 'crafted-1k',   label: 'Smiður',         category: 'crafted',  check: s => s.itemsCrafted   >= 1000  },
  { id: 'pvp',          label: 'Mannabani',             category: 'pvp',      check: s => s.playerKills    >= 1     },
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
        setError(data.error ?? 'Aðgangslykillinn er ekki réttur.');
      }
    } catch { setError('Nettenging brást. Reyndu aftur.'); }
    finally   { setLoading(false); }
  }

  return (
    <div className="b-modal" onClick={onClose} role="dialog" aria-modal="true" aria-label="Skrá inn">
      <form className="b-paper b-modal__box" onSubmit={submit} onClick={e => e.stopPropagation()}>
        <p className="b-modal__title">Skrá inn sem {username}</p>
        <p className="b-modal__sub">stjórnandi þjónsins útvegar þér aðgangslykil</p>
        <input type="password" className={`b-input${error ? ' is-error' : ''}`} value={token} onChange={e => setToken(e.target.value)} placeholder="Aðgangslykill" autoFocus autoComplete="current-password" />
        {error && <p className="b-err">{error}</p>}
        <div className="b-modal__actions">
          <button type="submit" className="b-btn b-btn--solid" disabled={loading || !token}>{loading ? 'Athuga…' : 'Skrá inn'}</button>
          <button type="button" className="b-btn" onClick={onClose}>Hætta við</button>
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
  const [origin,        setOrigin]        = useState<DOMRect | null>(null);

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
    const res = await fetch(`/api/crew/${username}/bio`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bio: bioText }) });
    if (res.ok) { setProfile(p => p ? { ...p, bio: bioText } : p); setEditingBio(false); }
    else { const data = await res.json().catch(() => ({})) as { error?: string }; setBioError(data.error ?? 'Ekki tókst að vista kynninguna.'); }
  }

  async function submitPost(e: FormEvent) {
    e.preventDefault();
    if (!newPost.trim()) return;
    setPosting(true);
    setPostError('');
    try {
      const res = await fetch(`/api/crew/${username}/posts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: newPost }) });
      if (res.ok) {
        const post = await res.json() as CrewPost;
        setProfile(p => p ? { ...p, posts: [post, ...p.posts] } : p);
        setNewPost('');
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setPostError(data.error ?? 'Ekki tókst að birta færsluna.');
      }
    } catch { setPostError('Nettenging brást. Reyndu aftur.'); }
    finally   { setPosting(false); }
  }

  async function deletePost(id: string) {
    if (!confirm('Eyða þessari færslu?')) return;
    const res = await fetch(`/api/crew/${username}/posts/${id}`, { method: 'DELETE' });
    if (res.ok) setProfile(p => p ? { ...p, posts: p.posts.filter(post => post.id !== id) } : p);
  }

  function startEditPost(post: CrewPost) { setEditingPostId(post.id); setEditText(post.text); }
  function cancelEditPost() { setEditingPostId(null); setEditText(''); }

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
      else { const data = await res.json().catch(() => ({})) as { error?: string }; setPhotoError(data.error ?? 'Upphleðsla mistókst.'); }
    } catch { setPhotoError('Nettenging brást og myndin komst ekki í gegn.'); }
    finally { setUploading(false); }
    if (fileRef.current) fileRef.current.value = '';
  }

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const prevPhoto     = useCallback(() => setLightboxIdx(i => i !== null && profile ? (i - 1 + profile.photos.length) % profile.photos.length : null), [profile]);
  const nextPhoto     = useCallback(() => setLightboxIdx(i => i !== null && profile ? (i + 1) % profile.photos.length : null), [profile]);

  const badges = playerStats ? earnedBadges(playerStats) : [];

  return (
    <div className="b-desk">
      <div className="j">
        <div className="b-grain" aria-hidden="true" />
        <AddressBar links={PAGE_LINKS} always />
        <main className="b-wrap b-page">
          <Link href="/crew" className="b-back"><ArrowIcon flip /> allur hópurinn</Link>

          {notFound ? (
            <p className="b-empty">enginn með nafnið {username} hefur aðgang</p>
          ) : !profile ? (
            <p className="b-empty">sæki {username}…</p>
          ) : (
            <>
              <section className="b-paper b-profile">
                <span className="b-paper__nail" aria-hidden="true" />
                <div className="b-profile__head"><PlayerHead name={profile.username} size={128} /></div>
                <div>
                  <div className="b-profile__top">
                    <div>
                      <div className="b-paper__kicker">Eftirlýst, JOÐ-félagi</div>
                      <h1 className="b-profile__name">{profile.username}</h1>
                      {playerStats && <div className="b-profile__bounty"><span className="b-poster__reward">Verðlaun</span> <span className="b-poster__val">{STAT_TABS[0].unit(playerStats.playTimeHours)}</span></div>}
                    </div>
                    {isOwner ? (
                      <button className="b-btn b-btn--small" onClick={logout}>Skrá út</button>
                    ) : (
                      <button className="b-btn b-btn--small" onClick={() => setShowLogin(true)}>Þetta er ég</button>
                    )}
                  </div>

                  {editingBio && isOwner ? (
                    <div className="b-profile__biorow">
                      <textarea className={`b-textarea${bioError ? ' is-error' : ''}`} value={bioText} onChange={e => setBioText(e.target.value)} maxLength={280} placeholder="Ein eða tvær línur um þig" style={{ flex: '1 1 18rem' }} />
                      <div className="b-inline">
                        <button className="b-btn b-btn--solid b-btn--small" onClick={saveBio}>Vista</button>
                        <button className="b-btn b-btn--small" onClick={() => { setEditingBio(false); setBioError(''); setBioText(profile.bio); }}>Hætta við</button>
                      </div>
                      {bioError && <p className="b-err" style={{ width: '100%' }}>{bioError}</p>}
                    </div>
                  ) : (
                    <div className="b-profile__biorow">
                      <p className={`b-profile__bio${profile.bio ? '' : ' is-empty'}`}>
                        {profile.bio || (isOwner ? 'þú átt eftir að skrifa kynningu' : 'engin kynning enn')}
                      </p>
                      {isOwner && <button className="b-btn b-btn--small" onClick={() => setEditingBio(true)}>Breyta kynningu</button>}
                    </div>
                  )}

                  {playerStats && (
                    <>
                      <dl className="b-stats">
                        {STAT_TABS.map(t => (
                          <div key={t.id} className="b-stat">
                            <dt className="b-stat__k">{t.label}</dt>
                            <dd className="b-stat__v">{t.unit(playerStats[t.id])}</dd>
                          </div>
                        ))}
                      </dl>
                      {badges.length > 0 && (
                        <ul className="b-badges" aria-label="Afrek">
                          {badges.map(b => <li key={b.id} className="b-badge"><Star className="b-star" />{b.label}</li>)}
                        </ul>
                      )}
                      {statsMeta?.source === 'cached' && statsMeta.cachedAt && (
                        <p className="b-note" style={{ marginTop: '0.75rem' }}>slökkt á þjóninum, þessar tölur eru frá {formatDate(statsMeta.cachedAt)}</p>
                      )}
                    </>
                  )}
                </div>
              </section>

              {/* posts */}
              <section className="b-block">
                <div className="b-block__head">
                  <h2 className="b-title">Færslur{profile.posts.length > 0 && <span className="b-note"> {profile.posts.length}</span>}</h2>
                </div>
                {isOwner && (
                  <form className="b-compose" onSubmit={submitPost}>
                    <textarea className={`b-textarea${postError ? ' is-error' : ''}`} value={newPost} onChange={e => setNewPost(e.target.value)} maxLength={500} placeholder="Hvað er að gerast á þjóninum?" />
                    <div className="b-compose__row">
                      <span className="b-compose__count">{newPost.length} / 500</span>
                      <button type="submit" className="b-btn b-btn--solid b-btn--small" disabled={posting || !newPost.trim()}>{posting ? 'Birti…' : 'Birta'}</button>
                    </div>
                    {postError && <p className="b-err">{postError}</p>}
                  </form>
                )}
                {profile.posts.length === 0 ? (
                  <p className="b-empty">{isOwner ? 'ekkert komið enn; skrifaðu fyrstu færsluna hér fyrir ofan' : 'engar færslur enn'}</p>
                ) : (
                  <ul className="b-paper b-posts">
                    {profile.posts.map(post => (
                      <li key={post.id} className="b-post">
                        {editingPostId === post.id ? (
                          <div>
                            <textarea className="b-textarea" value={editText} onChange={e => setEditText(e.target.value)} maxLength={500} autoFocus />
                            <div className="b-inline" style={{ marginTop: '0.6rem' }}>
                              <button className="b-btn b-btn--small" onClick={() => saveEditPost(post.id)} disabled={editSaving || !editText.trim()}>{editSaving ? 'Vista…' : 'Vista'}</button>
                              <button className="b-btn b-btn--small" onClick={cancelEditPost}>Hætta við</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="b-post__text" style={{ marginTop: 0 }}>{post.text}</p>
                            <div className="b-post__meta" style={{ marginTop: '0.5rem' }}>
                              <span>{formatDate(post.createdAt)}</span>
                              {isOwner && (
                                <span className="b-post__actions">
                                  <button onClick={() => startEditPost(post)}>breyta</button>
                                  <button onClick={() => deletePost(post.id)}>eyða</button>
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
              <section className="b-block">
                <div className="b-block__head">
                  <h2 className="b-title">Myndir úr leiknum{profile.photos.length > 0 && <span className="b-note"> {profile.photos.length}</span>}</h2>
                  {isOwner && (
                    <>
                      <input ref={fileRef} type="file" accept="image/*" onChange={uploadPhoto} style={{ display: 'none' }} id="crew-photo-upload" />
                      <label htmlFor="crew-photo-upload" className="b-btn b-btn--small" style={{ cursor: uploading ? 'wait' : 'pointer' }}>{uploading ? 'Hleð upp…' : 'Hlaða upp'}</label>
                    </>
                  )}
                </div>
                {photoError && <p className="b-err" style={{ marginBottom: '0.75rem' }}>{photoError}</p>}
                {profile.photos.length === 0 ? (
                  <p className="b-empty">{isOwner ? 'engar myndir enn; hentu inn nokkrum af því sem þú hefur byggt' : 'engar myndir enn'}</p>
                ) : (
                  <div className="b-shots">
                    {profile.photos.map((photo, idx) => (
                      <button key={photo.id} type="button" className="b-print-btn" onClick={e => { setOrigin(e.currentTarget.getBoundingClientRect()); setLightboxIdx(idx); }} aria-label={photo.caption || `Mynd úr leiknum ${idx + 1}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img {...photoProps(photo.filename, PHOTO_SIZES.shot)} alt={photo.caption || ''} loading="lazy" decoding="async" />
                        <span className="b-print-btn__cap">{photo.caption || formatDate(photo.uploadedAt)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
        <Footer />

        {showLogin && <LoginModal username={username} onSuccess={onLoginSuccess} onClose={() => setShowLogin(false)} />}
        <AnimatePresence>
          {lightboxIdx !== null && profile && (
            <Lightbox key="lb" photos={profile.photos.map(p => ({ src: p.filename, title: p.caption || undefined, sub: formatDate(p.uploadedAt) }))} index={lightboxIdx} origin={origin} onClose={closeLightbox} onPrev={prevPhoto} onNext={nextPhoto} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
