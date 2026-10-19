import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, RingGeometry } from 'three';
import { BALL_RADIUS, predictShot, type TableGeometry } from '@sinuca/core';
import type { GameController } from '../game/GameController';

const Y = BALL_RADIUS;
const WHITE = 0xffffff;
const RED = 0xff5a4a;
const GOLD = 0xe7b54d;

function basic(color: number, opacity: number) {
  return new MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

/** Faixa plana de largura `w` entre dois pontos da mesa. */
function setSegment(m: Mesh, x1: number, y1: number, x2: number, y2: number, w: number): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  m.visible = len > 0.5;
  m.position.set((x1 + x2) / 2, Y, (y1 + y2) / 2);
  m.scale.set(len, 1, w);
  m.rotation.y = -Math.atan2(dy, dx);
}

/** Linha de mira, bola fantasma, direções após o contato e marcações de caçapa e bola na mão. */
export class AimGuide {
  readonly group = new Group();
  private readonly quad = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly main = this.make(basic(WHITE, 0.9));
  private readonly target = this.make(basic(WHITE, 0.95));
  private readonly cuePath = this.make(basic(WHITE, 0.45));
  private readonly reflect = this.make(basic(WHITE, 0.45));
  private readonly crossA = this.make(basic(RED, 1));
  private readonly crossB = this.make(basic(RED, 1));
  private readonly ghost = new Mesh(
    new RingGeometry(BALL_RADIUS - 2, BALL_RADIUS + 2, 64).rotateX(-Math.PI / 2),
    basic(WHITE, 0.9),
  );
  private readonly handRing = new Mesh(
    new RingGeometry(BALL_RADIUS + 9, BALL_RADIUS + 13, 64).rotateX(-Math.PI / 2),
    basic(WHITE, 0.8),
  );
  private readonly pocketRings: Mesh[] = [];
  private readonly kitchen = new Mesh(
    new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    basic(WHITE, 0.05),
  );

  constructor(private readonly table: TableGeometry) {
    for (const m of [this.ghost, this.handRing, this.kitchen]) {
      m.renderOrder = 10;
      this.group.add(m);
    }
    const { headStringX, spec } = table;
    this.kitchen.scale.set(headStringX, 1, spec.width);
    this.kitchen.position.set(headStringX / 2, 0.5, spec.width / 2);
    this.kitchen.renderOrder = 1;
    for (const p of table.pockets) {
      const ring = new Mesh(
        new RingGeometry(p.radius + 8, p.radius + 15, 64).rotateX(-Math.PI / 2),
        basic(GOLD, 0.9),
      );
      ring.position.set(p.center.x, 60, p.center.y);
      ring.renderOrder = 11;
      this.pocketRings.push(ring);
      this.group.add(ring);
    }
  }

  private make(material: MeshBasicMaterial): Mesh {
    const m = new Mesh(this.quad, material);
    m.renderOrder = 10;
    this.group.add(m);
    return m;
  }

  private hideAll(): void {
    for (const c of this.group.children) c.visible = false;
  }

  update(game: GameController, time: number, draggingCue: boolean): void {
    this.hideAll();
    if (!game.canAct) return;
    const cue = game.cueBall;
    const m = game.match;

    // caçapas: piscando enquanto precisa cantar, fixa na escolhida
    const calling = game.getView().needsPocketCall;
    for (const p of this.table.pockets) {
      const ring = this.pocketRings[p.id]!;
      if (calling) {
        ring.visible = true;
        (ring.material as MeshBasicMaterial).opacity = 0.45 + Math.sin(time * 0.006) * 0.3;
      } else if (m.calledPocket === p.id) {
        ring.visible = true;
        (ring.material as MeshBasicMaterial).opacity = 1;
      }
    }

    if (m.ballInHand) {
      this.handRing.visible = true;
      this.handRing.position.set(cue.x, 1, cue.y);
      this.handRing.rotation.y = time * 0.001;
      if (m.ballInHandKitchenOnly) this.kitchen.visible = true;
    }
    if (draggingCue) return;

    const p = predictShot(game.balls, this.table, game.aim);
    const dx = Math.cos(game.aim);
    const dy = Math.sin(game.aim);
    setSegment(
      this.main,
      cue.x + dx * BALL_RADIUS,
      cue.y + dy * BALL_RADIUS,
      p.ghost.x,
      p.ghost.y,
      3,
    );
    this.ghost.visible = true;
    this.ghost.position.set(p.ghost.x, Y, p.ghost.y);

    if (p.kind === 'ball') {
      if (!game.isLegalTarget(p.target.id)) {
        const s = BALL_RADIUS * 0.7;
        setSegment(this.crossA, p.ghost.x - s, p.ghost.y - s, p.ghost.x + s, p.ghost.y + s, 6);
        setSegment(this.crossB, p.ghost.x + s, p.ghost.y - s, p.ghost.x - s, p.ghost.y + s, 6);
        return;
      }
      const len = 160 + 560 * Math.max(0, p.fullness);
      setSegment(
        this.target,
        p.target.x,
        p.target.y,
        p.target.x + p.targetDirection.x * len,
        p.target.y + p.targetDirection.y * len,
        3.5,
      );
      const tl = Math.hypot(p.cueDirection.x, p.cueDirection.y);
      if (tl > 0.02) {
        const l2 = 100 + 280 * tl;
        setSegment(
          this.cuePath,
          p.ghost.x,
          p.ghost.y,
          p.ghost.x + (p.cueDirection.x / tl) * l2,
          p.ghost.y + (p.cueDirection.y / tl) * l2,
          2.5,
        );
      }
    } else if (p.kind === 'cushion') {
      setSegment(
        this.reflect,
        p.ghost.x,
        p.ghost.y,
        p.ghost.x + p.reflected.x * 260,
        p.ghost.y + p.reflected.y * 260,
        2.5,
      );
    }
  }
}
