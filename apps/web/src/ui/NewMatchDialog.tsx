import { useState } from 'react';
import { AI_DIFFICULTIES, type AiDifficulty } from '@sinuca/core';
import type { GameMode, GameView } from '../game/GameController';
import { Dialog } from './Dialog';

export function NewMatchDialog({
  view,
  onStart,
  onClose,
}: {
  view: GameView;
  onStart(mode: GameMode, difficulty: AiDifficulty): void;
  onClose(): void;
}) {
  const [mode, setMode] = useState(view.mode);
  const [difficulty, setDifficulty] = useState(view.difficulty);
  return (
    <Dialog id="match-title" title="Quem joga com você?" onClose={onClose}>
      <p>Enfrente o computador ou chame alguém para a mesma mesa.</p>
      <div className="match-options" role="group" aria-label="Modo de jogo">
        <button
          className={mode === 'computer' ? 'selected' : ''}
          aria-pressed={mode === 'computer'}
          onClick={() => setMode('computer')}
        >
          <strong>Contra o computador</strong>
          <span>Um adversário pronto para jogar.</span>
        </button>
        <button
          className={mode === 'local' ? 'selected' : ''}
          aria-pressed={mode === 'local'}
          onClick={() => setMode('local')}
        >
          <strong>Dois jogadores</strong>
          <span>Alternem as tacadas neste aparelho.</span>
        </button>
      </div>
      {mode === 'computer' && (
        <>
          <span className="eyebrow">DIFICULDADE</span>
          <div className="difficulty-options" role="group" aria-label="Dificuldade do computador">
            {(Object.keys(AI_DIFFICULTIES) as AiDifficulty[]).map((level) => (
              <button
                key={level}
                className={difficulty === level ? 'selected' : ''}
                aria-pressed={difficulty === level}
                onClick={() => setDifficulty(level)}
              >
                {AI_DIFFICULTIES[level].label}
              </button>
            ))}
          </div>
          <p className="help-note">
            {difficulty === 'easy'
              ? 'Jogadas mais simples, com maior margem de erro.'
              : difficulty === 'medium'
                ? 'Mais alternativas de força e efeito para desafiar você.'
                : 'Busca mais ampla, com mira precisa e atenção à próxima posição.'}
          </p>
        </>
      )}
      <button className="primary" onClick={() => onStart(mode, difficulty)}>
        Começar partida
      </button>
    </Dialog>
  );
}
