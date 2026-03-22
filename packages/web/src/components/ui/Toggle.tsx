'use client';

import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}

export default function Toggle({ checked, onChange, disabled = false, label, id }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      id={id}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        if (!disabled) {
          onChange(!checked);
        }
      }}
      className={`interactive-focus-ring mobile-touch-target relative inline-grid w-14 place-items-center rounded-full transition-opacity duration-250 ease-in-out ${
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
      }`}
      type="button"
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none relative block h-7 w-12 rounded-full transition-all duration-250 ease-in-out ${
          checked ? 'accent-gradient' : 'border border-white/15 bg-white/10'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-250 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}
