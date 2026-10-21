import { GROUP_BALLS, type PlayerIndex } from '@sinuca/core';
import type { GameView } from '../game/GameController';
import { GROUP_LABEL, PLAYER_NAMES } from '../game/messages';
import { BallChip } from './BallChip';

export function PlayerCard({ player, view }: { player: PlayerIndex; view: GameView }) {
  const group = view.groups[player];
  const active = view.winner === null && view.turn === player;
  const status = view.winner
    ? view.winner.player === player
      ? 'Vencedor'
      : '—'
    : group
      ? view.onEight[player]
        ? 'Na bola 8'
        : GROUP_LABEL[group]
      : 'Mesa aberta';
  const late = active && view.phase === 'aiming' && view.clock < 0.27;

  return (
    <section
      className={`player p${player}${active ? ' active' : ''}${late ? ' late' : ''}`}
      aria-label={PLAYER_NAMES[player]}
    >
      <div className="avatar">{player + 1}</div>
      <div className="name">
        {PLAYER_NAMES[player]}
        {active && (
          <span className="turn-badge">{view.phase === 'rolling' ? 'Em jogo' : 'Sua vez'}</span>
        )}
      </div>
      <div className="status">{status}</div>
      <div className="chips">
        {!group && <span className="open-table">Lisas ou listradas? A mesa está aberta.</span>}
        {group &&
          [...GROUP_BALLS[group], 8].map((id) => (
            <BallChip key={id} id={id} out={id === 8 ? !view.onEight[player] : !view.onTable[id]} />
          ))}
      </div>
      <div
        className="clock"
        role="timer"
        aria-label={`Tempo da tacada: ${active ? Math.ceil(view.clock * 30) : 0} segundos`}
      >
        <i style={{ transform: `scaleX(${active && view.phase === 'aiming' ? view.clock : 0})` }} />
      </div>
    </section>
  );
}
