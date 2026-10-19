import type { GameView } from '../game/GameController';
import { PlayerCard } from './PlayerCard';

interface Props {
  view: GameView;
  muted: boolean;
  onNewGame(): void;
  onToggleSound(): void;
}

export function Hud({ view, muted, onNewGame, onToggleSound }: Props) {
  return (
    <header className="hud">
      <PlayerCard player={0} view={view} />
      <div className="hud-center">
        <div className="brand">
          SINUCA <b>8</b>
        </div>
        <div className="hud-buttons">
          <button type="button" onClick={onNewGame}>
            Nova partida
          </button>
          <button type="button" aria-pressed={muted} onClick={onToggleSound}>
            {muted ? 'Som: off' : 'Som: on'}
          </button>
        </div>
      </div>
      <PlayerCard player={1} view={view} />
    </header>
  );
}
