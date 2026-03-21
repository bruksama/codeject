'use client';

import { useId } from 'react';
import { Eye, X } from 'lucide-react';
import QrCodeGraphic from '@/components/ui/qr-code';
import { useModalDialog } from '@/hooks/use-modal-dialog';

interface RemoteAccessQrModalProps {
  onClose: () => void;
  tunnelUrl: string;
}

export default function RemoteAccessQrModal({ onClose, tunnelUrl }: RemoteAccessQrModalProps) {
  const titleId = useId();
  const messageId = useId();
  const { dialogRef, initialFocusRef } = useModalDialog<HTMLButtonElement>({ onClose });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 fade-in"
      onClick={onClose}
      role="presentation"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
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
        <div className="flex items-center justify-between border-b border-white/8 px-5 pb-4 pt-5">
          <h3 className="text-base font-semibold text-white/92" id={titleId}>
            Scan to Connect
          </h3>
          <button
            aria-label="Close QR modal"
            className="interactive-focus-ring mobile-touch-target flex h-10 w-10 items-center justify-center rounded-full bg-white/8"
            onClick={onClose}
            ref={initialFocusRef}
            type="button"
          >
            <X className="text-white/60" size={16} />
          </button>
        </div>
        <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
          <QrCodeGraphic value={tunnelUrl} />
          <p className="break-all text-sm font-medium text-white/72">{tunnelUrl}</p>
          <div
            className="flex w-full items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-left"
            id={messageId}
          >
            <Eye className="accent-text mt-0.5 shrink-0" size={14} />
            <p className="text-sm leading-6 text-white/58">
              QR shares only the public URL. Paste the bearer key separately on the remote device.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
