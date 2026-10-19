import type { Ball } from '../ball';
import type { Pocket, TableGeometry } from '../table/types';

const ESCAPE_MARGIN = 140;

/** Retorna a caçapa em que a bola caiu, ou null. */
export function detectPocket(ball: Ball, table: TableGeometry): Pocket | null {
  for (const pocket of table.pockets) {
    const along =
      (ball.x - pocket.throat.x) * pocket.axis.x + (ball.y - pocket.throat.y) * pocket.axis.y;
    if (along > 0) return pocket;
  }
  // Salvaguarda numérica: uma bola fora da mesa vai para a caçapa mais próxima.
  const { length, width } = table.spec;
  if (
    ball.x < -ESCAPE_MARGIN ||
    ball.x > length + ESCAPE_MARGIN ||
    ball.y < -ESCAPE_MARGIN ||
    ball.y > width + ESCAPE_MARGIN
  ) {
    let nearest = table.pockets[0]!;
    let best = Infinity;
    for (const pocket of table.pockets) {
      const d = Math.hypot(ball.x - pocket.center.x, ball.y - pocket.center.y);
      if (d < best) {
        best = d;
        nearest = pocket;
      }
    }
    return nearest;
  }
  return null;
}
