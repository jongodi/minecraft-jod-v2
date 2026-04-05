'use client';

import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState, useCallback, useEffect } from 'react';
import { DATAPACKS, CATEGORY_COLORS, type DatapackMeta } from '@/data/datapacks';
import type { DatapackUpdateResult } from '@/app/api/datapacks/check-updates/route';

// ─── Update badge ─────────────────────────────────────────────────────────────

function UpdateBadge({
  result,
  onClose,
}: {
  result: DatapackUpdateResult;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        style={{
          position:     'absolute',
          bottom:       'calc(100% + 8px)',
          left:         0,
          right:        0,
          background:   '#111',
          border:       '1px solid #333',
          padding:      '0.75rem',
          zIndex:       50,
          boxShadow:    '0 8px 32px rgba(0,0,0,0.8)',
        }}
      >
        {/* Close */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{
            position:   'absolute',
            top:        '0.4rem',
            right:      '0.4rem',
            background: 'none',
            border:     'none',
            color:      '#666',
            cursor:     'pointer',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize:   '0.6rem',
          }}
        >
          ✕
        </button>

        {result.latestVersion && (
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', color: '#00ff41', marginBottom: '0.4rem' }}>
            v{result.latestVersion} available
            {result.currentVersion && (
              <span style={{ color: '#444' }}> (current: v{result.currentVersion})</span>
            )}
          </p>
        )}

        {result.changelog && (
          <p style={{
            fontFamily:  "'JetBrains Mono', monospace",
            fontSize:    '0.6rem',
            color:       '#555',
            lineHeight:  1.5,
            marginBottom: '0.5rem',
            maxHeight:   '80px',
            overflow:    'hidden',
            maskImage:   'linear-gradient(to bottom, black 60%, transparent)',
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
              onClick={(e) => e.stopPropagation()}
              style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.55rem',
                letterSpacing: '0.15em',
                color:         '#00ff41',
                border:        '1px solid #00ff4133',
                padding:       '0.2rem 0.5rem',
                textDecoration: 'none',
              }}
            >
              VIEW ON MODRINTH →
            </a>
          )}
          {result.downloadUrl && (
            <a
              href={result.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.55rem',
                letterSpacing: '0.15em',
                color:         '#f0a500',
                border:        '1px solid #f0a50033',
                padding:       '0.2rem 0.5rem',
                textDecoration: 'none',
              }}
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
  pack: DatapackMeta;
  index: number;
  updateResult?: DatapackUpdateResult;
}) {
  const categoryColor = CATEGORY_COLORS[pack.category] ?? '#00ff41';
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHov, setIsHov] = useState(false);
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rx   = (e.clientX - rect.left) / rect.width  - 0.5;
    const ry   = (e.clientY - rect.top)  / rect.height - 0.5;
    setTilt({ x: rx * 8, y: ry * -8 });
  }, []);

  const onLeave = useCallback(() => {
    setIsHov(false);
    setTilt({ x: 0, y: 0 });
  }, []);

  // Determine update status badge
  const hasUpdate    = updateResult?.updateAvailable === true;
  const isUpToDate   = updateResult && !updateResult.updateAvailable && updateResult.latestVersion;
  const isManaged    = updateResult?.source === 'manual' || !updateResult;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setIsHov(true)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      data-cursor="hover"
      style={{
        background:     '#111111',
        border:         `1px solid ${isHov ? 'rgba(0,255,65,0.4)' : '#1a1a1a'}`,
        padding:        '1.25rem',
        display:        'flex',
        flexDirection:  'column',
        gap:            '0.75rem',
        position:       'relative',
        overflow:       'visible',
        transform:      `perspective(800px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) translateY(${isHov ? -4 : 0}px)`,
        transition:     isHov
          ? 'border-color 0.25s ease, box-shadow 0.25s ease'
          : 'transform 0.5s cubic-bezier(0.03,0.98,0.52,0.99), border-color 0.3s ease, box-shadow 0.4s ease',
        boxShadow:      isHov
          ? `0 12px 40px rgba(0,0,0,0.6), 0 0 24px rgba(0,255,65,0.08)`
          : 'none',
        willChange:     'transform',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Update popup */}
      {showUpdatePopup && updateResult && (
        <UpdateBadge result={updateResult} onClose={() => setShowUpdatePopup(false)} />
      )}

      {/* Top accent line */}
      <div
        style={{
          position:        'absolute',
          top:             0, left: 0, right: 0,
          height:          '2px',
          background:      `linear-gradient(to right, ${categoryColor}, transparent)`,
          transform:       `scaleX(${isHov ? 1 : 0})`,
          transformOrigin: 'left',
          transition:      'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
        }}
      />

      {/* Corner accent */}
      <div style={{
        position:    'absolute',
        top: 0, right: 0,
        width: 0, height: 0,
        borderLeft:  '20px solid transparent',
        borderTop:   `20px solid ${categoryColor}22`,
      }} />

      {/* Category tag + index */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.55rem',
            letterSpacing: '0.3em',
            color:         categoryColor,
            textTransform: 'uppercase',
            background:    `${categoryColor}12`,
            padding:       '0.2rem 0.5rem',
            border:        `1px solid ${categoryColor}33`,
          }}
        >
          {pack.category}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.5rem', color: '#333', letterSpacing: '0.1em' }}>
          #{String(pack.id).padStart(2, '0')}
        </span>
      </div>

      {/* Name */}
      <h3
        style={{
          fontFamily:    "'Space Grotesk', sans-serif",
          fontSize:      '1rem',
          fontWeight:    700,
          color:         '#f0f0f0',
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
          fontSize:      '0.7rem',
          color:         '#555',
          lineHeight:    1.6,
          letterSpacing: '0.02em',
          marginTop:     'auto',
        }}
      >
        {pack.description}
      </p>

      {/* Version / update status row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
        {pack.currentVersion && (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.55rem', color: '#333' }}>
            v{pack.currentVersion}
          </span>
        )}
        <div style={{ marginLeft: 'auto' }}>
          {hasUpdate && (
            <button
              onClick={() => setShowUpdatePopup(v => !v)}
              style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.5rem',
                letterSpacing: '0.2em',
                color:         '#f0a500',
                background:    '#f0a50015',
                border:        '1px solid #f0a50044',
                padding:       '0.15rem 0.4rem',
                cursor:        'pointer',
                display:       'flex',
                alignItems:    'center',
                gap:           '0.3rem',
              }}
            >
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f0a500', display: 'inline-block' }} />
              UPDATE AVAILABLE
            </button>
          )}
          {isUpToDate && (
            <span
              style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.5rem',
                letterSpacing: '0.2em',
                color:         '#00ff4166',
                background:    '#00ff4108',
                border:        '1px solid #00ff4120',
                padding:       '0.15rem 0.4rem',
                display:       'flex',
                alignItems:    'center',
                gap:           '0.3rem',
              }}
            >
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00ff41', display: 'inline-block' }} />
              UP TO DATE
            </span>
          )}
          {isManaged && !hasUpdate && !isUpToDate && (
            <span
              style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '0.5rem',
                letterSpacing: '0.2em',
                color:         '#333',
                padding:       '0.15rem 0',
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

  const checked    = results.filter(r => r.source !== 'manual');
  const updates    = results.filter(r => r.updateAvailable);
  const upToDate   = checked.filter(r => !r.updateAvailable && r.latestVersion);

  if (checked.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        display:       'flex',
        alignItems:    'center',
        gap:           '1.5rem',
        padding:       '0.6rem 1rem',
        background:    updates.length > 0 ? '#f0a50008' : '#00ff4106',
        border:        `1px solid ${updates.length > 0 ? '#f0a50030' : '#00ff4120'}`,
        marginBottom:  '1.5rem',
        flexWrap:      'wrap',
      }}
    >
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.1em', color: '#444' }}>
        UPDATE STATUS
      </span>
      {upToDate.length > 0 && (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: '#00ff4166' }}>
          ● {upToDate.length} up to date
        </span>
      )}
      {updates.length > 0 && (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: '#f0a500' }}>
          ● {updates.length} update{updates.length !== 1 ? 's' : ''} available
        </span>
      )}
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.55rem', color: '#2a2a2a', marginLeft: 'auto' }}>
        {results.filter(r => r.source === 'manual').length} manually managed
      </span>
    </motion.div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export default function DatapacksSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const isInView  = useInView(headerRef, { once: true, margin: '-80px' });
  const [updateResults, setUpdateResults] = useState<DatapackUpdateResult[] | null>(null);
  const [loadingUpdates, setLoadingUpdates] = useState(false);

  // Fetch update status once section comes into view
  useEffect(() => {
    if (!isInView || loadingUpdates || updateResults) return;
    setLoadingUpdates(true);
    fetch('/api/datapacks/check-updates')
      .then(r => r.json())
      .then((data: DatapackUpdateResult[]) => setUpdateResults(data))
      .catch(() => setUpdateResults(null))
      .finally(() => setLoadingUpdates(false));
  }, [isInView, loadingUpdates, updateResults]);

  // Map results by id for fast lookup
  const updateMap = updateResults
    ? Object.fromEntries(updateResults.map(r => [r.id, r]))
    : {};

  const updateCount = updateResults?.filter(r => r.updateAvailable).length ?? 0;

  return (
    <section
      id="datapacks"
      style={{
        padding:      'clamp(4rem, 10vw, 8rem) clamp(1.5rem, 6vw, 5rem)',
        borderBottom: '1px solid #1a1a1a',
        background:   '#080808',
      }}
    >
      {/* Header */}
      <div ref={headerRef} style={{ marginBottom: '3rem' }}>
        <motion.p
          initial={{ opacity: 0, x: -16 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.5 }}
          style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.65rem',
            letterSpacing: '0.3em',
            color:         '#00ff41',
            textTransform: 'uppercase',
            marginBottom:  '0.75rem',
          }}
        >
          04 — DATAPACKS
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily:    "'Space Grotesk', sans-serif",
            fontSize:      'clamp(2.5rem, 6vw, 5rem)',
            fontWeight:    900,
            letterSpacing: '-0.03em',
            color:         '#f0f0f0',
            lineHeight:    1,
          }}
        >
          DATAPACKS
          {updateCount > 0 && (
            <span
              style={{
                marginLeft:    '1rem',
                fontSize:      'clamp(0.8rem, 2vw, 1.2rem)',
                fontFamily:    "'JetBrains Mono', monospace",
                color:         '#f0a500',
                background:    '#f0a50015',
                border:        '1px solid #f0a50033',
                padding:       '0.2rem 0.6rem',
                verticalAlign: 'middle',
                letterSpacing: '0.05em',
              }}
            >
              {updateCount} UPDATE{updateCount !== 1 ? 'S' : ''}
            </span>
          )}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{
            marginTop:     '1rem',
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      '0.75rem',
            color:         '#444',
            letterSpacing: '0.05em',
            maxWidth:      '400px',
          }}
        >
          {DATAPACKS.length} datapacks — combat, structure, social, and more.
        </motion.p>
      </div>

      {/* Summary bar */}
      {loadingUpdates && (
        <div style={{
          fontFamily:   "'JetBrains Mono', monospace",
          fontSize:     '0.6rem',
          color:        '#333',
          letterSpacing: '0.2em',
          marginBottom: '1.5rem',
        }}>
          CHECKING FOR UPDATES...
        </div>
      )}
      <UpdateSummaryBar results={updateResults} />

      {/* Grid */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))',
          gap:                 '1px',
          background:          '#1a1a1a',
          border:              '1px solid #1a1a1a',
        }}
      >
        {DATAPACKS.map((pack, i) => (
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
