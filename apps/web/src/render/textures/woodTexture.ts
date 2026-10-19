import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { createCanvas, createTileableFbm } from './noise';

export interface WoodPalette {
  dark: [number, number, number];
  light: [number, number, number];
}

export const WALNUT: WoodPalette = { dark: [58, 30, 15], light: [112, 64, 33] };
export const MAPLE: WoodPalette = { dark: [196, 152, 98], light: [236, 208, 158] };

/**
 * Madeira com veios longos ao longo de x (cor e rugosidade), sem emenda visível.
 * `tileMm`: comprimento do ladrilho em mm.
 */
export function createWoodTextures(
  palette: WoodPalette,
  tileMm: number,
  maxAnisotropy: number,
  seed = 3,
) {
  const W = 1024;
  const H = 512;
  const RINGS = 22;
  const warp = createTileableFbm(seed, 2, 4);
  const streak = createTileableFbm(seed + 50, 4, 3);
  const pores = createTileableFbm(seed + 90, 64, 2);
  const [canvas, ctx] = createCanvas(W, H);
  const [rCanvas, rctx] = createCanvas(W, H);
  const img = ctx.createImageData(W, H);
  const rough = rctx.createImageData(W, H);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const v = y / H;
      // veios: senoide em v deslocada por ruído de baixa frequência (a fibra ondula suavemente)
      const phase = v * RINGS + (warp(u, v) - 0.5) * 3.2;
      const grain = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
      const late = Math.pow(grain, 2.2);
      const tone = streak(u, v);
      const pore = pores(u, v);
      const t = Math.min(
        1,
        Math.max(0, 0.55 + (late - 0.5) * 0.38 + (tone - 0.5) * 0.45 + (pore - 0.5) * 0.12),
      );
      const i = (y * W + x) * 4;
      for (let c = 0; c < 3; c++)
        img.data[i + c] = palette.dark[c]! + (palette.light[c]! - palette.dark[c]!) * t;
      img.data[i + 3] = 255;
      const r = 110 + late * 40 + (pore - 0.5) * 60;
      rough.data[i] = rough.data[i + 1] = rough.data[i + 2] = r;
      rough.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  rctx.putImageData(rough, 0, 0);

  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  const roughnessMap = new CanvasTexture(rCanvas);
  for (const t of [map, roughnessMap]) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(1 / tileMm, 2 / tileMm);
    t.anisotropy = maxAnisotropy;
  }
  return { map, roughnessMap };
}
