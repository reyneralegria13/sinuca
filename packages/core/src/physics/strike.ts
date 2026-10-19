import type { Ball } from '../ball';
import { DEFAULT_CUE, type CueParams } from '../constants';
import { clamp } from '../math/scalar';

export interface Spin {
  /** -1 (esquerda) a 1 (direita). */
  x: number;
  /** -1 (embaixo, puxa) a 1 (em cima, segue). */
  y: number;
}

export interface ShotInput {
  /** Direção da tacada em radianos, no plano da mesa. */
  angle: number;
  /** 0 a 1. */
  power: number;
  spin: Spin;
}

/**
 * Impacto do taco na branca.
 * Batendo a uma altura b do centro: ω = 5·v·b / (2·R²) ⇒ u = R·ω = 2,5·v·(b/R).
 * No centro (b = 0) a bola sai deslizando, sem giro; acima ganha giro para frente,
 * abaixo, giro para trás. O efeito lateral gera giro vertical e um pequeno desvio (squirt).
 * Retorna a velocidade de saída em mm/s.
 */
export function applyCueStrike(
  cue: Ball,
  input: ShotInput,
  params: CueParams = DEFAULT_CUE,
): number {
  const power = clamp(input.power, 0, 1);
  const sx = clamp(input.spin.x, -1, 1);
  const sy = clamp(input.spin.y, -1, 1);
  const speed = params.minSpeed + power * (params.maxSpeed - params.minSpeed);
  const angle = input.angle - sx * params.squirt * power;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const offset = params.maxTipOffset * 2.5;

  cue.vx = dx * speed;
  cue.vy = dy * speed;
  cue.ux = dx * speed * sy * offset;
  cue.uy = dy * speed * sy * offset;
  cue.side = speed * sx * offset;
  return speed;
}
