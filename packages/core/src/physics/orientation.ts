import type { Ball } from '../ball';
import { BALL_RADIUS } from '../constants';
import { rotateInPlace } from '../math/mat3';

/**
 * Gira a orientação da bola conforme o giro atual.
 * ω × (0, 0, R) = u  ⇒  ωx = -uy/R, ωy = ux/R. O efeito lateral gira em torno de z.
 */
export function integrateOrientation(ball: Ball, dt: number): void {
  const wx = -ball.uy / BALL_RADIUS;
  const wy = ball.ux / BALL_RADIUS;
  const wz = ball.side / BALL_RADIUS;
  const w = Math.hypot(wx, wy, wz);
  if (w > 1e-6) rotateInPlace(ball.orientation, wx / w, wy / w, wz / w, w * dt);
}
