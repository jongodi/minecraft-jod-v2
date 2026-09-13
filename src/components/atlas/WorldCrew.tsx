'use client';

import Image from 'next/image';

import { useState } from 'react';
import Link from 'next/link';
import type { PlayerStat, StatsResponse } from '@/app/api/stats/route';
import { useResource } from './useResource';
import { Arrow } from './Arrow';

interface Member {
  username: string;
  bio: string;
  photoCount: number;
  postCount: number;
}
const METRICS: {
  key: keyof Pick<
    PlayerStat,
    'playTimeHours' | 'mobKills' | 'deaths' | 'itemsCrafted' | 'distanceWalked'
  >;
  label: string;
  format: (value: number) => string;
}[] = [
  {
    key: 'playTimeHours',
    label: 'Playtime',
    format: (value) => `${value.toLocaleString()} h`,
  },
  {
    key: 'mobKills',
    label: 'Mob kills',
    format: (value) => value.toLocaleString(),
  },
  { key: 'deaths', label: 'Deaths', format: (value) => value.toLocaleString() },
  {
    key: 'itemsCrafted',
    label: 'Items crafted',
    format: (value) => value.toLocaleString(),
  },
  {
    key: 'distanceWalked',
    label: 'Distance walked',
    format: (value) => `${(value / 100000).toFixed(1)} km`,
  },
];

function Avatar({ name }: { name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="atlas-avatar">
      {failed ? (
        name.slice(0, 1).toUpperCase()
      ) : (
        <Image
          unoptimized
          src={`https://mc-heads.net/avatar/${encodeURIComponent(name)}/64`}
          alt=""
          width="48"
          height="48"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

export default function WorldCrew({
  onlineNames,
  statusKnown,
  showProfileLink = true,
}: {
  onlineNames: string[];
  statusKnown: boolean;
  showProfileLink?: boolean;
}) {
  const crew = useResource<Member[]>('/api/crew');
  const stats = useResource<StatsResponse>('/api/stats');
  const [metricIndex, setMetricIndex] = useState(0);
  const metric = METRICS[metricIndex];
  const members = Array.isArray(crew.data) ? crew.data : [];
  const ranked = [...(stats.data?.players ?? [])].sort(
    (a, b) => b[metric.key] - a[metric.key],
  );
  const online = new Set(onlineNames.map((name) => name.toLowerCase()));
  return (
    <div className="atlas-crew">
      <div>
        <div className="atlas-packs__head">
          <div>
            <h3>The usual suspects.</h3>
            <p>The people behind the places.</p>
          </div>
          {showProfileLink && (
            <Link className="atlas-text-button" href="/crew">
              Posts & profiles <Arrow diagonal />
            </Link>
          )}
        </div>
        <div className="atlas-crew__grid">
          {members.map((member) => (
            <Link
              key={member.username}
              href={`/crew/${encodeURIComponent(member.username)}`}
              className="atlas-member"
            >
              <Avatar name={member.username} />
              <div>
                <h4>{member.username}</h4>
                <p>
                  {online.has(member.username.toLowerCase())
                    ? 'Playing now'
                    : statusKnown
                      ? 'Offline'
                      : 'Status unavailable'}
                </p>
              </div>
              <Arrow diagonal />
            </Link>
          ))}
        </div>
        {crew.error && (
          <p className="atlas-notice">
            Couldn’t load the crew.{' '}
            <button className="atlas-text-button" onClick={crew.retry}>
              Retry
            </button>
          </p>
        )}
        {crew.loading && <p className="atlas-empty">Loading crew…</p>}
      </div>
      <div className="atlas-leaderboard">
        <div className="atlas-leaderboard__head">
          <span className="atlas-eyebrow">From the world</span>
          <label>
            <span className="atlas-sr-only">Leaderboard metric</span>
            <select
              value={metricIndex}
              onChange={(event) => setMetricIndex(Number(event.target.value))}
            >
              {METRICS.map((item, i) => (
                <option key={item.key} value={i}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {ranked.length > 0 ? (
          <ol>
            {ranked.map((player, i) => (
              <li key={player.username}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <Link href={`/crew/${encodeURIComponent(player.username)}`}>
                  {player.username}
                </Link>
                <strong>{metric.format(player[metric.key])}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <p className="atlas-empty">
            {stats.loading
              ? 'Loading player stats…'
              : 'Player stats aren’t available right now.'}
            {!stats.loading && (
              <button className="atlas-text-button" onClick={stats.retry}>
                Refresh stats
              </button>
            )}
          </p>
        )}
        <p className="atlas-leaderboard__source">
          {stats.data?.source === 'cached'
            ? `Last snapshot${stats.data.cachedAt ? ` · ${new Date(stats.data.cachedAt).toLocaleDateString()}` : ''}`
            : stats.data?.source === 'live'
              ? 'Live world stats'
              : 'Stats appear when the server makes them available.'}
        </p>
      </div>
    </div>
  );
}
