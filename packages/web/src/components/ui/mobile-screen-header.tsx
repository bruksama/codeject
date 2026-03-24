'use client';

import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import MobileActionButton from '@/components/ui/mobile-action-button';

interface MobileScreenHeaderProps {
  bottomContent?: ReactNode;
  className?: string;
  leading?: ReactNode;
  onBack?: () => void;
  rightActions?: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  title: ReactNode;
}

export function MobileScreenHeader({
  bottomContent,
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
      className={`shrink-0 border-b border-white/8 bg-[#08080f] px-4 pb-2.5 ${className}`}
      style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)' }}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex h-10 w-10 shrink-0 self-center items-center justify-center">
          {onBack ? (
            <MobileActionButton
              className="shadow-none"
              label="Go back"
              onClick={onBack}
              size="sm"
              style={{
                background: 'color-mix(in srgb, var(--accent-primary) 15%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent-primary) 26%, transparent)',
                color: 'color-mix(in srgb, var(--accent-primary) 80%, white)',
              }}
            >
              <ArrowLeft size={17} />
            </MobileActionButton>
          ) : (
            leading
          )}
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <h1 className="truncate text-[0.98rem] font-semibold text-white/92">{title}</h1>
          {subtitle ? (
            <p className="mt-0.5 truncate text-[0.72rem] leading-5 text-white/48">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex min-h-10 min-w-10 shrink-0 self-center items-center justify-end gap-2">
          {rightActions ?? trailing}
        </div>
      </div>

      {bottomContent ? (
        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">{bottomContent}</div>
      ) : null}
    </header>
  );
}

export default MobileScreenHeader;
