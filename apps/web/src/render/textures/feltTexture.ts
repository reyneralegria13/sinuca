import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { createCanvas, createTileableFbm, createValueNoise } from './noise';

/** Tamanho de um ladrilho da textura do feltro, em mm. */
export const FELT_TILE_MM = 260;

/** Feltro: cor com manchas suaves e mapa de relevo com a trama fina do tecido. */
export function createFeltTextures(maxAnisotropy: number) {
  const size = 512;
  const blotches = createTileableFbm(7, 4, 4);
  const fine = createValueNoise(11, 256);

  const [colorCanvas, cctx] = createCanvas(size, size);
  const color = cctx.createImageData(size, size);
  const [bumpCanvas, bctx] = createCanvas(size, size);
  const bump = bctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const blotch = blotches(x / size, y / size);
      const fiber = fine((x / size) * 256, (y / size) * 256);
      const weave = ((x + y) % 2 === 0 ? 1 : 0) * 0.25 + ((x - y) % 3 === 0 ? 0.15 : 0);
      const v = 0.95 + (blotch - 0.5) * 0.07 + (fiber - 0.5) * 0.04;
      color.data[i] = 255 * v;
      color.data[i + 1] = 255 * v;
      color.data[i + 2] = 255 * v;
      color.data[i + 3] = 255;
      const h = 128 + (fiber - 0.5) * 120 + weave * 50;
      bump.data[i] = bump.data[i + 1] = bump.data[i + 2] = h;
      bump.data[i + 3] = 255;
    }
  }
  cctx.putImageData(color, 0, 0);
  bctx.putImageData(bump, 0, 0);

  const map = new CanvasTexture(colorCanvas);
  map.colorSpace = SRGBColorSpace;
  const bumpMap = new CanvasTexture(bumpCanvas);
  for (const t of [map, bumpMap]) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(1 / FELT_TILE_MM, 1 / FELT_TILE_MM);
    t.anisotropy = maxAnisotropy;
  }
  return { map, bumpMap };
}
