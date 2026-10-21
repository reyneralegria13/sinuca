import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMatch,
  createRack,
  createRandom,
  createTableGeometry,
  TABLE_9FT,
  type AiSnapshot,
} from '@sinuca/core';

const workers = vi.hoisted(
  () =>
    [] as {
      onmessage?: (event: { data: unknown }) => void;
      onerror?: () => void;
      onmessageerror?: () => void;
      postMessage: ReturnType<typeof vi.fn>;
      terminate: ReturnType<typeof vi.fn>;
    }[],
);

vi.mock('../src/ai/computer.worker?worker&inline', () => ({
  default: class {
    postMessage = vi.fn();
    terminate = vi.fn();
    constructor() {
      workers.push(this);
    }
  },
}));

import { createComputerTask } from '../src/ai/workerClient';

function snapshot(): AiSnapshot {
  const table = createTableGeometry(TABLE_9FT);
  return {
    table,
    balls: createRack(table, createRandom(4)),
    match: createMatch(1),
    difficulty: 'medium',
    seed: 2,
  };
}

beforeEach(() => {
  workers.length = 0;
});

describe('ciclo de vida do worker', () => {
  it('envia o snapshot, recebe a resposta e encerra o worker', async () => {
    const state = snapshot();
    const task = createComputerTask(state);
    expect(workers[0].postMessage).toHaveBeenCalledWith(state);
    workers[0].onmessage!({ data: { plan: null } });
    await expect(task.result).resolves.toBeNull();
    expect(workers[0].terminate).toHaveBeenCalledOnce();
  });

  it('rejeita a busca cancelada e libera o worker', async () => {
    const task = createComputerTask(snapshot());
    const result = expect(task.result).rejects.toThrow('cancelada');
    task.cancel();
    await result;
    expect(workers[0].terminate).toHaveBeenCalledOnce();
  });

  it('propaga falhas para a recuperação do controlador', async () => {
    const task = createComputerTask(snapshot());
    const result = expect(task.result).rejects.toThrow('Falha no worker');
    workers[0].onerror!();
    await result;
    expect(workers[0].terminate).toHaveBeenCalledOnce();
  });
});
