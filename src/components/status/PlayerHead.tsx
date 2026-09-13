'use client';

import Image from 'next/image';
import { useState } from 'react';

interface PlayerHeadProps {
  name: string;
  size: number;
}

/**
 * The player's Minecraft head from mc-heads.net, the same render the old
 * site used, drawn pixel sharp. If the
 * avatar service is down the face becomes a bone square with the first
 * letter, so the roster never shows a broken image. Client component only
 * for the error fallback.
 */
export function PlayerHead({ name, size }: PlayerHeadProps) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className="flex items-center justify-center bg-text font-display uppercase text-accent-ink"
        style={{ width: size, height: size, fontSize: size * 0.6 }}
        aria-hidden="true"
      >
        {name.charAt(0)}
      </span>
    );
  }
  return (
    <Image
      src={`https://mc-heads.net/head/${encodeURIComponent(name)}/${size * 2}`}
      alt=""
      width={size}
      height={size}
      unoptimized
      fetchPriority="low"
      decoding="async"
      className="pixel"
      onError={() => setFailed(true)}
    />
  );
}
