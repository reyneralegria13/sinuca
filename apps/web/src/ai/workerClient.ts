import type { AiPlanner } from '@sinuca/core';
import ComputerWorker from './computer.worker?worker&inline';
import type { ComputerResponse } from './computer.worker';

/** Worker embutido: funciona também no HTML único, sem um arquivo externo de worker. */
export const createComputerTask: AiPlanner = (snapshot) => {
  const worker = new ComputerWorker();
  let rejectTask: (error: Error) => void;
  const result = new Promise<ComputerResponse['plan']>((resolve, reject) => {
    rejectTask = reject;
    worker.onmessage = (event: MessageEvent<ComputerResponse>) => {
      worker.terminate();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.plan);
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error('Falha no worker da IA.'));
    };
    worker.onmessageerror = () => {
      worker.terminate();
      reject(new Error('Resposta inválida da IA.'));
    };
    worker.postMessage(snapshot);
  });
  return {
    result,
    cancel: () => {
      worker.terminate();
      rejectTask(new Error('Busca cancelada.'));
    },
  };
};
