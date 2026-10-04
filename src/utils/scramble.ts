const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%/<>∆◇○';
const DIGITS = '0123456789';

export interface ScrambleOptions {
  duration?: number;
  /** Characters to cycle through; defaults to digits for numeric text. */
  glyphs?: string;
  onDone?: () => void;
}

/**
 * Resolves `to` into `el` left-to-right, like a machine readout settling.
 * Writes textContent directly — no React renders. Returns a cancel fn.
 */
export function scrambleInto(el: HTMLElement, to: string, opts: ScrambleOptions = {}) {
  const duration = opts.duration ?? 700;
  const glyphs = opts.glyphs ?? (/^[\d.,%\s:-]+$/.test(to) ? DIGITS : GLYPHS);
  const start = performance.now();
  let raf = 0;
  let lastFrame = 0;

  const frame = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    // throttle glyph swapping to ~30fps so it reads as mechanical, not noise
    if (now - lastFrame > 33 || p === 1) {
      lastFrame = now;
      const settled = Math.floor(p * to.length);
      let out = to.slice(0, settled);
      for (let i = settled; i < to.length; i++) {
        const c = to[i];
        out += c === ' ' || c === '.' || c === ':' ? c : glyphs[(Math.random() * glyphs.length) | 0];
      }
      el.textContent = out;
    }
    if (p < 1) raf = requestAnimationFrame(frame);
    else opts.onDone?.();
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

export const pad = (n: number, width: number) => String(Math.max(0, Math.floor(n))).padStart(width, '0');
