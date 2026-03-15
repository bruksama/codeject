import { Router } from 'express';
import { CliProgram } from '@codeject/shared';
import { v4 as uuidv4 } from 'uuid';
import { configStore } from '../services/config-store.js';

export const configRoutes = Router();

configRoutes.get('/programs', async (_request, response) => {
  response.json({ cliPrograms: await configStore.listPrograms() });
});

configRoutes.post('/programs', async (request, response) => {
  const payload = request.body as Partial<CliProgram>;
  const nextProgram: CliProgram = {
    id: payload.id ?? uuidv4(),
    name: payload.name ?? 'Custom CLI',
    command: payload.command ?? '',
    icon: payload.icon ?? '🛠️',
    defaultWorkingDir: payload.defaultWorkingDir,
  };
  const cliPrograms = [...(await configStore.listPrograms()), nextProgram];
  await configStore.savePrograms(cliPrograms);
  response.status(201).json({ cliProgram: nextProgram });
});

configRoutes.put('/programs/:programId', async (request, response) => {
  const cliPrograms = await configStore.listPrograms();
  const index = cliPrograms.findIndex((program) => program.id === request.params.programId);
  if (index === -1) {
    response.status(404).json({ error: 'CLI program not found' });
    return;
  }
  const nextProgram = { ...cliPrograms[index], ...(request.body as Partial<CliProgram>) };
  cliPrograms[index] = nextProgram;
  await configStore.savePrograms(cliPrograms);
  response.json({ cliProgram: nextProgram });
});

configRoutes.delete('/programs/:programId', async (request, response) => {
  const cliPrograms = await configStore.listPrograms();
  const filtered = cliPrograms.filter((program) => program.id !== request.params.programId);
  if (filtered.length === cliPrograms.length) {
    response.status(404).json({ error: 'CLI program not found' });
    return;
  }
  await configStore.savePrograms(filtered);
  response.status(204).send();
});

