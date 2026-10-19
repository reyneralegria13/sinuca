import { CylinderGeometry, Group, Mesh, SphereGeometry, type Material } from 'three';
import { BALL_RADIUS, type Spin } from '@sinuca/core';
import type { Materials } from './materials';

/** Comprimento do taco (58 pol). */
export const CUE_LENGTH = 1473;
const ELEVATION = 0.075;

/**
 * Taco montado ao longo de +X local, da ponta (x = 0) ao cabo.
 * yaw: gira em torno da bola; pitch: inclina o taco como numa tacada real.
 */
export class CueModel {
  readonly root = new Group();
  private readonly pitch = new Group();
  private readonly body = new Group();

  constructor(mat: Materials) {
    this.root.add(this.pitch);
    this.pitch.add(this.body);
    this.pitch.rotation.z = ELEVATION;

    const part = (a: number, b: number, ra: number, rb: number, m: Material) => {
      const g = new CylinderGeometry(ra, rb, b - a, 40, 1);
      g.rotateZ(Math.PI / 2);
      g.translate((a + b) / 2, 0, 0);
      const mesh = new Mesh(g, m);
      mesh.castShadow = true;
      this.body.add(mesh);
    };
    // ponta arredondada de couro com giz
    const tipCap = new Mesh(
      new SphereGeometry(6.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      mat.tip,
    );
    tipCap.rotation.z = Math.PI / 2;
    tipCap.position.x = 1;
    this.body.add(tipCap);
    part(1, 11, 6.4, 6.5, mat.tip);
    part(11, 33, 6.5, 6.6, mat.ferrule);
    part(33, 740, 6.6, 9.8, mat.shaft);
    part(740, 752, 9.8, 10.2, mat.ring);
    part(752, 760, 10.2, 10.3, mat.ferrule);
    part(760, 1000, 10.3, 11.6, mat.butt);
    part(1000, 1006, 11.6, 11.7, mat.ring);
    part(1006, 1260, 11.7, 13.4, mat.wrap);
    part(1260, 1266, 13.4, 13.5, mat.ring);
    part(1266, CUE_LENGTH - 14, 13.5, 14.6, mat.butt);
    part(CUE_LENGTH - 14, CUE_LENGTH, 14.6, 14.6, mat.bumper);
  }

  /** Posiciona o taco atrás da branca. `pull` é o recuo em mm (força da tacada). */
  update(x: number, y: number, angle: number, pull: number, spin: Spin, visible: boolean): void {
    this.root.visible = visible;
    if (!visible) return;
    this.root.position.set(x, BALL_RADIUS, y);
    this.root.rotation.y = Math.PI - angle;
    this.pitch.position.set(0, spin.y * BALL_RADIUS * 0.45, -spin.x * BALL_RADIUS * 0.45);
    this.body.position.x = BALL_RADIUS + 6 + pull;
  }
}
