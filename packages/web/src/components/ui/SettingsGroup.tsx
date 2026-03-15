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
        <p className="text-xs font-semibold uppercase tracking-widest text-purple-400/70 mb-2 px-1">
          {title}
        </p>
      )}
      <div className="settings-group">{children}</div>
    </div>
  );
}
