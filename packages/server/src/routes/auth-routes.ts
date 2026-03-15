import { Router } from 'express';
import { optionalLocalAuth } from '../middleware/auth-middleware.js';
import { authService } from '../services/auth-service.js';

export const authRoutes = Router();

authRoutes.get('/', async (_request, response) => {
  response.json({ configured: await authService.hasApiKey() });
});

authRoutes.post('/rotate', optionalLocalAuth, async (_request, response) => {
  const apiKey = await authService.rotateApiKey();
  response.status(201).json({ apiKey });
});
