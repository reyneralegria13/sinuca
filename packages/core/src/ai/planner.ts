import { predictShot } from '../aim/predict';
import { CUE_BALL, EIGHT_BALL, groupOf, type Ball } from '../ball';
import { BALL_DIAMETER, BALL_RADIUS, DEFAULT_PHYSICS } from '../constants';
import { createRandom } from '../math/random';
import { clamp } from '../math/scalar';
import type { Vec2 } from '../math/vec2';
import { fullTableArea, isValidPlacement, kitchenArea } from '../placement';
import { createSimulation, isMoving, simulateUntilRest } from '../physics/simulation';
import { applyCueStrike } from '../physics/strike';
import { isLegalFirstContact, isOnEight, resolveShot } from '../rules/eightBall';
import { ShotRecorder } from '../rules/shotRecorder';
import type { MatchState, ShotOutcome } from '../rules/types';
import type { TableGeometry } from '../table/types';
import { AI_DIFFICULTIES, type AiPlan, type AiSnapshot } from './types';

interface Candidate extends Pick<
  AiPlan,
  'input' | 'cuePosition' | 'calledPocket' | 'targetBall' | 'intent'
> {
  priority: number;
}

export const cloneAiBalls = (balls: readonly Ball[]): Ball[] =>
  balls.map((ball) => ({ ...ball, orientation: [...ball.orientation] }));

const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
const areaFor = (snapshot: AiSnapshot) =>
  snapshot.match.ballInHandKitchenOnly
    ? kitchenArea(snapshot.table)
    : fullTableArea(snapshot.table);

/** O caminho da bola-alvo até a boca não pode atravessar outra bola. */
function clearPath(balls: readonly Ball[], from: Vec2, to: Vec2, ignore: number): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSq = dx * dx + dy * dy;
  for (const ball of balls) {
    if (!ball.active || ball.id === ignore || ball.id === CUE_BALL) continue;
    const t = clamp(((ball.x - from.x) * dx + (ball.y - from.y) * dy) / lengthSq, 0, 1);
    if (Math.hypot(ball.x - from.x - dx * t, ball.y - from.y - dy * t) < BALL_DIAMETER + 1)
      return false;
  }
  return true;
}

function legalTargets(snapshot: AiSnapshot): Ball[] {
  return snapshot.balls.filter(
    (ball) => ball.active && isLegalFirstContact(snapshot.match, snapshot.balls, ball.id),
  );
}

function placements(snapshot: AiSnapshot): Vec2[] {
  const cue = snapshot.balls.find((ball) => ball.id === CUE_BALL)!;
  if (!snapshot.match.ballInHand) return [{ x: cue.x, y: cue.y }];
  const positions: Vec2[] = [];
  const add = (point: Vec2) => {
    if (
      isValidPlacement(snapshot.balls, snapshot.table, point, areaFor(snapshot)) &&
      positions.every((existing) => distance(existing, point) > BALL_RADIUS)
    )
      positions.push(point);
  };
  add(cue);
  add(snapshot.table.headSpot);
  if (!snapshot.match.isBreak) {
    // Alinha a branca atrás da bola fantasma para criar uma jogada direta com bola na mão.
    for (const ball of legalTargets(snapshot))
      for (const pocket of snapshot.table.pockets) {
        const length = distance(ball, pocket.throat);
        if (length < 1) continue;
        const dx = (pocket.throat.x - ball.x) / length;
        const dy = (pocket.throat.y - ball.y) / length;
        add({ x: ball.x - dx * 320, y: ball.y - dy * 320 });
      }
  }
  // Grade finita de recuperação se as posições preferidas estiverem ocupadas.
  const area = areaFor(snapshot);
  for (let x = area.minX + 15; x < area.maxX; x += 250)
    for (let y = BALL_RADIUS + 15; y < snapshot.table.spec.width - BALL_RADIUS; y += 240)
      add({ x, y });
  return positions;
}

