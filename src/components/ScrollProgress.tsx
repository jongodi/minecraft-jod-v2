'use client';

import { useEffect, useState } from 'react';

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
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
        height:        '1.5px',
        width:         `${progress}%`,
        background:    'var(--accent)',
        zIndex:        9997,
        pointerEvents: 'none',
        transition:    'width 0.05s linear',
        boxShadow:     '0 0 8px rgba(var(--accent-rgb),0.8)',
      }}
    />
  );
}
