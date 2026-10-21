import { describe, expect, it, vi } from 'vitest';
import { GameController } from '../src/game/GameController';

describe('controles da partida', () => {
  it('pausa o relógio e bloqueia a tacada enquanto um painel está aberto', () => {
    const game = new GameController();
    game.setPower(0.8);
    game.setPaused(true);
    const clock = game.clock;
    game.tick(10);
    expect(game.clock).toBe(clock);
    expect(game.power).toBe(0);
    game.setPower(0.5);
    expect(game.shoot()).toBe(false);
    expect(game.phase).toBe('aiming');
    game.setPaused(false);
    expect(game.shoot()).toBe(true);
  });

  it('pausa e retoma uma tacada sem mover as bolas por trás do painel', () => {
    const game = new GameController();
    game.setPower(0.7);
    game.shoot();
    game.tick(0.05);
    const x = game.cueBall.x;
    game.setPaused(true);
    game.tick(0.05);
    expect(game.cueBall.x).toBe(x);
    game.setPaused(false);
    game.tick(0.05);
    expect(game.cueBall.x).toBeGreaterThan(x);
  });

  it('uma saída completa termina e entrega uma próxima vez válida com áudio', () => {
    const audio = { cue: vi.fn(), ball: vi.fn(), cushion: vi.fn(), pocket: vi.fn() };
    const game = new GameController(audio, () => 0.5);
    game.setPower(1);
    expect(game.shoot()).toBe(true);
    for (let i = 0; i < 1200 && game.phase === 'rolling'; i++) game.tick(1 / 60);
    expect(game.phase).toBe('aiming');
    expect(game.match.isBreak).toBe(false);
    expect(game.clock).toBe(30);
    expect(audio.cue).toHaveBeenCalledOnce();
    expect(audio.ball).toHaveBeenCalled();
    expect(audio.cushion).toHaveBeenCalled();
    for (const [, pan] of audio.ball.mock.calls) expect(Math.abs(pan)).toBeLessThanOrEqual(1);
  });

  it('tempo esgotado troca o jogador e zera a força carregada', () => {
    const game = new GameController();
    game.setPower(0.8);
    game.tick(31);
    expect(game.match.turn).toBe(1);
    expect(game.match.ballInHand).toBe(true);
    expect(game.power).toBe(0);
    expect(game.getView().toast?.tone).toBe('foul');
  });
});
