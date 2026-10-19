# Como contribuir

## Fluxo

1. Crie uma branch a partir de `main`: `feat/nome-curto`, `fix/nome-curto`, `docs/...`.
2. Rode `npm run check` antes de abrir o pull request.
3. Abra o PR descrevendo o que mudou e como testar.

## Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/), validado pelo `commitlint`:

```
<tipo>(<escopo>): <descrição no imperativo>
```

**Tipos:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

**Escopos:** `core`, `physics`, `rules`, `web`, `render`, `ui`, `input`, `audio`, `docs`, `deps`, `ci`, `repo`.

Exemplos:

```
feat(physics): adiciona efeito massé
fix(rules): considera falta quando a branca salta da mesa
docs: explica o modelo de atrito
```

Para validar uma mensagem localmente: `echo "feat(core): exemplo" | npx commitlint`.

## Onde cada coisa mora

- Mudou como as bolas se movem? `packages/core/src/physics` e um teste em `packages/core/test/physics.test.ts`.
- Mudou uma regra? `packages/core/src/rules` e um teste em `rules.test.ts`.
- Mudou o visual da mesa? `apps/web/src/render`.
- Mudou um controle ou o placar? `apps/web/src/ui` e `apps/web/src/input`.

O núcleo não pode importar nada do navegador (DOM, Three.js, React). Isso mantém a física e as regras testáveis e reutilizáveis no servidor.

## Estilo

- TypeScript em modo `strict`.
- Prettier formata; ESLint aponta problemas. `npm run format` resolve a formatação.
- Unidades no núcleo: milímetros, segundos e radianos.
