import type { TableSpec } from './types';

const base = {
  cornerJaw: 88,
  sideMouth: 70,
  sideThroat: 55,
  jawDepth: 45,
  cushionWidth: 64,
  railWidth: 170,
};

/** Mesa oficial de 9 pés: área de jogo de 100 x 50 pol. */
export const TABLE_9FT: TableSpec = { length: 2540, width: 1270, ...base };

/** Mesa de 8 pés: 88 x 44 pol. */
export const TABLE_8FT: TableSpec = { length: 2235, width: 1118, ...base };

/** Mesa de 7 pés (bar): 78 x 39 pol. */
export const TABLE_7FT: TableSpec = { length: 1981, width: 991, ...base };
