import { CUE_BALL, EIGHT_BALL, groupOf, otherGroup, type Ball, type Group } from '../ball';
import type { Foul, MatchState, PlayerIndex, ShotOutcome, ShotRecord } from './types';

/** Na saída, ou uma bola cai ou pelo menos 4 bolas coloridas tocam a tabela. */
export const BREAK_MIN_BALLS_TO_CUSHION = 4;

const opponent = (p: PlayerIndex): PlayerIndex => (p === 0 ? 1 : 0);

export function createMatch(firstPlayer: PlayerIndex = 0): MatchState {
  return {
    turn: firstPlayer,
    groups: [null, null],
    ballInHand: true,
    ballInHandKitchenOnly: true,
    isBreak: true,
    calledPocket: null,
    winner: null,
  };
}

export function ballsLeftInGroup(balls: readonly Ball[], group: Group): number {
  let n = 0;
  for (const b of balls) if (b.active && groupOf(b.id) === group) n++;
  return n;
}

/** O jogador já encaçapou todo o seu grupo e precisa jogar na 8. */
export function isOnEight(match: MatchState, player: PlayerIndex, balls: readonly Ball[]): boolean {
  const g = match.groups[player];
  return g !== null && ballsLeftInGroup(balls, g) === 0;
}

/** Se a branca pode tocar primeiro nesta bola sem cometer falta. */
export function isLegalFirstContact(
  match: MatchState,
  balls: readonly Ball[],
  ballId: number,
): boolean {
  if (ballId === CUE_BALL) return false;
  if (match.isBreak) return true;
  const g = match.groups[match.turn];
  if (!g) return ballId !== EIGHT_BALL;
  if (isOnEight(match, match.turn, balls)) return ballId === EIGHT_BALL;
  return groupOf(ballId) === g;
}

/** Precisa cantar a caçapa antes de tacar. */
export function needsPocketCall(match: MatchState, balls: readonly Ball[]): boolean {
  return (
    match.winner === null && isOnEight(match, match.turn, balls) && match.calledPocket === null
  );
}

function detectFoul(match: MatchState, shot: ShotRecord): Foul | null {
  const pocketedCue = shot.pocketed.some((p) => p.ball === CUE_BALL);
  if (pocketedCue) return 'scratch';
  if (shot.firstContact === null) return 'no-contact';

  const object = shot.pocketed.filter((p) => p.ball !== CUE_BALL);
  if (match.isBreak) {
    if (object.length === 0 && shot.ballsToCushion.size < BREAK_MIN_BALLS_TO_CUSHION)
      return 'weak-break';
    return null;
  }

  const group = match.groups[match.turn];
  if (group) {
    const legal = shot.shooterOnEight
      ? shot.firstContact === EIGHT_BALL
      : groupOf(shot.firstContact) === group;
    if (!legal) return 'wrong-first-contact';
  } else if (shot.firstContact === EIGHT_BALL) {
    return 'eight-first-on-open-table';
  }

  if (object.length === 0 && !shot.cushionAfterContact) return 'no-cushion-after-contact';
  return null;
}

/**
 * Aplica as regras do 8 bolas a uma tacada já simulada.
 * Função pura: recebe o estado da partida e o registro da tacada e devolve o novo estado
 * e o resultado. As bolas não são alteradas aqui; quem chama aplica `respotEight` e `returnCueBall`.
 */
export function resolveShot(
  match: MatchState,
  shot: ShotRecord,
): { state: MatchState; outcome: ShotOutcome } {
  const shooter = match.turn;
  const other = opponent(shooter);
  const foul = detectFoul(match, shot);
  const pots = shot.pocketed.filter((p) => p.ball !== CUE_BALL);
  const eight = pots.find((p) => p.ball === EIGHT_BALL);
  const returnCueBall = shot.pocketed.some((p) => p.ball === CUE_BALL);

  const outcome: ShotOutcome = {
    shooter,
    foul,
    continuesTurn: false,
    groupAssigned: null,
    respotEight: false,
    returnCueBall,
    gameOver: null,
  };

  if (eight && !match.isBreak) {
    const legal = shot.shooterOnEight && foul === null && match.calledPocket === eight.pocket;
    outcome.gameOver = legal
      ? { winner: shooter, reason: 'eight-pocketed-legally' }
      : {
          winner: other,
          reason: !shot.shooterOnEight
            ? 'eight-pocketed-early'
            : foul !== null
              ? 'eight-pocketed-with-foul'
              : 'eight-pocketed-wrong-pocket',
        };
    return {
      state: { ...match, winner: outcome.gameOver.winner, calledPocket: null, ballInHand: false },
      outcome,
    };
  }

  const groups: [Group | null, Group | null] = [match.groups[0], match.groups[1]];
  const objectPots = pots.filter((p) => p.ball !== EIGHT_BALL);
  if (eight && match.isBreak) outcome.respotEight = true;

  if (foul === null && !match.isBreak && groups[shooter] === null) {
    const first = objectPots[0];
    if (first) {
      const g = groupOf(first.ball)!;
      groups[shooter] = g;
      groups[other] = otherGroup(g);
      outcome.groupAssigned = { player: shooter, group: g };
    }
  }

  if (foul === null) {
    if (match.isBreak) outcome.continuesTurn = objectPots.length > 0;
    else {
      const mine = groups[shooter];
      outcome.continuesTurn = mine
        ? objectPots.some((p) => groupOf(p.ball) === mine)
        : objectPots.length > 0;
    }
  }

  const nextTurn: PlayerIndex = outcome.continuesTurn ? shooter : other;
  return {
    state: {
      turn: nextTurn,
      groups,
      ballInHand: foul !== null,
      ballInHandKitchenOnly: false,
      isBreak: false,
      calledPocket: null,
      winner: null,
    },
    outcome,
  };
}

/** Tempo esgotado: falta, e o adversário recebe bola na mão. */
export function resolveShotClockViolation(match: MatchState): {
  state: MatchState;
  outcome: ShotOutcome;
} {
  const other = opponent(match.turn);
  return {
    state: {
      ...match,
      turn: other,
      ballInHand: true,
      ballInHandKitchenOnly: match.isBreak,
      calledPocket: null,
    },
    outcome: {
      shooter: match.turn,
      foul: 'shot-clock',
      continuesTurn: false,
      groupAssigned: null,
      respotEight: false,
      returnCueBall: false,
      gameOver: null,
    },
  };
}
