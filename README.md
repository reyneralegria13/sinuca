# Sinuca 8 Bolas

Jogo de sinuca 8 bolas para navegador e celular, com mesa em 3D, física realista e regras completas.
Feito em TypeScript, com o núcleo do jogo (física e regras) separado da interface.

## Destaques

- **Física de verdade:** a bola desliza e depois rola, com atrito do feltro, perdas nas tabelas e caçapas com bico. O efeito (em cima, embaixo e lateral) sai da própria física, sem truques.
- **Mesa em 3D:** feltro com trama, borrachas, trilho de madeira envernizada, diamantes de madrepérola, bolas com verniz e reflexo, sombras suaves de duas luminárias.
- **Regras do 8 bolas:** saída, mesa aberta, grupos, faltas, bola na mão, bola 8 cantada e tempo de tacada.
- **Contra o computador:** três dificuldades, cálculo em Web Worker, posicionamento da branca e escolha de caçapa para a 8. Também mantém o modo para dois jogadores no mesmo aparelho.
- **Medidas oficiais:** mesa de 9 pés (2540 × 1270 mm) e bola de 57,15 mm; também há mesas de 8 e 7 pés no núcleo.
- **Pronto para multijogador:** o núcleo não depende do navegador, então o mesmo código roda num servidor que valida as jogadas.

## Como rodar

Requisitos: Node.js 20 ou mais recente.

```bash
npm install
npm run dev        # abre o jogo em http://localhost:5173
```

Outros comandos:

| Comando                | O que faz                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `npm test`             | Roda os testes do núcleo (Vitest)                                                     |
| `npm run typecheck`    | Verifica os tipos de todos os pacotes                                                 |
| `npm run lint`         | ESLint                                                                                |
| `npm run format`       | Formata com Prettier                                                                  |
| `npm run check`        | Tipos, lint e testes de uma vez                                                       |
| `npm run ai:benchmark` | Executa autopartidas curtas dos três níveis e confere previsão versus execução física |
| `npm run build`        | Gera a versão de produção em `apps/web/dist`                                          |
| `npm run build:single` | Gera um único `index.html` autocontido em `apps/web/dist-single`                      |

## Como jogar

| Ação            | Toque / mouse                                         | Teclado                     |
| --------------- | ----------------------------------------------------- | --------------------------- |
| Mirar           | Arrastar na mesa                                      | Setas (Shift = mais rápido) |
| Ajuste fino     | Arrastar a faixa "Mira fina"                          | Setas                       |
| Força e tacada  | Puxar o taco na barra "Força" e soltar                | Segurar e soltar Espaço     |
| Efeito          | Tocar na bolinha branca e escolher o ponto de contato | —                           |
| Bola na mão     | Arrastar a branca                                     | —                           |
| Cantar a bola 8 | Tocar na caçapa                                       | —                           |

A linha de mira mostra a bola fantasma (onde a branca encosta), a direção da bola atingida e o desvio da branca. Um X vermelho indica que a bola mirada não pode ser tocada primeiro.

O jogo abre no modo contra o computador (nível médio). Em **Nova partida**, escolha **Contra o computador** e a dificuldade, ou **Dois jogadores**. O computador controla o segundo jogador e joga automaticamente quando chega sua vez.

## Estrutura

```
packages/core     física, geometria da mesa, regras e linha de mira (TypeScript puro, com testes)
apps/web          interface React + cena 3D em Three.js
docs/             arquitetura, modelo físico e regras
```

Detalhes em [docs/arquitetura.md](docs/arquitetura.md), [docs/fisica.md](docs/fisica.md) e [docs/regras.md](docs/regras.md).

Referências visuais, áudio e licenças em [docs/visual-e-audio.md](docs/visual-e-audio.md).

Pipeline e limites da IA em [docs/ia.md](docs/ia.md).

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md). Os commits seguem o padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/).

## Próximos passos

- Aprofundar a estratégia da IA com combinações, tabelas para encaçapar e busca de várias tacadas.
- Partidas online com servidor autoritativo e validação das tacadas.
- Câmera livre e replay da última tacada.

## Autoria

Reyner Alegria ([@reyneralegria13](https://github.com/reyneralegria13)).
