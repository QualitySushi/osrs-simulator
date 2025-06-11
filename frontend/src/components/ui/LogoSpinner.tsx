import React from 'react';
import { cn } from '@/lib/utils';

export function LogoSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('relative inline-block', className)}>
      <img
        src="/images/logo_transparent.png"
        alt="ScapeLab logo"
        className="absolute inset-0 w-full h-full object-contain logo-fade-1"
      />
      <img
        src="/images/logo_transparent_v2.png"
        alt="ScapeLab logo"
        className="absolute inset-0 w-full h-full object-contain logo-fade-2"
      />
    </div>
  );
}
