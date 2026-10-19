import { useEffect, useMemo, useState } from 'react';
import { SoundEngine } from './audio/SoundEngine';
import { GameController } from './game/GameController';
import { useGameView } from './game/useGameView';
import { useIsPortrait } from './game/useOrientation';
import { bindKeyboard } from './input/keyboard';
import { FineAim } from './ui/FineAim';
import { GameOverDialog } from './ui/GameOverDialog';
import { Hud } from './ui/Hud';
import { PowerBar } from './ui/PowerBar';
import { SpinControl } from './ui/SpinControl';
import { TableView } from './ui/TableView';
import { Toast } from './ui/Toast';

export function App() {
  const sound = useMemo(() => new SoundEngine(), []);
  const game = useMemo(() => new GameController(sound), [sound]);
  const view = useGameView(game);
  const portrait = useIsPortrait();
  const [muted, setMuted] = useState(false);

  useEffect(
    () => bindKeyboard(game, () => game.paused || view.winner !== null),
    [game, view.winner],
  );

  return (
    <div
      className={`app${portrait ? ' portrait' : ''}`}
      onPointerDownCapture={() => sound.unlock()}
    >
      <Hud
        view={view}
        muted={muted}
        onNewGame={() => game.newGame()}
        onToggleSound={() => {
          sound.muted = !sound.muted;
          setMuted(sound.muted);
        }}
      />
      <main className="stage">
        <div className="controls-left">
          <SpinControl game={game} spin={view.spin} />
          <span className="label">Mira fina</span>
          <FineAim game={game} vertical={!portrait} />
        </div>
        <div className="table-area">
          <TableView game={game} onInteract={() => sound.unlock()} />
          <div className="vignette" aria-hidden />
          {view.prompt && <div className="prompt">{view.prompt}</div>}
          <Toast toast={view.toast} />
        </div>
        <div className="controls-right">
          <span className="label">Força</span>
          <PowerBar game={game} power={view.power} vertical={!portrait} />
        </div>
      </main>
      <GameOverDialog winner={view.winner} onAgain={() => game.newGame()} />
    </div>
  );
}
