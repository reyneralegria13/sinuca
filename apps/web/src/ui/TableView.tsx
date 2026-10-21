import { useEffect, useRef } from 'react';
import type { GameController } from '../game/GameController';
import { TablePointer } from '../input/TablePointer';
import { SceneRenderer } from '../render/SceneRenderer';

/** Monta a cena 3D e roda o laço do jogo (simulação + desenho) a cada quadro. */
export function TableView({ game, onInteract }: { game: GameController; onInteract(): void }) {
  const host = useRef<HTMLDivElement>(null);
  const interact = useRef(onInteract);
  interact.current = onInteract;

  useEffect(() => {
    const el = host.current!;
    const scene = new SceneRenderer(el, game);
    const pointer = new TablePointer(game, scene, () => interact.current());
    const fit = () => scene.resize(el.clientWidth, el.clientHeight);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();

    let raf = 0;
    let last = performance.now();
    const frame = (t: number) => {
      const dt = Math.max(0, Math.min(0.05, (t - last) / 1000));
      last = t;
      game.tick(dt);
      scene.render(t);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      pointer.dispose();
      scene.dispose();
    };
  }, [game]);

  return <div ref={host} className="table-host" aria-label="Mesa de sinuca" />;
}
