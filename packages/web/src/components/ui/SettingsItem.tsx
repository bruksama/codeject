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
  const isInteractive = type !== 'value' && onClick;

  return (
    <div>
      <div
        className={`settings-row flex items-center gap-3 px-4 py-3.5 ${
          isInteractive || type === 'toggle' ? 'cursor-pointer' : ''
        } ${disabled ? 'opacity-40' : ''}`}
        onClick={type !== 'toggle' ? onClick : undefined}
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && isInteractive) onClick?.();
        }}
        aria-disabled={disabled}
      >
        {icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(124,58,237,0.15)',
              border: '1px solid rgba(124,58,237,0.2)',
            }}
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${type === 'destructive' ? 'text-red-400' : 'text-white/90'}`}
          >
            {label}
          </p>
          {sublabel && <p className="text-xs text-white/40 mt-0.5 truncate">{sublabel}</p>}
        </div>
        {badge}
        {type === 'value' && value && (
          <span className="text-sm text-white/40 flex-shrink-0">{value}</span>
        )}
        {type === 'toggle' && onToggle && <Toggle checked={checked} onChange={onToggle} />}
        {type === 'disclosure' && (
          <ChevronRight size={16} className="text-white/25 flex-shrink-0" />
        )}
      </div>
      {showDivider && <div className="h-px bg-white/5 ml-4" />}
    </div>
  );
}
