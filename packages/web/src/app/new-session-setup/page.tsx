'use client';

import { type ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { AlertCircle, Check, Folder, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import InlineAlertBanner from '@/components/ui/inline-alert-banner';
import { MobileScreenHeader } from '@/components/ui/mobile-screen-header';
import ProgramIcon from '@/components/ui/program-icon';
import { useSessionApi } from '@/hooks/use-session-api';
import { useAppStore } from '@/stores/useAppStore';
import { selectCliPrograms, selectSetActiveSession } from '@/stores/use-app-store-selectors';
import type { CliProgram } from '@/types';

interface NewSessionFormData {
  customCommand: string;
  programId: string;
  sessionName: string;
  workspacePath: string;
}

function generateSessionName(path: string) {
  if (!path) return '';
  const parts = path.replace('~/', '').split('/');
  return parts[parts.length - 1] || parts[parts.length - 2] || 'new-session';
}

function ProgramOption({
  onSelect,
  program,
  selected,
}: {
  onSelect: () => void;
  program: CliProgram;
  selected: boolean;
}) {
  return (
    <button
      aria-pressed={selected}
      className={`interactive-focus-ring mobile-touch-target flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-all duration-150 active:scale-[0.98] ${
        selected
          ? 'border-purple-500/50 bg-purple-500/10'
          : 'border-white/8 bg-white/3 hover:bg-white/6'
      }`}
      onClick={onSelect}
      style={{
        border: `1px solid ${selected ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
      }}
      type="button"
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
        style={{
          background: selected ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${selected ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.1)'}`,
        }}
      >
        <ProgramIcon alt={program.name} icon={program.icon} size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white/92">{program.name}</p>
        <p className="mt-1 text-xs font-mono leading-5 text-white/45">{program.command}</p>
      </div>
      {selected ? (
        <div className="accent-gradient flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
          <Check size={13} className="text-white" strokeWidth={3} />
        </div>
      ) : null}
    </button>
  );
}

const CUSTOM_PROGRAM: CliProgram = {
  command: '',
  icon: '⌘',
  id: 'custom',
  name: 'Custom Command',
};

export default function NewSessionSetupPage() {
  const router = useRouter();
  const sessionApi = useSessionApi();
  const cliPrograms = useAppStore(selectCliPrograms);
  const setActiveSession = useAppStore(selectSetActiveSession);
  const allPrograms = [...cliPrograms, CUSTOM_PROGRAM];

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setValue,
  } = useForm<NewSessionFormData>({
    defaultValues: {
      customCommand: '',
      programId: cliPrograms[0]?.id || '',
      sessionName: '',
      workspacePath: '~/projects/',
    },
  });

  const selectedProgramId = useWatch({ control, name: 'programId' });
  const workspacePath = useWatch({ control, name: 'workspacePath' });
  const sessionName = useWatch({ control, name: 'sessionName' });
  const customCommand = useWatch({ control, name: 'customCommand' });
  const isCustom = selectedProgramId === 'custom';
  const selectedProgram = allPrograms.find((program) => program.id === selectedProgramId);

  useEffect(() => {
    if (cliPrograms.length > 0) return;
    void sessionApi.loadCliPrograms().catch(() => undefined);
  }, [cliPrograms.length, sessionApi]);

  useEffect(() => {
    if (cliPrograms.length > 0 && !selectedProgramId) {
      setValue('programId', cliPrograms[0].id);
    }
  }, [cliPrograms, selectedProgramId, setValue]);

  useEffect(() => {
    const generated = generateSessionName(workspacePath);
    if (generated && !sessionName) {
      setValue('sessionName', generated);
    }
  }, [sessionName, setValue, workspacePath]);

  const handlePathChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextPath = event.target.value;
    setValue('workspacePath', nextPath);
    const generated = generateSessionName(nextPath);
    if (generated) {
      setValue('sessionName', generated);
    }
  };

  const onSubmit = async (data: NewSessionFormData) => {
    const program = cliPrograms.find((item) => item.id === data.programId) || {
      ...CUSTOM_PROGRAM,
      command: data.customCommand,
    };

    try {
      const newSession = await sessionApi.createSession({
        cliProgram: program,
        name: data.sessionName || generateSessionName(data.workspacePath) || 'new-session',
        sessionOptions: { terminal: { cols: 120, rows: 32 } },
        workspacePath: data.workspacePath,
      });

      setActiveSession(newSession.id);
      toast.success(`Session "${newSession.name}" created`);
      router.push('/chat-interface');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create session');
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#08080f]">
      <MobileScreenHeader
        onBack={() => router.back()}
        subtitle="Choose a program, workspace, and readable session name."
        title="New Session"
      />

      <main className="flex-1 overflow-y-auto" id="main-content" tabIndex={-1}>
        <form
          className="space-y-6 px-4 pb-8 pt-3"
          id="new-session-form"
          onSubmit={handleSubmit(onSubmit)}
        >
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
                <ProgramOption
                  key={program.id}
                  onSelect={() => setValue('programId', program.id)}
                  program={program}
                  selected={selectedProgramId === program.id}
                />
              ))}
            </div>
          </div>

          {isCustom ? (
            <div className="slide-up">
              <label
                className="mb-1.5 block text-sm font-medium text-white/72"
                htmlFor="customCommand"
              >
                Command
              </label>
              <p className="mb-2 text-xs leading-5 text-white/42">
                The executable to run, for example{' '}
                <code className="text-purple-400/80">npx my-assistant</code>.
              </p>
              <div className="relative">
                <Terminal
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
                  size={15}
                />
                <input
                  {...register('customCommand', {
                    validate: (value) =>
                      !isCustom ||
                      Boolean(value.trim()) ||
                      'Command is required for custom programs',
                  })}
                  aria-describedby="customCommand-message"
                  aria-invalid={Boolean(errors.customCommand)}
                  className="input-focus w-full rounded-xl py-3 pl-9 pr-4 text-sm font-mono text-white/84 placeholder:text-white/25 transition-all duration-200"
                  id="customCommand"
                  placeholder="e.g. npx my-cli-assistant"
                  type="text"
                />
              </div>
              <div className="field-support-text mt-1.5">
                {errors.customCommand ? (
                  <p
                    className="flex items-center gap-1.5 text-xs text-red-400"
                    id="customCommand-message"
                    role="alert"
                  >
                    <AlertCircle size={12} />
                    {errors.customCommand.message}
                  </p>
                ) : null}
              </div>
            </div>
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
                onChange={handlePathChange}
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
            <div
              className="fade-in rounded-2xl p-4"
              style={{
                background: 'rgba(124,58,237,0.06)',
                border: '1px solid rgba(124,58,237,0.2)',
              }}
            >
              <p className="mb-3 text-[0.625rem] font-semibold uppercase tracking-widest text-purple-400/60">
                Session Preview
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-xl"
                  style={{
                    background: 'rgba(124,58,237,0.15)',
                    border: '1px solid rgba(124,58,237,0.25)',
                  }}
                >
                  <ProgramIcon alt={selectedProgram.name} icon={selectedProgram.icon} size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white/92">
                    {sessionName || generateSessionName(workspacePath) || 'new-session'}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs text-white/40">{workspacePath}</p>
                </div>
                <div className="status-pulse h-2.5 w-2.5 shrink-0 rounded-full bg-yellow-400" />
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-white/6 pt-3">
                <Terminal size={12} className="text-white/28" />
                <code className="text-xs text-white/48">
                  {isCustom ? customCommand || 'command…' : selectedProgram.command}
                </code>
              </div>
            </div>
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
              <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>Creating Session…</span>
            </>
          ) : (
            <span>Create Session</span>
          )}
        </button>
      </div>
    </div>
  );
}
