import type { Vec2 } from '../math/vec2';
import type { Pocket, Segment, TableGeometry, TableSpec } from './types';

function segment(x1: number, y1: number, x2: number, y2: number): Segment {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return { x1, y1, x2, y2, dx, dy, lengthSq: dx * dx + dy * dy };
}

/**
 * Gera a geometria completa da mesa a partir das medidas.
 * As tabelas são segmentos de reta (inclusive os bicos angulados das caçapas),
 * e a colisão é tratada como cápsula com o raio da bola.
 */
export function createTableGeometry(spec: TableSpec): TableGeometry {
  const L = spec.length;
  const W = spec.width;
  const cj = spec.cornerJaw;
  const sm = spec.sideMouth;
  const st = spec.sideThroat;
  const sd = spec.jawDepth;
  const cw = spec.cushionWidth;
  // Ponta do bico de canto: recua em direção à garganta, que é mais estreita que a boca.
  const ctx = cj - 60;
  const cty = 42;
  const mid = L / 2;

  const cushions: Segment[] = [
    // tabela de cima
    segment(ctx, -cty, cj, 0),
    segment(cj, 0, mid - sm, 0),
    segment(mid - sm, 0, mid - st, -sd),
    segment(mid + st, -sd, mid + sm, 0),
    segment(mid + sm, 0, L - cj, 0),
    segment(L - cj, 0, L - ctx, -cty),
    // tabela de baixo
    segment(ctx, W + cty, cj, W),
    segment(cj, W, mid - sm, W),
    segment(mid - sm, W, mid - st, W + sd),
    segment(mid + st, W + sd, mid + sm, W),
    segment(mid + sm, W, L - cj, W),
    segment(L - cj, W, L - ctx, W + cty),
    // cabeceira
    segment(-cty, ctx, 0, cj),
    segment(0, cj, 0, W - cj),
    segment(0, W - cj, -cty, W - ctx),
    // pé
    segment(L + cty, ctx, L, cj),
    segment(L, cj, L, W - cj),
    segment(L, W - cj, L + cty, W - ctx),
  ];

  const playfield: Vec2[] = [
    [ctx, -cty],
    [cj, 0],
    [mid - sm, 0],
    [mid - st, -sd],
    [mid + st, -sd],
    [mid + sm, 0],
    [L - cj, 0],
    [L - ctx, -cty],
    [L + cty, ctx],
    [L, cj],
    [L, W - cj],
    [L + cty, W - ctx],
    [L - ctx, W + cty],
    [L - cj, W],
    [mid + sm, W],
    [mid + st, W + sd],
    [mid - st, W + sd],
    [mid - sm, W],
    [cj, W],
    [ctx, W + cty],
    [-cty, W - ctx],
    [0, W - cj],
    [0, cj],
    [-cty, ctx],
  ].map(([x, y]) => ({ x: x!, y: y! }));

  const b = -cw; // linha onde a borracha encosta no trilho
  const cushionShapes: Vec2[][] = [
    [
      [ctx, -cty],
      [cj, 0],
      [mid - sm, 0],
      [mid - st, -sd],
      [mid - st - 7, b],
      [ctx + 12, b],
    ],
    [
      [mid + st, -sd],
      [mid + sm, 0],
      [L - cj, 0],
      [L - ctx, -cty],
      [L - ctx - 12, b],
      [mid + st + 7, b],
    ],
    [
      [ctx, W + cty],
      [cj, W],
      [mid - sm, W],
      [mid - st, W + sd],
      [mid - st - 7, W - b],
      [ctx + 12, W - b],
    ],
    [
      [mid + st, W + sd],
      [mid + sm, W],
      [L - cj, W],
      [L - ctx, W + cty],
      [L - ctx - 12, W - b],
      [mid + st + 7, W - b],
    ],
    [
      [-cty, ctx],
      [0, cj],
      [0, W - cj],
      [-cty, W - ctx],
      [b, W - ctx - 12],
      [b, ctx + 12],
    ],
    [
      [L + cty, ctx],
      [L, cj],
      [L, W - cj],
      [L + cty, W - ctx],
      [L - b, W - ctx - 12],
      [L - b, ctx + 12],
    ],
  ].map((shape) => shape.map(([x, y]) => ({ x: x!, y: y! })));

  const d = Math.SQRT1_2;
  const pockets: Pocket[] = [
    {
      id: 0,
      kind: 'corner',
      throat: { x: -7, y: -7 },
      axis: { x: -d, y: -d },
      center: { x: -30, y: -30 },
      radius: 58,
    },
    {
      id: 1,
      kind: 'side',
      throat: { x: mid, y: -30 },
      axis: { x: 0, y: -1 },
      center: { x: mid, y: -58 },
      radius: 56,
    },
    {
      id: 2,
      kind: 'corner',
      throat: { x: L + 7, y: -7 },
      axis: { x: d, y: -d },
      center: { x: L + 30, y: -30 },
      radius: 58,
    },
    {
      id: 3,
      kind: 'corner',
      throat: { x: -7, y: W + 7 },
      axis: { x: -d, y: d },
      center: { x: -30, y: W + 30 },
      radius: 58,
    },
    {
      id: 4,
      kind: 'side',
      throat: { x: mid, y: W + 30 },
      axis: { x: 0, y: 1 },
      center: { x: mid, y: W + 58 },
      radius: 56,
    },
    {
      id: 5,
      kind: 'corner',
      throat: { x: L + 7, y: W + 7 },
      axis: { x: d, y: d },
      center: { x: L + 30, y: W + 30 },
      radius: 58,
    },
  ];

  return {
    spec,
    cushions,
    pockets,
    playfield,
    cushionShapes,
    headSpot: { x: L / 4, y: W / 2 },
    footSpot: { x: (L * 3) / 4, y: W / 2 },
    centerSpot: { x: L / 2, y: W / 2 },
    headStringX: L / 4,
  };
}
