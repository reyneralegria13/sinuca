import type { GameView } from '../game/GameController';
import { PLAYER_NAMES } from '../game/messages';

export function GameOverDialog({
  winner,
  onAgain,
  playerNames = PLAYER_NAMES,
}: {
  winner: GameView['winner'];
  onAgain(): void;
  playerNames?: readonly [string, string];
}) {
  if (!winner) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="over-title">
      <div className="sheet">
        <h2 id="over-title">{playerNames[winner.player]} venceu</h2>
        <p>{winner.text}</p>
        <button type="button" className="primary" onClick={onAgain} autoFocus>
          Jogar de novo
        </button>
      </div>
    </div>
  );
}
