import { useRef, useState } from 'react';
import type { GameController } from '../game/GameController';

const RAD_PER_PX = 0.0011;

/** Roda de ajuste fino: cada pixel arrastado gira a mira ~0,06°. */
export function FineAim({ game, vertical }: { game: GameController; vertical: boolean }) {
  const last = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);

  return (
    <div
      className="fine"
      role="slider"
      aria-label="Ajuste fino da mira"
      tabIndex={0}
      style={{ ['--offset' as string]: `${offset}px` }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        last.current = vertical ? e.clientY : e.clientX;
      }}
      onPointerMove={(e) => {
        if (last.current === null) return;
        const pos = vertical ? e.clientY : e.clientX;
        const d = pos - last.current;
        last.current = pos;
        game.nudgeAim(d * RAD_PER_PX * (vertical ? 1 : -1));
        setOffset((o) => o + d);
      }}
      onPointerUp={() => (last.current = null)}
      onPointerCancel={() => (last.current = null)}
      onKeyDown={(e) => {
        if (!e.key.startsWith('Arrow')) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') game.nudgeAim(-0.002);
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') game.nudgeAim(0.002);
      }}
    />
  );
}
