'use client';

import { Folder, Terminal } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { type FieldErrors, type UseFormRegister } from 'react-hook-form';
import InlineAlertBanner from '@/components/ui/inline-alert-banner';
import ProgramIcon from '@/components/ui/program-icon';
import { CliProgramCommandPreview } from './cli-program-command-preview';
import { CliProgramEmojiPicker } from './cli-program-emoji-picker';
import { CliProgramEditorProgramInfoCard } from './cli-program-editor-program-info-card';
import { CliProgramEditorSubmitBar } from './cli-program-editor-submit-bar';
import { CliProgramFormField } from './cli-program-form-field';
import type { CliProgramFormData } from './cli-program-form-types';
interface CliProgramEditorFormProps {
  commandPreview: string | null;
  errors: FieldErrors<CliProgramFormData>;
  existingProgramId?: string;
  isEditing: boolean;
  isSubmitting: boolean;
  onDelete: () => void;
  onSelectIcon: (emoji: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onToggleEmojiPicker: () => void;
  register: UseFormRegister<CliProgramFormData>;
  selectedIcon: string;
  sessionsUsingCount: number;
  showDeleteAction: boolean;
  showEmojiPicker: boolean;
}

export function CliProgramEditorForm({
  commandPreview,
  errors,
  existingProgramId,
  isEditing,
  isSubmitting,
  onDelete,
  onSelectIcon,
  onSubmit,
  onToggleEmojiPicker,
  register,
  selectedIcon,
  sessionsUsingCount,
  showDeleteAction,
  showEmojiPicker,
}: CliProgramEditorFormProps) {
  return (
    <>
      <main className="flex-1 overflow-y-auto" id="main-content" tabIndex={-1}>
        <form className="space-y-6 px-4 pb-8 pt-3" id="cli-program-form" onSubmit={onSubmit}>
          <InlineAlertBanner
            message="Keep commands direct and readable. Shell operators stay blocked so saved presets cannot smuggle chained commands."
            title="Program safety"
          />
          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-widest text-purple-400/70">
              Icon
            </label>
            <div className="mb-3 flex items-center gap-4">
              <button
                aria-expanded={showEmojiPicker}
                aria-label="Change icon"
                className={`interactive-focus-ring mobile-touch-target flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-150 active:scale-95 ${
                  showEmojiPicker
                    ? 'border-purple-500/50 bg-purple-500/15'
                    : 'border border-white/10 bg-white/5 hover:bg-white/8'
                }`}
                onClick={onToggleEmojiPicker}
                type="button"
              >
                <ProgramIcon alt="Program icon" icon={selectedIcon} size={30} />
              </button>
              <div>
                <p className="text-sm font-medium text-white/72">Program Icon</p>
                <p className="mt-0.5 text-xs leading-5 text-white/42">
                  {showEmojiPicker ? 'Tap an emoji to select it.' : 'Tap to change the icon.'}
                </p>
              </div>
            </div>
            {showEmojiPicker ? (
              <div
                className="slide-up overflow-hidden rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
              >
                <CliProgramEmojiPicker onSelect={onSelectIcon} selected={selectedIcon} />
              </div>
            ) : null}
          </div>
          <CliProgramFormField
            description="How this program appears in session cards and the program picker."
            error={errors.name?.message}
            htmlFor="name"
            label="Display Name"
          >
            <input
              {...register('name', {
                maxLength: { message: 'Name must be under 32 characters', value: 32 },
                minLength: { message: 'Name must be at least 2 characters', value: 2 },
                required: 'Display name is required',
              })}
              aria-describedby="name-message"
              aria-invalid={Boolean(errors.name)}
              className="input-focus w-full rounded-xl px-4 py-3 text-sm text-white/84 placeholder:text-white/25 transition-all duration-200"
              id="name"
              placeholder="e.g. Claude Code"
              type="text"
            />
          </CliProgramFormField>
          <CliProgramFormField
            description="The executable must be available in PATH on the host machine."
            error={errors.command?.message}
            htmlFor="command"
            label="Command"
          >
            <div className="relative">
              <Terminal
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
                size={15}
              />
              <input
                {...register('command', {
                  pattern: {
                    message: 'Enter a valid command with no leading or trailing spaces',
                    value: /^[^\s]+(\s+[^\s]+)*$/,
                  },
                  required: 'Command is required',
                  validate: (value) =>
                    !value.includes(';') && !value.includes('&&') && !value.includes('|')
                      ? true
                      : 'Command cannot contain shell operators for security',
                })}
                aria-describedby="command-message"
                aria-invalid={Boolean(errors.command)}
                className="input-focus w-full rounded-xl py-3 pl-9 pr-4 text-sm font-mono text-white/84 placeholder:text-white/25 transition-all duration-200"
                id="command"
                placeholder="e.g. claude"
                type="text"
              />
            </div>
          </CliProgramFormField>
          {commandPreview ? <CliProgramCommandPreview commandPreview={commandPreview} /> : null}
          <CliProgramFormField
            description="Pre-filled when creating new sessions with this program."
            error={errors.defaultWorkingDir?.message}
            htmlFor="defaultWorkingDir"
            label="Default Working Directory"
          >
            <div className="relative">
              <Folder
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
                size={15}
              />
              <input
                {...register('defaultWorkingDir', {
                  validate: (value) =>
                    !value || value.startsWith('~') || value.startsWith('/')
                      ? true
                      : 'Path must start with ~ or /',
                })}
                aria-describedby="defaultWorkingDir-message"
                aria-invalid={Boolean(errors.defaultWorkingDir)}
                className="input-focus w-full rounded-xl py-3 pl-9 pr-4 text-sm font-mono text-white/84 placeholder:text-white/25 transition-all duration-200"
                id="defaultWorkingDir"
                placeholder="~/projects"
                type="text"
              />
            </div>
          </CliProgramFormField>
          {isEditing && existingProgramId ? (
            <CliProgramEditorProgramInfoCard
              programId={existingProgramId}
              sessionsUsingCount={sessionsUsingCount}
            />
          ) : null}
          {Object.keys(errors).length > 0 ? (
            <InlineAlertBanner
              message={`${Object.keys(errors).length} field(s) still need attention before this preset can be saved.`}
              title="Fix the highlighted fields"
              tone="warning"
            />
          ) : null}
        </form>
      </main>
      <CliProgramEditorSubmitBar
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onDelete={onDelete}
        showDeleteAction={showDeleteAction}
      />
    </>
  );
}
