import { describe, expect, it, vi } from 'vitest';
import {
  emergencyComputerPlan,
  planComputerShot,
  type AiPlan,
  type AiSnapshot,
  type AiPlanner,
} from '@sinuca/core';
import { GameController } from '../src/game/GameController';

function deferredPlanner() {
  const tasks: {
    snapshot: AiSnapshot;
    resolve(plan: AiPlan | null): void;
    cancel: ReturnType<typeof vi.fn>;
  }[] = [];
  const planner: AiPlanner = (snapshot) => {
    let resolveTask!: (plan: AiPlan | null) => void;
    const result = new Promise<AiPlan | null>((resolve) => {
      resolveTask = resolve;
    });
    const cancel = vi.fn();
    tasks.push({ snapshot, resolve: resolveTask, cancel });
    return { result, cancel };
  };
  return { planner, tasks };
}

describe('computador na partida', () => {
  it('bloqueia ações humanas e executa uma resposta assíncrona válida', async () => {
    const { planner, tasks } = deferredPlanner();
    const game = new GameController(undefined, Math.random, planner);
    game.startMatch('computer', 'medium', 1);
    game.tick(0.01);
    expect(game.getView().computerStatus).toBe('thinking');
    expect(game.canAct).toBe(false);
    const aim = game.aim;
    const cue = { x: game.cueBall.x, y: game.cueBall.y };
    game.setAim(2);
    game.nudgeAim(2);
    game.aimAt({ x: 900, y: 200 });
    game.setPower(1);
    game.setSpin({ x: 1, y: 0 });
    expect(game.aim).toBe(aim);
    expect(game.power).toBe(0);
    expect(game.spin).toEqual({ x: 0, y: 0 });
    expect(game.placeCue({ x: 50, y: 50 })).toBe(false);
    expect({ x: game.cueBall.x, y: game.cueBall.y }).toEqual(cue);
    expect(game.shoot()).toBe(false);
    tasks[0].resolve(emergencyComputerPlan(tasks[0].snapshot));
    await Promise.resolve();
    expect(game.getView().computerStatus).toBe('aiming');
    game.tick(0.4);
    expect(game.power).toBeGreaterThan(0);
    game.tick(0.5);
    expect(game.phase).toBe('rolling');
    expect(game.getView().computerStatus).toBe('idle');
    game.dispose();
  });

  it('cancela a busca ao reiniciar e descarta respostas antigas', async () => {
    const { planner, tasks } = deferredPlanner();
    const game = new GameController(undefined, Math.random, planner);
    game.startMatch('computer', 'hard', 1);
    game.tick(0.01);
    const obsolete = emergencyComputerPlan(tasks[0].snapshot);
    game.startMatch('local');
    expect(tasks[0].cancel).toHaveBeenCalledOnce();
    tasks[0].resolve(obsolete);
    await Promise.resolve();
    expect(game.mode).toBe('local');
    expect(game.match.turn).toBe(0);
    expect(game.computerStatus).toBe('idle');
    expect(game.lastComputerPlan).toBeNull();
    expect(game.canAct).toBe(true);
  });

  it('pausa a busca, ignora seu resultado e calcula novamente ao retomar', async () => {
    const { planner, tasks } = deferredPlanner();
    const game = new GameController(undefined, Math.random, planner);
    game.startMatch('computer', 'easy', 1);
    game.tick(0.01);
    game.setPaused(true);
    const clock = game.clock;
    tasks[0].resolve(emergencyComputerPlan(tasks[0].snapshot));
    await Promise.resolve();
    game.tick(10);
    expect(game.clock).toBe(clock);
    expect(game.lastComputerPlan).toBeNull();
    expect(tasks[0].cancel).toHaveBeenCalledOnce();
    game.setPaused(false);
    game.tick(0.01);
    expect(tasks).toHaveLength(2);
    game.dispose();
  });

  it('usa recuperação quando o worker falha ou demora demais', async () => {
    const failing: AiPlanner = () => ({
      result: Promise.reject(new Error('worker indisponível')),
      cancel: vi.fn(),
    });
    const game = new GameController(undefined, Math.random, failing);
    game.startMatch('computer', 'medium', 1);
    game.tick(0.01);
    await Promise.resolve();
    expect(game.lastComputerPlan?.stats.fallback).toBe(true);
    game.tick(0.9);
    expect(game.phase).toBe('rolling');

    const { planner, tasks } = deferredPlanner();
    const slow = new GameController(undefined, Math.random, planner);
    slow.startMatch('computer', 'medium', 1);
    slow.tick(0.01);
    slow.tick(8.1);
    expect(tasks[0].cancel).toHaveBeenCalledOnce();
    expect(slow.lastComputerPlan?.stats.fallback).toBe(true);
    expect(slow.phase).toBe('rolling');
  });

  it('calcula e executa uma encaçapada usando o mesmo pipeline do worker', async () => {
    const planner: AiPlanner = (snapshot) => ({
      result: Promise.resolve(planComputerShot(snapshot)),
      cancel: vi.fn(),
    });
    const game = new GameController(undefined, () => 0.4, planner);
    game.startMatch('computer', 'hard', 1);
    game.match = {
      ...game.match,
      isBreak: false,
      ballInHand: false,
      ballInHandKitchenOnly: false,
      groups: ['stripes', 'solids'],
    };
    for (const ball of game.balls) ball.active = [0, 1, 8, 9].includes(ball.id);
    Object.assign(game.balls[0], { x: 1270, y: 900 });
    Object.assign(game.balls[1], { x: 1270, y: 350 });
    Object.assign(game.balls[8], { x: 1900, y: 1000 });
    Object.assign(game.balls[9], { x: 2200, y: 400 });
    game.tick(0.01);
    await Promise.resolve();
    expect(game.lastComputerPlan?.stats.fallback).toBe(false);
    game.tick(0.9);
    expect(game.phase).toBe('rolling');
    for (let i = 0; i < 1200 && game.phase === 'rolling'; i++) game.tick(1 / 60);
    expect(game.phase).toBe('aiming');
    expect(game.balls[1].active).toBe(false);
    expect(game.match.turn).toBe(1);
    expect(game.match.ballInHand).toBe(false);
    expect(game.getView().onEight[1]).toBe(true);
    game.tick(0.01); // Continua automaticamente após encaçapar.
    await Promise.resolve();
    expect(game.lastComputerPlan?.targetBall).toBe(8);
    expect(game.match.calledPocket).not.toBeNull();
    game.dispose();
  });
});
