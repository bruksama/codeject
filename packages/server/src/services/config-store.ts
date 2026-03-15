import { CliProgram } from '@codeject/shared';
import { environment } from '../config/environment.js';
import { readJsonFile, writeJsonFile } from './file-system-store.js';

interface StoredConfig {
  apiKeyHash: string | null;
  cliPrograms: CliProgram[];
}

const defaultPrograms: CliProgram[] = [
  { id: 'claude-code', name: 'Claude Code', command: 'claude', icon: '🤖', defaultWorkingDir: '~/projects' },
  { id: 'codex', name: 'OpenAI Codex', command: 'codex', icon: '⚡', defaultWorkingDir: '~/projects' },
  { id: 'aider', name: 'Aider', command: 'aider', icon: '🧠', defaultWorkingDir: '~/projects' },
];

const defaultConfig: StoredConfig = {
  apiKeyHash: null,
  cliPrograms: defaultPrograms,
};

export class ConfigStore {
  async read() {
    return readJsonFile(environment.configFile, defaultConfig);
  }

  async update(updater: (config: StoredConfig) => StoredConfig) {
    const nextConfig = updater(await this.read());
    await writeJsonFile(environment.configFile, nextConfig);
    return nextConfig;
  }

  async listPrograms() {
    const config = await this.read();
    return config.cliPrograms;
  }

  async savePrograms(cliPrograms: CliProgram[]) {
    await this.update((config) => ({ ...config, cliPrograms }));
    return cliPrograms;
  }

  async getApiKeyHash() {
    const config = await this.read();
    return config.apiKeyHash;
  }

  async setApiKeyHash(apiKeyHash: string | null) {
    await this.update((config) => ({ ...config, apiKeyHash }));
  }
}

export const configStore = new ConfigStore();

