import { CUE_BALL, type Ball } from './ball';
import { BALL_DIAMETER, BALL_RADIUS } from './constants';
import type { Vec2 } from './math/vec2';
import type { TableGeometry } from './table/types';

export interface PlacementArea {
  minX: number;
  maxX: number;
}

export function fullTableArea(table: TableGeometry): PlacementArea {
  return { minX: BALL_RADIUS, maxX: table.spec.length - BALL_RADIUS };
}

/** Área atrás da linha de saída (usada na saída). */
export function kitchenArea(table: TableGeometry): PlacementArea {
  return { minX: BALL_RADIUS, maxX: table.headStringX };
}

export function isValidPlacement(
  balls: readonly Ball[],
  table: TableGeometry,
  point: Vec2,
  area: PlacementArea,
  ignoreId: number = CUE_BALL,
): boolean {
  if (
    point.x < Math.max(BALL_RADIUS, area.minX) ||
    point.x > Math.min(table.spec.length - BALL_RADIUS, area.maxX)
  )
    return false;
  if (point.y < BALL_RADIUS || point.y > table.spec.width - BALL_RADIUS) return false;
  for (const b of balls) {
    if (!b.active || b.id === ignoreId) continue;
    if (Math.hypot(b.x - point.x, b.y - point.y) < BALL_DIAMETER + 0.5) return false;
  }
  return true;
}

/** Procura, em espiral, o ponto livre mais próximo do desejado. */
export function findFreeSpot(
  balls: readonly Ball[],
  table: TableGeometry,
  desired: Vec2,
  area: PlacementArea,
  ignoreId: number = CUE_BALL,
): Vec2 {
  if (isValidPlacement(balls, table, desired, area, ignoreId)) return { ...desired };
  for (let r = BALL_RADIUS / 2; r < table.spec.length; r += BALL_RADIUS / 2) {
    for (let a = 0; a < Math.PI * 2; a += 0.15) {
      const p = { x: desired.x + Math.cos(a) * r, y: desired.y + Math.sin(a) * r };
      if (isValidPlacement(balls, table, p, area, ignoreId)) return p;
    }
  }
  return { ...desired };
}

/** Coloca a bola no ponto livre mais próximo e a deixa parada e ativa. */
export function placeBall(
  ball: Ball,
  balls: readonly Ball[],
  table: TableGeometry,
  desired: Vec2,
  area: PlacementArea,
): void {
  const p = findFreeSpot(balls, table, desired, area, ball.id);
  ball.x = p.x;
  ball.y = p.y;
  ball.active = true;
  ball.vx = ball.vy = ball.ux = ball.uy = ball.side = 0;
}
