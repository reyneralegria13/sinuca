import {
  advance,
  cloneAiBalls,
  emergencyComputerPlan,
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
  type AiDifficulty,
  type AiPlan,
  type AiPlanner,
  type AiSnapshot,
  type AiTask,
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
export type GameMode = 'local' | 'computer';
export type ComputerStatus = 'idle' | 'thinking' | 'aiming';

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
  mode: GameMode;
  difficulty: AiDifficulty;
  playerNames: [string, string];
  computerStatus: ComputerStatus;
  computerTurn: boolean;
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
  mode: GameMode = 'local';
  difficulty: AiDifficulty = 'medium';
  computerStatus: ComputerStatus = 'idle';
  lastComputerPlan: AiPlan | null = null;

  private computerTask: AiTask | null = null;
  private computerPlan: AiPlan | null = null;
  private computerGeneration = 0;
  private computerElapsed = 0;
  private computerAimElapsed = 0;

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
    private readonly computerPlanner?: AiPlanner,
  ) {
    this.newGame(0);
  }

  get cueBall(): Ball {
    return this.balls[CUE_BALL]!;
  }

  newGame(firstPlayer?: PlayerIndex): void {
    this.cancelComputer();
    this.lastComputerPlan = null;
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
    this.showToast(`Saída: ${this.playerNames[starter]}`, 'info');
  }

  startMatch(
    mode: GameMode,
    difficulty: AiDifficulty = this.difficulty,
    firstPlayer: PlayerIndex = 0,
  ): void {
    this.mode = mode;
    this.difficulty = difficulty;
    this.newGame(firstPlayer);
  }

  get playerNames(): [string, string] {
    return [PLAYER_NAMES[0], this.mode === 'computer' ? 'Computador' : PLAYER_NAMES[1]];
  }

  get computerTurn(): boolean {
    return this.mode === 'computer' && this.match.turn === 1 && this.match.winner === null;
  }

  private describePlayer(text: string): string {
    return this.mode === 'computer' ? text.replaceAll(PLAYER_NAMES[1], 'Computador') : text;
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
      mode: this.mode,
      difficulty: this.difficulty,
      playerNames: this.playerNames,
      computerStatus: this.computerStatus,
      computerTurn: this.computerTurn,
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
    if (this.computerTurn)
      return this.computerStatus === 'aiming'
        ? 'Computador preparando a tacada…'
        : 'Computador analisando a mesa…';
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
    return this.readyToShoot && !this.computerTurn;
  }

  private get readyToShoot(): boolean {
    return this.phase === 'aiming' && this.match.winner === null && !this.paused;
  }

  setAim(angle: number): void {
    if (this.canAct) this.aim = angle;
  }

  nudgeAim(delta: number): void {
    if (this.canAct) this.aim += delta;
  }

  aimAt(point: Vec2): void {
    if (!this.canAct) return;
    const c = this.cueBall;
    if (Math.hypot(point.x - c.x, point.y - c.y) > BALL_RADIUS * 0.6)
      this.aim = Math.atan2(point.y - c.y, point.x - c.x);
  }

  setPower(power: number): void {
    if (this.computerTurn) return;
    this.power = Math.max(0, Math.min(1, power));
    this.emit();
  }

  setSpin(spin: Spin): void {
    if (this.computerTurn) return;
    const l = Math.hypot(spin.x, spin.y);
    this.spin = l > 1 ? { x: spin.x / l, y: spin.y / l } : { ...spin };
    this.emit();
  }

  setPaused(paused: boolean): void {
    if (paused === this.paused) return;
    this.paused = paused;
    if (paused) {
      this.power = 0;
      this.cancelComputer();
    }
    this.emit();
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
    return this.strike();
  }

  private strike(): boolean {
    if (!this.readyToShoot) return false;
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
    if (this.paused) return;
    if (this.phase === 'rolling') {
      this.accumulator = advance(this.sim, this.accumulator + dt, this.events);
      if (!isMoving(this.balls) && this.falling.length === 0) this.finishShot();
    } else if (this.phase === 'aiming' && !this.paused && this.match.winner === null) {
      this.clock -= dt;
      if (this.clock <= 0) this.onShotClock();
      else {
        if (this.computerTurn) this.tickComputer(dt);
        if (Math.abs(this.clock - this.lastClockEmit) > 0.1) {
          this.lastClockEmit = this.clock;
          this.emit();
        }
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
    this.cancelComputer();
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
      this.winnerText = this.describePlayer(
        gameOverText(outcome.gameOver.reason, outcome.gameOver.winner),
      );
      this.showToast(`${this.playerNames[outcome.gameOver.winner]} venceu!`, 'success');
      return;
    }
    this.phase = 'aiming';
    this.autoAim();
    const { text, tone } = describeOutcome(outcome, state.turn);
    this.showToast(this.describePlayer(text), tone);
  }

  private snapshot(): AiSnapshot {
    return {
      balls: cloneAiBalls(this.balls),
      table: this.table,
      match: { ...this.match, groups: [...this.match.groups] },
      difficulty: this.difficulty,
      seed: Math.floor(this.random() * 0x100000000),
    };
  }

  private cancelComputer(): void {
    this.computerGeneration++;
    this.computerTask?.cancel();
    this.computerTask = null;
    this.computerPlan = null;
    this.computerStatus = 'idle';
    this.computerElapsed = 0;
    this.computerAimElapsed = 0;
  }

  private beginComputer(): void {
    const snapshot = this.snapshot();
    const generation = ++this.computerGeneration;
    this.computerStatus = 'thinking';
    this.computerElapsed = 0;
    const accept = (plan: AiPlan | null) => {
      if (generation !== this.computerGeneration || !this.computerTurn || !this.readyToShoot)
        return;
      this.computerTask = null;
      this.prepareComputerPlan(plan ?? emergencyComputerPlan(snapshot));
    };
    try {
      if (!this.computerPlanner) {
        accept(emergencyComputerPlan(snapshot));
        return;
      }
      this.computerTask = this.computerPlanner(snapshot);
      this.computerTask.result.then(accept, () => {
        if (generation === this.computerGeneration) accept(emergencyComputerPlan(snapshot));
      });
    } catch {
      accept(emergencyComputerPlan(snapshot));
    }
    this.emit();
  }

  private prepareComputerPlan(plan: AiPlan | null): void {
    if (!plan) return; // Sem alvos num estado inválido, o relógio ainda resolve a vez.
    const input = plan.input;
    const valid =
      Number.isFinite(input.angle) &&
      Number.isFinite(input.power) &&
      input.power >= 0.03 &&
      input.power <= 1 &&
      Number.isFinite(input.spin.x) &&
      Number.isFinite(input.spin.y) &&
      Math.hypot(input.spin.x, input.spin.y) <= 1 &&
      (plan.calledPocket === null ||
        this.table.pockets.some((pocket) => pocket.id === plan.calledPocket)) &&
      (!needsPocketCall(this.match, this.balls) || plan.calledPocket !== null);
    if (!valid) {
      this.prepareEmergencyPlan();
      return;
    }
    if (plan.cuePosition) {
      if (
        !this.match.ballInHand ||
        !Number.isFinite(plan.cuePosition.x) ||
        !Number.isFinite(plan.cuePosition.y) ||
        !isValidPlacement(this.balls, this.table, plan.cuePosition, this.placementArea)
      ) {
        this.prepareEmergencyPlan();
        return;
      }
      this.cueBall.x = plan.cuePosition.x;
      this.cueBall.y = plan.cuePosition.y;
    }
    this.computerPlan = plan;
    this.lastComputerPlan = plan;
    this.computerStatus = 'aiming';
    this.computerAimElapsed = 0;
    this.aim = input.angle;
    this.spin = { ...input.spin };
    this.match = { ...this.match, calledPocket: plan.calledPocket };
    this.emit();
  }

  private prepareEmergencyPlan(): void {
    const plan = emergencyComputerPlan(this.snapshot());
    if (plan) this.prepareComputerPlan(plan);
  }

  private tickComputer(dt: number): void {
    if (this.computerStatus === 'idle') this.beginComputer();
    this.computerElapsed += dt;
    if (this.computerStatus === 'thinking' && this.computerElapsed >= 8) {
      // Uma busca lenta ou um worker sem resposta nunca deixa a partida presa.
      this.cancelComputer();
      this.prepareEmergencyPlan();
    }
    if (this.computerStatus !== 'aiming' || !this.computerPlan) return;
    this.computerAimElapsed += dt;
    this.power = this.computerPlan.input.power * Math.min(1, this.computerAimElapsed / 0.65);
    if (this.computerAimElapsed >= 0.85) {
      this.power = this.computerPlan.input.power;
      this.computerPlan = null;
      this.computerStatus = 'idle';
      this.strike();
    }
  }

  /** Cancela buscas ao desmontar; pode ser reativado pelo próximo tick (React StrictMode). */
  dispose(): void {
    this.cancelComputer();
  }
}
