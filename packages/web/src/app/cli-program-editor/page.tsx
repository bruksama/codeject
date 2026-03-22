'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import MobileActionButton from '@/components/ui/mobile-action-button';
import { MobileScreenHeader } from '@/components/ui/mobile-screen-header';
import { CliProgramDeleteConfirmModal } from '@/app/cli-program-editor/cli-program-delete-confirm-modal';
import { CliProgramEditorForm } from '@/app/cli-program-editor/cli-program-editor-form';
import type { CliProgramFormData } from '@/app/cli-program-editor/cli-program-form-types';
import { useSessionApi } from '@/hooks/use-session-api';
import { useAppStore } from '@/stores/useAppStore';
import { selectCliPrograms, selectSessions } from '@/stores/use-app-store-selectors';

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

      <CliProgramEditorForm
        commandPreview={commandPreview}
        errors={errors}
        existingProgramId={existingProgram?.id}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onDelete={() => setShowDeleteModal(true)}
        onSelectIcon={(emoji) => {
          setValue('icon', emoji);
          setShowEmojiPicker(false);
        }}
        onSubmit={handleSubmit(onSubmit)}
        onToggleEmojiPicker={() => setShowEmojiPicker((current) => !current)}
        register={register}
        selectedIcon={selectedIcon}
        sessionsUsingCount={
          existingProgram
            ? sessions.filter((session) => session.cliProgram.id === existingProgram.id).length
            : 0
        }
        showDeleteAction={isEditing}
        showEmojiPicker={showEmojiPicker}
      />

      {showDeleteModal && existingProgram ? (
        <CliProgramDeleteConfirmModal
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={() => void handleDelete()}
          programName={existingProgram.name}
        />
      ) : null}
    </div>
  );
}
