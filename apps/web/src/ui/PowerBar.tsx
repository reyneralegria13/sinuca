import { useRef } from 'react';
import type { GameController } from '../game/GameController';

/** Puxe o taco ao longo da barra e solte para tacar. Voltar até o início cancela. */
export function PowerBar({
  game,
  power,
  vertical,
}: {
  game: GameController;
  power: number;
  vertical: boolean;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      className="power"
      role="slider"
      aria-label="Força da tacada: arraste e solte"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(power * 100)}
      tabIndex={0}
      onPointerDown={(e) => {
        if (!game.canAct) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        const r = e.currentTarget.getBoundingClientRect();
        const d = vertical
          ? (e.clientY - start.current.y) / (r.height * 0.8)
          : (e.clientX - start.current.x) / (r.width * 0.8);
        game.setPower(d);
      }}
      onPointerUp={() => {
        if (!start.current) return;
        start.current = null;
        game.shoot();
      }}
      onPointerCancel={() => {
        start.current = null;
        game.setPower(0);
      }}
    >
      <div
        className="power-fill"
        style={vertical ? { height: `${power * 100}%` } : { width: `${power * 100}%` }}
      />
      <div
        className="power-cue"
        style={{
          transform: vertical
            ? `translate(-50%, ${power * 22}%)`
            : `translate(${power * 22}%, -50%)`,
        }}
      />
    </div>
  );
}
