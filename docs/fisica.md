# Modelo físico

Unidades: milímetros, segundos e radianos. Passo fixo de 1 ms.

## Estado de cada bola

| Campo         | Significado                                                 |
| ------------- | ----------------------------------------------------------- |
| `x, y`        | Posição do centro                                           |
| `vx, vy`      | Velocidade do centro                                        |
| `ux, uy`      | Velocidade de superfície causada pelo giro horizontal (R·ω) |
| `side`        | Giro em torno do eixo vertical (efeito lateral)             |
| `orientation` | Matriz de rotação 3×3, usada para desenhar a bola girando   |

Quando `u = v` a bola rola sem deslizar. A diferença `v − u` é o deslize do ponto de contato.

## Atrito com o feltro

**Deslizando** (|v − u| > 0): o atrito de deslizamento μs·g age contra o deslize.

- o centro freia: Δv = −μs·g·Δt na direção do deslize;
- o giro muda: Δu = +5/2·μs·g·Δt (momento de inércia I = 2/5·m·R²).

O deslize zera depois que o centro perde 2/7 do deslize inicial; a partir daí a bola rola.

**Rolando:** resistência ao rolamento μr·g mais um amortecimento proporcional à velocidade, que representa as perdas no tecido.

| Parâmetro         | Valor    |
| ----------------- | -------- |
| μs (deslizamento) | 0,20     |
| μr (rolamento)    | 0,014    |
| Amortecimento     | 0,22 s⁻¹ |

## Impacto do taco

Batendo a uma altura b acima do centro:

```
ω = 5·v·b / (2·R²)   ⇒   u = R·ω = 2,5·v·(b/R)
```

- No centro (b = 0) a branca sai deslizando sem giro.
- Acima do centro, ganha giro para frente: depois do choque ela **segue**.
- Abaixo, giro para trás: depois do choque ela **volta**.
- O efeito lateral gera giro vertical e um pequeno desvio da direção (squirt).

O ponto de contato fica limitado a metade do raio, como num taco real (acima disso o taco escorrega).

## Colisão entre bolas

Massas iguais, choque instantâneo com restituição e = 0,94. Só a componente normal da velocidade é trocada.
O giro **não** muda no choque. Por isso a branca para num choque cheio sem giro, e o giro que ela carrega a acelera em seguida — é daí que surgem o "segue" e o "puxa".

## Tabelas

Cada tabela, inclusive os bicos das caçapas, é um segmento de reta tratado como cápsula de raio R.
No impacto:

- a componente normal é refletida com restituição 0,76;
- o efeito lateral vira velocidade tangente (muda o ângulo de saída) e perde parte do giro;
- o rolamento contra a tabela se inverte parcialmente.

## Caçapas

Cada caçapa tem uma garganta e uma direção. A bola cai quando o centro passa da garganta.
Como os bicos são segmentos reais, a bola pode bater no bico e não entrar.

## Linha de mira

`predictShot` traça a reta da branca e acha o primeiro contato:

- **bola:** raio contra círculos de raio 2R (a "bola fantasma");
- **tabela:** raio contra as cápsulas.

Para o contato com bola, a bola atingida sai na direção que liga os centros, e a branca na tangente (perpendicular), antes de considerar o giro.

## Testes

`packages/core/test/physics.test.ts` cobre a saída (todas as bolas param dentro da mesa e sem sobreposição), o segue e o puxa, a conversão de deslize em rolamento, o efeito lateral simétrico na tabela e as caçapas.
