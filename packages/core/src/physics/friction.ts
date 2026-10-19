import type { Ball } from '../ball';
import type { PhysicsParams } from '../constants';

/**
 * Atrito com o feltro.
 *
 * Deslizamento: o ponto de contato tem velocidade v - u ≠ 0. O atrito μs·g age contra
 * esse deslize, freando o centro (dv = -μs·g·dt) e alterando o giro
 * (du = +5/2·μs·g·dt, pois I = 2/5·m·R²). O deslize zera após Δv = 2/7 do deslize inicial.
 *
 * Rolamento: u = v; a bola perde velocidade pela resistência ao rolamento μr·g
 * e por um amortecimento linear que representa as perdas no feltro.
 */
export function applyClothFriction(ball: Ball, dt: number, p: PhysicsParams): void {
  const sx = ball.vx - ball.ux;
  const sy = ball.vy - ball.uy;
  const slip = Math.hypot(sx, sy);

  if (slip > 1) {
    const dv = p.slidingFriction * p.gravity * dt;
    if (dv * 3.5 >= slip) {
      ball.vx -= (sx * 2) / 7;
      ball.vy -= (sy * 2) / 7;
      ball.ux = ball.vx;
      ball.uy = ball.vy;
    } else {
      const k = dv / slip;
      ball.vx -= sx * k;
      ball.vy -= sy * k;
      ball.ux += sx * k * 2.5;
      ball.uy += sy * k * 2.5;
    }
  } else {
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > 0) {
      const dec = p.rollingFriction * p.gravity * dt + p.linearDamping * speed * dt;
      const scale = Math.max(0, speed - dec) / speed;
      ball.vx *= scale;
      ball.vy *= scale;
    }
    ball.ux = ball.vx;
    ball.uy = ball.vy;
  }

  if (ball.side !== 0) {
    const d = p.sideSpinDecay * dt;
    ball.side = Math.abs(ball.side) <= d ? 0 : ball.side - Math.sign(ball.side) * d;
  }

  // Abaixo de 3 mm/s a bola é considerada parada.
  if (ball.vx * ball.vx + ball.vy * ball.vy < 9 && ball.ux * ball.ux + ball.uy * ball.uy < 9) {
    ball.vx = ball.vy = ball.ux = ball.uy = 0;
  }
}
