import os from 'node:os';
import path from 'node:path';

export const cliTranscriptPaths = {
  claudeProjectsDir: path.join(os.homedir(), '.claude', 'projects'),
  codexSessionsDir: path.join(os.homedir(), '.codex', 'sessions'),
};

export function encodeWorkspacePath(workspacePath: string) {
  return workspacePath.replaceAll('/', '-');
}
