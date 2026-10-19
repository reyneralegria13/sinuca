# Regras do 8 bolas

Implementadas em `packages/core/src/rules/eightBall.ts`.

## Saída

- A branca é posicionada atrás da linha de saída.
- É válida se alguma bola cair ou se pelo menos 4 bolas coloridas tocarem a tabela.
- Saída fraca é falta: o adversário recebe bola na mão.
- Se a bola 8 cair na saída, ela volta para a marca do pé da mesa.
- A mesa continua aberta depois da saída.

## Mesa aberta e grupos

- Com a mesa aberta, qualquer bola pode ser tocada primeiro, menos a 8.
- A primeira bola encaçapada numa tacada válida define o grupo: lisas (1 a 7) ou listradas (9 a 15).

## Continuar jogando

O jogador continua enquanto encaçapar bolas do próprio grupo numa tacada válida.

## Faltas

| Falta            | Situação                                                                           |
| ---------------- | ---------------------------------------------------------------------------------- |
| Branca na caçapa | A branca caiu                                                                      |
| Sem contato      | A branca não tocou nenhuma bola                                                    |
| Bola errada      | O primeiro toque não foi numa bola do próprio grupo (ou na 8, quando é a vez dela) |
| 8 na mesa aberta | Tocou a 8 primeiro com a mesa aberta                                               |
| Sem tabela       | Nenhuma bola caiu e nenhuma tocou a tabela depois do contato                       |
| Tempo            | A tacada não saiu em 30 segundos                                                   |

Toda falta passa a vez e dá **bola na mão** ao adversário, em qualquer ponto da mesa.

## Bola 8

- Depois de encaçapar todo o grupo, o jogador joga na 8 e precisa **cantar a caçapa** antes da tacada.
- **Vence** quem encaçapa a 8 na caçapa cantada, sem falta.
- **Perde** quem encaçapa a 8 antes de terminar o grupo, com falta (por exemplo, junto com a branca) ou em outra caçapa.
