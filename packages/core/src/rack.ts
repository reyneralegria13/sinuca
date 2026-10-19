import { createBall, CUE_BALL, EIGHT_BALL, type Ball } from './ball';
import { BALL_DIAMETER } from './constants';
import { shuffle } from './math/random';
import type { TableGeometry } from './table/types';

/** Folga entre bolas no triângulo, para que não comecem sobrepostas. */
const RACK_GAP = 0.3;
const ROW_SPACING = Math.sqrt(3) / 2;

/**
 * Monta o triângulo do 8 bolas: bola 1 no ápice, bola 8 no centro da terceira fileira,
 * e uma lisa e uma listrada nos cantos de trás. As demais ficam em ordem aleatória.
 * Retorna as 16 bolas ordenadas por número (índice = número da bola; 0 é a branca).
 */
export function createRack(table: TableGeometry, random: () => number = Math.random): Ball[] {
  const solids = shuffle([2, 3, 4, 5, 6, 7], random);
  const stripes = shuffle([9, 10, 11, 12, 13, 14, 15], random);
  const slots: number[] = new Array(15).fill(0);
  slots[0] = 1;
  slots[4] = EIGHT_BALL;
  const solidLeft = random() < 0.5;
  slots[10] = solidLeft ? solids.pop()! : stripes.pop()!;
  slots[14] = solidLeft ? stripes.pop()! : solids.pop()!;
  const rest = shuffle([...solids, ...stripes], random);
  for (let k = 0; k < slots.length; k++) if (!slots[k]) slots[k] = rest.pop()!;

  const balls: Ball[] = [createBall(CUE_BALL, table.headSpot.x, table.headSpot.y, random)];
  const step = BALL_DIAMETER + RACK_GAP;
  let k = 0;
  for (let row = 0; row < 5; row++) {
    for (let j = 0; j <= row; j++) {
      const x = table.footSpot.x + row * step * ROW_SPACING;
      const y = table.footSpot.y + (j - row / 2) * step;
      balls.push(createBall(slots[k++]!, x, y, random));
    }
  }
  return balls.sort((a, b) => a.id - b.id);
}
