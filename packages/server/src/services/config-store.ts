import { CliProgram } from '@codeject/shared';
import { environment } from '../config/environment.js';
import { readJsonFile, writeJsonFile } from './file-system-store.js';

interface StoredConfig {
  apiKeyHash: string | null;
  cliPrograms: CliProgram[];
  remoteAccess: StoredRemoteAccessConfig;
}

export type TunnelLifecycleState = 'inactive' | 'starting' | 'active' | 'stopping' | 'error';

export interface StoredRemoteAccessConfig {
  autoStart: boolean;
  enabled: boolean;
  lastError: string | null;
  managedPid: number | null;
  startedAt: string | null;
  tunnelStatus: TunnelLifecycleState;
  tunnelUrl: string | null;
}

const defaultPrograms: CliProgram[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    command: 'claude',
    icon: '/assets/program-icons/claude.png',
    defaultWorkingDir: '~/projects',
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    command: 'codex',
    icon: '/assets/program-icons/codex.png',
    defaultWorkingDir: '~/projects',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    command: 'opencode',
    icon: '/assets/program-icons/opencode.png',
    defaultWorkingDir: '~/projects',
  },
];

const defaultConfig: StoredConfig = {
  apiKeyHash: null,
  cliPrograms: defaultPrograms,
  remoteAccess: {
    autoStart: false,
    enabled: false,
    lastError: null,
    managedPid: null,
    startedAt: null,
    tunnelStatus: 'inactive',
    tunnelUrl: null,
  },
};

export class ConfigStore {
  async read() {
    const stored = await readJsonFile<Partial<StoredConfig>>(environment.configFile, defaultConfig);
    return {
      apiKeyHash: stored.apiKeyHash ?? defaultConfig.apiKeyHash,
      cliPrograms: normalizePrograms(stored.cliPrograms),
      remoteAccess: {
        ...defaultConfig.remoteAccess,
        ...stored.remoteAccess,
      },
    };
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

  async getRemoteAccess() {
    const config = await this.read();
    return config.remoteAccess;
  }

  async setRemoteAccess(remoteAccess: Partial<StoredRemoteAccessConfig>) {
    const nextConfig = await this.update((config) => ({
      ...config,
      remoteAccess: { ...config.remoteAccess, ...remoteAccess },
    }));
    return nextConfig.remoteAccess;
  }
}

export const configStore = new ConfigStore();

function normalizePrograms(cliPrograms?: CliProgram[]) {
  if (!cliPrograms?.length) {
    return defaultConfig.cliPrograms;
  }

  return cliPrograms.map((program) => {
    if (program.id === 'claude-code') {
      return {
        ...program,
        name: 'Claude Code',
        command: program.command || 'claude',
        icon: normalizeKnownProgramIcon(program.icon, '/assets/program-icons/claude.png', [
          '/assets/program-icons/claude-code.svg',
        ]),
      };
    }

    if (program.id === 'codex') {
      return {
        ...program,
        name: 'OpenAI Codex',
        command: program.command || 'codex',
        icon: normalizeKnownProgramIcon(program.icon, '/assets/program-icons/codex.png', [
          '/assets/program-icons/openai-codex.png',
        ]),
      };
    }

    if (program.id === 'aider' && program.command === 'aider') {
      return {
        id: 'opencode',
        name: 'OpenCode',
        command: 'opencode',
        icon: '/assets/program-icons/opencode.png',
        defaultWorkingDir: program.defaultWorkingDir ?? '~/projects',
      };
    }

    return program;
  });
}

function normalizeKnownProgramIcon(
  icon: string | undefined,
  fallbackIcon: string,
  legacyIcons: string[] = []
) {
  if (!icon || legacyIcons.includes(icon) || /^[^\w/.-]/u.test(icon)) {
    return fallbackIcon;
  }

  return icon;
}
