'use client';

import { type ChangeEvent, type FormEventHandler } from 'react';
import { AlertCircle, Folder } from 'lucide-react';
import { type FieldErrors, type UseFormRegister } from 'react-hook-form';
import InlineAlertBanner from '@/components/ui/inline-alert-banner';
import type { CliProgram } from '@/types';
import { type NewSessionFormData } from './new-session-form-types';
import { NewSessionCustomCommandField } from './new-session-custom-command-field';
import { NewSessionPreviewCard } from './new-session-preview-card';
import { NewSessionProgramOption } from './new-session-program-option';

interface NewSessionSetupFormProps {
  allPrograms: CliProgram[];
  customCommand: string;
  errors: FieldErrors<NewSessionFormData>;
  isCustom: boolean;
  isSubmitting: boolean;
  onPathChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSelectProgram: (programId: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  register: UseFormRegister<NewSessionFormData>;
  selectedProgram?: CliProgram;
  selectedProgramId: string;
  sessionName: string;
  workspacePath: string;
}

export function NewSessionSetupForm({
  allPrograms,
  customCommand,
  errors,
  isCustom,
  isSubmitting,
  onPathChange,
  onSelectProgram,
  onSubmit,
  register,
  selectedProgram,
  selectedProgramId,
  sessionName,
  workspacePath,
}: NewSessionSetupFormProps) {
  return (
    <>
      <main className="flex-1 overflow-y-auto" id="main-content" tabIndex={-1}>
        <form className="space-y-6 px-4 pb-8 pt-3" id="new-session-form" onSubmit={onSubmit}>
          <InlineAlertBanner
            message="The session name auto-fills from the workspace path and stays editable. Inline errors stay next to each field."
            title="Faster mobile setup"
          />

          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-widest text-purple-400/70">
              CLI Program
            </label>
            <div className="space-y-2">
              {allPrograms.map((program) => (
                <NewSessionProgramOption
                  key={program.id}
                  onSelect={() => onSelectProgram(program.id)}
                  program={program}
                  selected={selectedProgramId === program.id}
                />
              ))}
            </div>
          </div>

          {isCustom ? (
            <NewSessionCustomCommandField errors={errors} isCustom={isCustom} register={register} />
          ) : null}

          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-white/72"
              htmlFor="workspacePath"
            >
              Workspace Path
            </label>
            <p className="mb-2 text-xs leading-5 text-white/42">
              The project directory the CLI assistant will work in.
            </p>
            <div className="relative">
              <Folder
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
                size={15}
              />
              <input
                {...register('workspacePath', {
                  required: 'Workspace path is required',
                  validate: (value) =>
                    value.startsWith('~') || value.startsWith('/') || 'Path must start with ~ or /',
                })}
                aria-describedby="workspacePath-message"
                aria-invalid={Boolean(errors.workspacePath)}
                className="input-focus w-full rounded-xl py-3 pl-9 pr-4 text-sm font-mono text-white/84 placeholder:text-white/25 transition-all duration-200"
                id="workspacePath"
                onChange={onPathChange}
                placeholder="~/projects/my-app"
                type="text"
              />
            </div>
            <div className="field-support-text mt-1.5">
              {errors.workspacePath ? (
                <p
                  className="flex items-center gap-1.5 text-xs text-red-400"
                  id="workspacePath-message"
                  role="alert"
                >
                  <AlertCircle size={12} />
                  {errors.workspacePath.message}
                </p>
              ) : workspacePath ? (
                <p className="text-xs text-white/30" id="workspacePath-message">
                  Session will start in this directory.
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/72" htmlFor="sessionName">
              Session Name
              <span className="ml-2 text-[0.625rem] font-normal text-white/30">auto-generated</span>
            </label>
            <input
              {...register('sessionName', {
                maxLength: { message: 'Name must be under 48 characters', value: 48 },
                minLength: { message: 'Name must be at least 2 characters', value: 2 },
                pattern: {
                  message: 'Only letters, numbers, hyphens, dots, and spaces allowed',
                  value: /^[a-zA-Z0-9_\-. ]+$/,
                },
                required: 'Session name is required',
              })}
              aria-describedby="sessionName-message"
              aria-invalid={Boolean(errors.sessionName)}
              className="input-focus w-full rounded-xl px-4 py-3 text-sm text-white/84 placeholder:text-white/25 transition-all duration-200"
              id="sessionName"
              placeholder="my-project"
              type="text"
            />
            <div className="field-support-text mt-1.5">
              {errors.sessionName ? (
                <p
                  className="flex items-center gap-1.5 text-xs text-red-400"
                  id="sessionName-message"
                  role="alert"
                >
                  <AlertCircle size={12} />
                  {errors.sessionName.message}
                </p>
              ) : null}
            </div>
          </div>

          {selectedProgram && workspacePath ? (
            <NewSessionPreviewCard
              customCommand={customCommand}
              isCustom={isCustom}
              selectedProgram={selectedProgram}
              sessionName={sessionName}
              workspacePath={workspacePath}
            />
          ) : null}
        </form>
      </main>

      <div
        className="flex-shrink-0 px-4 py-3"
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
          form="new-session-form"
          type="submit"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span>Creating Session…</span>
            </>
          ) : (
            <span>Create Session</span>
          )}
        </button>
      </div>
    </>
  );
}
