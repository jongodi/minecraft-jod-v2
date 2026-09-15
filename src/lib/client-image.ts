// Browser-side photo preparation: big screenshots are shrunk to a sensible size and
// re-encoded as WebP before upload, so uploads are fast and the gallery stays light.
// Runs only in the browser.

export const MAX_EDGE   = 2560;            // longest side after resizing
const SMALL_ENOUGH      = 1.5 * 1024 * 1024; // files under this are sent untouched if they also fit MAX_EDGE
const WEBP_QUALITY      = 0.86;

export interface PreparedImage {
  blob:        Blob;
  ext:         string;
  contentType: string;
  width:       number;
  height:      number;
  resized:     boolean;
}

const EXT_FOR: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif',
};

export function extFor(file: Blob & { name?: string }): string {
  const byType = EXT_FOR[file.type];
  if (byType) return byType;
  const byName = (file.name ?? '').split('.').pop()?.toLowerCase() ?? '';
  return Object.values(EXT_FOR).includes(byName) ? byName : 'png';
}

async function decode(file: File): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; close: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(file);
      return { width: bmp.width, height: bmp.height, draw: (ctx, w, h) => ctx.drawImage(bmp, 0, 0, w, h), close: () => bmp.close() };
    } catch { /* fall through to <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Gat ekki lesið myndina.'));
      el.src = url;
    });
    return { width: img.naturalWidth, height: img.naturalHeight, draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h), close: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

/** Shrink and re-encode when it helps; otherwise hand the original back. GIFs are left alone (animation). */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const passthrough = (width = 0, height = 0): PreparedImage =>
    ({ blob: file, ext: extFor(file), contentType: file.type || 'image/png', width, height, resized: false });

  if (!file.type.startsWith('image/')) throw new Error('Aðeins er hægt að hlaða upp myndum.');
  if (file.type === 'image/gif') return passthrough();

  let src;
  try { src = await decode(file); }
  catch { return passthrough(); }

  try {
    const { width, height } = src;
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    if (scale === 1 && file.size <= SMALL_ENOUGH) return passthrough(width, height);

    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return passthrough(width, height);
    ctx.imageSmoothingQuality = 'high';
    src.draw(ctx, w, h);

    let out = await toBlob(canvas, 'image/webp', WEBP_QUALITY);
    let ext = 'webp';
    if (!out || out.type !== 'image/webp') { out = await toBlob(canvas, 'image/jpeg', WEBP_QUALITY); ext = 'jpg'; }
    if (!out) return passthrough(width, height);

    // Only worth it if we actually shrank the file or the pixels
    if (scale === 1 && out.size >= file.size) return passthrough(width, height);
    return { blob: out, ext, contentType: out.type, width: w, height: h, resized: true };
  } finally {
    src.close();
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
