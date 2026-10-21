import {
  advance,
  applyCueStrike,
  BALL_RADIUS,
  createMatch,
  createRack,
  createSimulation,
  createTableGeometry,
  CUE_BALL,
  EIGHT_BALL,
  fullTableArea,
  isLegalFirstContact,
  isMoving,
  isOnEight,
  isValidPlacement,
  kitchenArea,
  needsPocketCall,
  placeBall,
  resolveShot,
  resolveShotClockViolation,
  SHOT_CLOCK_SECONDS,
  ShotRecorder,
  TABLE_9FT,
  type Ball,
  type Group,
  type MatchState,
  type PlayerIndex,
  type Pocket,
  type ShotOutcome,
  type Simulation,
  type SimulationEvents,
  type Spin,
  type TableGeometry,
  type Vec2,
} from '@sinuca/core';
import { describeOutcome, gameOverText, PLAYER_NAMES, type ToastTone } from './messages';

export type Phase = 'aiming' | 'rolling' | 'over';

export interface GameAudio {
  cue(speed: number, pan?: number): void;
  ball(speed: number, pan?: number): void;
  cushion(speed: number, pan?: number): void;
  pocket(pan?: number): void;
}

export interface FallingBall {
  ball: Ball;
  pocket: Pocket;
  from: Vec2;
  /** Progresso da animação de queda, de 0 a 1. */
  t: number;
}

export interface Toast {
  id: number;
  text: string;
  tone: ToastTone;
}

/** Estado resumido para a interface (React). Muda só quando algo visível muda. */
export interface GameView {
  phase: Phase;
  turn: PlayerIndex;
  groups: [Group | null, Group | null];
  onTable: boolean[];
  onEight: [boolean, boolean];
  ballInHand: boolean;
  isBreak: boolean;
  needsPocketCall: boolean;
  calledPocket: number | null;
  clock: number;
  power: number;
  spin: Spin;
  prompt: string | null;
  toast: Toast | null;
  winner: { player: PlayerIndex; text: string } | null;
}

const FALL_DURATION = 0.45;

/**
 * Orquestra uma partida local: liga a simulação do núcleo, as regras, o relógio da tacada,
 * a mira e os sons. Não sabe nada de renderização: o renderizador e a interface leem daqui.
 */
export class GameController {
  readonly table: TableGeometry = createTableGeometry(TABLE_9FT);
  balls: Ball[] = [];
  match: MatchState = createMatch(0);
  phase: Phase = 'aiming';
  aim = 0;
  power = 0;
  spin: Spin = { x: 0, y: 0 };
  clock = SHOT_CLOCK_SECONDS;
  paused = false;
  falling: FallingBall[] = [];

  private sim!: Simulation;
  private recorder: ShotRecorder | null = null;
  private accumulator = 0;
  private listeners = new Set<() => void>();
  private view!: GameView;
  private toast: Toast | null = null;
  private toastSeq = 0;
  private lastClockEmit = 0;
  private winnerText: string | null = null;

  private readonly events: SimulationEvents = {
    onBallContact: (a, b, speed) => {
      this.recorder?.onBallContact(a, b);
      this.audio?.ball(speed, (a.x + b.x) / this.table.spec.length - 1);
    },
    onCushionContact: (ball, speed) => {
      this.recorder?.onCushionContact(ball);
      this.audio?.cushion(speed, (ball.x / this.table.spec.length) * 2 - 1);
    },
    onPocket: (ball, pocket) => {
      this.recorder?.onPocket(ball, pocket);
      this.falling.push({ ball, pocket, from: { x: ball.x, y: ball.y }, t: 0 });
      this.audio?.pocket((pocket.center.x / this.table.spec.length) * 2 - 1);
      this.emit();
    },
  };

  constructor(
    private readonly audio?: GameAudio,
    private readonly random: () => number = Math.random,
  ) {
    this.newGame(0);
  }

  get cueBall(): Ball {
    return this.balls[CUE_BALL]!;
  }

