'use client';

import { Suspense, useEffect, useId, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { AlertCircle, Check, Folder, Terminal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import InlineAlertBanner from '@/components/ui/inline-alert-banner';
import MobileActionButton from '@/components/ui/mobile-action-button';
import { MobileScreenHeader } from '@/components/ui/mobile-screen-header';
import ProgramIcon from '@/components/ui/program-icon';
import { useSessionApi } from '@/hooks/use-session-api';
import { useModalDialog } from '@/hooks/use-modal-dialog';
import { useAppStore } from '@/stores/useAppStore';
import { selectCliPrograms, selectSessions } from '@/stores/use-app-store-selectors';

interface CliProgramFormData {
  command: string;
  defaultWorkingDir: string;
  icon: string;
  name: string;
}

const PRESET_ICONS = [
  '🤖',
  '⚡',
  '🧠',
  '▶️',
  '🔧',
  '💡',
  '🚀',
  '🛠️',
  '⚙️',
  '🔬',
  '🎯',
  '💻',
  '🌟',
  '🔮',
  '🦾',
  '🧬',
  '📦',
  '🔑',
  '🌐',
  '🎨',
  '⚗️',
  '🔩',
  '💎',
  '🏗️',
] as const;

function EmojiPicker({
  onSelect,
  selected,
}: {
  onSelect: (emoji: string) => void;
  selected: string;
}) {
  return (
    <div className="grid grid-cols-6 gap-2 p-3 sm:grid-cols-8">
      {PRESET_ICONS.map((emoji) => (
        <button
          key={emoji}
          aria-label={`Select ${emoji} icon`}
          aria-pressed={selected === emoji}
          className={`emoji-option interactive-focus-ring mobile-touch-target flex h-11 w-11 items-center justify-center rounded-xl text-xl ${
            selected === emoji
              ? 'border border-purple-500/50 bg-purple-500/25'
              : 'border border-white/8 bg-white/4 hover:bg-white/10'
          }`}
          onClick={() => onSelect(emoji)}
          type="button"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

function DeleteConfirmModal({
  onCancel,
  onConfirm,
  programName,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  programName: string;
}) {
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
              <Trash2 size={18} className="text-red-400" />
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

function FormField({
  children,
  description,
  error,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  description?: string;
  error?: string;
  htmlFor: string;
  label: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-white/72" htmlFor={htmlFor}>
        {label}
      </label>
      {description ? <p className="mb-2 text-xs leading-5 text-white/42">{description}</p> : null}
      {children}
      <div className="field-support-text mt-1.5">
        {error ? (
          <p
            className="flex items-center gap-1.5 text-xs text-red-400"
            id={`${htmlFor}-message`}
            role="alert"
          >
            <AlertCircle size={12} />
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function CliProgramEditorPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-dvh items-center justify-center"
          style={{ background: '#08080f' }}
        />
      }
    >
      <CliProgramEditorContent />
    </Suspense>
  );
}

function CliProgramEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const programId = searchParams.get('id');
  const sessionApi = useSessionApi();
  const cliPrograms = useAppStore(selectCliPrograms);
  const sessions = useAppStore(selectSessions);
  const existingProgram = cliPrograms.find((program) => program.id === programId);
  const isEditing = Boolean(programId);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const {
    control,
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    reset,
    register,
    setValue,
  } = useForm<CliProgramFormData>({
    defaultValues: {
      command: existingProgram?.command || '',
      defaultWorkingDir: existingProgram?.defaultWorkingDir || '~/projects',
      icon: existingProgram?.icon || '/assets/program-icons/claude.png',
      name: existingProgram?.name || '',
    },
  });

  const commandValue = useWatch({ control, name: 'command' });
  const selectedIcon = useWatch({ control, name: 'icon' });
  const commandPreview = commandValue ? `${commandValue} --workspace ~/projects/my-app` : null;

  useEffect(() => {
    if (cliPrograms.length > 0) return;
    void sessionApi.loadCliPrograms().catch(() => undefined);
  }, [cliPrograms.length, sessionApi]);

  useEffect(() => {
    if (!existingProgram) return;
    reset({
      command: existingProgram.command,
      defaultWorkingDir: existingProgram.defaultWorkingDir || '~/projects',
      icon: existingProgram.icon,
      name: existingProgram.name,
    });
  }, [existingProgram, reset]);

  const onSubmit = async (data: CliProgramFormData) => {
    try {
      await sessionApi.saveCliProgram({
        command: data.command,
        defaultWorkingDir: data.defaultWorkingDir,
        icon: data.icon,
        id: existingProgram?.id,
        name: data.name,
      });
      toast.success(isEditing ? `${data.name} updated` : `${data.name} added to CLI programs`);
      router.back();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save program');
    }
  };

  const handleDelete = async () => {
    if (!existingProgram) return;

    try {
      await sessionApi.deleteCliProgram(existingProgram.id);
      setShowDeleteModal(false);
      toast.success(`${existingProgram.name} removed`);
      router.back();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete program');
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#08080f]">
      <MobileScreenHeader
        onBack={() => router.back()}
        rightActions={
          isEditing && isDirty ? (
            <MobileActionButton
              form="cli-program-form"
              label="Save program"
              size="sm"
              type="submit"
            >
              Save
            </MobileActionButton>
          ) : undefined
        }
        subtitle="Saved presets keep new-session setup short and consistent."
        title={isEditing ? 'Edit Program' : 'Add CLI Program'}
      />

      <main className="flex-1 overflow-y-auto" id="main-content" tabIndex={-1}>
        <form
          className="space-y-6 px-4 pb-8 pt-3"
          id="cli-program-form"
          onSubmit={handleSubmit(onSubmit)}
        >
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
                onClick={() => setShowEmojiPicker((current) => !current)}
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
                <EmojiPicker
                  onSelect={(emoji) => {
                    setValue('icon', emoji);
                    setShowEmojiPicker(false);
                  }}
                  selected={selectedIcon}
                />
              </div>
            ) : null}
          </div>

          <FormField
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
          </FormField>

          <FormField
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
          </FormField>

          {commandPreview ? (
            <div
              className="fade-in rounded-xl px-4 py-3"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="mb-1.5 text-[0.625rem] font-semibold uppercase tracking-widest text-white/25">
                Preview
              </p>
              <code className="break-all text-xs font-mono leading-relaxed text-green-400/80">
                $ {commandPreview}
              </code>
            </div>
          ) : null}

          <FormField
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
          </FormField>

          {isEditing && existingProgram ? (
            <div
              className="fade-in rounded-2xl p-4"
              style={{
                background: 'rgba(124,58,237,0.05)',
                border: '1px solid rgba(124,58,237,0.15)',
              }}
            >
              <p className="mb-3 text-[0.625rem] font-semibold uppercase tracking-widest text-purple-400/50">
                Program Info
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/45">ID</span>
                  <code className="text-xs text-white/42">{existingProgram.id}</code>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/45">Sessions using this preset</span>
                  <span className="text-white/68">
                    {
                      sessions.filter((session) => session.cliProgram.id === existingProgram.id)
                        .length
                    }
                  </span>
                </div>
              </div>
            </div>
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
              <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>{isEditing ? 'Saving…' : 'Adding Program…'}</span>
            </>
          ) : (
            <>
              <Check size={16} strokeWidth={2.5} />
              <span>{isEditing ? 'Save Changes' : 'Add CLI Program'}</span>
            </>
          )}
        </button>

        {isEditing ? (
          <button
            className="interactive-focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500/8 py-3.5 text-sm font-semibold text-red-400 transition-all duration-150 active:scale-[0.98]"
            onClick={() => setShowDeleteModal(true)}
            style={{ border: '1px solid rgba(239,68,68,0.2)' }}
            type="button"
          >
            <Trash2 size={15} />
            <span>Delete Program</span>
          </button>
        ) : null}
      </div>

      {showDeleteModal && existingProgram ? (
        <DeleteConfirmModal
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={() => void handleDelete()}
          programName={existingProgram.name}
        />
      ) : null}
    </div>
  );
}
