'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';

interface ProgramIconProps {
  alt: string;
  className?: string;
  icon?: string;
  size?: number;
}

function isImageIcon(icon?: string) {
  return Boolean(icon && /^(\/|https?:\/\/)/.test(icon));
}

export default function ProgramIcon({ alt, className = '', icon, size = 20 }: ProgramIconProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const fallbackLabel = useMemo(() => {
    const token = alt.trim().charAt(0).toUpperCase();
    return token || '⌘';
  }, [alt]);

  if (isImageIcon(icon) && !imageFailed) {
    return (
      <Image
        alt={alt}
        className={className}
        height={size}
        onError={() => setImageFailed(true)}
        src={icon!}
        unoptimized
        width={size}
      />
    );
  }

  if (icon && !isImageIcon(icon)) {
    return <span className={className}>{icon}</span>;
  }

  return (
    <span className={`inline-flex items-center justify-center font-semibold ${className}`}>
      {fallbackLabel}
    </span>
  );
}
