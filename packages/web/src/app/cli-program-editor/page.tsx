'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { X, Terminal, Folder, AlertCircle, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/stores/useAppStore';
import { CliProgram } from '@/types';

interface CliProgramFormData {
  name: string;
  command: string;
  icon: string;
  defaultWorkingDir: string;
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
];

function EmojiPicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (emoji: string) => void;
}) {
  return (
    <div className="grid grid-cols-8 gap-2 p-1">
      {PRESET_ICONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className={`emoji-option w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
            selected === emoji
              ? 'bg-purple-500/25 border border-purple-500/50'
              : 'bg-white/4 border border-white/8 hover:bg-white/10'
          }`}
          aria-label={`Select ${emoji} icon`}
          aria-pressed={selected === emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// Delete confirm modal
function DeleteConfirmModal({
  programName,
  onConfirm,
  onCancel,
}: {
  programName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center pb-6 px-4 fade-in"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
    >
      <div
        className="w-full rounded-3xl overflow-hidden scale-in"
        style={{ background: 'rgba(15,15,26,0.98)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
              <Trash2 size={18} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white/90">Delete Program</h3>
              <p className="text-xs text-white/40 mt-0.5">This action cannot be undone</p>
            </div>
          </div>
          <p className="text-sm text-white/55 leading-relaxed">
            Remove <span className="text-white/80 font-medium">{programName}</span> from your CLI
            programs list? Existing sessions using this program will still be accessible.
          </p>
        </div>
        <div className="border-t border-white/8 flex">
          <button
            onClick={onCancel}
            className="flex-1 py-4 text-sm font-medium text-white/60 hover:bg-white/5 active:bg-white/10 transition-colors border-r border-white/8"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-4 text-sm font-semibold text-red-400 active:opacity-70 transition-opacity"
          >
            Delete Program
          </button>
        </div>
      </div>
    </div>
  );
}

// Field wrapper component
function FormField({
  label,
  sublabel,
  error,
  children,
}: {
  label: string;
  sublabel?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/70 mb-1.5">{label}</label>
      {sublabel && <p className="text-xs text-white/35 mb-2">{sublabel}</p>}
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1.5">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}

export default function CliProgramEditorPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-dvh flex items-center justify-center"
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

  const { cliPrograms, addCliProgram, updateCliProgram, deleteCliProgram } = useAppStore();

  const isEditing = !!programId;
  const existingProgram = cliPrograms.find((p) => p.id === programId);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(existingProgram?.icon || '🤖');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CliProgramFormData>({
    defaultValues: {
      name: existingProgram?.name || '',
      command: existingProgram?.command || '',
      icon: existingProgram?.icon || '🤖',
      defaultWorkingDir: existingProgram?.defaultWorkingDir || '~/projects',
    },
  });

  const commandValue = watch('command');

  useEffect(() => {
    setValue('icon', selectedIcon);
  }, [selectedIcon, setValue]);

  // BACKEND INTEGRATION: Validate that the command exists on the local machine
  const onSubmit = async (data: CliProgramFormData) => {
    if (isEditing && existingProgram) {
      updateCliProgram(existingProgram.id, {
        name: data.name,
        command: data.command,
        icon: data.icon,
        defaultWorkingDir: data.defaultWorkingDir,
      });
      toast.success(`${data.name} updated`);
    } else {
      const newProgram: CliProgram = {
        id: `program-${Date.now()}`,
        name: data.name,
        command: data.command,
        icon: data.icon,
        defaultWorkingDir: data.defaultWorkingDir,
      };
      addCliProgram(newProgram);
      toast.success(`${data.name} added to CLI programs`);
    }
    router.back();
  };

  const handleDelete = () => {
    if (!existingProgram) return;
    deleteCliProgram(existingProgram.id);
    setShowDeleteModal(false);
    toast.success(`${existingProgram.name} removed`);
    router.back();
  };

  // Command preview
  const commandPreview = commandValue ? `${commandValue} --workspace ~/projects/my-app` : null;

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: '#08080f', paddingTop: 'env(safe-area-inset-top, 44px)' }}
    >
      {/* Navbar */}
      <header
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 active:scale-90 transition-transform duration-150"
          aria-label="Go back"
        >
          <X size={18} className="text-white/70" />
        </button>
        <h1 className="text-base font-semibold text-white/90">
          {isEditing ? 'Edit Program' : 'Add CLI Program'}
        </h1>
        {/* Save shortcut for edit mode */}
        {isEditing && isDirty ? (
          <button
            form="cli-program-form"
            type="submit"
            className="text-sm font-semibold text-purple-400 active:opacity-70 transition-opacity"
          >
            Save
          </button>
        ) : (
          <div className="w-9" aria-hidden="true" />
        )}
      </header>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto">
        <form
          id="cli-program-form"
          onSubmit={handleSubmit(onSubmit)}
          className="px-4 pt-5 pb-8 space-y-6"
        >
          {/* Icon picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-purple-400/70 mb-3">
              Icon
            </label>

            {/* Current icon + toggle */}
            <div className="flex items-center gap-4 mb-3">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all duration-150 active:scale-95 ${
                  showEmojiPicker
                    ? 'border-purple-500/50 bg-purple-500/15'
                    : 'bg-white/5 border border-white/10 hover:bg-white/8'
                }`}
                style={{ border: showEmojiPicker ? '1px solid rgba(124,58,237,0.5)' : undefined }}
                aria-label="Change icon"
                aria-expanded={showEmojiPicker}
              >
                {selectedIcon}
              </button>
              <div>
                <p className="text-sm font-medium text-white/70">Program Icon</p>
                <p className="text-xs text-white/35 mt-0.5">
                  {showEmojiPicker ? 'Tap an emoji to select' : 'Tap to change'}
                </p>
              </div>
            </div>

            {/* Emoji grid */}
            {showEmojiPicker && (
              <div
                className="rounded-2xl overflow-hidden slide-up"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
              >
                <EmojiPicker
                  selected={selectedIcon}
                  onSelect={(emoji) => {
                    setSelectedIcon(emoji);
                    setValue('icon', emoji);
                    setShowEmojiPicker(false);
                  }}
                />
              </div>
            )}
          </div>

          {/* Name */}
          <FormField
            label="Display Name"
            sublabel="How this program appears in session cards and the program picker"
            error={errors.name?.message}
          >
            <input
              type="text"
              placeholder="e.g. Claude Code"
              className="w-full px-4 py-3 rounded-xl text-sm text-white/80 placeholder-white/25 input-focus transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
              }}
              {...register('name', {
                required: 'Display name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' },
                maxLength: { value: 32, message: 'Name must be under 32 characters' },
              })}
            />
          </FormField>

          {/* Command */}
          <FormField
            label="Command"
            sublabel="The executable to run. Must be available in PATH on the host machine."
            error={errors.command?.message}
          >
            <div className="relative">
              <Terminal
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
              />
              <input
                type="text"
                placeholder="e.g. claude"
                className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-white/80 placeholder-white/25 input-focus transition-all duration-200 font-mono"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
                {...register('command', {
                  required: 'Command is required',
                  pattern: {
                    value: /^[^\s]+(\s+[^\s]+)*$/,
                    message: 'Enter a valid command (no leading/trailing spaces)',
                  },
                  validate: (v) =>
                    !v.includes(';') && !v.includes('&&') && !v.includes('|')
                      ? true
                      : 'Command cannot contain shell operators for security',
                })}
              />
            </div>
          </FormField>

          {/* Command preview */}
          {commandPreview && (
            <div
              className="rounded-xl px-4 py-3 fade-in"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-[10px] uppercase tracking-widest font-semibold text-white/25 mb-1.5">
                Preview
              </p>
              <code className="text-xs font-mono text-green-400/80 leading-relaxed break-all">
                $ {commandPreview}
              </code>
            </div>
          )}

          {/* Default working directory */}
          <FormField
            label="Default Working Directory"
            sublabel="Pre-filled workspace path when creating new sessions with this program"
            error={errors.defaultWorkingDir?.message}
          >
            <div className="relative">
              <Folder
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
              />
              <input
                type="text"
                placeholder="~/projects"
                className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-white/80 placeholder-white/25 input-focus transition-all duration-200 font-mono"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
                {...register('defaultWorkingDir', {
                  validate: (v) =>
                    !v || v.startsWith('~') || v.startsWith('/')
                      ? true
                      : 'Path must start with ~ or /',
                })}
              />
            </div>
          </FormField>

          {/* Program info card (edit mode) */}
          {isEditing && existingProgram && (
            <div
              className="rounded-2xl p-4 fade-in"
              style={{
                background: 'rgba(124,58,237,0.05)',
                border: '1px solid rgba(124,58,237,0.15)',
              }}
            >
              <p className="text-[10px] uppercase tracking-widest font-semibold text-purple-400/50 mb-3">
                Program Info
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">ID</span>
                  <code className="text-xs font-mono text-white/35">{existingProgram.id}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Sessions using this</span>
                  <span className="text-xs text-white/60 font-medium">
                    {/* BACKEND INTEGRATION: Count sessions using this program */}
                    {
                      useAppStore
                        .getState()
                        .sessions.filter((s) => s.cliProgram.id === existingProgram.id).length
                    }{' '}
                    session(s)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Validation summary */}
          {Object.keys(errors).length > 0 && (
            <div
              className="rounded-xl px-4 py-3 flex items-start gap-2.5 fade-in"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">Fix the errors above</p>
                <p className="text-xs text-red-400/70 mt-0.5">
                  {Object.keys(errors).length} field(s) need attention
                </p>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Bottom action bar */}
      <div
        className="flex-shrink-0 px-4 py-3 space-y-2.5"
        style={{
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          background: 'rgba(8,8,15,0.9)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Save button */}
        <button
          type="submit"
          form="cli-program-form"
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl text-sm font-semibold text-white accent-gradient accent-glow active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{isEditing ? 'Saving…' : 'Adding Program…'}</span>
            </>
          ) : (
            <>
              <Check size={16} strokeWidth={2.5} />
              <span>{isEditing ? 'Save Changes' : 'Add CLI Program'}</span>
            </>
          )}
        </button>

        {/* Delete button (edit mode only) */}
        {isEditing && (
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold text-red-400 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <Trash2 size={15} />
            <span>Delete Program</span>
          </button>
        )}
      </div>

      {/* Delete confirm modal */}
      {showDeleteModal && existingProgram && (
        <DeleteConfirmModal
          programName={existingProgram.name}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}
