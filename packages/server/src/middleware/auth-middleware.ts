import type { NextFunction, Request, Response } from 'express';
import { authService } from '../services/auth-service.js';

function isLocalRequest(request: Request) {
  const ip = request.ip ?? request.socket.remoteAddress ?? '';
  return ip.includes('127.0.0.1') || ip.includes('::1') || ip.includes('localhost');
}

export async function optionalLocalAuth(request: Request, response: Response, next: NextFunction) {
  if (isLocalRequest(request)) {
    next();
    return;
  }

  const header = request.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (token && (await authService.validateApiKey(token))) {
    next();
    return;
  }

  response.status(401).json({ error: 'Unauthorized' });
}

export function isLocalSocket(remoteAddress?: string | null) {
  const value = remoteAddress ?? '';
  return value.includes('127.0.0.1') || value.includes('::1');
}

