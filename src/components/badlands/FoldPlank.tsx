'use client';

import { Chevron } from './Bits';

interface Props {
  open: boolean;
  onToggle: () => void;
  /** id of the region this plank folds, for `aria-controls`. */
  controls: string;
  /** What pressing it does while the section is folded, and while it is open. */
  openLabel: string;
  closeLabel: string;
  /** How much is in there, posted on a paper tag while it is folded. */
  count?: number;
}

/** The plank nailed under a long section. Pressed, it unfolds the section into
    its full form; pressed again, it folds it back to the compact one. Wood and
    lantern light, because it is a thing you can act on. */
export default function FoldPlank({ open, onToggle, controls, openLabel, closeLabel, count }: Props) {
  return (
    <button
      type="button"
      className={`b-fold${open ? ' is-open' : ''}`}
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
    >
      <span className="b-fold__nail" aria-hidden="true" />
      <span className="b-fold__label">{open ? closeLabel : openLabel}</span>
      {!open && count !== undefined && <span className="b-fold__count">{count}</span>}
      <Chevron className="b-fold__chev" />
      <span className="b-fold__nail b-fold__nail--r" aria-hidden="true" />
    </button>
  );
}
