'use client';

import { useEffect, useRef, useState } from 'react';

interface CopyAddressProps {
  address: string;
}

/**
 * Client component: needs the clipboard API and a two-second confirmation.
 * The whole row is the button so the thumb target is the full width.
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
      className={`mt-2 flex min-h-14 w-full items-center justify-between gap-4 rounded px-4 text-left transition-colors duration-feedback ease-out ${
        copied ? 'bg-accent-deep text-accent-ink' : 'bg-accent text-accent-ink hover:bg-accent-deep'
      }`}
    >
      <span className="num text-lead font-semibold">{address}</span>
      <span className="text-label font-semibold" aria-live="polite">
        {copied ? 'Afritað' : 'Afrita'}
      </span>
    </button>
  );
}
