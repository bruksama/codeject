'use client';

import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import MobileActionButton from '@/components/ui/mobile-action-button';

interface MobileScreenHeaderProps {
  className?: string;
  leading?: ReactNode;
  onBack?: () => void;
  rightActions?: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  title: ReactNode;
}

export function MobileScreenHeader({
  className = '',
  leading,
  onBack,
  rightActions,
  subtitle,
  trailing,
  title,
}: MobileScreenHeaderProps) {
  return (
    <header
      className={`flex items-start gap-3 border-b border-white/8 px-4 py-3 ${className}`}
      style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center">
        {onBack ? (
          <MobileActionButton label="Go back" onClick={onBack}>
            <ArrowLeft size={18} />
          </MobileActionButton>
        ) : (
          leading
        )}
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <h1 className="text-base font-semibold text-white/92">{title}</h1>
        {subtitle ? <p className="mt-1 text-xs leading-5 text-white/48">{subtitle}</p> : null}
      </div>

      <div className="flex min-h-11 min-w-11 shrink-0 items-center justify-end gap-2">
        {rightActions ?? trailing}
      </div>
    </header>
  );
}

export default MobileScreenHeader;
