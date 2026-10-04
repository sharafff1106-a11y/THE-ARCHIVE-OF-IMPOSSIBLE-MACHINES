/**
 * The memories the engine stores are not photographs. They are drawn,
 * procedurally, then ordered-dithered into two tones like an archival
 * transfer. Nobody knows whose memories they are.
 *
 * Each one quietly points at something later in the archive.
 */

const W = 240;
const H = 150;

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

type Painter = (g: CanvasRenderingContext2D, r: () => number) => void;

const gray = (v: number) => `rgb(${(v * 255) | 0},${(v * 255) | 0},${(v * 255) | 0})`;

function stars(g: CanvasRenderingContext2D, r: () => number, n: number, maxY: number) {
  for (let i = 0; i < n; i++) {
    const x = r() * W;
    const y = r() * maxY;
    g.fillStyle = gray(0.5 + r() * 0.5);
    g.fillRect(x, y, r() > 0.92 ? 2 : 1, 1);
  }
}

function figure(g: CanvasRenderingContext2D, x: number, y: number, h: number, lookUp = false) {
  g.fillStyle = '#000';
  const w = h * 0.26;
  g.fillRect(x - w / 2, y - h * 0.78, w, h * 0.5); // torso
  g.fillRect(x - w / 2 + 0.5, y - h * 0.3, w * 0.38, h * 0.3); // legs
  g.fillRect(x + w * 0.12, y - h * 0.3, w * 0.38, h * 0.3);
  g.beginPath();
  g.arc(x + (lookUp ? 0.6 : 0), y - h * 0.88 - (lookUp ? 0.6 : 0), h * 0.12, 0, Math.PI * 2);
  g.fill();
}

const SCENES: Array<{ title: string; paint: Painter }> = [
  {
    // Someone on a hill, looking at the sky.
    title: 'SUBJECT LOOKING UP',
    paint: (g, r) => {
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, gray(0.02));
      sky.addColorStop(0.75, gray(0.32));
      sky.addColorStop(1, gray(0.45));
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);
      stars(g, r, 160, H * 0.7);
      // a faint band of stars across the sky
      for (let i = 0; i < 420; i++) {
        const t = r();
        const x = t * W;
        const y = 10 + t * 50 + (r() - 0.5) * 22;
        g.fillStyle = gray(0.35 + r() * 0.4);
        g.fillRect(x, y, 1, 1);
      }
      g.fillStyle = '#000';
      g.beginPath();
      g.moveTo(0, H * 0.84);
      g.quadraticCurveTo(W * 0.55, H * 0.6, W, H * 0.88);
      g.lineTo(W, H);
      g.lineTo(0, H);
      g.fill();
      figure(g, W * 0.56, H * 0.715, 20, true);
    },
  },
  {
    // A lit window. Someone inside, waiting.
    title: 'WINDOW, NIGHT, UNKNOWN STREET',
    paint: (g) => {
      g.fillStyle = gray(0.05);
      g.fillRect(0, 0, W, H);
      const wx = W * 0.56;
      const wy = H * 0.2;
      const ww = 58;
      const wh = 72;
      const light = g.createRadialGradient(wx + ww / 2, wy + wh / 2, 4, wx + ww / 2, wy + wh / 2, 70);
      light.addColorStop(0, gray(0.95));
      light.addColorStop(1, gray(0.55));
      g.fillStyle = light;
      g.fillRect(wx, wy, ww, wh);
      g.fillStyle = gray(0.05);
      g.fillRect(wx + ww / 2 - 1.5, wy, 3, wh);
      g.fillRect(wx, wy + wh * 0.45, ww, 3);
      // silhouette in the lower pane
      g.fillStyle = '#000';
      g.beginPath();
      g.arc(wx + ww * 0.3, wy + wh * 0.66, 6, 0, Math.PI * 2);
      g.fill();
      g.fillRect(wx + ww * 0.3 - 10, wy + wh * 0.74, 20, 30);
      // spill of light on the street
      g.fillStyle = gray(0.18);
      g.beginPath();
      g.moveTo(wx - 10, H);
      g.lineTo(wx + ww + 30, H);
      g.lineTo(wx + ww + 6, H * 0.84);
      g.lineTo(wx + 4, H * 0.84);
      g.fill();
    },
  },
  {
    // A corridor with a door of light at the end.
    title: 'CORRIDOR, DOOR OPEN',
    paint: (g) => {
      g.fillStyle = gray(0.03);
      g.fillRect(0, 0, W, H);
      const cx = W / 2;
      const cy = H * 0.48;
      for (let i = 0; i < 9; i++) {
        const k = 1 - i / 9;
        g.strokeStyle = gray(0.1 + (1 - k) * 0.25);
        g.strokeRect(cx - (W / 2) * k, cy - (H / 1.6) * k, W * k, (H / 0.8) * k);
      }
      const door = g.createLinearGradient(0, cy - 16, 0, cy + 16);
      door.addColorStop(0, gray(1));
      door.addColorStop(1, gray(0.8));
      g.fillStyle = door;
      g.fillRect(cx - 9, cy - 18, 18, 34);
      figure(g, cx, cy + 16, 18);
      g.fillStyle = gray(0.25);
      g.beginPath();
      g.moveTo(cx - 9, cy + 16);
      g.lineTo(cx + 9, cy + 16);
      g.lineTo(cx + 40, H);
      g.lineTo(cx - 40, H);
      g.fill();
    },
  },
  {
    // This machine. Someone was standing in front of it before you.
    title: 'M-001, PRIOR VISITOR',
    paint: (g) => {
      g.fillStyle = gray(0.04);
      g.fillRect(0, 0, W, H);
      const cx = W * 0.44;
      const glow = g.createRadialGradient(cx, H * 0.45, 2, cx, H * 0.45, 70);
      glow.addColorStop(0, gray(0.9));
      glow.addColorStop(1, gray(0.04));
      g.fillStyle = glow;
      g.fillRect(cx - 20, H * 0.18, 40, 70);
      g.strokeStyle = gray(0.55);
      g.lineWidth = 1.2;
      g.beginPath();
      g.ellipse(cx, H * 0.42, 46, 12, -0.2, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.ellipse(cx, H * 0.55, 38, 8, 0.12, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = gray(0.2);
      g.fillRect(cx - 52, H * 0.82, 104, 12);
      g.fillRect(cx - 30, H * 0.65, 60, 18);
      g.fillRect(cx - 24, H * 0.12, 48, 8);
      figure(g, W * 0.79, H * 0.92, 34);
    },
  },
];

export function memoryTitle(index: number) {
  return SCENES[index % SCENES.length].title;
}

/** Paints memory `index` into `target`, dithered. */
export function paintMemory(target: HTMLCanvasElement, index: number) {
  const src = document.createElement('canvas');
  src.width = W;
  src.height = H;
  const g = src.getContext('2d', { willReadFrequently: true })!;
  SCENES[index % SCENES.length].paint(g, rng(index * 7919 + 17));

  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
      const threshold = (BAYER[y & 3][x & 3] + 0.5) / 16;
      const on = l > threshold;
      d[i] = on ? 243 : 11;
      d[i + 1] = on ? 240 : 13;
      d[i + 2] = on ? 232 : 18;
      d[i + 3] = 255;
    }
  }
  target.width = W;
  target.height = H;
  target.getContext('2d')!.putImageData(img, 0, 0);
}
