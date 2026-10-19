import type { Vec2 } from '../math/vec2';

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dx: number;
  dy: number;
  lengthSq: number;
}

export type PocketKind = 'corner' | 'side';

export interface Pocket {
  id: number;
  kind: PocketKind;
  /** Ponto da garganta: a bola cai quando o centro passa deste ponto na direção `axis`. */
  throat: Vec2;
  /** Direção unitária apontando para dentro da caçapa. */
  axis: Vec2;
  /** Centro do buraco, usado para desenho e animação. */
  center: Vec2;
  radius: number;
}

export interface TableSpec {
  /** Comprimento da área de jogo, de tabela a tabela (mm). */
  length: number;
  /** Largura da área de jogo (mm). */
  width: number;
  /** Distância da quina até o bico da tabela na caçapa de canto. */
  cornerJaw: number;
  /** Meia abertura da boca da caçapa do meio. */
  sideMouth: number;
  /** Meia abertura da garganta da caçapa do meio. */
  sideThroat: number;
  /** Profundidade dos bicos das caçapas além da linha da tabela. */
  jawDepth: number;
  /** Largura da borracha da tabela (da área de jogo até o trilho de madeira). */
  cushionWidth: number;
  /** Largura do trilho de madeira. */
  railWidth: number;
}

export interface TableGeometry {
  spec: TableSpec;
  cushions: Segment[];
  pockets: Pocket[];
  /** Contorno da área de feltro, incluindo a boca das caçapas até a garganta. */
  playfield: Vec2[];
  /** Polígonos de cada borracha (vista de cima), para desenho. */
  cushionShapes: Vec2[][];
  headSpot: Vec2;
  footSpot: Vec2;
  centerSpot: Vec2;
  /** Linha de saída: posição x da "cozinha". */
  headStringX: number;
}
