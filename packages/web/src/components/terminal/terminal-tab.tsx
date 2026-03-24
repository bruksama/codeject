'use client';

import type { TerminalKey, TerminalSnapshot } from '@/types';
import { TerminalInputBar } from './terminal-input-bar';
import { TerminalSnapshotViewer } from './terminal-snapshot-viewer';
import { TerminalVirtualKeyboard } from './terminal-virtual-keyboard';

interface TerminalTabProps {
  disabled?: boolean;
  isActive?: boolean;
  onSendInput: (value: string) => boolean;
  onSendKey: (key: TerminalKey) => void;
  snapshot?: TerminalSnapshot;
}

export function TerminalTab({
  disabled = false,
  isActive = true,
  onSendInput,
  onSendKey,
  snapshot,
}: TerminalTabProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-white/6 px-3 py-2.5 text-xs text-white/45">
        <span>Terminal</span>
        <span>{snapshot ? `${snapshot.cols} x ${snapshot.rows}` : 'Awaiting snapshot'}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 py-3">
        <TerminalSnapshotViewer
          content={snapshot?.content ?? ''}
          isActive={isActive}
          seq={snapshot?.seq ?? 0}
        />
        <TerminalVirtualKeyboard disabled={disabled} onKey={onSendKey} />
      </div>
      <div
        className="shrink-0 border-t border-white/6 px-3 pt-2"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
      >
        <TerminalInputBar disabled={disabled} onSend={onSendInput} />
      </div>
    </div>
  );
}
