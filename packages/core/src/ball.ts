import { randomRotation, type Mat3 } from './math/mat3';

export type Group = 'solids' | 'stripes';

export const CUE_BALL = 0;
export const EIGHT_BALL = 8;

/**
 * Estado dinâmico de uma bola.
 * (vx, vy) é a velocidade do centro; (ux, uy) é a velocidade de superfície
 * gerada pelo giro horizontal (R·ω). Quando u = v a bola rola sem deslizar.
 * `side` é o giro em torno do eixo vertical (efeito lateral), em mm/s na superfície.
 */
export interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ux: number;
  uy: number;
  side: number;
  active: boolean;
  orientation: Mat3;
}

export function createBall(
  id: number,
  x: number,
  y: number,
  random: () => number = Math.random,
): Ball {
  return {
    id,
    x,
    y,
    vx: 0,
    vy: 0,
    ux: 0,
    uy: 0,
    side: 0,
    active: true,
    orientation: randomRotation(random),
  };
}

export function stopBall(ball: Ball): void {
  ball.vx = ball.vy = ball.ux = ball.uy = ball.side = 0;
}

export function groupOf(id: number): Group | null {
  if (id === CUE_BALL || id === EIGHT_BALL) return null;
  return id < EIGHT_BALL ? 'solids' : 'stripes';
}

export const GROUP_BALLS: Record<Group, readonly number[]> = {
  solids: [1, 2, 3, 4, 5, 6, 7],
  stripes: [9, 10, 11, 12, 13, 14, 15],
};

export const otherGroup = (group: Group): Group => (group === 'solids' ? 'stripes' : 'solids');
