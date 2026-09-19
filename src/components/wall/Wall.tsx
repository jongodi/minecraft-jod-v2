'use client';

// A member's wall: their wanted poster at the top, the pin slot under it
// when it is their own, and everything they have pinned, newest first.
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import type { CrewProfile, CrewEntry } from '@/lib/crew-types';
import { LIMITS, allPhotos, coverPhoto, sameUser } from '@/lib/crew-types';
import type { PlayerStat, StatsResponse } from '@/app/api/stats/route';
import { formatDate } from '@/lib/format';
import { errorFrom } from '@/lib/crew-upload';
import AddressBar from '@/components/badlands/AddressBar';
import Footer from '@/components/badlands/Footer';
import PlayerHead from '@/components/badlands/PlayerHead';
import Lightbox from '@/components/badlands/Lightbox';
import { ArrowIcon, Star } from '@/components/badlands/Bits';
import { PAGE_LINKS, STAT_TABS } from '@/components/badlands/data';
import { useCrewSession } from '@/components/badlands/hooks';
import { photoProps, PHOTO_SIZES } from '@/components/badlands/photo';
import Composer from './Composer';
import Print from './Print';

/** A place on the map, as the wall needs it: to pin things at and to list what the member built. */
export interface WallPlace { id: number; label: string; sublabel: string; builders: string[] }

// ─── Badges: the highest earned tier per category ─────────────────────────────

interface BadgeDef { id: string; label: string; category: string; check: (s: PlayerStat) => boolean }

const BADGE_DEFS: BadgeDef[] = [
  { id: 'played-10h',   label: 'Nýliði',          category: 'playtime', check: s => s.playTimeHours  >= 10    },
  { id: 'played-100h',  label: 'Fastagestur',     category: 'playtime', check: s => s.playTimeHours  >= 100   },
  { id: 'played-500h',  label: 'Lykilmaður',      category: 'playtime', check: s => s.playTimeHours  >= 500   },
  { id: 'kills-100',    label: '100 verur felldar', category: 'kills',  check: s => s.mobKills       >= 100   },
  { id: 'kills-1k',     label: 'Skrímslabani',    category: 'kills',    check: s => s.mobKills       >= 1000  },
  { id: 'kills-5k',     label: 'Slátrarinn',      category: 'kills',    check: s => s.mobKills       >= 5000  },
  { id: 'walked-100km', label: 'Landkönnuður',    category: 'distance', check: s => s.distanceWalked >= 100 * 100_000 },
  { id: 'walked-500km', label: 'Heimsflakkari',   category: 'distance', check: s => s.distanceWalked >= 500 * 100_000 },
  { id: 'deaths-10',    label: 'Hrakfallabálkur', category: 'deaths',   check: s => s.deaths         >= 10    },
  { id: 'deaths-50',    label: 'Óheppinn',        category: 'deaths',   check: s => s.deaths         >= 50    },
  { id: 'crafted-1k',   label: 'Smiður',          category: 'crafted',  check: s => s.itemsCrafted   >= 1000  },
  { id: 'pvp',          label: 'Mannabani',       category: 'pvp',      check: s => s.playerKills    >= 1     },
  { id: 'draw-200',     label: 'Sýslumaður',      category: 'draw',     check: s => s.drawMs > 0 && s.drawMs < 200 },
];

function earnedBadges(stat: PlayerStat): BadgeDef[] {
  const top = new Map<string, BadgeDef>();
  for (const b of BADGE_DEFS) if (b.check(stat)) top.set(b.category, b);
  return Array.from(top.values());
}

