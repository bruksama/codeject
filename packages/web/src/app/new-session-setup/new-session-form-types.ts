import type { CliProgram } from '@/types';

export interface NewSessionFormData {
  customCommand: string;
  programId: string;
  sessionName: string;
  workspacePath: string;
}

export const CUSTOM_PROGRAM: CliProgram = {
  command: '',
  icon: '⌘',
  id: 'custom',
  name: 'Custom Command',
};

export function generateSessionName(path: string) {
  if (!path) return '';
  const parts = path.replace('~/', '').split('/');
  return parts[parts.length - 1] || parts[parts.length - 2] || 'new-session';
}
