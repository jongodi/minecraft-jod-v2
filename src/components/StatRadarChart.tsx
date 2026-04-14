'use client';

import type { PlayerStat } from '@/app/api/stats/route';

interface Props {
  stat: PlayerStat;
  allStats: PlayerStat[];
  size?: number;
}

const AXES = [
  { key: 'playTimeHours'  as keyof PlayerStat, label: 'PLAYTIME'  },
  { key: 'mobKills'       as keyof PlayerStat, label: 'KILLS'     },
  { key: 'itemsCrafted'   as keyof PlayerStat, label: 'CRAFTED'   },
  { key: 'distanceWalked' as keyof PlayerStat, label: 'WALKED'    },
  { key: 'deaths'         as keyof PlayerStat, label: 'DEATHS'    },
];

const N = AXES.length;

function polarToXY(angle: number, r: number, cx: number, cy: number) {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function StatRadarChart({ stat, allStats, size = 220 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;
  const labelR = size * 0.48;
  const green = '#00ff41';

  // Find max per axis across all players
  const maxValues = AXES.map(a => {
    const vals = allStats.map(p => (p[a.key] as number) || 0);
    return Math.max(...vals, 1);
  });

  // Player values normalised 0–1
  const values = AXES.map((a, i) => {
    const v = (stat[a.key] as number) || 0;
    return Math.min(v / maxValues[i], 1);
  });

  const angleStep = 360 / N;

  // Build polygon points for the player
  const playerPoints = values.map((v, i) => {
    const angle = i * angleStep;
    const r = v * maxR;
    return polarToXY(angle, r, cx, cy);
  });
  const playerPath = playerPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ') + ' Z';

  // Grid rings
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const gridPaths = gridLevels.map(level => {
    const pts = AXES.map((_, i) => {
      const angle = i * angleStep;
      const r = level * maxR;
      return polarToXY(angle, r, cx, cy);
    });
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ' Z';
  });

  // Axis lines (from center to each vertex)
  const axisLines = AXES.map((_, i) => {
    const angle = i * angleStep;
    const tip = polarToXY(angle, maxR, cx, cy);
    return { x1: cx, y1: cy, x2: tip.x, y2: tip.y };
  });

  // Label positions
  const labels = AXES.map((a, i) => {
    const angle = i * angleStep;
    const pos = polarToXY(angle, labelR, cx, cy);
    return { ...pos, label: a.label };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: 'visible' }}
    >
      {/* Grid rings */}
      {gridPaths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#1a1a1a" strokeWidth={0.8} />
      ))}

      {/* Axis lines */}
      {axisLines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#1a1a1a" strokeWidth={0.8} />
      ))}

      {/* Player polygon */}
      <path
        d={playerPath}
        fill={`rgba(0,255,65,0.12)`}
        stroke={green}
        strokeWidth={1.5}
        strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0 0 6px rgba(0,255,65,0.3))' }}
      />

      {/* Player vertex dots */}
      {playerPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={green} style={{ filter: 'drop-shadow(0 0 4px rgba(0,255,65,0.8))' }} />
      ))}

      {/* Labels */}
      {labels.map(({ x, y, label }, i) => {
        const textAnchor = x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle';
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor={textAnchor}
            dominantBaseline="middle"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '5.5px',
              fill: '#555',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            } as React.CSSProperties}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
