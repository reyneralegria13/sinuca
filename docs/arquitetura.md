# Arquitetura

O projeto é um monorepo com npm workspaces:

```
packages/core   @sinuca/core  — lógica do jogo, sem dependências
apps/web        @sinuca/web   — interface e renderização
```

## Núcleo (`packages/core`)

Tudo o que define o jogo, independente de tela:

| Módulo           | Responsabilidade                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `constants.ts`   | Medidas da bola, parâmetros físicos e do taco, passo da simulação                             |
| `ball.ts`        | Estado de uma bola (posição, velocidade, giro, orientação) e grupos                           |
| `table/`         | Especificações de mesa (9, 8 e 7 pés) e geração da geometria: tabelas, bicos, caçapas, marcas |
| `rack.ts`        | Montagem do triângulo                                                                         |
| `placement.ts`   | Validação e busca de posição livre (bola na mão, recolocar a 8)                               |
| `physics/`       | Atrito, colisões, caçapas, orientação 3D, impacto do taco e laço da simulação                 |
| `aim/predict.ts` | Linha de mira: primeiro contato, bola fantasma e direções                                     |
| `rules/`         | Regras do 8 bolas como funções puras e o gravador da tacada                                   |
| `math/`          | Vetores, matriz de rotação, gerador aleatório com semente                                     |

Princípios:

- **Funções puras nas regras.** `resolveShot(estado, registroDaTacada)` devolve o novo estado e o resultado. Fácil de testar e de rodar num servidor.
- **Passo fixo de 1 ms na física.** A simulação é determinística para a mesma entrada e a mesma semente.
- **Eventos.** A simulação avisa contatos e caçapas por `SimulationEvents`; regras (via `ShotRecorder`), sons e animações escutam sem acoplamento.

## Aplicação web (`apps/web`)

| Pasta     | Responsabilidade                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------ |
| `game/`   | `GameController`: liga simulação, regras, relógio, mira e sons. Expõe um `GameView` para o React |
| `render/` | Cena Three.js: materiais, texturas procedurais, mesa, bolas, taco, linha de mira                 |
| `input/`  | Toque/mouse na mesa e teclado                                                                    |
| `audio/`  | Amostras CC0 com Web Audio, intensidade por impacto, panorama, volume e fallback sintetizado     |
| `ui/`     | Componentes React: placar, força, mira fina, efeito, avisos                                      |
| `styles/` | Tokens de design e estilos                                                                       |

Fluxo por quadro:

```
requestAnimationFrame
  └─ GameController.tick(dt)    física em passos fixos, relógio, animação de queda
  └─ SceneRenderer.render()     lê bolas, mira e força direto do controller e desenha
React só renderiza quando o GameView muda (placar, avisos, força, efeito).
```

### Coordenadas

O núcleo usa milímetros com x ao longo do comprimento, y ao longo da largura e z para cima.
Na cena 3D o grupo da mesa usa as mesmas medidas, com y da mesa em Z e a altura em Y.
Essa troca de eixos é aplicada também na rotação das bolas (`render/coords.ts`).

## Caminho para o multijogador

O cliente envia só a intenção da tacada (`ShotInput`: ângulo, força, efeito). O servidor:

1. valida a vez, o tempo e os limites dos valores;
2. roda `applyCueStrike` + `simulateUntilRest` com o mesmo núcleo;
3. aplica `resolveShot` e devolve o resultado oficial.

O cliente apenas anima. Como o resultado é decidido no servidor, alterar o código do navegador não muda o placar.
