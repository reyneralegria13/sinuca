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
import { HelpDialog } from './ui/HelpDialog';
import { SettingsDialog } from './ui/SettingsDialog';
import { PLAYER_NAMES } from './game/messages';

export function App() {
  const sound = useMemo(() => new SoundEngine(), []);
  const game = useMemo(() => new GameController(sound), [sound]);
  const view = useGameView(game);
  const portrait = useIsPortrait();
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(sound.volume);
  const [panel, setPanel] = useState<'help' | 'sound' | null>(null);
  const openPanel = (next: typeof panel) => {
    game.setPaused(next !== null);
    setPanel(next);
  };

  useEffect(
    () => bindKeyboard(game, () => game.paused || view.winner !== null),
    [game, view.winner],
  );

  useEffect(() => {
    const unlock = () => void sound.unlock();
    window.addEventListener('keydown', unlock);
    return () => window.removeEventListener('keydown', unlock);
  }, [sound]);

  return (
    <div
      className={`app${portrait ? ' portrait' : ''}`}
      onPointerDownCapture={() => void sound.unlock()}
    >
      <Hud
        view={view}
        muted={muted}
        onNewGame={() => game.newGame()}
        onHelp={() => openPanel('help')}
        onSettings={() => openPanel('sound')}
        onToggleSound={() => {
          sound.muted = !sound.muted;
          setMuted(sound.muted);
        }}
      />
      <main className="stage">
        <div className="controls-left">
          <span className="label">Efeito</span>
          <SpinControl game={game} spin={view.spin} />
          <span className="label">Mira fina</span>
          <FineAim game={game} vertical={!portrait} />
        </div>
        <div className="table-area">
          <div className="table-heading">
            <span className="eyebrow">MESA 01</span>
            <span>Clube esmeralda</span>
          </div>
          <TableView game={game} onInteract={() => void sound.unlock()} />
          <div className="vignette" aria-hidden />
          {view.prompt && <div className="prompt">{view.prompt}</div>}
          <Toast toast={view.toast} />
        </div>
        <div className="controls-right">
          <span className="label">Força</span>
          <output className="power-value" aria-label="Força selecionada">
            {Math.round(view.power * 100)}
            <small>%</small>
          </output>
          <PowerBar game={game} power={view.power} vertical={!portrait} />
          <span className="control-hint">
            Puxe
            <br />e solte
          </span>
        </div>
      </main>
      <footer className="game-footer">
        <span className="game-status">
          <i />
          {view.phase === 'over'
            ? 'Partida encerrada'
            : view.phase === 'rolling'
              ? 'Bolas em movimento'
              : `Vez do ${PLAYER_NAMES[view.turn]}`}
        </span>
        <span className="keyboard-hint">
          <kbd>←</kbd>
          <kbd>→</kbd> mirar <span className="footer-divider" /> <kbd>Espaço</kbd> tacar
        </span>
        <span className="table-spec">8 bolas · Mesa de 9 pés</span>
      </footer>
      {panel === 'help' && <HelpDialog onClose={() => openPanel(null)} />}
      {panel === 'sound' && (
        <SettingsDialog
          sound={sound}
          volume={volume}
          onClose={() => openPanel(null)}
          onVolume={(value) => {
            sound.volume = value;
            sound.muted = false;
            setMuted(false);
            setVolume(value);
          }}
        />
      )}
      <GameOverDialog winner={view.winner} onAgain={() => game.newGame()} />
    </div>
  );
}
