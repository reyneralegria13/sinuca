import { describe, expect, it } from 'vitest';
import { BALL_DIAMETER, predictShot } from '../src';
import { layout, table } from './helpers';

describe('linha de mira', () => {
  it('bola cheia: a bola fantasma encosta na bola alvo', () => {
    const balls = layout({ 0: [500, 600], 1: [1000, 600] });
    const p = predictShot(balls, table, 0);
    expect(p.kind).toBe('ball');
    if (p.kind !== 'ball') return;
    expect(p.ghost.x).toBeCloseTo(1000 - BALL_DIAMETER, 3);
    expect(p.targetDirection.x).toBeCloseTo(1, 5);
    expect(p.fullness).toBeCloseTo(1, 5);
  });

  it('corte: alvo e branca saem em direções perpendiculares', () => {
    const balls = layout({ 0: [500, 600], 1: [1000, 630] });
    const p = predictShot(balls, table, 0);
    if (p.kind !== 'ball') throw new Error('esperava contato com bola');
    const dot = p.targetDirection.x * p.cueDirection.x + p.targetDirection.y * p.cueDirection.y;
    expect(dot).toBeCloseTo(0, 6);
  });

  it('sem bolas no caminho, informa a tabela e o reflexo', () => {
    const balls = layout({ 0: [500, 600] });
    const p = predictShot(balls, table, -Math.PI / 2);
    expect(p.kind).toBe('cushion');
    if (p.kind !== 'cushion') return;
    expect(p.ghost.y).toBeCloseTo(28.575, 1);
    expect(p.reflected.y).toBeCloseTo(1, 5);
  });
});
