import type { Foul, GameOverReason, Group, PlayerIndex, ShotOutcome } from '@sinuca/core';

export const PLAYER_NAMES: readonly [string, string] = ['Jogador 1', 'Jogador 2'];

export const GROUP_LABEL: Record<Group, string> = {
  solids: 'Lisas · 1 a 7',
  stripes: 'Listradas · 9 a 15',
};

const GROUP_NAME: Record<Group, string> = { solids: 'lisas', stripes: 'listradas' };

export const FOUL_TEXT: Record<Foul, string> = {
  scratch: 'Bola branca na caçapa',
  'no-contact': 'A branca não tocou em nenhuma bola',
  'wrong-first-contact': 'Tocou primeiro na bola errada',
  'eight-first-on-open-table': 'Com a mesa aberta não pode tocar primeiro na 8',
  'no-cushion-after-contact': 'Nenhuma bola tocou a tabela depois do contato',
  'weak-break': 'Saída fraca: menos de 4 bolas tocaram a tabela',
  'shot-clock': 'Tempo esgotado',
};

export function gameOverText(reason: GameOverReason, winner: PlayerIndex): string {
  const loser = PLAYER_NAMES[winner === 0 ? 1 : 0];
  switch (reason) {
    case 'eight-pocketed-legally':
      return `${PLAYER_NAMES[winner]} encaçapou a bola 8 na caçapa cantada.`;
    case 'eight-pocketed-early':
      return `${loser} encaçapou a bola 8 antes de terminar o grupo.`;
    case 'eight-pocketed-with-foul':
      return `${loser} encaçapou a bola 8 cometendo falta.`;
    case 'eight-pocketed-wrong-pocket':
      return `${loser} encaçapou a bola 8 numa caçapa diferente da cantada.`;
  }
}

export type ToastTone = 'info' | 'foul' | 'success';

export function describeOutcome(
  outcome: ShotOutcome,
  nextTurn: PlayerIndex,
): { text: string; tone: ToastTone } {
  const shooter = PLAYER_NAMES[outcome.shooter];
  const next = PLAYER_NAMES[nextTurn];
  if (outcome.foul)
    return { text: `${FOUL_TEXT[outcome.foul]}. Bola na mão para o ${next}.`, tone: 'foul' };
  const parts: string[] = [];
  if (outcome.respotEight) parts.push('Bola 8 na saída: ela volta para a marca');
  if (outcome.groupAssigned)
    parts.push(`${shooter} fica com as ${GROUP_NAME[outcome.groupAssigned.group]}`);
  parts.push(outcome.continuesTurn ? `${shooter} continua` : `Vez do ${next}`);
  return { text: parts.join('. '), tone: outcome.groupAssigned ? 'success' : 'info' };
}