// ─── Login: the token, for anyone without a link ──────────────────────────────

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
      else setError(await errorFrom(res));
    } catch { setError('Nettenging brást. Reyndu aftur.'); }
    finally   { setLoading(false); }
  }

  return (
    <div className="b-modal" onClick={onClose} role="dialog" aria-modal="true" aria-label="Skrá inn">
      <form className="b-paper b-modal__box" onSubmit={submit} onClick={e => e.stopPropagation()}>
        <p className="b-modal__title">Skrá inn sem {username}</p>
        <p className="b-modal__sub">stjórnandi þjónsins sendir þér innskráningartengil; þetta er leiðin ef þú ert með aðgangslykil í staðinn</p>
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

// ─── The wall ─────────────────────────────────────────────────────────────────

interface Props {
  initial: CrewProfile;
  places:  WallPlace[];
  /** true when the page was opened from a sign-in link */
  justSignedIn?: boolean;
}

export default function Wall({ initial, places, justSignedIn = false }: Props) {
  const [profile, setProfile] = useState<CrewProfile>(initial);
  const { me, refresh, signOut } = useCrewSession();
  const isOwner = sameUser(me, profile.username);

  const [showLogin,   setShowLogin]   = useState(false);
  const [editingBio,  setEditingBio]  = useState(false);
  const [bioText,     setBioText]     = useState(initial.bio);
  const [bioError,    setBioError]    = useState('');
  const [stats,       setStats]       = useState<PlayerStat | null>(null);
  const [statsMeta,   setStatsMeta]   = useState<{ source: string; cachedAt: string | null } | null>(null);
  const [lightbox,    setLightbox]    = useState<number | null>(null);
  const [origin,      setOrigin]      = useState<DOMRect | null>(null);
  const [welcome,     setWelcome]     = useState(justSignedIn);

  const username = profile.username;

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then((data: StatsResponse) => {
        setStats(data.players.find(p => sameUser(p.username, username)) ?? null);
        setStatsMeta({ source: data.source, cachedAt: data.cachedAt });
      })
      .catch(() => {});
  }, [username]);

  /* The wall is fetched again when the viewer changes: the server rendered it for a stranger. */
  useEffect(() => {
    if (me === undefined) return;
    fetch(`/api/crew/${username}`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then((p: CrewProfile | null) => { if (p) { setProfile(p); setBioText(p.bio); } }).catch(() => {});
  }, [me, username]);

  const prints = useMemo(() => allPhotos(profile), [profile]);
  const cover  = coverPhoto(profile);
  const built  = places.filter(p => p.builders.some(b => sameUser(b, username)));
  const badges = stats ? earnedBadges(stats) : [];

  const patchProfile = useCallback(async (body: { bio?: string; coverPhotoId?: string | null }) => {
    const res = await fetch(`/api/crew/${username}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(await errorFrom(res));
    const p = await res.json() as CrewProfile;
    setProfile(p);
    return p;
  }, [username]);

  async function saveBio() {
    setBioError('');
    try { await patchProfile({ bio: bioText }); setEditingBio(false); }
    catch (e) { setBioError(e instanceof Error ? e.message : 'Ekki tókst að vista kynninguna.'); }
  }

  const onPinned  = useCallback((entry: CrewEntry) => setProfile(p => ({ ...p, entries: [entry, ...p.entries] })), []);
  const onChange  = useCallback((entry: CrewEntry) => setProfile(p => ({ ...p, entries: p.entries.map(e => (e.id === entry.id ? entry : e)) })), []);
  const onRemove  = useCallback((id: string) => setProfile(p => ({ ...p, entries: p.entries.filter(e => e.id !== id) })), []);
  const onCover   = useCallback((photoId: string | null) => { patchProfile({ coverPhotoId: photoId }).catch(() => {}); }, [patchProfile]);
  const onOpen    = useCallback((photoId: string, rect: DOMRect) => { const i = prints.findIndex(p => p.id === photoId); if (i >= 0) { setOrigin(rect); setLightbox(i); } }, [prints]);

  const closeLightbox = useCallback(() => setLightbox(null), []);
  const prevPhoto     = useCallback(() => setLightbox(i => (i !== null && prints.length ? (i - 1 + prints.length) % prints.length : null)), [prints.length]);
  const nextPhoto     = useCallback(() => setLightbox(i => (i !== null && prints.length ? (i + 1) % prints.length : null)), [prints.length]);

  return (
    <div className="b">
      <AddressBar links={PAGE_LINKS} always />
      <main className="b-wrap b-page w-page">
        <Link href="/crew" className="b-back"><ArrowIcon flip /> allur hópurinn</Link>

        {welcome && isOwner && (
          <p className="w-welcome" role="status">
            Velkomin á vegginn þinn, {username}. Þetta tæki man eftir þér í eitt ár.
            <button type="button" onClick={() => setWelcome(false)} aria-label="Loka">✕</button>
          </p>
        )}

        <section className={`b-paper w-poster${cover ? ' has-cover' : ''}`} aria-label={`Eftirlýsingaspjald: ${username}`}>
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="w-poster__cover" {...photoProps(cover.filename, PHOTO_SIZES.cover)} alt="" aria-hidden="true" decoding="async" />
          )}
          <span className="b-paper__nail" aria-hidden="true" />
          <div className="w-poster__skin"><PlayerHead name={username} size={96} full /></div>
          <div className="w-poster__body">
            <div className="w-poster__top">
              <div>
                <div className="b-paper__kicker">Eftirlýst, JOÐ-félagi</div>
                <h1 className="w-poster__name">{username}</h1>
                {stats && stats.playTimeHours > 0 && (
                  <div className="w-poster__bounty"><span className="b-poster__reward">Verðlaun</span> <span className="b-poster__val">{STAT_TABS[0].unit(stats.playTimeHours)}</span></div>
                )}
              </div>
              <div className="b-inline">
                {isOwner ? (
                  <button className="b-btn b-btn--small" onClick={signOut}>Skrá út</button>
                ) : me === null ? (
                  <button className="b-btn b-btn--small" onClick={() => setShowLogin(true)}>Þetta er ég</button>
                ) : null}
              </div>
            </div>

            {editingBio && isOwner ? (
              <div className="w-poster__biorow">
                <textarea className={`b-textarea${bioError ? ' is-error' : ''}`} value={bioText} onChange={e => setBioText(e.target.value)} maxLength={LIMITS.bio} rows={3} placeholder="Ein eða tvær línur um þig" autoFocus />
                <div className="b-inline">
                  <button className="b-btn b-btn--solid b-btn--small" onClick={saveBio}>Vista</button>
                  <button className="b-btn b-btn--small" onClick={() => { setEditingBio(false); setBioError(''); setBioText(profile.bio); }}>Hætta við</button>
                </div>
                {bioError && <p className="b-err">{bioError}</p>}
              </div>
            ) : isOwner ? (
              <button type="button" className={`w-poster__bio w-poster__bio--edit${profile.bio ? '' : ' is-empty'}`} onClick={() => setEditingBio(true)} title="Breyta kynningu">
                {profile.bio || 'Skrifaðu eina eða tvær línur um þig…'}
              </button>
            ) : (
              <p className={`w-poster__bio${profile.bio ? '' : ' is-empty'}`}>{profile.bio || 'engin kynning enn'}</p>
            )}

            {built.length > 0 && (
              <p className="w-poster__built">
                <span className="b-paper__kicker">Byggði</span>{' '}
                {built.map((p, i) => <span key={p.id}>{i > 0 && ', '}<Link href={`/?stadur=${p.id}#heimur`} className="b-link">{p.label}</Link></span>)}
              </p>
            )}

            {stats && (
              <>
                <dl className="b-stats">
                  {STAT_TABS.filter(t => (stats[t.id] ?? 0) > 0).map(t => (
                    <div key={t.id} className="b-stat">
                      <dt className="b-stat__k">{t.nick} · {t.label}</dt>
                      <dd className="b-stat__v">{t.unit(stats[t.id] ?? 0)}</dd>
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

        {isOwner && <Composer username={username} places={places} onPinned={onPinned} />}

        <section className="w-wall" aria-label="Veggurinn">
          {profile.entries.length === 0 ? (
            <p className="b-empty w-wall__empty">
              {isOwner ? 'veggurinn er auður; hentu inn skjámynd eða skrifaðu miða hér fyrir ofan' : `${username} hefur ekki fest neitt upp enn`}
            </p>
          ) : (
            profile.entries.map(entry => (
              <Print key={entry.id} username={username} entry={entry} places={places} me={me} isOwner={isOwner}
                coverPhotoId={profile.coverPhotoId} onChange={onChange} onRemove={onRemove} onCover={onCover} onOpen={onOpen} />
            ))
          )}
        </section>
      </main>
      <Footer />

      {showLogin && <LoginModal username={username} onSuccess={() => { refresh(); setWelcome(true); }} onClose={() => setShowLogin(false)} />}
      <AnimatePresence>
        {lightbox !== null && prints[lightbox] && (
          <Lightbox key="lb" photos={prints.map(p => ({ src: p.filename, title: p.caption || undefined, sub: p.takenAt ? `tekin ${formatDate(p.takenAt)}` : formatDate(p.uploadedAt) }))}
            index={lightbox} origin={origin} onClose={closeLightbox} onPrev={prevPhoto} onNext={nextPhoto} />
        )}
      </AnimatePresence>
    </div>
  );
}
