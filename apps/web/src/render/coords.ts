import { Matrix4, Quaternion } from 'three';
import type { Mat3 } from '@sinuca/core';

/**
 * Convenção da cena: o grupo da mesa fica em coordenadas do núcleo (mm), com
 * x da mesa → X, y da mesa → Z e altura → Y. Isso troca os eixos y e z (P),
 * então a rotação da bola no mundo 3D é P·M·P. Como a malha da esfera tem o eixo
 * da faixa em Y local e os números em X local, a mesma troca P leva o corpo à malha.
 */
const SWAP = [0, 2, 1];
const tmp = new Matrix4();

export function orientationToQuaternion(M: Mat3, out: Quaternion): Quaternion {
  const r = (i: number, j: number) => M[SWAP[i]! * 3 + SWAP[j]!]!;
  tmp.set(
    r(0, 0),
    r(0, 1),
    r(0, 2),
    0,
    r(1, 0),
    r(1, 1),
    r(1, 2),
    0,
    r(2, 0),
    r(2, 1),
    r(2, 2),
    0,
    0,
    0,
    0,
    1,
  );
  return out.setFromRotationMatrix(tmp);
}
