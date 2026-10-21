import { planComputerShot, type AiSnapshot, type AiPlan } from '@sinuca/core';

export type ComputerResponse = { plan: AiPlan | null; error?: string };

self.onmessage = (event: MessageEvent<AiSnapshot>) => {
  try {
    self.postMessage({ plan: planComputerShot(event.data) } satisfies ComputerResponse);
  } catch {
    self.postMessage({
      plan: null,
      error: 'Não foi possível calcular a tacada.',
    } satisfies ComputerResponse);
  }
};
