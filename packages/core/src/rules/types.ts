import type { Group } from '../ball';

export type PlayerIndex = 0 | 1;

export interface MatchState {
  turn: PlayerIndex;
  /** Grupo de cada jogador; null enquanto a mesa está aberta. */
  groups: [Group | null, Group | null];
  ballInHand: boolean;
  /** Bola na mão restrita à área atrás da linha de saída. */
  ballInHandKitchenOnly: boolean;
  isBreak: boolean;
  /** Caçapa cantada para a bola 8. */
  calledPocket: number | null;
  winner: PlayerIndex | null;
}

export type Foul =
  | 'scratch'
  | 'no-contact'
  | 'wrong-first-contact'
  | 'eight-first-on-open-table'
  | 'no-cushion-after-contact'
  | 'weak-break'
  | 'shot-clock';

export type GameOverReason =
  | 'eight-pocketed-legally'
  | 'eight-pocketed-early'
  | 'eight-pocketed-with-foul'
  | 'eight-pocketed-wrong-pocket';

export interface ShotRecord {
  /** Primeira bola tocada pela branca. */
  firstContact: number | null;
  pocketed: { ball: number; pocket: number }[];
  /** Alguma bola tocou a tabela depois do primeiro contato. */
  cushionAfterContact: boolean;
  /** Bolas coloridas diferentes que tocaram a tabela (critério da saída). */
  ballsToCushion: Set<number>;
  /** O jogador da vez já estava na bola 8 antes da tacada. */
  shooterOnEight: boolean;
}

export interface ShotOutcome {
  shooter: PlayerIndex;
  foul: Foul | null;
  /** O mesmo jogador continua. */
  continuesTurn: boolean;
  groupAssigned: { player: PlayerIndex; group: Group } | null;
  /** A 8 caiu na saída e deve voltar para a marca. */
  respotEight: boolean;
  /** A branca caiu e deve voltar à mesa. */
  returnCueBall: boolean;
  gameOver: { winner: PlayerIndex; reason: GameOverReason } | null;
}
