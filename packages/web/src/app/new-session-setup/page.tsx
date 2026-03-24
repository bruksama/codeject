'use client';

import { type ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { MobileScreenHeader } from '@/components/ui/mobile-screen-header';
import {
  CUSTOM_PROGRAM,
  type NewSessionFormData,
  generateSessionName,
} from '@/app/new-session-setup/new-session-form-types';
import { NewSessionSetupForm } from '@/app/new-session-setup/new-session-setup-form';
import { useSessionApi } from '@/hooks/use-session-api';
import { useAppStore } from '@/stores/useAppStore';
import { selectCliPrograms, selectSetActiveSession } from '@/stores/use-app-store-selectors';

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
    <div className="flex h-dvh flex-col overflow-hidden bg-[#08080f]">
      <MobileScreenHeader
        onBack={() => router.back()}
        subtitle="Choose a program, workspace, and readable session name."
        title="New Session"
      />

      <NewSessionSetupForm
        allPrograms={allPrograms}
        customCommand={customCommand}
        errors={errors}
        isCustom={isCustom}
        isSubmitting={isSubmitting}
        onPathChange={handlePathChange}
        onSelectProgram={(programId) => setValue('programId', programId)}
        onSubmit={handleSubmit(onSubmit)}
        register={register}
        selectedProgram={selectedProgram}
        selectedProgramId={selectedProgramId}
        sessionName={sessionName}
        workspacePath={workspacePath}
      />
    </div>
  );
}
