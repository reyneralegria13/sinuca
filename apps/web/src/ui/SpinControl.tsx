import { useRef, useState } from 'react';
import type { Spin } from '@sinuca/core';
import type { GameController } from '../game/GameController';

const LIMIT = 0.8;

function CueBallFace({ spin, size, className }: { spin: Spin; size: number; className?: string }) {
  return (
    <span className={`cueface ${className ?? ''}`} style={{ width: size, height: size }}>
      <span
        className="cuedot"
        style={{ left: `${50 + spin.x * 38}%`, top: `${50 - spin.y * 38}%` }}
      />
    </span>
  );
}

/** Botão com a bola branca e o ponto de contato; abre um painel para escolher o efeito. */
export function SpinControl({ game, spin }: { game: GameController; spin: Spin }) {
  const [open, setOpen] = useState(false);
  const dragging = useRef(false);

  const setFrom = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    let x = ((e.clientX - r.left) / r.width) * 2 - 1;
    let y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    const l = Math.hypot(x, y);
    if (l > LIMIT) {
      x *= LIMIT / l;
      y *= LIMIT / l;
    }
    game.setSpin({ x: x / LIMIT, y: y / LIMIT });
  };

  const toggle = (v: boolean) => {
    setOpen(v);
    game.setPaused(v);
  };

  return (
    <>
      <button
        type="button"
        className="spin-button"
        aria-label="Escolher efeito na bola branca"
        onClick={() => toggle(true)}
      >
        <CueBallFace spin={spin} size={40} />
      </button>
      {open && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="spin-title"
          onClick={() => toggle(false)}
        >
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2 id="spin-title">Efeito</h2>
            <p>
              Toque onde o taco vai bater. Em cima a branca segue, embaixo ela puxa e nos lados muda
              o ângulo na tabela.
            </p>
            <div
              className="spin-pad"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                dragging.current = true;
                setFrom(e);
              }}
              onPointerMove={(e) => dragging.current && setFrom(e)}
              onPointerUp={() => (dragging.current = false)}
            >
              <CueBallFace spin={spin} size={200} className="big" />
            </div>
            <div className="row">
              <button type="button" onClick={() => game.setSpin({ x: 0, y: 0 })}>
                Centralizar
              </button>
              <button type="button" className="primary" onClick={() => toggle(false)}>
                Pronto
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
