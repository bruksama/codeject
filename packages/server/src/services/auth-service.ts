import crypto from 'node:crypto';
import { configStore } from './config-store.js';

function hashApiKey(apiKey: string) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

export class AuthService {
  async ensureApiKey() {
    const existingHash = await configStore.getApiKeyHash();
    if (existingHash) return null;
    return this.rotateApiKey();
  }

  async rotateApiKey() {
    const apiKey = `cjt_${crypto.randomBytes(24).toString('hex')}`;
    await configStore.setApiKeyHash(hashApiKey(apiKey));
    return apiKey;
  }

  async validateApiKey(apiKey: string) {
    const storedHash = await configStore.getApiKeyHash();
    if (!storedHash) return false;
    return crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(hashApiKey(apiKey)));
  }

  async hasApiKey() {
    return Boolean(await configStore.getApiKeyHash());
  }
}

export const authService = new AuthService();

