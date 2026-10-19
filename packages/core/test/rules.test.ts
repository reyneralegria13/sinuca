import { describe, expect, it } from 'vitest';
import {
  createBall,
  createMatch,
  isLegalFirstContact,
  needsPocketCall,
  resolveShot,
  resolveShotClockViolation,
  type Ball,
  type MatchState,
  type ShotRecord,
} from '../src';

const shot = (partial: Partial<ShotRecord>): ShotRecord => ({
  firstContact: null,
  pocketed: [],
  cushionAfterContact: false,
  ballsToCushion: new Set(),
  shooterOnEight: false,
  ...partial,
});

const afterBreak = (partial: Partial<MatchState> = {}): MatchState => ({
  ...createMatch(0),
  isBreak: false,
  ballInHand: false,
  ballInHandKitchenOnly: false,
  ...partial,
});

const tableWith = (ids: number[]): Ball[] =>
  Array.from({ length: 16 }, (_, id) => {
    const b = createBall(id, 0, 0);
    b.active = ids.includes(id);
    return b;
  });

describe('saída', () => {
  it('saída fraca é falta', () => {
    const r = resolveShot(
      createMatch(0),
      shot({ firstContact: 1, ballsToCushion: new Set([2, 3]) }),
    );
    expect(r.outcome.foul).toBe('weak-break');
    expect(r.state.turn).toBe(1);
    expect(r.state.ballInHand).toBe(true);
  });

  it('bola encaçapada na saída mantém a vez e a mesa aberta', () => {
    const r = resolveShot(
      createMatch(0),
      shot({ firstContact: 1, pocketed: [{ ball: 3, pocket: 2 }] }),
    );
    expect(r.outcome.foul).toBeNull();
    expect(r.outcome.continuesTurn).toBe(true);
    expect(r.state.groups).toEqual([null, null]);
  });

  it('bola 8 na saída volta para a marca', () => {
    const r = resolveShot(
      createMatch(0),
      shot({ firstContact: 1, pocketed: [{ ball: 8, pocket: 5 }] }),
    );
    expect(r.outcome.respotEight).toBe(true);
    expect(r.outcome.gameOver).toBeNull();
  });
});

describe('mesa aberta', () => {
  it('a primeira bola encaçapada define os grupos', () => {
    const r = resolveShot(
      afterBreak(),
      shot({ firstContact: 11, pocketed: [{ ball: 11, pocket: 1 }], cushionAfterContact: true }),
    );
    expect(r.outcome.groupAssigned).toEqual({ player: 0, group: 'stripes' });
    expect(r.state.groups).toEqual(['stripes', 'solids']);
    expect(r.state.turn).toBe(0);
  });

  it('tocar primeiro na 8 é falta', () => {
    const r = resolveShot(afterBreak(), shot({ firstContact: 8, cushionAfterContact: true }));
    expect(r.outcome.foul).toBe('eight-first-on-open-table');
  });
});

describe('faltas', () => {
  const m = afterBreak({ groups: ['solids', 'stripes'] });

  it('branca na caçapa', () => {
    const r = resolveShot(m, shot({ firstContact: 2, pocketed: [{ ball: 0, pocket: 3 }] }));
    expect(r.outcome.foul).toBe('scratch');
    expect(r.outcome.returnCueBall).toBe(true);
    expect(r.state.ballInHand).toBe(true);
    expect(r.state.turn).toBe(1);
  });

  it('tocar primeiro na bola do adversário', () => {
    expect(resolveShot(m, shot({ firstContact: 12, cushionAfterContact: true })).outcome.foul).toBe(
      'wrong-first-contact',
    );
  });

  it('nenhuma bola na tabela após o contato', () => {
    expect(resolveShot(m, shot({ firstContact: 2 })).outcome.foul).toBe('no-cushion-after-contact');
  });

  it('encaçapar só bola do adversário passa a vez sem falta', () => {
    const r = resolveShot(m, shot({ firstContact: 2, pocketed: [{ ball: 12, pocket: 0 }] }));
    expect(r.outcome.foul).toBeNull();
    expect(r.state.turn).toBe(1);
    expect(r.state.ballInHand).toBe(false);
  });

  it('tempo esgotado dá bola na mão ao adversário', () => {
    const r = resolveShotClockViolation(m);
    expect(r.outcome.foul).toBe('shot-clock');
    expect(r.state.turn).toBe(1);
    expect(r.state.ballInHand).toBe(true);
  });
});

describe('bola 8', () => {
  const onEight = afterBreak({ groups: ['solids', 'stripes'], calledPocket: 4 });

  it('vence ao encaçapar a 8 na caçapa cantada', () => {
    const r = resolveShot(
      onEight,
      shot({ firstContact: 8, pocketed: [{ ball: 8, pocket: 4 }], shooterOnEight: true }),
    );
    expect(r.outcome.gameOver).toEqual({ winner: 0, reason: 'eight-pocketed-legally' });
  });

  it('perde ao encaçapar a 8 em outra caçapa', () => {
    const r = resolveShot(
      onEight,
      shot({ firstContact: 8, pocketed: [{ ball: 8, pocket: 2 }], shooterOnEight: true }),
    );
    expect(r.outcome.gameOver?.winner).toBe(1);
    expect(r.outcome.gameOver?.reason).toBe('eight-pocketed-wrong-pocket');
  });

  it('perde ao encaçapar a 8 junto com a branca', () => {
    const r = resolveShot(
      onEight,
      shot({
        firstContact: 8,
        pocketed: [
          { ball: 8, pocket: 4 },
          { ball: 0, pocket: 1 },
        ],
        shooterOnEight: true,
      }),
    );
    expect(r.outcome.gameOver?.reason).toBe('eight-pocketed-with-foul');
  });

  it('perde ao encaçapar a 8 antes de terminar o grupo', () => {
    const r = resolveShot(
      afterBreak({ groups: ['solids', 'stripes'] }),
      shot({ firstContact: 3, pocketed: [{ ball: 8, pocket: 0 }], cushionAfterContact: true }),
    );
    expect(r.outcome.gameOver).toEqual({ winner: 1, reason: 'eight-pocketed-early' });
  });

  it('quem está na 8 só pode tocar a 8 e precisa cantar a caçapa', () => {
    const balls = tableWith([0, 8, 9, 10]);
    const m = afterBreak({ groups: ['solids', 'stripes'] });
    expect(isLegalFirstContact(m, balls, 8)).toBe(true);
    expect(isLegalFirstContact(m, balls, 9)).toBe(false);
    expect(needsPocketCall(m, balls)).toBe(true);
    expect(needsPocketCall({ ...m, calledPocket: 2 }, balls)).toBe(false);
  });
});
