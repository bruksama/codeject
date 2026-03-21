'use client';

import { useId } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useModalDialog } from '@/hooks/use-modal-dialog';

interface SettingsConfirmModalProps {
  confirmLabel: string;
  destructive?: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}

export function SettingsConfirmModal({
  confirmLabel,
  destructive = false,
  message,
  onCancel,
  onConfirm,
  title,
}: SettingsConfirmModalProps) {
  const titleId = useId();
  const messageId = useId();
  const { dialogRef, initialFocusRef } = useModalDialog<HTMLButtonElement>({ onClose: onCancel });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 fade-in"
      onClick={onCancel}
      role="presentation"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)' }}
    >
      <div
        aria-describedby={messageId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full overflow-hidden rounded-3xl border border-white/12 bg-[rgba(15,15,26,0.98)] scale-in"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="px-5 pb-4 pt-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/15">
              <AlertTriangle className="text-red-300" size={18} />
            </div>
            <h3 className="text-base font-semibold text-white/92" id={titleId}>
              {title}
            </h3>
          </div>
          <p className="text-sm leading-6 text-white/60" id={messageId}>
            {message}
          </p>
        </div>
        <div className="flex border-t border-white/8">
          <button
            className="flex-1 border-r border-white/8 py-4 text-sm font-medium text-white/60 transition-colors hover:bg-white/5"
            onClick={onCancel}
            ref={initialFocusRef}
            type="button"
          >
            Cancel
          </button>
          <button
            className={`flex-1 py-4 text-sm font-semibold transition-opacity active:opacity-70 ${
              destructive ? 'text-red-300' : 'text-white'
            }`}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