function candidatesFor(snapshot: AiSnapshot): Candidate[] {
  const targets = legalTargets(snapshot);
  const onEight = isOnEight(snapshot.match, snapshot.match.turn, snapshot.balls);
  const candidates: Candidate[] = [];
  const positions = placements(snapshot);
  const originalCue = snapshot.balls.find((ball) => ball.id === CUE_BALL)!;
  if (snapshot.match.isBreak) {
    const apex = targets.find((ball) => ball.id === 1) ?? targets[0];
    if (!apex) return [];
    for (const offset of [0, -90, 90]) {
      const position = snapshot.match.ballInHand
        ? { x: snapshot.table.headSpot.x, y: snapshot.table.headSpot.y + offset }
        : originalCue;
      if (
        snapshot.match.ballInHand &&
        !isValidPlacement(snapshot.balls, snapshot.table, position, areaFor(snapshot))
      )
        continue;
      for (const power of [0.9, 1, 0.8])
        candidates.push({
          input: {
            angle: Math.atan2(apex.y - position.y, apex.x - position.x),
            power,
            spin: { x: 0, y: 0 },
          },
          cuePosition: snapshot.match.ballInHand ? { x: position.x, y: position.y } : null,
          calledPocket: null,
          targetBall: apex.id,
          intent: 'break',
          priority: 100 - Math.abs(offset) / 10,
        });
    }
    return candidates;
  }

  // Ordena as posições pela qualidade da melhor oportunidade antes de limitar a busca.
  const direct: Candidate[] = [];
  for (const position of positions) {
    const balls = cloneAiBalls(snapshot.balls);
    const cue = balls.find((ball) => ball.id === CUE_BALL)!;
    cue.x = position.x;
    cue.y = position.y;
    cue.active = true;
    for (const target of targets)
      for (const pocket of snapshot.table.pockets) {
        const mouth = {
          x: pocket.throat.x + pocket.axis.x * 18,
          y: pocket.throat.y + pocket.axis.y * 18,
        };
        const objectDistance = distance(target, mouth);
        if (objectDistance < 1 || !clearPath(balls, target, mouth, target.id)) continue;
        const dx = (mouth.x - target.x) / objectDistance;
        const dy = (mouth.y - target.y) / objectDistance;
        const ghost = { x: target.x - dx * BALL_DIAMETER, y: target.y - dy * BALL_DIAMETER };
        if (
          !isValidPlacement(balls, snapshot.table, ghost, fullTableArea(snapshot.table), target.id)
        ) {
          // A bola branca atual não deve obstruir sua própria posição futura.
          const withoutCue = balls.filter((ball) => ball.id !== CUE_BALL);
          if (
            !isValidPlacement(
              withoutCue,
              snapshot.table,
              ghost,
              fullTableArea(snapshot.table),
              target.id,
            )
          )
            continue;
        }
        const angle = Math.atan2(ghost.y - cue.y, ghost.x - cue.x);
        const prediction = predictShot(balls, snapshot.table, angle);
        if (
          prediction.kind !== 'ball' ||
          prediction.target.id !== target.id ||
          prediction.fullness < 0.22
        )
          continue;
        const travel = distance(cue, ghost) + objectDistance / prediction.fullness;
        // Estimativa inicial; a física decide qual força realmente funciona.
        const power = clamp(0.12 + travel / 6500, 0.14, 0.65);
        const priority = 1000 + prediction.fullness * 180 - travel / 12;
        direct.push({
          input: { angle, power, spin: { x: 0, y: 0 } },
          cuePosition: snapshot.match.ballInHand ? { ...position } : null,
          calledPocket: onEight ? pocket.id : null,
          targetBall: target.id,
          intent: 'pot',
          priority,
        });
      }
  }
  direct.sort((a, b) => b.priority - a.priority);
  // Primeiro cobre alvos/caçapas diferentes; só então refina força e efeito.
  const routes = new Set<string>();
  const selected = direct
    .filter((candidate) => {
      const key = `${candidate.targetBall}:${candidate.calledPocket ?? Math.round(candidate.input.angle * 30)}`;
      if (routes.has(key)) return false;
      routes.add(key);
      return true;
    })
    .slice(0, snapshot.difficulty === 'hard' ? 10 : 6);
  for (const route of selected) {
    for (const factor of [1, 0.68, 1.35])
      candidates.push({
        ...route,
        input: { ...route.input, power: clamp(route.input.power * factor, 0.06, 0.85) },
      });
    if (snapshot.difficulty !== 'easy')
      for (const y of [-0.35, 0.35])
        candidates.push({
          ...route,
          priority: route.priority - 5,
          input: { ...route.input, spin: { x: 0, y } },
        });
  }

  const position = positions[0];
  if (!position) return candidates;
  const balls = cloneAiBalls(snapshot.balls);
  const cue = balls.find((ball) => ball.id === CUE_BALL)!;
  cue.x = position.x;
  cue.y = position.y;
  cue.active = true;
  const defaultPocket = onEight
    ? snapshot.table.pockets.reduce((best, pocket) =>
        distance(targets[0]!, pocket.throat) < distance(targets[0]!, best.throat) ? pocket : best,
      ).id
    : null;
  const addContact = (
    angle: number,
    target: number | null,
    intent: Candidate['intent'],
    priority: number,
  ) => {
    for (const power of [0.24, 0.48])
      candidates.push({
        input: { angle, power, spin: { x: 0, y: 0 } },
        cuePosition: snapshot.match.ballInHand ? { ...position } : null,
        calledPocket: defaultPocket,
        targetBall: target,
        intent,
        priority,
      });
  };
  for (const target of targets) {
    const angle = Math.atan2(target.y - cue.y, target.x - cue.x);
    for (const offset of [0, -0.025, 0.025]) {
      const prediction = predictShot(balls, snapshot.table, angle + offset);
      if (prediction.kind === 'ball' && prediction.target.id === target.id)
        addContact(angle + offset, target.id, 'safety', 300 - distance(cue, target) / 20);
    }
  }
  if (snapshot.difficulty !== 'easy') {
    const e = DEFAULT_PHYSICS.cushionRestitution;
    const { length: L, width: W } = snapshot.table.spec;
    for (const target of targets) {
      // Espelha o alvo corrigindo a perda de velocidade normal na borracha.
      const mirrors = [
        { x: target.x, y: BALL_RADIUS - (target.y - BALL_RADIUS) / e },
        { x: target.x, y: W - BALL_RADIUS + (W - BALL_RADIUS - target.y) / e },
        { x: BALL_RADIUS - (target.x - BALL_RADIUS) / e, y: target.y },
        { x: L - BALL_RADIUS + (L - BALL_RADIUS - target.x) / e, y: target.y },
      ];
      for (const mirror of mirrors) {
        const angle = Math.atan2(mirror.y - cue.y, mirror.x - cue.x);
        const prediction = predictShot(balls, snapshot.table, angle);
        if (prediction.kind !== 'cushion') continue;
        for (const offset of [0, -0.025, 0.025])
          addContact(angle + offset, target.id, 'escape', 240);
      }
    }
  }
  // Se estiver escondida, busca saídas pela tabela. A simulação valida o primeiro contato.
  for (let i = 0; i < 24; i++) {
    const angle = (i * Math.PI * 2) / 24;
    const prediction = predictShot(balls, snapshot.table, angle);
    if (prediction.kind === 'cushion') addContact(angle, null, 'escape', 10);
  }
  return candidates;
}

