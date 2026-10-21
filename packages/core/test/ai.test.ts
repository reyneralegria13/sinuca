import { describe, expect, it } from 'vitest';
import {
  AI_DIFFICULTIES,
  applyCueStrike,
  cloneAiBalls,
  createMatch,
  createRack,
  createRandom,
  createSimulation,
  emergencyComputerPlan,
  fullTableArea,
  isLegalFirstContact,
  isOnEight,
  isValidPlacement,
  kitchenArea,
  planComputerShot,
  resolveShot,
  ShotRecorder,
  simulateUntilRest,
  type AiDifficulty,
  type AiPlan,
  type AiSnapshot,
} from '../src';
import { layout, table } from './helpers';

function snapshot(difficulty: AiDifficulty = 'hard'): AiSnapshot {
  return {
    balls: layout({ 0: [1270, 900], 1: [1270, 350], 8: [1900, 1000], 9: [2200, 400] }),
    match: {
      ...createMatch(1),
      isBreak: false,
      ballInHand: false,
      ballInHandKitchenOnly: false,
      groups: ['stripes', 'solids'],
    },
    table,
    difficulty,
    seed: 42,
  };
}

function execute(state: AiSnapshot, plan: AiPlan) {
  const balls = cloneAiBalls(state.balls);
  const cue = balls.find((ball) => ball.id === 0)!;
  if (plan.cuePosition) Object.assign(cue, plan.cuePosition);
  const recorder = new ShotRecorder(isOnEight(state.match, state.match.turn, balls));
  applyCueStrike(cue, plan.input);
  simulateUntilRest(createSimulation(table, balls), recorder);
  return {
    ...resolveShot({ ...state.match, calledPocket: plan.calledPocket }, recorder.record),
    record: recorder.record,
  };
}

describe('pipeline da IA', () => {
  it.each(['easy', 'medium', 'hard'] as const)(
    'simula uma encaçapada legal no nível %s',
    (difficulty) => {
      const state = snapshot(difficulty);
      const before = structuredClone(state);
      const plan = planComputerShot(state)!;
      expect(plan).not.toBeNull();
      expect(state).toEqual(before);
      expect(plan.stats.simulated).toBeGreaterThan(1);
      expect(plan.stats.simulated).toBeLessThanOrEqual(AI_DIFFICULTIES[difficulty].candidates + 1);
      expect(plan.stats.fallback).toBe(false);
      expect(isLegalFirstContact(state.match, state.balls, plan.targetBall!)).toBe(true);
      const actual = execute(state, plan);
      expect(actual.outcome).toEqual(plan.predicted);
      expect(actual.outcome.foul).toBeNull();
      expect(actual.record.pocketed).toContainEqual({ ball: 1, pocket: 1 });
      expect(actual.outcome.continuesTurn).toBe(true);
    },
  );

  it('canta a caçapa e vence ao jogar legalmente na bola 8', () => {
    const state = snapshot();
    state.balls = layout({ 0: [1270, 900], 8: [1270, 350], 9: [2100, 700] });
    const plan = planComputerShot(state)!;
    expect(plan.calledPocket).toBe(1);
    expect(execute(state, plan).outcome.gameOver).toEqual({
      winner: 1,
      reason: 'eight-pocketed-legally',
    });
  });

  it('posiciona a branca legalmente com bola na mão sem alterar a mesa original', () => {
    const state = snapshot();
    state.match.ballInHand = true;
    state.balls[0].x = 200;
    const plan = planComputerShot(state)!;
    expect(plan.cuePosition).not.toBeNull();
    expect(isValidPlacement(state.balls, table, plan.cuePosition!, fullTableArea(table))).toBe(
      true,
    );
    expect(execute(state, plan).outcome.foul).toBeNull();
    expect(state.balls[0].x).toBe(200);
  });

  it('executa uma saída válida e mantém a branca atrás da linha', () => {
    const state: AiSnapshot = {
      ...snapshot('medium'),
      balls: createRack(table, createRandom(8)),
      match: createMatch(1),
    };
    const plan = planComputerShot(state)!;
    expect(plan.intent).toBe('break');
    expect(isValidPlacement(state.balls, table, plan.cuePosition!, kitchenArea(table))).toBe(true);
    expect(execute(state, plan).outcome.foul).toBeNull();
  });

  it('repete a decisão para a mesma entrada e semente', () => {
    const state = snapshot('easy');
    expect(planComputerShot(state)).toEqual(planComputerShot(state));
  });

  it('encontra uma saída pela tabela quando o contato direto está bloqueado', () => {
    const state = snapshot('hard');
    state.balls = layout({ 0: [450, 635], 1: [1500, 635], 9: [800, 635], 8: [2000, 1000] });
    const plan = planComputerShot(state)!;
    expect(execute(state, plan).outcome.foul).toBeNull();
    expect(execute(state, plan).record.firstContact).toBe(1);
  });

  it('tem um fallback geométrico e ignora partidas encerradas ou sem alvos', () => {
    const state = snapshot();
    const fallback = emergencyComputerPlan(state)!;
    expect(fallback.stats.fallback).toBe(true);
    expect(fallback.stats.simulated).toBe(0);
    state.match.winner = 0;
    expect(planComputerShot(state)).toBeNull();
    expect(emergencyComputerPlan(state)).toBeNull();
    state.match.winner = null;
    state.balls = layout({ 0: [300, 300] });
    expect(planComputerShot(state)).toBeNull();
    expect(emergencyComputerPlan(state)).toBeNull();
  });
});
