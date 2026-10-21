import { BALL_RADIUS } from '@sinuca/core';
import type { GameController } from '../game/GameController';
import type { SceneRenderer } from '../render/SceneRenderer';

/**
 * Toque/mouse na mesa:
 * - arrastar aponta o taco para o ponto tocado;
 * - com bola na mão, arrastar a partir da branca a reposiciona;
 * - quando é preciso cantar a 8, tocar perto de uma caçapa a escolhe.
 */
export class TablePointer {
  private mode: 'aim' | 'cue' | null = null;
  private readonly el: HTMLElement;

  constructor(
    private readonly game: GameController,
    private readonly view: SceneRenderer,
    private readonly onInteract: () => void,
  ) {
    this.el = view.renderer.domElement;
    this.el.addEventListener('pointerdown', this.down);
    this.el.addEventListener('pointermove', this.move);
    this.el.addEventListener('pointerup', this.up);
    this.el.addEventListener('pointercancel', this.up);
  }

  private down = (e: PointerEvent) => {
    this.onInteract();
    const g = this.game;
    if (!g.canAct) return;
    const p = this.view.pick(e.clientX, e.clientY);
    if (!p) return;
    if (g.getView().needsPocketCall) {
      const pocket = g.pocketNear(p);
      if (pocket) g.callPocket(pocket.id);
      return;
    }
    this.el.setPointerCapture(e.pointerId);
    const cue = g.cueBall;
    if (g.match.ballInHand && Math.hypot(p.x - cue.x, p.y - cue.y) < BALL_RADIUS * 3.2) {
      this.mode = 'cue';
      this.view.draggingCue = true;
      g.placeCue(p);
      return;
    }
    this.mode = 'aim';
    g.aimAt(p);
  };

  private move = (e: PointerEvent) => {
    if (!this.mode) return;
    if (!this.game.canAct) {
      this.up();
      return;
    }
    const p = this.view.pick(e.clientX, e.clientY);
    if (!p) return;
    if (this.mode === 'cue') this.game.placeCue(p);
    else this.game.aimAt(p);
  };

  private up = () => {
    if (this.mode === 'cue') this.game.autoAim();
    this.mode = null;
    this.view.draggingCue = false;
  };

  dispose(): void {
    this.el.removeEventListener('pointerdown', this.down);
    this.el.removeEventListener('pointermove', this.move);
    this.el.removeEventListener('pointerup', this.up);
    this.el.removeEventListener('pointercancel', this.up);
  }
}
