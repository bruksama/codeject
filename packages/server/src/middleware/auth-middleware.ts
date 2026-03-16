import type { NextFunction, Request, Response } from 'express';
import { authService } from '../services/auth-service.js';

function getClientIp(headers: Request['headers'], remoteAddress?: string | null) {
  const forwardedFor = headers['x-forwarded-for'];
  const cfConnectingIp = headers['cf-connecting-ip'];
  const firstForwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const firstCf = Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
  return firstCf ?? firstForwarded?.split(',')[0]?.trim() ?? remoteAddress ?? '';
}

function isLoopbackAddress(ip: string) {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip === 'localhost'
  );
}

export function isLocalRequest(request: Request) {
  return isLoopbackAddress(getClientIp(request.headers, request.ip ?? request.socket.remoteAddress));
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

export function isLocalSocket(headers: NodeJS.Dict<string | string[]>, remoteAddress?: string | null) {
  return isLoopbackAddress(getClientIp(headers, remoteAddress));
}
