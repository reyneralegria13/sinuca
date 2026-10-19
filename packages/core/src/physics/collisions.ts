import type { Ball } from '../ball';
import { BALL_DIAMETER, BALL_RADIUS, type PhysicsParams } from '../constants';
import type { Segment } from '../table/types';

/**
 * Colisão entre duas bolas de massa igual.
 * Separa a sobreposição e troca a componente normal da velocidade com restituição e.
 * O giro (u) não muda no impacto instantâneo, e é isso que produz o "seguir" e o "puxar":
 * a branca para no choque, mas o giro que ela carrega a acelera em seguida.
 * Retorna a velocidade relativa de aproximação (0 se não houve impacto).
 */
export function resolveBallContact(a: Ball, b: Ball, p: PhysicsParams): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d2 = dx * dx + dy * dy;
  if (d2 >= BALL_DIAMETER * BALL_DIAMETER) return 0;

  const d = Math.sqrt(d2) || 1e-6;
  const nx = dx / d;
  const ny = dy / d;
  const overlap = (BALL_DIAMETER - d) / 2;
  a.x -= nx * overlap;
  a.y -= ny * overlap;
  b.x += nx * overlap;
  b.y += ny * overlap;

  const approach = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  if (approach <= 0) return 0;

  const j = ((1 + p.ballRestitution) / 2) * approach;
  a.vx -= j * nx;
  a.vy -= j * ny;
  b.vx += j * nx;
  b.vy += j * ny;
  return approach;
}

/**
 * Colisão com a tabela (segmento tratado como cápsula de raio R).
 * Reflete a componente normal com restituição, transfere o efeito lateral para a
 * componente tangente e inverte parcialmente o rolamento contra a tabela.
 * Retorna a velocidade normal do impacto (0 se não houve).
 */
export function resolveCushionContact(ball: Ball, s: Segment, p: PhysicsParams): number {
  let t = ((ball.x - s.x1) * s.dx + (ball.y - s.y1) * s.dy) / s.lengthSq;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = s.x1 + s.dx * t;
  const qy = s.y1 + s.dy * t;
  const ex = ball.x - qx;
  const ey = ball.y - qy;
  const d2 = ex * ex + ey * ey;
  if (d2 >= BALL_RADIUS * BALL_RADIUS) return 0;

  const d = Math.sqrt(d2) || 1e-6;
  const nx = ex / d;
  const ny = ey / d;
  ball.x = qx + nx * BALL_RADIUS;
  ball.y = qy + ny * BALL_RADIUS;

  const vn = ball.vx * nx + ball.vy * ny;
  if (vn >= 0) return 0;

  const inX = ball.vx;
  const inY = ball.vy;
  ball.vx -= (1 + p.cushionRestitution) * vn * nx;
  ball.vy -= (1 + p.cushionRestitution) * vn * ny;

  if (ball.side !== 0) {
    // Efeito à direita desvia a bola para a direita de quem a lançou, e vice-versa.
    const tx = -ny;
    const ty = nx;
    const sign = -inY * tx + inX * ty >= 0 ? 1 : -1;
    const kick = ball.side * p.englishTransfer * sign;
    ball.vx += tx * kick;
    ball.vy += ty * kick;
    ball.side *= 0.55;
  }

  const un = ball.ux * nx + ball.uy * ny;
  ball.ux -= (1 + p.cushionRollReversal) * un * nx;
  ball.uy -= (1 + p.cushionRollReversal) * un * ny;
  return -vn;
}
