import { CUE_BALL, type Ball } from '../ball';
import type { SimulationEvents } from '../physics/events';
import type { Pocket } from '../table/types';
import type { ShotRecord } from './types';

/** Coleta os fatos de uma tacada a partir dos eventos da simulação. */
export class ShotRecorder implements SimulationEvents {
  readonly record: ShotRecord;

  constructor(shooterOnEight: boolean) {
    this.record = {
      firstContact: null,
      pocketed: [],
      cushionAfterContact: false,
      ballsToCushion: new Set(),
      shooterOnEight,
    };
  }

  onBallContact(a: Ball, b: Ball): void {
    if (this.record.firstContact !== null) return;
    if (a.id === CUE_BALL) this.record.firstContact = b.id;
    else if (b.id === CUE_BALL) this.record.firstContact = a.id;
  }

  onCushionContact(ball: Ball): void {
    if (this.record.firstContact !== null) this.record.cushionAfterContact = true;
    if (ball.id !== CUE_BALL) this.record.ballsToCushion.add(ball.id);
  }

  onPocket(ball: Ball, pocket: Pocket): void {
    this.record.pocketed.push({ ball: ball.id, pocket: pocket.id });
  }
}
