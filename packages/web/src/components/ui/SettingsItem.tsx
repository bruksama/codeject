'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import Toggle from './Toggle';

interface SettingsItemProps {
  icon?: React.ReactNode;
  label: string;
  sublabel?: string;
  value?: string;
  type?: 'disclosure' | 'toggle' | 'value' | 'destructive';
  checked?: boolean;
  onToggle?: (checked: boolean) => void;
  onClick?: () => void;
  showDivider?: boolean;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export default function SettingsItem({
  icon,
  label,
  sublabel,
  value,
  type = 'disclosure',
  checked = false,
  onToggle,
  onClick,
  showDivider = true,
  badge,
  disabled = false,
}: SettingsItemProps) {
  const isToggle = type === 'toggle' && Boolean(onToggle);
  const isInteractive = (type !== 'toggle' && Boolean(onClick)) || isToggle;
  const showDisclosure = type === 'disclosure' || (type === 'value' && isInteractive);
  const handleActivate = () => {
    if (disabled) {
      return;
    }

    if (isToggle && onToggle) {
      onToggle(!checked);
      return;
    }

    onClick?.();
  };
  const bodyClassName = `settings-row interactive-focus-ring flex w-full items-center gap-3 px-4 py-3.5 text-left ${
    isInteractive ? 'cursor-pointer' : ''
  } ${disabled ? 'opacity-40' : ''}`;
  const content = (
    <>
      {icon && (
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 15%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent-primary) 24%, transparent)',
          }}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${type === 'destructive' ? 'text-red-300' : 'text-white/92'}`}
        >
          {label}
        </p>
        {sublabel ? <p className="mt-0.5 text-xs leading-5 text-white/55">{sublabel}</p> : null}
      </div>
      {badge}
      {type === 'value' && value ? (
        <span className="text-sm text-white/55 flex-shrink-0">{value}</span>
      ) : null}
      {type === 'toggle' && onToggle ? <Toggle checked={checked} onChange={onToggle} /> : null}
      {showDisclosure ? <ChevronRight size={16} className="text-white/25 flex-shrink-0" /> : null}
    </>
  );

  return (
    <div>
      {isInteractive ? (
        <button
          aria-disabled={disabled}
          className={bodyClassName}
          disabled={disabled}
          onClick={handleActivate}
          type="button"
        >
          {content}
        </button>
      ) : (
        <div className={bodyClassName}>{content}</div>
      )}
      {showDivider && <div className="h-px bg-white/5 ml-4" />}
    </div>
  );
}
