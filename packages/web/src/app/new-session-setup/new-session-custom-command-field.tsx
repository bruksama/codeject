'use client';

import { AlertCircle, Terminal } from 'lucide-react';
import { type FieldErrors, type UseFormRegister } from 'react-hook-form';
import type { NewSessionFormData } from './new-session-form-types';

interface NewSessionCustomCommandFieldProps {
  errors: FieldErrors<NewSessionFormData>;
  isCustom: boolean;
  register: UseFormRegister<NewSessionFormData>;
}

export function NewSessionCustomCommandField({
  errors,
  isCustom,
  register,
}: NewSessionCustomCommandFieldProps) {
  return (
    <div className="slide-up">
      <label className="mb-1.5 block text-sm font-medium text-white/72" htmlFor="customCommand">
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
              !isCustom || Boolean(value.trim()) || 'Command is required for custom programs',
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
  );
}
