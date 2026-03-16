'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { X, Folder, Terminal, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import ProgramIcon from '@/components/ui/program-icon';
import { useSessionApi } from '@/hooks/use-session-api';
import { useAppStore } from '@/stores/useAppStore';
import { CliProgram } from '@/types';

interface NewSessionFormData {
  programId: string;
  customCommand: string;
  workspacePath: string;
  sessionName: string;
}

function generateSessionName(path: string): string {
  if (!path) return '';
  const parts = path.replace('~/', '').split('/');
  return parts[parts.length - 1] || parts[parts.length - 2] || 'new-session';
}

function ProgramOption({
  program,
  selected,
  onSelect,
}: {
  program: CliProgram;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-3 p-3.5 rounded-xl w-full text-left transition-all duration-150 active:scale-[0.98] ${
        selected
          ? 'border-purple-500/50 bg-purple-500/10'
          : 'border-white/8 bg-white/3 hover:bg-white/6'
      }`}
      style={{
        border: `1px solid ${selected ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
      }}
      aria-pressed={selected}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{
          background: selected ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${selected ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.1)'}`,
        }}
      >
        <ProgramIcon alt={program.name} icon={program.icon} size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white/90">{program.name}</p>
        <p className="text-xs text-white/35 font-mono mt-0.5 truncate">{program.command}</p>
      </div>
      {selected && (
        <div className="w-5 h-5 rounded-full accent-gradient flex items-center justify-center flex-shrink-0">
          <Check size={12} className="text-white" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

const CUSTOM_PROGRAM: CliProgram = {
  id: 'custom',
  name: 'Custom Command',
  command: '',
  icon: '⌘',
};

export default function NewSessionSetupPage() {
  const router = useRouter();
  const sessionApi = useSessionApi();
  const { cliPrograms, setActiveSession } = useAppStore();

  const allPrograms = [...cliPrograms, CUSTOM_PROGRAM];

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NewSessionFormData>({
    defaultValues: {
      programId: cliPrograms[0]?.id || '',
      customCommand: '',
      workspacePath: '~/projects/',
      sessionName: '',
    },
  });

  const selectedProgramId = useWatch({ control, name: 'programId' });
  const workspacePath = useWatch({ control, name: 'workspacePath' });
  const sessionName = useWatch({ control, name: 'sessionName' });
  const customCommand = useWatch({ control, name: 'customCommand' });
  const isCustom = selectedProgramId === 'custom';

  // Auto-generate session name from path
  useEffect(() => {
    if (cliPrograms.length > 0) return;
    void sessionApi.loadCliPrograms().catch(() => undefined);
  }, [cliPrograms.length, sessionApi]);

  useEffect(() => {
    const generated = generateSessionName(workspacePath);
    if (generated && !sessionName) {
      setValue('sessionName', generated);
    }
  }, [workspacePath, sessionName, setValue]);

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue('workspacePath', val);
    const generated = generateSessionName(val);
    if (generated) setValue('sessionName', generated);
  };

  const onSubmit = async (data: NewSessionFormData) => {
    const program = cliPrograms.find((p) => p.id === data.programId) || {
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

  const selectedProgram = allPrograms.find((p) => p.id === selectedProgramId);

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: '#08080f', paddingTop: 'env(safe-area-inset-top, 44px)' }}
    >
      {/* Navbar */}
      <header
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 active:scale-90 transition-transform duration-150"
          aria-label="Cancel"
        >
          <X size={18} className="text-white/70" />
        </button>
        <h1 className="text-base font-semibold text-white/90">New Session</h1>
        <div className="w-9" aria-hidden="true" />
      </header>

      {/* Scrollable form body */}
      <div className="flex-1 overflow-y-auto">
        <form
          id="new-session-form"
          onSubmit={handleSubmit(onSubmit)}
          className="px-4 pt-5 pb-8 space-y-6"
        >
          {/* CLI Program selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-purple-400/70 mb-3">
              CLI Program
            </label>
            <div className="space-y-2">
              {allPrograms.map((program) => (
                <ProgramOption
                  key={program.id}
                  program={program}
                  selected={selectedProgramId === program.id}
                  onSelect={() => setValue('programId', program.id)}
                />
              ))}
            </div>
          </div>

          {/* Custom command (shown if custom selected) */}
          {isCustom && (
            <div className="slide-up">
              <label
                htmlFor="customCommand"
                className="block text-sm font-medium text-white/70 mb-1.5"
              >
                Command
              </label>
              <p className="text-xs text-white/35 mb-2">
                The full executable command to run, e.g.{' '}
                <code className="text-purple-400/80">npx my-assistant</code>
              </p>
              <div className="relative">
                <Terminal
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
                />
                <input
                  id="customCommand"
                  type="text"
                  placeholder="e.g. npx my-cli-assistant"
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-white/80 placeholder-white/25 input-focus transition-all duration-200 font-mono"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.09)',
                  }}
                  {...register('customCommand', {
                    validate: (v) =>
                      !isCustom || !!v.trim() || 'Command is required for custom programs',
                  })}
                />
              </div>
              {errors.customCommand && (
                <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  {errors.customCommand.message}
                </p>
              )}
            </div>
          )}

          {/* Workspace path */}
          <div>
            <label
              htmlFor="workspacePath"
              className="block text-sm font-medium text-white/70 mb-1.5"
            >
              Workspace Path
            </label>
            <p className="text-xs text-white/35 mb-2">
              The project directory the CLI assistant will work in
            </p>
            <div className="relative">
              <Folder
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
              />
              <input
                id="workspacePath"
                type="text"
                placeholder="~/projects/my-app"
                className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-white/80 placeholder-white/25 input-focus transition-all duration-200 font-mono"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
                {...register('workspacePath', {
                  required: 'Workspace path is required',
                  validate: (v) =>
                    v.startsWith('~') || v.startsWith('/') || 'Path must start with ~ or /',
                })}
                onChange={handlePathChange}
              />
            </div>
            {errors.workspacePath ? (
              <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircle size={12} />
                {errors.workspacePath.message}
              </p>
            ) : (
              workspacePath && (
                <p className="mt-1.5 text-xs text-white/25">Session will start in this directory</p>
              )
            )}
          </div>

          {/* Session name */}
          <div>
            <label htmlFor="sessionName" className="block text-sm font-medium text-white/70 mb-1.5">
              Session Name
              <span className="ml-2 text-[10px] font-normal text-white/30 normal-case tracking-normal">
                auto-generated
              </span>
            </label>
            <input
              id="sessionName"
              type="text"
              placeholder="my-project"
              className="w-full px-4 py-3 rounded-xl text-sm text-white/80 placeholder-white/25 input-focus transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
              }}
              {...register('sessionName', {
                required: 'Session name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' },
                maxLength: { value: 48, message: 'Name must be under 48 characters' },
                pattern: {
                  value: /^[a-zA-Z0-9_\-. ]+$/,
                  message: 'Only letters, numbers, hyphens, dots and spaces allowed',
                },
              })}
            />
            {errors.sessionName && (
              <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircle size={12} />
                {errors.sessionName.message}
              </p>
            )}
          </div>

          {/* Preview card */}
          {selectedProgram && workspacePath && (
            <div
              className="rounded-2xl p-4 fade-in"
              style={{
                background: 'rgba(124,58,237,0.06)',
                border: '1px solid rgba(124,58,237,0.2)',
              }}
            >
              <p className="text-[10px] uppercase tracking-widest font-semibold text-purple-400/60 mb-3">
                Session Preview
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{
                    background: 'rgba(124,58,237,0.15)',
                    border: '1px solid rgba(124,58,237,0.25)',
                  }}
                >
                  {selectedProgram.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white/90 truncate">
                    {sessionName || generateSessionName(workspacePath) || 'new-session'}
                  </p>
                  <p className="text-xs text-white/35 font-mono truncate mt-0.5">{workspacePath}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-yellow-400 status-pulse flex-shrink-0" />
              </div>
              <div className="mt-3 pt-3 border-t border-white/6 flex items-center gap-2">
                <Terminal size={12} className="text-white/25" />
                <code className="text-xs text-white/40 font-mono">
                  {isCustom ? customCommand || 'command…' : selectedProgram.command}
                </code>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Create button — sticky at bottom */}
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
          type="submit"
          form="new-session-form"
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl text-sm font-semibold text-white accent-gradient accent-glow active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Creating Session…</span>
            </>
          ) : (
            <>
              <span>{selectedProgram?.icon || '🚀'}</span>
              <span>Create Session</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
