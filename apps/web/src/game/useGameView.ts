import { useSyncExternalStore } from 'react';
import type { GameController, GameView } from './GameController';

export function useGameView(game: GameController): GameView {
  return useSyncExternalStore(game.subscribe, game.getView);
}