  newGame(firstPlayer?: PlayerIndex): void {
    const starter =
      firstPlayer ?? (this.match.winner !== null ? (this.match.winner === 0 ? 1 : 0) : 0);
    this.balls = createRack(this.table, this.random);
    this.sim = createSimulation(this.table, this.balls);
    this.match = createMatch(starter);
    this.phase = 'aiming';
    this.falling = [];
    this.recorder = null;
    this.accumulator = 0;
    this.power = 0;
    this.spin = { x: 0, y: 0 };
    this.clock = SHOT_CLOCK_SECONDS;
    this.winnerText = null;
    this.aim = 0;
    this.showToast(`Saída do ${PLAYER_NAMES[starter]}`, 'info');
  }

  // ---------- assinatura para a interface ----------
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getView = (): GameView => this.view;

  private emit(): void {
    this.view = this.buildView();
    for (const l of this.listeners) l();
  }

  private buildView(): GameView {
    const m = this.match;
    return {
      phase: this.phase,
      turn: m.turn,
      groups: [m.groups[0], m.groups[1]],
      onTable: this.balls.map((b) => b.active),
      onEight: [isOnEight(m, 0, this.balls), isOnEight(m, 1, this.balls)],
      ballInHand: m.ballInHand && this.phase === 'aiming',
      isBreak: m.isBreak,
      needsPocketCall: this.phase === 'aiming' && needsPocketCall(m, this.balls),
      calledPocket: m.calledPocket,
      clock: Math.max(0, this.clock / SHOT_CLOCK_SECONDS),
      power: this.power,
      spin: { ...this.spin },
      prompt: this.prompt(),
      toast: this.toast,
      winner:
        m.winner !== null && this.winnerText ? { player: m.winner, text: this.winnerText } : null,
    };
  }

  private prompt(): string | null {
    if (this.phase !== 'aiming') return null;
    if (needsPocketCall(this.match, this.balls))
      return 'Toque na caçapa onde vai encaçapar a bola 8';
    if (this.match.ballInHand && this.match.isBreak)
      return 'Saída: posicione a branca atrás da linha';
    if (this.match.ballInHand) return 'Bola na mão: arraste a branca para onde quiser';
    return null;
  }

  private showToast(text: string, tone: ToastTone): void {
    this.toast = { id: ++this.toastSeq, text, tone };
    this.emit();
  }

  // ---------- comandos ----------
  get canAct(): boolean {
    return this.phase === 'aiming' && this.match.winner === null;
  }

  setAim(angle: number): void {
    this.aim = angle;
  }

  nudgeAim(delta: number): void {
    if (this.canAct) this.aim += delta;
  }

  aimAt(point: Vec2): void {
    const c = this.cueBall;
    if (Math.hypot(point.x - c.x, point.y - c.y) > BALL_RADIUS * 0.6)
      this.aim = Math.atan2(point.y - c.y, point.x - c.x);
  }

  setPower(power: number): void {
    this.power = Math.max(0, Math.min(1, power));
    this.emit();
  }

