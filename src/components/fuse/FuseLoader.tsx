'use client';

import dynamic from 'next/dynamic';

/**
 * The game is not part of the initial bundle: it loads when this component
 * mounts, which is below the fold, and never blocks first paint.
 */
const Fuse = dynamic(() => import('./Fuse'), {
  ssr: false,
  loading: () => <div className="aspect-[4/5] w-full border border-line bg-bg-2 sm:aspect-[16/9]" aria-hidden="true" />,
});

export function FuseLoader() {
  return <Fuse />;
}
