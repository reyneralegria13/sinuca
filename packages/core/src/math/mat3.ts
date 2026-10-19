/**
 * Matriz de rotação 3x3 armazenada em ordem de linhas (row-major).
 * Converte coordenadas do corpo da bola para coordenadas do mundo:
 * mundo = M * corpo. A coluna j é o eixo j do corpo expresso no mundo.
 */
export type Mat3 = number[];

export const identity = (): Mat3 => [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** Aplica, à esquerda de M, a rotação de `angle` radianos em torno do eixo unitário k. */
export function rotateInPlace(M: Mat3, kx: number, ky: number, kz: number, angle: number): void {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  const r00 = t * kx * kx + c;
  const r01 = t * kx * ky - s * kz;
  const r02 = t * kx * kz + s * ky;
  const r10 = t * kx * ky + s * kz;
  const r11 = t * ky * ky + c;
  const r12 = t * ky * kz - s * kx;
  const r20 = t * kx * kz - s * ky;
  const r21 = t * ky * kz + s * kx;
  const r22 = t * kz * kz + c;
  for (let j = 0; j < 3; j++) {
    const a0 = M[j]!;
    const a1 = M[3 + j]!;
    const a2 = M[6 + j]!;
    M[j] = r00 * a0 + r01 * a1 + r02 * a2;
    M[3 + j] = r10 * a0 + r11 * a1 + r12 * a2;
    M[6 + j] = r20 * a0 + r21 * a1 + r22 * a2;
  }
}

/** Corrige o acúmulo de erro numérico (Gram-Schmidt nas colunas). */
export function orthonormalize(M: Mat3): void {
  let x0 = M[0]!,
    x1 = M[3]!,
    x2 = M[6]!;
  let l = Math.hypot(x0, x1, x2) || 1;
  x0 /= l;
  x1 /= l;
  x2 /= l;
  let y0 = M[1]!,
    y1 = M[4]!,
    y2 = M[7]!;
  const d = x0 * y0 + x1 * y1 + x2 * y2;
  y0 -= d * x0;
  y1 -= d * x1;
  y2 -= d * x2;
  l = Math.hypot(y0, y1, y2) || 1;
  y0 /= l;
  y1 /= l;
  y2 /= l;
  M[0] = x0;
  M[3] = x1;
  M[6] = x2;
  M[1] = y0;
  M[4] = y1;
  M[7] = y2;
  M[2] = x1 * y2 - x2 * y1;
  M[5] = x2 * y0 - x0 * y2;
  M[8] = x0 * y1 - x1 * y0;
}

export function randomRotation(random: () => number): Mat3 {
  const M = identity();
  let kx = random() - 0.5;
  let ky = random() - 0.5;
  let kz = random() - 0.5;
  const l = Math.hypot(kx, ky, kz) || 1;
  kx /= l;
  ky /= l;
  kz /= l;
  rotateInPlace(M, kx, ky, kz, random() * Math.PI * 2);
  return M;
}
