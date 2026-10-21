# Aparência e áudio

A direção visual usa um salão escuro, feltro esmeralda, madeira e um filete de latão. O placar separa a identidade do jogador, seu grupo e o tempo de tacada. A interface informa que a partida é local e oferece ajuda, volume e prévia dos quatro tipos de impacto.

## Referências consultadas

- [Brunswick Gold Crown VI](https://www.brunswickbilliards.com/products/gold-crown-vi-9-foot-pool-table): materiais e acabamento de mesas de salão. Apenas referência visual; nenhum modelo, marca ou imagem foi incorporado.
- [Miniclip — primeiros passos no 8 Ball Pool](https://support.miniclip.com/hc/en-us/articles/360020665798--How-to-start-playing-8-Ball-Pool): hierarquia do placar e controles de sinuca. A interface e os materiais do projeto são próprios.
- [Za-Games — billiard ball clack](https://freesound.org/people/Za-Games/sounds/539854/): gravação de bolas de sinuca em colisão, CC0.
- [Kenney — Impact Sounds](https://kenney.nl/assets/impact-sounds): foley CC0 adaptado para taco, borracha e caçapa.

As fontes e licenças dos arquivos incorporados estão em [CREDITS.md](../apps/web/src/audio/samples/CREDITS.md).

## Áudio

O Web Audio decodifica as amostras na primeira interação por toque ou teclado. Cada tipo de superfície tem filtro, duração e ganho próprios. A velocidade física controla a intensidade; a posição horizontal na mesa controla um panorama estéreo suave. Há pequenas variações de afinação para reduzir repetição, volume mestre e compressor para a saída. O panorama acompanha o eixo longo da mesa, inclusive quando a câmera gira no modo retrato.

Os contatos de cada quadro são agrupados por material, preservando o impacto mais forte. O limite de 24 vozes e a desconexão dos nós ao final impedem acúmulo de áudio. Se um formato não puder ser decodificado, um impacto sintetizado serve de fallback. O áudio nunca bloqueia o jogo.

Os sons são incorporados ao arquivo HTML no modo `build:single`. A compilação normal usa arquivos locais com hash; não consulta serviços externos para tocar os efeitos. A fonte tipográfica existente ainda é carregada pelo Google Fonts, com fontes do sistema como alternativa.

## Verificação

`npm run check` cobre tipos, lint, física, regras, mira e integração do controlador. Os testes de integração verificam pausa nos painéis, retomada, saída completa com áudio e falta por tempo. `npm run build` e `npm run build:single` verificam ambos os formatos de distribuição.

Verificação manual: abrir o jogo em desktop e celular, mirar, reposicionar a branca, carregar e soltar a força, escolher efeito, abrir/fechar a ajuda com Escape, ajustar volume e ouvir as quatro prévias. Confirmar que o relógio fica parado com um painel aberto e que Espaço e as setas não interferem nos botões e no volume.
