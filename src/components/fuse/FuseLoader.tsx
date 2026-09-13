'use client';

import dynamic from 'next/dynamic';

/**
 * The game is not part of the initial bundle: it loads when this component
 * mounts, which is below the fold, and never blocks first paint.
 */
const Fuse = dynamic(() => import('./Fuse'), {
  ssr: false,
  loading: () => <div className="aspect-stage w-full border border-line bg-bg-2 sm:aspect-photo" aria-hidden="true" />,
});

export function FuseLoader() {
  return <Fuse />;
}
