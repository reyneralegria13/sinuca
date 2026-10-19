import type { GameController } from '../game/GameController';

/**
 * Teclado: setas giram a mira (Shift = mais rápido); segurar Espaço carrega a força
 * em vaivém e soltar dá a tacada.
 */
export function bindKeyboard(game: GameController, isBlocked: () => boolean): () => void {
  let charging: number | null = null;
  let raf = 0;

  const pump = () => {
    if (charging === null) return;
    const k = ((performance.now() - charging) / 1400) % 2;
    game.setPower(k < 1 ? k : 2 - k);
    raf = requestAnimationFrame(pump);
  };

  const down = (e: KeyboardEvent) => {
    if (isBlocked()) return;
    const step = e.shiftKey ? 0.02 : 0.0025;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      game.nudgeAim(-step);
      e.preventDefault();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      game.nudgeAim(step);
      e.preventDefault();
    } else if (e.code === 'Space') {
      e.preventDefault();
      if (charging === null && game.canAct) {
        charging = performance.now();
        pump();
      }
    }
  };

  const up = (e: KeyboardEvent) => {
    if (e.code !== 'Space' || charging === null) return;
    charging = null;
    cancelAnimationFrame(raf);
    game.shoot();
  };

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    cancelAnimationFrame(raf);
  };
}
