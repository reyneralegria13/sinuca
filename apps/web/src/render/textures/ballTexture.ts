import { CanvasTexture, SRGBColorSpace } from 'three';
import { createCanvas } from './noise';

export const BALL_COLORS: Record<number, string> = {
  0: '#f6f2e7',
  1: '#f2b51b',
  2: '#173ea3',
  3: '#cc2721',
  4: '#4a2678',
  5: '#ec6512',
  6: '#167343',
  7: '#76191c',
  8: '#0d0d0f',
};

export const ballColor = (id: number): string => BALL_COLORS[id > 8 ? id - 8 : id]!;

const IVORY = '#f5f0e2';

/**
 * Textura equirretangular da bola (2:1). A faixa das listradas fica no equador
 * do eixo vertical local e os círculos com número em ±X local (u = 0 e u = 0,5).
 */
export function createBallTexture(id: number, maxAnisotropy: number): CanvasTexture {
  const W = 1024;
  const H = 512;
  const [canvas, ctx] = createCanvas(W, H);
  const stripe = id > 8;
  const color = ballColor(id);

  ctx.fillStyle = id === 0 ? BALL_COLORS[0]! : stripe ? IVORY : color;
  ctx.fillRect(0, 0, W, H);

  if (stripe) {
    const half = H * (28 / 180);
    ctx.fillStyle = color;
    ctx.fillRect(0, H / 2 - half, W, half * 2);
  }

  if (id !== 0) {
    const r = H * (19 / 180);
    const drawBadge = (cx: number) => {
      ctx.fillStyle = IVORY;
      ctx.beginPath();
      ctx.ellipse(cx, H / 2, r, r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#141414';
      ctx.font = `700 ${Math.round(r * (id > 9 ? 1.05 : 1.25))}px "Barlow Semi Condensed", "Arial Narrow", Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(id), cx, H / 2 + r * 0.06);
      if (id === 6 || id === 9) {
        ctx.fillRect(cx - r * 0.35, H / 2 + r * 0.62, r * 0.7, r * 0.09);
      }
    };
    drawBadge(W / 2);
    // o círculo em u = 0 cruza a emenda: desenha nas duas bordas
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    drawBadge(0);
    drawBadge(W);
    ctx.restore();
  }

  // leve variação de tom, como resina real
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 3;
    d[i] = d[i]! + n;
    d[i + 1] = d[i + 1]! + n;
    d[i + 2] = d[i + 2]! + n;
  }
  ctx.putImageData(img, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}
