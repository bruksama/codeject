'use client';

import React from 'react';

interface SettingsGroupProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function SettingsGroup({ title, children, className = '' }: SettingsGroupProps) {
  return (
    <div className={`mb-5 ${className}`}>
      {title && (
        <p className="accent-text mb-2 px-1 text-xs font-semibold uppercase tracking-widest opacity-80">
          {title}
        </p>
      )}
      <div className="settings-group">{children}</div>
    </div>
  );
}
