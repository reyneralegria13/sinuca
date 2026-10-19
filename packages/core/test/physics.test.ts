import { describe, expect, it } from 'vitest';
import {
  applyCueStrike,
  BALL_DIAMETER,
  createSimulation,
  simulateUntilRest,
  step,
  type Ball,
} from '../src';
import { layout, rackedSimulation, table } from './helpers';

const { length: L, width: W } = table.spec;

describe('saída', () => {
  it.each([1, 2, 3, 4, 5])('todas as bolas param dentro da mesa (semente %i)', (seed) => {
    const sim = rackedSimulation(seed);
    applyCueStrike(sim.balls[0]!, { angle: 0, power: 1, spin: { x: 0, y: 0 } });
    const t = simulateUntilRest(sim);
    expect(t).toBeLessThan(15);
    for (const b of sim.balls.filter((b) => b.active)) {
      expect(b.x).toBeGreaterThan(0);
      expect(b.x).toBeLessThan(L);
      expect(b.y).toBeGreaterThan(0);
      expect(b.y).toBeLessThan(W);
    }
  });

  it('nenhuma bola fica sobreposta ao final', () => {
    const sim = rackedSimulation(7);
    applyCueStrike(sim.balls[0]!, { angle: 0, power: 1, spin: { x: 0, y: 0 } });
    simulateUntilRest(sim);
    const active = sim.balls.filter((b) => b.active);
    for (let i = 0; i < active.length; i++)
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i]!;
        const b = active[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(BALL_DIAMETER - 0.5);
      }
  });
});

describe('efeito vertical', () => {
  /** Tacada reta: branca a 400 mm da bola 1. Mede a branca 1,2 s após o contato. */
  function cueAfterContact(spinY: number): Ball {
    const balls = layout({ 0: [1000, W / 2], 1: [1400, W / 2] });
    const sim = createSimulation(table, balls);
    applyCueStrike(balls[0]!, { angle: 0, power: 0.3, spin: { x: 0, y: spinY } });
    let contactAt: number | null = null;
    let t = 0;
    while (t < 6) {
      step(sim, 1 / 1000, { onBallContact: () => (contactAt ??= t) });
      t += 1 / 1000;
      if (contactAt !== null && t > contactAt + 1.2) break;
    }
    return balls[0]!;
  }

  const contactX = 1400 - BALL_DIAMETER;

  it('com efeito embaixo a branca volta', () => {
    expect(cueAfterContact(-0.8).x).toBeLessThan(contactX - 200);
  });

  it('com efeito em cima a branca segue', () => {
    expect(cueAfterContact(0.8).x).toBeGreaterThan(contactX + 200);
  });

  it('a bola deslizando passa a rolar (u converge para v)', () => {
    const balls = layout({ 0: [300, W / 2] });
    const sim = createSimulation(table, balls);
    applyCueStrike(balls[0]!, { angle: 0, power: 0.3, spin: { x: 0, y: 0 } });
    for (let i = 0; i < 600; i++) step(sim);
    const b = balls[0]!;
    expect(Math.abs(b.vx - b.ux)).toBeLessThan(1);
    expect(b.vx).toBeGreaterThan(0);
  });
});

describe('efeito lateral', () => {
  function reboundAngle(spinX: number): number {
    const balls = layout({ 0: [800, 900] });
    const sim = createSimulation(table, balls);
    applyCueStrike(balls[0]!, { angle: -Math.PI / 4, power: 0.3, spin: { x: spinX, y: 0 } });
    let hit = false;
    for (let i = 0; i < 5000 && !hit; i++)
      step(sim, 1 / 1000, { onCushionContact: () => (hit = true) });
    for (let i = 0; i < 300; i++) step(sim);
    return Math.atan2(balls[0]!.vy, balls[0]!.vx);
  }

  it('muda o ângulo de saída da tabela de forma simétrica', () => {
    const left = reboundAngle(-1);
    const none = reboundAngle(0);
    const right = reboundAngle(1);
    expect(Math.abs(left - none)).toBeGreaterThan(0.05);
    expect(Math.abs(right - none)).toBeGreaterThan(0.05);
    expect(Math.sign(left - none)).toBe(-Math.sign(right - none));
  });
});

describe('caçapas', () => {
  it('bola de canto entra na caçapa 0', () => {
    const balls = layout({ 0: [600, 600], 1: [300, 300] });
    const sim = createSimulation(table, balls);
    applyCueStrike(balls[0]!, { angle: Math.atan2(-1, -1), power: 0.3, spin: { x: 0, y: 0 } });
    const pots: number[] = [];
    simulateUntilRest(sim, { onPocket: (_b, p) => pots.push(p.id) });
    expect(pots).toContain(0);
    expect(balls[1]!.active).toBe(false);
  });

  it('bola reta entra na caçapa do meio', () => {
    const balls = layout({ 0: [L / 2, 700], 1: [L / 2, 300] });
    const sim = createSimulation(table, balls);
    applyCueStrike(balls[0]!, { angle: -Math.PI / 2, power: 0.3, spin: { x: 0, y: 0 } });
    simulateUntilRest(sim);
    expect(balls[1]!.active).toBe(false);
  });

  it('bola rolando colada na tabela até o canto cai na caçapa', () => {
    const balls = layout({ 0: [L - 600, 29] });
    const sim = createSimulation(table, balls);
    applyCueStrike(balls[0]!, { angle: 0, power: 0.2, spin: { x: 0, y: 0 } });
    const pots: number[] = [];
    simulateUntilRest(sim, { onPocket: (_b, p) => pots.push(p.id) });
    expect(pots).toEqual([2]);
  });

  it('bola que continua em jogo nunca termina fora da área de jogo', () => {
    for (const x of [L / 2 - 400, L / 2 - 200]) {
      const balls = layout({ 0: [x, 29] });
      const sim = createSimulation(table, balls);
      applyCueStrike(balls[0]!, { angle: 0, power: 0.12, spin: { x: 0, y: 0 } });
      simulateUntilRest(sim);
      if (balls[0]!.active) expect(balls[0]!.y).toBeGreaterThan(0);
    }
  });
});
