'use client';

import { useEffect, useState } from 'react';

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop  = window.scrollY;
      const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
      const pct        = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(pct);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      style={{
        position:      'fixed',
        top:           0,
        left:          0,
        height:        2,
        width:         `${progress}%`,
        background:    '#00ff41',
        zIndex:        9997,
        pointerEvents: 'none',
        transition:    'width 0.05s linear',
        boxShadow:     '0 0 12px rgba(0,255,65,0.9), 0 0 4px rgba(0,255,65,1)',
      }}
    />
  );
}
