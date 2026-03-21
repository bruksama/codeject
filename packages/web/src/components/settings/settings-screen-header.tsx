'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { MobileScreenHeader } from '@/components/ui/mobile-screen-header';

interface SettingsScreenHeaderProps {
  rightActions?: ReactNode;
  subtitle?: string;
  title: string;
}

export function SettingsScreenHeader({ rightActions, subtitle, title }: SettingsScreenHeaderProps) {
  const router = useRouter();

  return (
    <MobileScreenHeader
      onBack={() => router.push('/settings')}
      rightActions={rightActions}
      subtitle={subtitle}
      title={title}
    />
  );
}

export default SettingsScreenHeader;
