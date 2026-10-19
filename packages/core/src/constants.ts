/**
 * Unidades: milímetros, segundos e radianos.
 * Eixos da mesa: x ao longo do comprimento, y ao longo da largura, z para cima.
 */

/** Bola oficial de pool: 2 1/4 pol (57,15 mm). */
export const BALL_RADIUS = 28.575;
export const BALL_DIAMETER = BALL_RADIUS * 2;

export interface PhysicsParams {
  /** Aceleração da gravidade (mm/s²). */
  gravity: number;
  /** Coeficiente de atrito de deslizamento bola-feltro. */
  slidingFriction: number;
  /** Coeficiente de resistência ao rolamento. */
  rollingFriction: number;
  /** Amortecimento proporcional à velocidade (1/s), representa perdas no feltro. */
  linearDamping: number;
  /** Desaceleração do giro lateral (mm/s²). */
  sideSpinDecay: number;
  /** Coeficiente de restituição bola-bola. */
  ballRestitution: number;
  /** Coeficiente de restituição bola-tabela. */
  cushionRestitution: number;
  /** Fração do giro lateral convertida em desvio na tabela. */
  englishTransfer: number;
  /** Quanto do rolamento normal à tabela se inverte no impacto. */
  cushionRollReversal: number;
}

export const DEFAULT_PHYSICS: PhysicsParams = {
  gravity: 9810,
  slidingFriction: 0.2,
  rollingFriction: 0.014,
  linearDamping: 0.22,
  sideSpinDecay: 2500,
  ballRestitution: 0.94,
  cushionRestitution: 0.76,
  englishTransfer: 0.2,
  cushionRollReversal: 0.6,
};

export interface CueParams {
  /** Velocidade da branca na tacada mais fraca (mm/s). */
  minSpeed: number;
  /** Velocidade da branca na tacada mais forte (mm/s). */
  maxSpeed: number;
  /** Afastamento máximo do ponto de contato em relação ao centro, como fração do raio. */
  maxTipOffset: number;
  /** Desvio da direção causado pelo efeito lateral (rad por unidade de efeito e de força). */
  squirt: number;
}

export const DEFAULT_CUE: CueParams = {
  minSpeed: 150,
  maxSpeed: 9000,
  maxTipOffset: 0.5,
  squirt: 0.02,
};

/** Passo fixo da simulação. 1 ms mantém o deslocamento por passo abaixo de 1/3 do raio na tacada máxima. */
export const SIMULATION_STEP = 1 / 1000;

/** Tempo de cada tacada, em segundos. */
export const SHOT_CLOCK_SECONDS = 30;
