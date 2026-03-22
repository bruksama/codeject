'use client';

import { useId } from 'react';
import { Trash2 } from 'lucide-react';
import { useModalDialog } from '@/hooks/use-modal-dialog';

interface CliProgramDeleteConfirmModalProps {
  onCancel: () => void;
  onConfirm: () => void;
  programName: string;
}

export function CliProgramDeleteConfirmModal({
  onCancel,
  onConfirm,
  programName,
}: CliProgramDeleteConfirmModalProps) {
  const titleId = useId();
  const messageId = useId();
  const { dialogRef, initialFocusRef } = useModalDialog<HTMLButtonElement>({ onClose: onCancel });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 fade-in"
      onClick={onCancel}
      role="presentation"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
    >
      <div
        aria-describedby={messageId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full overflow-hidden rounded-3xl scale-in"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        style={{ background: 'rgba(15,15,26,0.98)', border: '1px solid rgba(255,255,255,0.12)' }}
        tabIndex={-1}
      >
        <div className="px-5 pb-4 pt-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15">
              <Trash2 className="text-red-400" size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white/92" id={titleId}>
                Delete Program
              </h2>
              <p className="mt-0.5 text-xs text-white/42">This action cannot be undone.</p>
            </div>
          </div>
          <p className="text-sm leading-6 text-white/55" id={messageId}>
            Remove <span className="font-medium text-white/82">{programName}</span> from the CLI
            program list? Existing sessions using it remain accessible.
          </p>
        </div>
        <div className="flex border-t border-white/8">
          <button
            className="interactive-focus-ring flex-1 border-r border-white/8 py-4 text-sm font-medium text-white/65"
            onClick={onCancel}
            ref={initialFocusRef}
            type="button"
          >
            Cancel
          </button>
          <button
            className="interactive-focus-ring flex-1 py-4 text-sm font-semibold text-red-400"
            onClick={onConfirm}
            type="button"
          >
            Delete Program
          </button>
        </div>
      </div>
    </div>
  );
}
