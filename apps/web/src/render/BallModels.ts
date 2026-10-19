import { Group, Mesh, MeshPhysicalMaterial, Quaternion, SphereGeometry } from 'three';
import { BALL_RADIUS } from '@sinuca/core';
import type { GameController } from '../game/GameController';
import { orientationToQuaternion } from './coords';
import { createBallTexture } from './textures/ballTexture';

/** Malhas das 16 bolas: resina com verniz (clearcoat) e reflexo do ambiente. */
export class BallModels {
  readonly group = new Group();
  private readonly meshes: Mesh[] = [];
  private readonly q = new Quaternion();

  constructor(maxAnisotropy: number) {
    const geometry = new SphereGeometry(BALL_RADIUS, 64, 48);
    for (let id = 0; id < 16; id++) {
      const material = new MeshPhysicalMaterial({
        map: createBallTexture(id, maxAnisotropy),
        roughness: 0.16,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        envMapIntensity: 1.1,
        specularIntensity: 0.6,
      });
      const m = new Mesh(geometry, material);
      m.castShadow = true;
      m.receiveShadow = true;
      m.name = `ball-${id}`;
      this.meshes.push(m);
      this.group.add(m);
    }
  }

  update(game: GameController): void {
    for (const ball of game.balls) {
      const m = this.meshes[ball.id]!;
      if (ball.active) {
        m.visible = true;
        m.position.set(ball.x, BALL_RADIUS, ball.y);
        m.quaternion.copy(orientationToQuaternion(ball.orientation, this.q));
        m.scale.setScalar(1);
      } else {
        m.visible = false;
      }
    }
    for (const f of game.falling) {
      const m = this.meshes[f.ball.id]!;
      const k = f.t;
      const ease = k * k;
      m.visible = true;
      m.position.set(
        f.from.x + (f.pocket.center.x - f.from.x) * Math.min(1, k * 1.6),
        BALL_RADIUS - ease * 160,
        f.from.y + (f.pocket.center.y - f.from.y) * Math.min(1, k * 1.6),
      );
    }
  }
}
