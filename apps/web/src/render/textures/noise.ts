/** Ruído de valor 2D periódico (repete a cada `period` células), para texturas sem emenda. */
export function createValueNoise(seed: number, period = 64) {
  const grid = new Float32Array(period * period);
  let s = seed >>> 0;
  for (let i = 0; i < grid.length; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    grid[i] = s / 4294967296;
  }
  const at = (x: number, y: number) =>
    grid[(((y % period) + period) % period) * period + (((x % period) + period) % period)]!;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number): number => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const tx = smooth(x - xi);
    const ty = smooth(y - yi);
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
}

/** Soma de oitavas (fBm) periódica. */
export function fbm(
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves: number,
): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2;
  }
  return sum;
}

/**
 * fBm que fecha a emenda: recebe coordenadas de 0 a 1 no ladrilho.
 * A frequência base é igual ao período do ruído, e cada oitava dobra, então todas repetem na borda.
 */
export function createTileableFbm(seed: number, baseFrequency: number, octaves: number) {
  const layers = Array.from({ length: octaves }, (_, o) =>
    createValueNoise(seed + o * 101, baseFrequency * 2 ** o),
  );
  return (u: number, v: number): number => {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    layers.forEach((noise, o) => {
      const f = baseFrequency * 2 ** o;
      sum += amp * noise(u * f, v * f);
      norm += amp;
      amp *= 0.5;
    });
    return sum / norm;
  };
}

export function createCanvas(
  width: number,
  height: number,
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext('2d')!];
}