function positionValue(balls: Ball[], table: TableGeometry, match: MatchState): number {
  const cue = balls.find((ball) => ball.id === CUE_BALL)!;
  let opportunities = 0;
  for (const target of balls) {
    if (!target.active || !isLegalFirstContact(match, balls, target.id)) continue;
    const prediction = predictShot(balls, table, Math.atan2(target.y - cue.y, target.x - cue.x));
    if (prediction.kind === 'ball' && prediction.target.id === target.id) opportunities++;
  }
  return opportunities * 8 - distance(cue, table.centerSpot) / 100;
}

function evaluate(
  snapshot: AiSnapshot,
  candidate: Candidate,
): { score: number; outcome: ShotOutcome } {
  const balls = cloneAiBalls(snapshot.balls);
  const cue = balls.find((ball) => ball.id === CUE_BALL)!;
  if (candidate.cuePosition) {
    cue.x = candidate.cuePosition.x;
    cue.y = candidate.cuePosition.y;
    cue.active = true;
  }
  const recorder = new ShotRecorder(isOnEight(snapshot.match, snapshot.match.turn, balls));
  const sim = createSimulation(snapshot.table, balls);
  applyCueStrike(cue, candidate.input);
  simulateUntilRest(sim, recorder, 20);
  const { state, outcome } = resolveShot(
    { ...snapshot.match, calledPocket: candidate.calledPocket },
    recorder.record,
  );
  if (isMoving(balls)) return { score: -200000, outcome };
  if (outcome.gameOver)
    return { score: outcome.gameOver.winner === snapshot.match.turn ? 100000 : -100000, outcome };
  let score = outcome.foul ? -4000 : 500;
  if (outcome.returnCueBall) score -= 1500;
  const group = snapshot.match.groups[snapshot.match.turn] ?? outcome.groupAssigned?.group;
  for (const pot of recorder.record.pocketed) {
    if (pot.ball === CUE_BALL || pot.ball === EIGHT_BALL) continue;
    score += !group || groupOf(pot.ball) === group ? 900 : -300;
  }
  if (!outcome.foul) {
    if (outcome.continuesTurn) score += 160 + positionValue(balls, snapshot.table, state);
    else score -= positionValue(balls, snapshot.table, state); // Dificulta a próxima vez do adversário.
    score -= candidate.input.power * 12;
  }
  return { score, outcome };
}

