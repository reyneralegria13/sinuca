import {
  createBall,
  createRack,
  createRandom,
  createSimulation,
  createTableGeometry,
  TABLE_9FT,
  type Ball,
} from '../src';

export const table = createTableGeometry(TABLE_9FT);

/** Mesa só com a branca e as bolas pedidas, nas posições dadas. */
export function layout(positions: Record<number, [number, number]>): Ball[] {
  return Object.entries(positions).map(([id, [x, y]]) =>
    createBall(Number(id), x, y, createRandom(1)),
  );
}

export function rackedSimulation(seed = 42) {
  return createSimulation(table, createRack(table, createRandom(seed)));
}
