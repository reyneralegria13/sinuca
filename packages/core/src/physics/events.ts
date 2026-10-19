import type { Ball } from '../ball';
import type { Pocket } from '../table/types';

/** Ganchos opcionais disparados durante a simulação (som, regras, replays). */
export interface SimulationEvents {
  onBallContact?(a: Ball, b: Ball, impactSpeed: number): void;
  onCushionContact?(ball: Ball, impactSpeed: number): void;
  onPocket?(ball: Ball, pocket: Pocket): void;
}
