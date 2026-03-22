'use client';

import { Check, Trash2 } from 'lucide-react';

interface CliProgramEditorSubmitBarProps {
  isEditing: boolean;
  isSubmitting: boolean;
  onDelete: () => void;
  showDeleteAction: boolean;
}

export function CliProgramEditorSubmitBar({
  isEditing,
  isSubmitting,
  onDelete,
  showDeleteAction,
}: CliProgramEditorSubmitBarProps) {
  return (
    <div
      className="space-y-2.5 px-4 py-3"
      style={{
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        background: 'rgba(8,8,15,0.9)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <button
        className="accent-gradient accent-glow interactive-focus-ring flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        form="cli-program-form"
        type="submit"
      >
        {isSubmitting ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span>{isEditing ? 'Saving…' : 'Adding Program…'}</span>
          </>
        ) : (
          <>
            <Check size={16} strokeWidth={2.5} />
            <span>{isEditing ? 'Save Changes' : 'Add CLI Program'}</span>
          </>
        )}
      </button>

      {showDeleteAction ? (
        <button
          className="interactive-focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500/8 py-3.5 text-sm font-semibold text-red-400 transition-all duration-150 active:scale-[0.98]"
          onClick={onDelete}
          style={{ border: '1px solid rgba(239,68,68,0.2)' }}
          type="button"
        >
          <Trash2 size={15} />
          <span>Delete Program</span>
        </button>
      ) : null}
    </div>
  );
}