/** Recuperação rápida para falha/timeout do worker; usa apenas geometria, sem bloquear a tela. */
export function emergencyComputerPlan(snapshot: AiSnapshot): AiPlan | null {
  if (
    snapshot.match.winner !== null ||
    !snapshot.balls.some((ball) => ball.id === CUE_BALL) ||
    !legalTargets(snapshot).length
  )
    return null;
  const candidate = candidatesFor(snapshot).sort((a, b) => b.priority - a.priority)[0];
  if (!candidate) return null;
  return {
    input: candidate.input,
    cuePosition: candidate.cuePosition,
    calledPocket: candidate.calledPocket,
    targetBall: candidate.targetBall,
    intent: candidate.intent,
    score: 0,
    predicted: null,
    stats: { generated: 1, simulated: 0, fallback: true },
  };
}

/** Pipeline determinístico: gerar → filtrar → simular → aplicar regras → pontuar → dosar erro. */
export function planComputerShot(snapshot: AiSnapshot): AiPlan | null {
  if (
    snapshot.match.winner !== null ||
    !snapshot.balls.some((ball) => ball.id === CUE_BALL) ||
    !legalTargets(snapshot).length
  )
    return null;
  const config = AI_DIFFICULTIES[snapshot.difficulty];
  const candidates = candidatesFor(snapshot);
  const sorted = candidates.sort((a, b) => b.priority - a.priority);
  // Reserva espaço para defesa/escape mesmo quando há muitas tentativas de encaçapar.
  const limit = config.candidates;
  const pots = sorted.filter(
    (candidate) => candidate.intent === 'pot' || candidate.intent === 'break',
  );
  const contacts = sorted.filter((candidate) => candidate.intent === 'safety');
  const escapes = sorted.filter((candidate) => candidate.intent === 'escape');
  const reserve = snapshot.match.isBreak ? 0 : Math.min(8, Math.floor(limit / 4));
  const search = [...pots.slice(0, limit - reserve), ...contacts.slice(0, reserve)];
  for (const candidate of [
    ...contacts.slice(reserve),
    ...escapes,
    ...pots.slice(limit - reserve),
  ]) {
    if (search.length >= limit) break;
    search.push(candidate);
  }
  if (!search.length) return null;
  let best = search[0]!;
  let bestScore = -Infinity;
  for (const candidate of search) {
    const { score } = evaluate(snapshot, candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  const random = createRandom(snapshot.seed);
  const input = {
    ...best.input,
    spin: { ...best.input.spin },
    angle: best.input.angle + (random() * 2 - 1) * config.angleError,
    power: clamp(best.input.power * (1 + (random() * 2 - 1) * config.powerError), 0.04, 1),
  };
  // Relata a previsão da tacada que será executada, já incluindo a imprecisão do nível.
  const actual = evaluate(snapshot, { ...best, input });
  return {
    input,
    cuePosition: best.cuePosition,
    calledPocket: best.calledPocket,
    targetBall: best.targetBall,
    intent: best.intent,
    score: actual.score,
    predicted: actual.outcome,
    stats: { generated: candidates.length, simulated: search.length + 1, fallback: false },
  };
}
