'use client';

import { useEffect, useState } from 'react';

/* How long the whole break takes, the sweep and the last block's own fall
   together (badlands.css, .b-break), and a beat after it to take it away. */
const SWEEP_MS = 280;
const DONE_MS = 560;

interface Block { left: number; top: number; w: number; h: number; x: number; y: number; delay: number }

/** The still giving way to the live world the way the game removes a block:
    a crack across it, then gone. When the 3D map has drawn its first view,
    the still is laid over it again as a grid of blocks (16 across on a wide
    frame, 6 on a tall one), each showing its own piece of the same picture
    by background position, so the picture is decoded once and nothing is
    copied. The blocks crack and go in a sweep outward from the lantern that
    was pressed, in the middle of the frame. Only opacity moves. */
export default function BlockBreak({ frame, img, onDone }: { frame: HTMLElement; img: HTMLImageElement; onDone: () => void }) {
  /* measured once, when the break begins: the frame does not change size in half a second */
  const [grid] = useState(() => {
    const w = frame.clientWidth;
    const h = frame.clientHeight;
    const cols = w > h ? 16 : 6;
    const rows = Math.max(1, Math.round((cols * h) / w));
    /* the still covers the frame (object-fit: cover, object-position: 50% 45%) */
    const nw = img.naturalWidth || 1920;
    const nh = img.naturalHeight || 1080;
    const scale = Math.max(w / nw, h / nh);
    const dw = nw * scale;
    const dh = nh * scale;
    const ox = (w - dw) * 0.5;
    const oy = (h - dh) * 0.45;
    const bw = w / cols;
    const bh = h / rows;
    const far = Math.hypot(w / 2, h / 2);
    const blocks: Block[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const d = Math.hypot(c * bw + bw / 2 - w / 2, r * bh + bh / 2 - h / 2);
        blocks.push({
          left: Math.floor(c * bw), top: Math.floor(r * bh),
          /* a pixel over each edge, so no seam of the map shows between two blocks */
          w: Math.ceil(bw) + 1, h: Math.ceil(bh) + 1,
          x: ox - Math.floor(c * bw), y: oy - Math.floor(r * bh),
          delay: Math.round((d / far) * SWEEP_MS),
        });
      }
    }
    return { src: img.currentSrc || img.src, dw, dh, blocks };
  });

  useEffect(() => {
    const t = setTimeout(onDone, DONE_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="b-break" aria-hidden="true">
      {grid.blocks.map(b => (
        <span
          key={`${b.left}-${b.top}`}
          className="b-break__block"
          style={{
            left: b.left, top: b.top, width: b.w, height: b.h,
            backgroundImage: `url("${grid.src}")`,
            backgroundSize: `${grid.dw}px ${grid.dh}px`,
            backgroundPosition: `${b.x}px ${b.y}px`,
            animationDelay: `${b.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}
