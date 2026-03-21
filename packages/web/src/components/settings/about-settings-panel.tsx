'use client';

import { FileText, Github, Info } from 'lucide-react';
import { toast } from 'sonner';
import SettingsGroup from '@/components/ui/SettingsGroup';
import SettingsItem from '@/components/ui/SettingsItem';

const APP_VERSION = '1.1.0';
const GITHUB_REPOSITORY_URL = 'https://github.com/bruksama/codeject';
const GITHUB_REPOSITORY_LABEL = 'github.com/bruksama/codeject';

export function AboutSettingsPanel() {
  return (
    <div className="space-y-5 px-4 pb-8 pt-4">
      <div className="glass-card rounded-[28px] border border-white/10 p-5">
        <p className="text-sm font-semibold text-white/92">Codeject</p>
        <p className="mt-2 text-sm leading-6 text-white/55">
          Mobile-first control surface for local CLI coding assistants, tuned for monitoring and
          steering long-running sessions from a phone.
        </p>
      </div>

      <SettingsGroup title="About">
        <SettingsItem
          icon={<Info className="accent-text" size={16} />}
          label="Version"
          showDivider
          type="value"
          value={APP_VERSION}
        />
        <SettingsItem
          icon={<Github className="accent-text" size={16} />}
          label="GitHub Repository"
          onClick={() => window.open(GITHUB_REPOSITORY_URL, '_blank', 'noopener,noreferrer')}
          showDivider
          sublabel={GITHUB_REPOSITORY_LABEL}
          type="disclosure"
        />
        <SettingsItem
          icon={<FileText className="accent-text" size={16} />}
          label="Licenses"
          onClick={() => toast.info('Open source licenses')}
          showDivider
          type="disclosure"
        />
        <SettingsItem
          icon={<FileText className="accent-text" size={16} />}
          label="Privacy Policy"
          onClick={() => toast.info('Privacy policy')}
          showDivider={false}
          type="disclosure"
        />
      </SettingsGroup>
    </div>
  );
}
