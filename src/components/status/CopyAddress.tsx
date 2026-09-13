'use client';

import { useEffect, useRef, useState } from 'react';

interface CopyAddressProps {
  address: string;
}

/**
 * Client component: clipboard API plus a two second confirmation. The whole
 * block is the button so the thumb target is the full width, 64 px tall.
 */
export function CopyAddress({ address }: CopyAddressProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Afritaðu vistfangið:', address);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Afrita vistfangið ${address}`}
      className={`flex h-16 w-full items-center justify-between gap-4 px-5 text-left transition-colors duration-feedback ease-out ${
        copied ? 'bg-text text-accent-ink' : 'bg-accent text-accent-ink'
      }`}
    >
      <span className="font-display text-address">{address}</span>
      <span className="font-label text-label uppercase" aria-live="polite">
        {copied ? 'Afritað' : 'Afrita'}
      </span>
    </button>
  );
}
