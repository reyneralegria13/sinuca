import type { GameView } from '../game/GameController';
import { PlayerCard } from './PlayerCard';
import { Icon } from './Icon';

interface Props {
  view: GameView;
  muted: boolean;
  onNewGame(): void;
  onToggleSound(): void;
  onHelp(): void;
  onSettings(): void;
}

export function Hud({ view, muted, onNewGame, onToggleSound, onHelp, onSettings }: Props) {
  return (
    <header className="hud">
      <div className="topbar">
        <div className="brand">
          <b>8</b>
          <span>
            SINUCA <em>CLUB</em>
          </span>
        </div>
        <span className="local-badge">
          <i /> Partida local · 2 jogadores
        </span>
        <div className="hud-buttons">
          <button
            type="button"
            className="icon-button"
            aria-label="Como jogar"
            title="Como jogar"
            onClick={onHelp}
          >
            <Icon name="help" />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Ajustar volume e ouvir sons"
            title="Ajustes de som"
            onClick={onSettings}
          >
            <Icon name="settings" />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={muted ? 'Ativar som' : 'Silenciar som'}
            title={muted ? 'Ativar som' : 'Silenciar som'}
            aria-pressed={muted}
            onClick={onToggleSound}
          >
            <Icon name={muted ? 'muted' : 'sound'} />
          </button>
          <button type="button" className="new-game" onClick={onNewGame}>
            <Icon name="restart" />
            <span>Nova partida</span>
          </button>
        </div>
      </div>
      <div className="scoreboard">
        <PlayerCard player={0} view={view} />
        <div className="match-center">
          <span className="eyebrow">8 BOLAS</span>
          <strong>VS</strong>
          <span>Mesa livre</span>
        </div>
        <PlayerCard player={1} view={view} />
      </div>
    </header>
  );
}
