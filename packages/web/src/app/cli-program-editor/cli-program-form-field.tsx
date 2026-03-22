'use client';

import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

interface CliProgramFormFieldProps {
  children: ReactNode;
  description?: string;
  error?: string;
  htmlFor: string;
  label: string;
}

export function CliProgramFormField({
  children,
  description,
  error,
  htmlFor,
  label,
}: CliProgramFormFieldProps) {
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
