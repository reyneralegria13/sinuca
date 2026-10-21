import { createServer } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import console from 'node:console';

// Executa a busca real e a física, sem abrir navegador nem iniciar servidor HTTP.
const server = await createServer({
  root: fileURLToPath(new URL('../', import.meta.url)),
  configFile: false,
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
});

try {
  const core = await server.ssrLoadModule('/packages/core/src/index.ts');
  const table = core.createTableGeometry(core.TABLE_9FT);
  const rows = [];
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const random = core.createRandom(2026);
    let balls = core.createRack(table, random);
    let match = core.createMatch(1);
    let fouls = 0;
    let pocketed = 0;
    let simulated = 0;
    let elapsed = 0;
    let shots = 0;
    // Autopartida curta: os dois lados usam o pipeline para exercitar transições reais.
    for (; shots < 8 && match.winner === null; shots++) {
      const start = performance.now();
      const plan = core.planComputerShot({
        balls,
        match,
        table,
        difficulty,
        seed: Math.floor(random() * 0x100000000),
      });
      elapsed += performance.now() - start;
      if (!plan) throw new Error('O pipeline não devolveu uma jogada.');
      if (plan.cuePosition) {
        const area = match.ballInHandKitchenOnly
          ? core.kitchenArea(table)
          : core.fullTableArea(table);
        if (!core.isValidPlacement(balls, table, plan.cuePosition, area))
          throw new Error('Posicionamento ilegal da branca.');
        Object.assign(balls[0], plan.cuePosition);
      }
      const recorder = new core.ShotRecorder(core.isOnEight(match, match.turn, balls));
      core.applyCueStrike(balls[0], plan.input);
      const sim = core.createSimulation(table, balls);
      core.simulateUntilRest(sim, recorder, 20);
      if (core.isMoving(balls)) throw new Error('A tacada não terminou no limite da simulação.');
      const result = core.resolveShot(
        { ...match, calledPocket: plan.calledPocket },
        recorder.record,
      );
      if (JSON.stringify(result.outcome) !== JSON.stringify(plan.predicted))
        throw new Error('Previsão e execução divergiram.');
      simulated += plan.stats.simulated;
      fouls += result.outcome.foul ? 1 : 0;
      pocketed += recorder.record.pocketed.filter((p) => p.ball !== 0 && p.ball !== 8).length;
      if (result.outcome.respotEight)
        core.placeBall(balls[8], balls, table, table.footSpot, {
          minX: table.footSpot.x,
          maxX: table.spec.length,
        });
      if (result.outcome.returnCueBall && !result.outcome.gameOver)
        core.placeBall(balls[0], balls, table, table.headSpot, core.fullTableArea(table));
      match = result.state;
      balls = core.cloneAiBalls(balls);
    }
    rows.push({
      difficulty,
      shots,
      simulations: simulated,
      pocketed,
      fouls,
      averageMs: Math.round(elapsed / shots),
      winner: match.winner,
    });
  }
  const report = {
    seed: 2026,
    description: 'Autopartida de até 8 tacadas por nível; não é uma estimativa de taxa de vitória.',
    results: rows,
  };
  await writeFile(
    new URL('../docs/ai-benchmark.json', import.meta.url),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.table(rows);
  console.log('Previsões conferidas contra a execução física. Relatório: docs/ai-benchmark.json');
} finally {
  await server.close();
}
