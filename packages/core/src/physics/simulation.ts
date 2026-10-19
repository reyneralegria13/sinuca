import type { Ball } from '../ball';
import { DEFAULT_PHYSICS, SIMULATION_STEP, type PhysicsParams } from '../constants';
import { orthonormalize } from '../math/mat3';
import type { TableGeometry } from '../table/types';
import { resolveBallContact, resolveCushionContact } from './collisions';
import type { SimulationEvents } from './events';
import { applyClothFriction } from './friction';
import { integrateOrientation } from './orientation';
import { detectPocket } from './pockets';

export interface Simulation {
  table: TableGeometry;
  balls: Ball[];
  params: PhysicsParams;
  steps: number;
}

export function createSimulation(
  table: TableGeometry,
  balls: Ball[],
  params: PhysicsParams = DEFAULT_PHYSICS,
): Simulation {
  return { table, balls, params, steps: 0 };
}

export function isMoving(balls: readonly Ball[]): boolean {
  for (const b of balls) if (b.active && (b.vx || b.vy || b.ux || b.uy)) return true;
  return false;
}

/** Avança a simulação um passo de `dt` segundos. */
export function step(
  sim: Simulation,
  dt: number = SIMULATION_STEP,
  events: SimulationEvents = {},
): void {
  const { balls, params, table } = sim;

  for (const ball of balls) {
    if (!ball.active) continue;
    applyClothFriction(ball, dt, params);
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    integrateOrientation(ball, dt);
  }

  for (let i = 0; i < balls.length; i++) {
    const a = balls[i]!;
    if (!a.active) continue;
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j]!;
      if (!b.active) continue;
      const speed = resolveBallContact(a, b, params);
      if (speed > 0) events.onBallContact?.(a, b, speed);
    }
  }

  for (const ball of balls) {
    if (!ball.active) continue;
    for (const s of table.cushions) {
      const speed = resolveCushionContact(ball, s, params);
      if (speed > 0) events.onCushionContact?.(ball, speed);
    }
  }

  for (const ball of balls) {
    if (!ball.active) continue;
    const pocket = detectPocket(ball, table);
    if (pocket) {
      ball.active = false;
      ball.vx = ball.vy = ball.ux = ball.uy = ball.side = 0;
      events.onPocket?.(ball, pocket);
    }
  }

  if (++sim.steps % 400 === 0) for (const ball of balls) orthonormalize(ball.orientation);
}

/** Avança `elapsed` segundos em passos fixos. Retorna o tempo que sobrou (menor que um passo). */
export function advance(
  sim: Simulation,
  elapsed: number,
  events?: SimulationEvents,
  maxSteps = 80,
): number {
  let remaining = elapsed;
  let n = 0;
  while (remaining >= SIMULATION_STEP && n < maxSteps) {
    step(sim, SIMULATION_STEP, events);
    remaining -= SIMULATION_STEP;
    n++;
  }
  return n >= maxSteps ? 0 : remaining;
}

/** Roda até todas as bolas pararem. Útil para servidor, testes e IA. */
export function simulateUntilRest(
  sim: Simulation,
  events?: SimulationEvents,
  maxSeconds = 60,
): number {
  let t = 0;
  while (isMoving(sim.balls) && t < maxSeconds) {
    step(sim, SIMULATION_STEP, events);
    t += SIMULATION_STEP;
  }
  return t;
}
