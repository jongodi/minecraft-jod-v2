'use client';

import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState, useCallback, useEffect } from 'react';
import { CATEGORY_COLORS, type DatapackMeta } from '@/data/datapacks';
import type { DatapackUpdateResult } from '@/app/api/datapacks/check-updates/route';

// ─── Update popup ─────────────────────────────────────────────────────────────
function UpdateBadge({ result, onClose }: { result: DatapackUpdateResult; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        style={{
          position:  'absolute',
          bottom:    'calc(100% + 8px)',
          left:      0,
          right:     0,
          background: '#0d1018',
          border:    '1px solid #2a3045',
          padding:   '0.75rem',
          zIndex:    50,
          boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
        }}
      >
        <button
          onClick={e => { e.stopPropagation(); onClose(); }}
          style={{
            position:      'absolute',
            top:           '0.4rem',
            right:         '0.4rem',
            background:    'none',
            border:        'none',
            color:         '#505770',
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.6rem',
            cursor:        'pointer',
            transition:    'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#dde1ec')}
          onMouseLeave={e => (e.currentTarget.style.color = '#505770')}
        >
          ✕
        </button>

        {result.latestVersion && (
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem', color: '#f0a500', marginBottom: '0.4rem' }}>
            v{result.latestVersion} available
            {result.currentVersion && (
              <span style={{ color: '#1e2230' }}> (current: v{result.currentVersion})</span>
            )}
          </p>
        )}

        {result.changelog && (
          <p style={{
            fontFamily:  "'JetBrains Mono', monospace",
            fontSize:    '0.58rem',
            color:       '#505770',
            lineHeight:  1.5,
            marginBottom: '0.5rem',
            maxHeight:   '70px',
            overflow:    'hidden',
            maskImage:   'linear-gradient(to bottom, black 55%, transparent)',
          }}>
            {result.changelog.slice(0, 200)}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {result.modrinthUrl && (
            <a
              href={result.modrinthUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                fontFamily:     "'JetBrains Mono', monospace",
                fontSize:       '0.52rem',
                letterSpacing:  '0.15em',
                color:          '#00ff41',
                border:         '1px solid rgba(0,255,65,0.2)',
                padding:        '0.18rem 0.5rem',
                textDecoration: 'none',
                transition:     'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,255,65,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              VIEW ON MODRINTH →
            </a>
          )}
          {result.downloadUrl && (
            <a
              href={result.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                fontFamily:     "'JetBrains Mono', monospace",
                fontSize:       '0.52rem',
                letterSpacing:  '0.15em',
                color:          '#f0a500',
                border:         '1px solid rgba(240,165,0,0.2)',
                padding:        '0.18rem 0.5rem',
                textDecoration: 'none',
                transition:     'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(240,165,0,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              DOWNLOAD ↓
            </a>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function DatapackCard({
  pack,
  index,
  updateResult,
}: {
  pack:         DatapackMeta;
  index:        number;
  updateResult?: DatapackUpdateResult;
}) {
  const categoryColor   = CATEGORY_COLORS[pack.category] ?? '#00ff41';
  const [isHov,         setIsHov]         = useState(false);
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);

  const hasUpdate  = updateResult?.updateAvailable === true;
  const isUpToDate = updateResult && !updateResult.updateAvailable && updateResult.latestVersion;
  const isManaged  = !updateResult || updateResult.source === 'manual';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setIsHov(true)}
      onMouseLeave={() => { setIsHov(false); }}
      data-cursor="hover"
      style={{
        background:    '#131722',
        border:        `1px solid ${isHov ? '#2a3045' : '#1c2030'}`,
        padding:       '1.25rem',
        display:       'flex',
        flexDirection: 'column',
        gap:           '0.7rem',
        position:      'relative',
        overflow:      'visible',
        transform:     isHov ? 'translateY(-2px)' : 'none',
        transition:    'border-color 0.25s ease, transform 0.3s ease, box-shadow 0.3s ease',
        boxShadow:     isHov
          ? `0 10px 36px rgba(0,0,0,0.5), 0 0 0 1px ${categoryColor}18`
          : 'none',
      }}
    >
      {/* Update popup */}
      {showUpdatePopup && updateResult && (
        <UpdateBadge result={updateResult} onClose={() => setShowUpdatePopup(false)} />
      )}

      {/* Top accent line (slides in on hover) */}
      <div
        style={{
          position:        'absolute',
          top:             0, left: 0, right: 0,
          height:          '1px',
          background:      `linear-gradient(to right, ${categoryColor}, transparent)`,
          transform:       `scaleX(${isHov ? 1 : 0})`,
          transformOrigin: 'left',
          transition:      'transform 0.4s cubic-bezier(0.16,1,0.3,1)',
        }}
      />

      {/* Category tag + index */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.5rem',
            letterSpacing: '0.28em',
            color:         categoryColor,
            textTransform: 'uppercase',
            background:    `${categoryColor}0f`,
            padding:       '0.18rem 0.45rem',
            border:        `1px solid ${categoryColor}2a`,
          }}
        >
          {pack.category}
        </span>
        <span style={{
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.45rem',
          color:         '#1e2230',
          letterSpacing: '0.08em',
        }}>
          #{String(pack.id).padStart(2, '0')}
        </span>
      </div>

      {/* Name */}
      <h3
        style={{
          fontFamily:    "'Space Grotesk', sans-serif",
          fontSize:      '0.95rem',
          fontWeight:    700,
          color:         '#dde1ec',
          letterSpacing: '-0.01em',
          lineHeight:    1.2,
        }}
      >
        {pack.name}
      </h3>

      {/* Description */}
      <p
        style={{
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.65rem',
          color:         '#505770',
          lineHeight:    1.65,
          letterSpacing: '0.02em',
          marginTop:     'auto',
          flexGrow:      1,
        }}
      >
        {pack.description}
      </p>

      {/* Version / status row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.15rem' }}>
        {pack.currentVersion && (
          <span style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.5rem',
            color:         '#1e2230',
            letterSpacing: '0.05em',
          }}>
            v{pack.currentVersion}
          </span>
        )}
        <div style={{ marginLeft: 'auto' }}>
          {hasUpdate && (
            <button
              onClick={() => setShowUpdatePopup(v => !v)}
              style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.46rem',
                letterSpacing: '0.2em',
                color:         '#f0a500',
                background:    'rgba(240,165,0,0.08)',
                border:        '1px solid rgba(240,165,0,0.3)',
                padding:       '0.14rem 0.4rem',
                cursor:        'pointer',
                display:       'flex',
                alignItems:    'center',
                gap:           '0.3rem',
                transition:    'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(240,165,0,0.14)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(240,165,0,0.08)')}
            >
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#f0a500', display: 'inline-block' }} />
              UPDATE AVAILABLE
            </button>
          )}
          {isUpToDate && (
            <span
              style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.46rem',
                letterSpacing: '0.2em',
                color:         'rgba(0,255,65,0.5)',
                background:    'rgba(0,255,65,0.05)',
                border:        '1px solid rgba(0,255,65,0.15)',
                padding:       '0.14rem 0.4rem',
                display:       'flex',
                alignItems:    'center',
                gap:           '0.3rem',
              }}
            >
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#00ff41', display: 'inline-block' }} />
              UP TO DATE
            </span>
          )}
          {isManaged && !hasUpdate && !isUpToDate && (
            <span
              style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.46rem',
                letterSpacing: '0.18em',
                color:         '#1e2230',
              }}
            >
              MANUAL
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Summary bar ─────────────────────────────────────────────────────────────
function UpdateSummaryBar({ results }: { results: DatapackUpdateResult[] | null }) {
  if (!results) return null;
  const checked  = results.filter(r => r.source !== 'manual');
  const updates  = results.filter(r => r.updateAvailable);
  const upToDate = checked.filter(r => !r.updateAvailable && r.latestVersion);
  if (checked.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        display:       'flex',
        alignItems:    'center',
        gap:           '1.5rem',
        padding:       '0.6rem 1rem',
        background:    updates.length > 0 ? 'rgba(240,165,0,0.04)' : 'rgba(0,255,65,0.03)',
        border:        `1px solid ${updates.length > 0 ? 'rgba(240,165,0,0.18)' : 'rgba(0,255,65,0.12)'}`,
        marginBottom:  '1.5rem',
        flexWrap:      'wrap',
      }}
    >
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.55rem', letterSpacing: '0.1em', color: '#1e2230' }}>
        UPDATE STATUS
      </span>
      {upToDate.length > 0 && (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.55rem', color: 'rgba(0,255,65,0.5)' }}>
          ● {upToDate.length} up to date
        </span>
      )}
      {updates.length > 0 && (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.55rem', color: '#f0a500' }}>
          ● {updates.length} update{updates.length !== 1 ? 's' : ''} available
        </span>
      )}
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.5rem', color: '#131722', marginLeft: 'auto' }}>
        {results.filter(r => r.source === 'manual').length} manually managed
      </span>
    </motion.div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
export default function DatapacksSection() {
  const headerRef                   = useRef<HTMLDivElement>(null);
  const isInView                    = useInView(headerRef, { once: true, margin: '-80px' });
  const [packs,          setPacks]  = useState<DatapackMeta[]>([]);
  const [updateResults,  setUpdateResults]  = useState<DatapackUpdateResult[] | null>(null);
  const [loadingUpdates, setLoadingUpdates] = useState(false);

  useEffect(() => {
    fetch('/api/datapacks')
      .then(r => r.json())
      .then((data: DatapackMeta[]) => setPacks(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isInView || loadingUpdates || updateResults) return;
    setLoadingUpdates(true);
    fetch('/api/datapacks/check-updates')
      .then(r => r.json())
      .then((data: DatapackUpdateResult[]) => setUpdateResults(data))
      .catch(() => setUpdateResults(null))
      .finally(() => setLoadingUpdates(false));
  }, [isInView, loadingUpdates, updateResults]);

  const updateMap = updateResults
    ? Object.fromEntries(updateResults.map(r => [r.id, r]))
    : {};

  const updateCount = updateResults?.filter(r => r.updateAvailable).length ?? 0;

  return (
    <section
      id="datapacks"
      style={{
        padding:      'clamp(5rem, 12vw, 9rem) clamp(1.5rem, 6vw, 5rem)',
        borderBottom: '1px solid #1c2030',
        background:   '#0d1018',
      }}
    >
      {/* Header */}
      <div ref={headerRef} style={{ marginBottom: 'clamp(2.5rem, 5vw, 4rem)' }}>
        <motion.p
          initial={{ opacity: 0, x: -14 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="section-label"
        >
          04 — DATAPACKS
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily:    "'Space Grotesk', sans-serif",
            fontSize:      'clamp(3rem, 7vw, 6rem)',
            fontWeight:    900,
            letterSpacing: '-0.03em',
            color:         '#dde1ec',
            lineHeight:    0.95,
          }}
        >
          DATAPACKS
          {updateCount > 0 && (
            <span
              style={{
                marginLeft:    '1rem',
                fontSize:      'clamp(0.75rem, 1.8vw, 1.1rem)',
                fontFamily:    "'JetBrains Mono', monospace",
                color:         '#f0a500',
                background:    'rgba(240,165,0,0.08)',
                border:        '1px solid rgba(240,165,0,0.25)',
                padding:       '0.18rem 0.55rem',
                verticalAlign: 'middle',
                letterSpacing: '0.06em',
              }}
            >
              {updateCount} UPDATE{updateCount !== 1 ? 'S' : ''}
            </span>
          )}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.25 }}
          style={{
            marginTop:     '1rem',
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.68rem',
            color:         '#505770',
            letterSpacing: '0.04em',
            lineHeight:    1.6,
          }}
        >
          {packs.length > 0 ? `${packs.length} datapacks` : ''}{packs.length > 0 ? ' — combat, structure, social, and more.' : ''}
        </motion.p>
      </div>

      {/* Loading indicator */}
      {loadingUpdates && (
        <div style={{
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      '0.55rem',
          color:         '#1e2230',
          letterSpacing: '0.22em',
          marginBottom:  '1.5rem',
          textTransform: 'uppercase',
        }}>
          CHECKING FOR UPDATES...
        </div>
      )}

      <UpdateSummaryBar results={updateResults} />

      {/* Grid */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(230px, 100%), 1fr))',
          gap:                 '1px',
          background:          '#1c2030',
          border:              '1px solid #1c2030',
        }}
      >
        {packs.map((pack, i) => (
          <DatapackCard
            key={pack.id}
            pack={pack}
            index={i}
            updateResult={updateMap[pack.id]}
          />
        ))}
      </div>
    </section>
  );
}
