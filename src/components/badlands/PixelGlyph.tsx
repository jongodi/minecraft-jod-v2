import { GLYPH_SIZE } from './packGlyphs';

const FILL: Record<string, string> = { '#': 'var(--ink)', r: 'var(--tc-red)', y: 'var(--tc-yellow)' };

/** Renders a rows-of-characters drawing as crisp SVG rectangles. Runs of the
    same colour on a row become one rect, so a glyph is a few dozen nodes. */
export default function PixelGlyph({ rows, className }: { rows: readonly string[]; className?: string }) {
  const rects: React.ReactNode[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (!FILL[ch]) { x += 1; continue; }
      let w = 1;
      while (row[x + w] === ch) w += 1;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={w} height="1" fill={FILL[ch]} />);
      x += w;
    }
  });
  return (
    <svg className={className} viewBox={`0 0 ${GLYPH_SIZE} ${GLYPH_SIZE}`} aria-hidden="true" shapeRendering="crispEdges">
      {rects}
    </svg>
  );
}