  setSpin(spin: Spin): void {
    const l = Math.hypot(spin.x, spin.y);
    this.spin = l > 1 ? { x: spin.x / l, y: spin.y / l } : { ...spin };
    this.emit();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  isLegalTarget(ballId: number): boolean {
    return isLegalFirstContact(this.match, this.balls, ballId);
  }

  get placementArea() {
    return this.match.ballInHandKitchenOnly ? kitchenArea(this.table) : fullTableArea(this.table);
  }

  /** Move a branca com a bola na mão. Retorna false se o ponto é inválido. */
  placeCue(point: Vec2): boolean {
    if (!this.canAct || !this.match.ballInHand) return false;
    const area = this.placementArea;
    const p = {
      x: Math.max(area.minX, Math.min(area.maxX, point.x)),
      y: Math.max(BALL_RADIUS, Math.min(this.table.spec.width - BALL_RADIUS, point.y)),
    };
    if (!isValidPlacement(this.balls, this.table, p, area)) return false;
    this.cueBall.x = p.x;
    this.cueBall.y = p.y;
    return true;
  }

  pocketNear(point: Vec2, radius = 130): Pocket | null {
    let best: Pocket | null = null;
    let bd = radius;
    for (const p of this.table.pockets) {
      const d = Math.hypot(point.x - p.center.x, point.y - p.center.y);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  callPocket(id: number): void {
    if (!this.canAct || !isOnEight(this.match, this.match.turn, this.balls)) return;
    this.match = { ...this.match, calledPocket: id };
    this.showToast('Caçapa cantada para a bola 8', 'info');
  }

  shoot(): boolean {
    if (!this.canAct) return false;
    if (this.power < 0.03) {
      this.setPower(0);
      return false;
    }
    if (needsPocketCall(this.match, this.balls)) {
      this.power = 0;
      this.showToast('Primeiro toque na caçapa onde vai encaçapar a bola 8', 'info');
      return false;
    }
    this.recorder = new ShotRecorder(isOnEight(this.match, this.match.turn, this.balls));
    const speed = applyCueStrike(this.cueBall, {
      angle: this.aim,
      power: this.power,
      spin: this.spin,
    });
    this.audio?.cue(speed, (this.cueBall.x / this.table.spec.length) * 2 - 1);
    this.match = { ...this.match, ballInHand: false };
    this.phase = 'rolling';
    this.power = 0;
    this.accumulator = 0;
    this.emit();
    return true;
  }

  /** Aponta para a bola legal mais próxima (início de cada vez). */
  autoAim(): void {
    const c = this.cueBall;
    let best: Ball | null = null;
    let bd = Infinity;
    for (const b of this.balls) {
      if (!b.active || b.id === CUE_BALL || !this.isLegalTarget(b.id)) continue;
      const d = Math.hypot(b.x - c.x, b.y - c.y);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    if (best) this.aim = Math.atan2(best.y - c.y, best.x - c.x);
  }

  // ---------- laço ----------
  tick(dt: number): void {
    if (this.phase === 'rolling') {
      this.accumulator = advance(this.sim, this.accumulator + dt, this.events);
      if (!isMoving(this.balls) && this.falling.length === 0) this.finishShot();
    } else if (this.phase === 'aiming' && !this.paused && this.match.winner === null) {
      this.clock -= dt;
      if (this.clock <= 0) this.onShotClock();
      else if (Math.abs(this.clock - this.lastClockEmit) > 0.1) {
        this.lastClockEmit = this.clock;
        this.emit();
      }
    }
    if (this.falling.length) {
      for (const f of this.falling) f.t = Math.min(1, f.t + dt / FALL_DURATION);
      this.falling = this.falling.filter((f) => f.t < 1);
    }
  }

  private finishShot(): void {
    if (!this.recorder) return;
    const { state, outcome } = resolveShot(this.match, this.recorder.record);
    this.recorder = null;
    this.applyOutcome(state, outcome);
  }

  private onShotClock(): void {
    const { state, outcome } = resolveShotClockViolation(this.match);
    this.applyOutcome(state, outcome);
  }

  private applyOutcome(state: MatchState, outcome: ShotOutcome): void {
    if (outcome.respotEight) {
      const eight = this.balls[EIGHT_BALL]!;
      placeBall(eight, this.balls, this.table, this.table.footSpot, {
        minX: this.table.footSpot.x,
        maxX: this.table.spec.length,
      });
    }
    if (outcome.returnCueBall && !outcome.gameOver) {
      placeBall(
        this.cueBall,
        this.balls,
        this.table,
        this.table.headSpot,
        fullTableArea(this.table),
      );
    }
    this.match = state;
    this.clock = SHOT_CLOCK_SECONDS;
    this.power = 0;

    if (outcome.gameOver) {
      this.phase = 'over';
      this.winnerText = gameOverText(outcome.gameOver.reason, outcome.gameOver.winner);
      this.showToast(`${PLAYER_NAMES[outcome.gameOver.winner]} venceu!`, 'success');
      return;
    }
    this.phase = 'aiming';
    this.autoAim();
    const { text, tone } = describeOutcome(outcome, state.turn);
    this.showToast(text, tone);
  }
}
