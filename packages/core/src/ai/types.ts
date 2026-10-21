import type { Ball } from '../ball';
import type { Vec2 } from '../math/vec2';
import type { ShotInput } from '../physics/strike';
import type { MatchState, ShotOutcome } from '../rules/types';
import type { TableGeometry } from '../table/types';

export type AiDifficulty = 'easy' | 'medium' | 'hard';
export type AiIntent = 'break' | 'pot' | 'safety' | 'escape';

/** Cópia independente da partida; a busca nunca altera as bolas que estão na tela. */
export interface AiSnapshot {
  balls: Ball[];
  match: MatchState;
  table: TableGeometry;
  difficulty: AiDifficulty;
  seed: number;
}

export interface AiPlan {
  input: ShotInput;
  cuePosition: Vec2 | null;
  calledPocket: number | null;
  targetBall: number | null;
  intent: AiIntent;
  score: number;
  predicted: ShotOutcome | null;
  stats: { generated: number; simulated: number; fallback: boolean };
}

export interface AiTask {
  result: Promise<AiPlan | null>;
  cancel(): void;
}

export type AiPlanner = (snapshot: AiSnapshot) => AiTask;

export const AI_DIFFICULTIES: Record<
  AiDifficulty,
  { label: string; candidates: number; angleError: number; powerError: number }
> = {
  easy: { label: 'Fácil', candidates: 18, angleError: 0.012, powerError: 0.06 },
  medium: { label: 'Médio', candidates: 36, angleError: 0.004, powerError: 0.025 },
  hard: { label: 'Difícil', candidates: 64, angleError: 0.0008, powerError: 0.008 },
};
